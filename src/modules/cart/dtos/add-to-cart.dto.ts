import { IsNotEmpty, IsUUID, IsInt, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Product UUID to add to cart',
  })
  @IsNotEmpty({ message: 'Product ID is required' })
  @IsUUID('all', { message: 'Product ID must be a valid UUID' })
  productId: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Quantity of the product to add (minimum: 1)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity?: number = 1;
}

