import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dtos/register.dto.js';
import { LoginDto } from './dtos/login.dto.js';
import { AuthResponseDto } from './dtos/auth-response.dto.js';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/index.js';
import { CurrentUser, Roles, Public } from '../../common/decorators/index.js';

@ApiTags('Auth')
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
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully and tokens issued',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error or invalid password' })
  @ApiResponse({ status: 409, description: 'Email address already registered' })
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
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password / Account inactive' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  /**
   * Logout authenticated user and revoke refresh token
   * POST /api/v1/auth/logout
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke active refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@CurrentUser('id') userId: string): Promise<{ message: string }> {
    return this.authService.logout(userId);
  }

  /**
   * Get current authenticated user profile
   * GET /api/v1/auth/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('JWT-auth')
  @ApiOperation({ summary: 'Get current authenticated user info' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiSecurity('JWT-auth')
  @ApiOperation({ summary: 'Test endpoint requiring ADMIN role' })
  @ApiResponse({ status: 200, description: 'Access granted to admin area' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  getAdminData(@CurrentUser() user: any) {
    return {
      message: 'Access granted to admin area',
      adminUser: user,
    };
  }
}
