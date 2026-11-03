import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmPaymentDto {
  @ApiProperty({
    example: 'cs_test_a1b2c3d4e5f6...',
    description: 'Stripe Checkout Session ID received upon redirect or completion',
  })
  @IsNotEmpty({ message: 'Session ID is required' })
  @IsString({ message: 'Session ID must be a string' })
  sessionId: string;
}

