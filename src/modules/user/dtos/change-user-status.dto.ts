import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class ChangeUserStatusDto {
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(UserStatus, {
    message: `Status must be either ${Object.values(UserStatus).join(' or ')}`,
  })
  status: UserStatus;
}

