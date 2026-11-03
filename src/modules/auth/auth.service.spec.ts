import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaMock: any;
  let jwtMock: any;
  let configMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    jwtMock = {
      signAsync: vi.fn().mockImplementation((payload) => Promise.resolve(`jwt_token_${payload.sub}`)),
    };

    configMock = {
      getOrThrow: vi.fn().mockImplementation((key: string) => {
        const configs: Record<string, string> = {
          'jwt.accessSecret': 'test_access_secret',
          'jwt.accessExpiresIn': '15m',
          'jwt.refreshSecret': 'test_refresh_secret',
          'jwt.refreshExpiresIn': '7d',
        };
        return configs[key];
      }),
    };

    authService = new AuthService(prismaMock, jwtMock, configMock);
  });

  describe('register', () => {
    const registerDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'StrongPassword123!',
    };

    it('should register a new customer successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        photoUrl: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      });
      prismaMock.user.update.mockResolvedValue({});

      const result = await authService.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toEqual({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        photoUrl: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      });
      expect(prismaMock.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email is already taken', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'existing-id', email: 'john@example.com' });

      await expect(authService.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'john@example.com',
      password: 'StrongPassword123!',
    };

    it('should throw UnauthorizedException if user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is INACTIVE', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'john@example.com',
        password: await bcrypt.hash('StrongPassword123!', 10),
        status: UserStatus.INACTIVE,
        role: UserRole.USER,
      });

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'john@example.com',
        password: await bcrypt.hash('OtherPassword123!', 10),
        status: UserStatus.ACTIVE,
        role: UserRole.USER,
      });

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should successfully log in with correct password', async () => {
      const hashedPassword = await bcrypt.hash('StrongPassword123!', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        password: hashedPassword,
        photoUrl: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      });
      prismaMock.user.update.mockResolvedValue({});

      const result = await authService.login(loginDto);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('john@example.com');
    });
  });

  describe('logout', () => {
    it('should invalidate refresh token on logout', async () => {
      prismaMock.user.update.mockResolvedValue({});

      const result = await authService.logout('user-123');

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { refreshToken: null },
      });
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
