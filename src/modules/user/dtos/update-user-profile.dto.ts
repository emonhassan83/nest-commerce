import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({ example: 'Emon Hossain Updated', description: 'User full name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'https://emonhassan.s3.ap-southeast-1.amazonaws.com/uploads/avatar.png',
    description: 'Avatar image URL',
  })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ example: '+8801800000000', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;
}
