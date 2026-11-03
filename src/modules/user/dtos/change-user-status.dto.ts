import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class ChangeUserStatusDto {
  @ApiProperty({
    enum: UserStatus,
    example: UserStatus.INACTIVE,
    description: 'New account status: ACTIVE or INACTIVE',
  })
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(UserStatus, {
    message: `Status must be either ${Object.values(UserStatus).join(' or ')}`,
  })
  status: UserStatus;
}
