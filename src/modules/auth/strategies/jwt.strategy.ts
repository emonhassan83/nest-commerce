import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';

/**
 * Extracts raw JWT token directly from Authorization header.
 * Seamlessly supports direct token `Authorization: <token>`
 * while also maintaining fallback for `Authorization: Bearer <token>`.
 */
export function extractTokenFromAuthorizationHeader(req: any): string | null {
  const authHeader = req?.headers?.authorization;
  if (!authHeader) {
    return null;
  }

  const rawHeader = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (typeof rawHeader !== 'string') {
    return null;
  }

  const trimmed = rawHeader.trim();
  if (trimmed.startsWith('Bearer ')) {
    return trimmed.slice(7).trim();
  }
  return trimmed;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: extractTokenFromAuthorizationHeader,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        photoUrl: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Your account is currently inactive or suspended');
    }

    return user;
  }
}
