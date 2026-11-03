import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dtos/register.dto.js';
import { LoginDto } from './dtos/login.dto.js';
import { AuthResponseDto } from './dtos/auth-response.dto.js';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/index.js';
import { CurrentUser, Roles, Public } from '../../common/decorators/index.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new customer
   * POST /api/v1/auth/register
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  /**
   * Login with email and password
   * POST /api/v1/auth/login
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  /**
   * Logout authenticated user and revoke refresh token
   * POST /api/v1/auth/logout
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser('id') userId: string): Promise<{ message: string }> {
    return this.authService.logout(userId);
  }

  /**
   * Get current authenticated user profile
   * GET /api/v1/auth/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: any) {
    return { user };
  }

  /**
   * Example endpoint demonstrating Role-based Guard verification
   * GET /api/v1/auth/admin-only
   */
  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdminData(@CurrentUser() user: any) {
    return {
      message: 'Access granted to admin area',
      adminUser: user,
    };
  }
}
