import { IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.PROCESSING,
    description: 'New status for the order',
  })
  @IsNotEmpty({ message: 'Order status is required' })
  @IsEnum(OrderStatus, { message: 'Invalid order status' })
  status: OrderStatus;
}

