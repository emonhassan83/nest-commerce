import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductService } from './product.service.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

describe('ProductService', () => {
  let service: ProductService;
  let prisma: Partial<PrismaService>;

  beforeEach(() => {
    prisma = {
      category: {
        findUnique: vi.fn(),
      } as any,
      product: {
        findUnique: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      } as any,
      orderItem: {
        count: vi.fn(),
      } as any,
      cartItem: {
        deleteMany: vi.fn(),
      } as any,
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(prisma)),
    };

    service = new ProductService(prisma as PrismaService);
  });

  describe('createProduct', () => {
    it('should throw NotFoundException if categoryId does not exist', async () => {
      (prisma.category!.findUnique as any).mockResolvedValue(null);

      await expect(
        service.createProduct({
          name: 'Phone',
          categoryId: 'non-existent-cat',
          price: 599.99,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create product when category exists', async () => {
      (prisma.category!.findUnique as any).mockResolvedValue({ id: 'cat-1', name: 'Electronics' });
      const mockProduct = {
        id: 'prod-1',
        name: 'Phone',
        categoryId: 'cat-1',
        price: 599.99,
        stock: 10,
        category: { id: 'cat-1', name: 'Electronics' },
      };
      (prisma.product!.create as any).mockResolvedValue(mockProduct);

      const result = await service.createProduct({
        name: 'Phone',
        categoryId: 'cat-1',
        price: 599.99,
        stock: 10,
      });

      expect(result.message).toBe('Product created successfully');
      expect(result.data).toEqual(mockProduct);
    });
  });

  describe('getAllProducts', () => {
    it('should return paginated products with metadata', async () => {
      const mockProducts = [
        { id: '1', name: 'Product A', price: 100, category: { name: 'Electronics' } },
        { id: '2', name: 'Product B', price: 200, category: { name: 'Electronics' } },
      ];
      (prisma.product!.count as any).mockResolvedValue(2);
      (prisma.product!.findMany as any).mockResolvedValue(mockProducts);

      const result = await service.getAllProducts({ page: 1, limit: 10 });

      expect(result.data).toEqual(mockProducts);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('getProductById', () => {
    it('should throw NotFoundException if product is not found', async () => {
      (prisma.product!.findUnique as any).mockResolvedValue(null);

      await expect(service.getProductById('prod-unknown')).rejects.toThrow(NotFoundException);
    });

    it('should return product details when found', async () => {
      const mockProduct = { id: 'prod-1', name: 'Laptop', price: 1200 };
      (prisma.product!.findUnique as any).mockResolvedValue(mockProduct);

      const result = await service.getProductById('prod-1');
      expect(result.data).toEqual(mockProduct);
    });
  });

  describe('updateProduct', () => {
    it('should throw NotFoundException if product does not exist', async () => {
      (prisma.product!.findUnique as any).mockResolvedValue(null);

      await expect(service.updateProduct('prod-unknown', { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if new categoryId does not exist', async () => {
      (prisma.product!.findUnique as any).mockResolvedValue({ id: 'prod-1', categoryId: 'old-cat' });
      (prisma.category!.findUnique as any).mockResolvedValue(null);

      await expect(
        service.updateProduct('prod-1', { categoryId: 'missing-cat' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully update product', async () => {
      (prisma.product!.findUnique as any).mockResolvedValue({ id: 'prod-1', categoryId: 'old-cat' });
      (prisma.product!.update as any).mockResolvedValue({
        id: 'prod-1',
        name: 'Updated Laptop',
        price: 1500,
      });

      const result = await service.updateProduct('prod-1', { name: 'Updated Laptop', price: 1500 });
      expect(result.message).toBe('Product updated successfully');
      expect(result.data.name).toBe('Updated Laptop');
    });
  });

  describe('deleteProduct', () => {
    it('should throw NotFoundException if product not found', async () => {
      (prisma.product!.findUnique as any).mockResolvedValue(null);

      await expect(service.deleteProduct('prod-unknown')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if product has order items', async () => {
      (prisma.product!.findUnique as any).mockResolvedValue({ id: 'prod-1' });
      (prisma.orderItem!.count as any).mockResolvedValue(3);

      await expect(service.deleteProduct('prod-1')).rejects.toThrow(BadRequestException);
    });

    it('should delete cart items and product inside transaction', async () => {
      (prisma.product!.findUnique as any).mockResolvedValue({ id: 'prod-1' });
      (prisma.orderItem!.count as any).mockResolvedValue(0);
      (prisma.cartItem!.deleteMany as any).mockResolvedValue({ count: 1 });
      (prisma.product!.delete as any).mockResolvedValue({ id: 'prod-1' });

      const result = await service.deleteProduct('prod-1');
      expect(result.message).toBe('Product deleted successfully');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});

