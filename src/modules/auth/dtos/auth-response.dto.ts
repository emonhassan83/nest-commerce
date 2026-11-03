import { UserRole, UserStatus } from '@prisma/client';

export class AuthUserDto {
  id!: string;
  name!: string | null;
  email!: string;
  photoUrl!: string | null;
  role!: UserRole;
  status!: UserStatus;
}

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  user!: AuthUserDto;
}

