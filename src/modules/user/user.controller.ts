import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UserService } from './user.service.js';
import { UpdateUserProfileDto, ChangeUserStatusDto, QueryUserDto } from './dtos/index.js';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/index.js';
import { CurrentUser, Roles } from '../../common/decorators/index.js';

@ApiTags('User')
@ApiSecurity('JWT-auth')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 1. Admin: Get all users with search, filtering and pagination
   * GET /api/v1/user
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Get all users with pagination and search' })
  @ApiResponse({ status: 200, description: 'Paginated user list retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  async getAllUsers(@Query() query: QueryUserDto) {
    return this.userService.getAllUsers(query);
  }

  /**
   * 2. User: Get my profile
   * GET /api/v1/user/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.userService.getMyProfile(userId);
  }

  /**
   * 3. User: Update my profile
   * PATCH /api/v1/user/me
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.userService.updateMyProfile(userId, dto);
  }

  /**
   * 4. Admin: Change a user's status (ACTIVE / INACTIVE)
   * PATCH /api/v1/user/:id/status
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Change a user account status (ACTIVE / INACTIVE)' })
  @ApiParam({ name: 'id', description: 'Target User UUID' })
  @ApiResponse({ status: 200, description: 'User status updated successfully' })
  @ApiResponse({ status: 400, description: 'Admin cannot deactivate their own account' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async changeUserStatus(
    @Param('id') targetUserId: string,
    @Body() dto: ChangeUserStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.userService.changeUserStatus(targetUserId, dto, adminId);
  }

  /**
   * 5. User: Delete my profile
   * DELETE /api/v1/user/me
   */
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete or deactivate current user profile' })
  @ApiResponse({ status: 200, description: 'Account deleted or deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteMyProfile(@CurrentUser('id') userId: string) {
    return this.userService.deleteMyProfile(userId);
  }
}
