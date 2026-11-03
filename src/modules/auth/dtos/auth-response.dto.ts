import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';

export class AuthUserDto {
  @ApiProperty({ example: 'b78a9c32-2d12-4c28-98e3-0b19d8f8d951' })
  id!: string;

  @ApiProperty({ example: 'Emon Hossain', nullable: true })
  name!: string | null;

  @ApiProperty({ example: 'emon@example.com' })
  email!: string;

  @ApiProperty({ example: 'https://example.com/photo.jpg', nullable: true })
  photoUrl!: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role!: UserRole;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status!: UserStatus;
}

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Signed JWT access token (15m)',
  })
  accessToken!: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Signed JWT refresh token (7d)',
  })
  refreshToken!: string;

  @ApiProperty({ type: () => AuthUserDto })
  user!: AuthUserDto;
}
