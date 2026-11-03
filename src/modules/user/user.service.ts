import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { UpdateUserProfileDto, ChangeUserStatusDto, QueryUserDto } from './dtos/index.js';

export const USER_SELECT_FIELDS = {
  id: true,
  name: true,
  email: true,
  photoUrl: true,
  phoneNumber: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Admin: Get all users with search, filtering and pagination
   */
  async getAllUsers(query: QueryUserDto) {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search && query.search.trim() !== '') {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: USER_SELECT_FIELDS,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get current authenticated user profile
   */
  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT_FIELDS,
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return {
      data: user,
    };
  }

  /**
   * Update current authenticated user profile
   */
  async updateMyProfile(userId: string, dto: UpdateUserProfileDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new NotFoundException('User profile not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl }),
        ...(dto.phoneNumber !== undefined && { phoneNumber: dto.phoneNumber }),
      },
      select: USER_SELECT_FIELDS,
    });

    this.logger.log(`User profile updated: ${userId}`);

    return {
      message: 'Profile updated successfully',
      data: updatedUser,
    };
  }

  /**
   * Admin: Change user account status (ACTIVE / INACTIVE)
   */
  async changeUserStatus(
    targetUserId: string,
    dto: ChangeUserStatusDto,
    currentAdminId: string,
  ) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID "${targetUserId}" not found`);
    }

    // Safety: prevent admin from disabling their own account
    if (targetUserId === currentAdminId && dto.status === UserStatus.INACTIVE) {
      throw new BadRequestException('Admin cannot deactivate their own account');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        status: dto.status,
        // Invalidate active session if set to INACTIVE
        ...(dto.status === UserStatus.INACTIVE && { refreshToken: null }),
      },
      select: USER_SELECT_FIELDS,
    });

    this.logger.log(
      `User ${targetUserId} status changed to ${dto.status} by admin ${currentAdminId}`,
    );

    return {
      message: `User status changed to ${dto.status} successfully`,
      data: updatedUser,
    };
  }

  /**
   * Delete or deactivate current user profile
   */
  async deleteMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    // Check if user has related orders (e-commerce audit trail)
    const orderCount = await this.prisma.order.count({
      where: { userId },
    });

    if (orderCount > 0) {
      // Soft-deactivate if order history exists
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.INACTIVE,
          refreshToken: null,
        },
      });

      this.logger.log(`User profile deactivated due to order history: ${userId}`);

      return {
        message: 'Account has order history and was deactivated successfully',
      };
    }

    // Direct deletion if no order history
    await this.prisma.user.delete({
      where: { id: userId },
    });

    this.logger.log(`User profile deleted: ${userId}`);

    return {
      message: 'Account deleted successfully',
    };
  }
}
