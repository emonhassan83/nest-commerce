import { IsOptional, IsArray, ValidateNested, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemInputDto {
  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Product UUID' })
  @IsUUID('all', { message: 'productId must be a valid UUID' })
  productId: string;

  @ApiPropertyOptional({ example: 1, description: 'Quantity to order', default: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;
}

export class CreateOrderDto {
  @ApiPropertyOptional({
    description:
      'Direct items to order. If omitted, orders directly from the authenticated user active cart.',
    type: [OrderItemInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items?: OrderItemInputDto[];
}

