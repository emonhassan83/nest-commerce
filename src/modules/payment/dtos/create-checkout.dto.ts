import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Order UUID to pay for',
  })
  @IsNotEmpty({ message: 'Order ID is required' })
  @IsUUID('all', { message: 'Order ID must be a valid UUID' })
  orderId: string;
}

