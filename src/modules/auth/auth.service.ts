import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { RegisterDto } from './dtos/register.dto.js';
import { LoginDto } from './dtos/login.dto.js';
import { AuthResponseDto } from './dtos/auth-response.dto.js';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.accessSecret = configService.getOrThrow<string>('jwt.accessSecret');
    this.accessExpiresIn = configService.getOrThrow<string>('jwt.accessExpiresIn');
    this.refreshSecret = configService.getOrThrow<string>('jwt.refreshSecret');
    this.refreshExpiresIn = configService.getOrThrow<string>('jwt.refreshExpiresIn');
  }

  /**
   * Register a new customer account with validated constraints
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Corner case 1: Email uniqueness check
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email address already exists');
    }

    // Corner case 2: Password hashing using bcrypt with 10 salt rounds
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    // Corner case 3: Default secure role and active status
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        name: dto.name.trim(),
        passwordHash,
        photoUrl: dto.photoUrl,
        phoneNumber: dto.phoneNumber,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
        role: true,
        status: true,
      },
    });

    // Generate JWT token pair
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Save hashed refresh token for secure revocation
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    this.logger.log(`New user registered successfully: ${user.email}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        photoUrl: user.photoUrl,
        role: user.role,
        status: user.status,
      },
    };
  }

  /**
   * Authenticate an existing user and issue new token pair
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Corner case 1: Find user
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Timing-safe response: same error message whether email doesn't exist or password fails
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Corner case 2: Account active status check
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Your account is currently inactive or suspended');
    }

    // Corner case 3: Verify password hash
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate JWT token pair
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Update refresh token hash in database
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    this.logger.log(`User logged in successfully: ${user.email}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        photoUrl: user.photoUrl,
        role: user.role,
        status: user.status,
      },
    };
  }

  /**
   * Logout user by invalidating the refresh token hash
   */
  async logout(userId: string): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    this.logger.log(`User logged out successfully: ${userId}`);
    return { message: 'Logged out successfully' };
  }

  /**
   * Generates Access Token and Refresh Token with role in payload
   */
  private async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresIn as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Hashes and updates refresh token in database
   */
  private async updateRefreshTokenHash(userId: string, refreshToken: string): Promise<void> {
    const saltRounds = 10;
    const refreshTokenHash = await bcrypt.hash(refreshToken, saltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }
}
