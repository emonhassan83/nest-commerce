import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

describe('CartService', () => {
  let service: CartService;
  let prisma: Partial<PrismaService>;

  beforeEach(() => {
    prisma = {
      cart: {
        findUnique: vi.fn(),
        create: vi.fn(),
      } as any,
      cartItem: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      } as any,
      product: {
        findUnique: vi.fn(),
      } as any,
    };

    service = new CartService(prisma as PrismaService);
  });

  describe('getOrCreateCart', () => {
    it('should return existing cart if found', async () => {
      const mockCart = { id: 'cart-1', userId: 'user-1' };
      (prisma.cart!.findUnique as any).mockResolvedValue(mockCart);

      const result = await service.getOrCreateCart('user-1');
      expect(result).toEqual(mockCart);
      expect(prisma.cart!.create).not.toHaveBeenCalled();
    });

    it('should create new cart if none exists', async () => {
      (prisma.cart!.findUnique as any).mockResolvedValue(null);
      const newCart = { id: 'cart-new', userId: 'user-1' };
      (prisma.cart!.create as any).mockResolvedValue(newCart);

      const result = await service.getOrCreateCart('user-1');
      expect(result).toEqual(newCart);
      expect(prisma.cart!.create).toHaveBeenCalledWith({ data: { userId: 'user-1' } });
    });
  });

  describe('getMyCart', () => {
    it('should return empty summary if cart has no items', async () => {
      (prisma.cart!.findUnique as any)
        .mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1' }) // for getOrCreateCart
        .mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1', items: [] }); // for fullCart

      const result = await service.getMyCart('user-1');
      expect(result.data.items).toEqual([]);
      expect(result.data.totalItems).toBe(0);
      expect(result.data.totalQuantity).toBe(0);
      expect(result.data.grandTotal).toBe(0);
    });

    it('should correctly calculate subtotals and grandTotal', async () => {
      const mockFullCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'item-1',
            productId: 'p-1',
            quantity: 2,
            createdAt: new Date(),
            updatedAt: new Date(),
            product: {
              id: 'p-1',
              name: 'Keyboard',
              description: 'Mechanical',
              price: 50.0,
              stock: 10,
              category: { id: 'cat-1', name: 'Electronics' },
            },
          },
          {
            id: 'item-2',
            productId: 'p-2',
            quantity: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            product: {
              id: 'p-2',
              name: 'Mouse',
              description: 'Wireless',
              price: 25.5,
              stock: 5,
              category: { id: 'cat-1', name: 'Electronics' },
            },
          },
        ],
      };

      (prisma.cart!.findUnique as any)
        .mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1' })
        .mockResolvedValueOnce(mockFullCart);

      const result = await service.getMyCart('user-1');
      expect(result.data.items.length).toBe(2);
      expect(result.data.totalQuantity).toBe(3);
      expect(result.data.grandTotal).toBe(125.5);
      expect(result.data.items[0].subtotal).toBe(100.0);
      expect(result.data.items[0].isStockAvailable).toBe(true);
    });
  });

  describe('addToCart', () => {
    it('should throw NotFoundException if product is missing', async () => {
      (prisma.product!.findUnique as any).mockResolvedValue(null);

      await expect(
        service.addToCart('user-1', { productId: 'unknown-p', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if product is out of stock', async () => {
      (prisma.product!.findUnique as any).mockResolvedValue({ id: 'p-1', name: 'Laptop', stock: 0 });

      await expect(
        service.addToCart('user-1', { productId: 'p-1', quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if requested quantity exceeds stock', async () => {
      (prisma.product!.findUnique as any).mockResolvedValue({ id: 'p-1', name: 'Laptop', stock: 2 });

      await expect(
        service.addToCart('user-1', { productId: 'p-1', quantity: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create new cartItem if not already in cart', async () => {
      (prisma.product!.findUnique as any).mockResolvedValue({ id: 'p-1', name: 'Laptop', stock: 10, price: 999 });
      (prisma.cart!.findUnique as any)
        .mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1' }) // getOrCreateCart
        .mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1' }) // getOrCreateCart in getMyCart
        .mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1', items: [] }); // fullCart
      (prisma.cartItem!.findUnique as any).mockResolvedValue(null);
      (prisma.cartItem!.create as any).mockResolvedValue({ id: 'ci-1', cartId: 'cart-1', productId: 'p-1', quantity: 2 });

      const result = await service.addToCart('user-1', { productId: 'p-1', quantity: 2 });
      expect(result.message).toBe('Item added to cart successfully');
      expect(prisma.cartItem!.create).toHaveBeenCalled();
    });

    it('should increment quantity if item already exists in cart', async () => {
      (prisma.product!.findUnique as any).mockResolvedValue({ id: 'p-1', name: 'Laptop', stock: 10, price: 999 });
      (prisma.cart!.findUnique as any)
        .mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1' })
        .mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1' })
        .mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1', items: [] });
      (prisma.cartItem!.findUnique as any).mockResolvedValue({
        id: 'ci-1',
        cartId: 'cart-1',
        productId: 'p-1',
        quantity: 3,
      });

      const result = await service.addToCart('user-1', { productId: 'p-1', quantity: 2 });
      expect(result.message).toBe('Item added to cart successfully');
      expect(prisma.cartItem!.update).toHaveBeenCalledWith({
        where: { id: 'ci-1' },
        data: { quantity: 5 },
      });
    });
  });

  describe('updateCartItem', () => {
    it('should throw NotFoundException if cartItem not found or belongs to another user', async () => {
      (prisma.cartItem!.findUnique as any).mockResolvedValue(null);

      await expect(
        service.updateCartItem('user-1', 'ci-unknown', { quantity: 2 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if new quantity exceeds stock', async () => {
      (prisma.cartItem!.findUnique as any).mockResolvedValue({
        id: 'ci-1',
        cart: { userId: 'user-1' },
        product: { stock: 3 },
      });

      await expect(
        service.updateCartItem('user-1', 'ci-1', { quantity: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update quantity successfully', async () => {
      (prisma.cartItem!.findUnique as any).mockResolvedValue({
        id: 'ci-1',
        cart: { userId: 'user-1' },
        product: { stock: 10 },
      });
      (prisma.cart!.findUnique as any)
        .mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1' })
        .mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1', items: [] });

      const result = await service.updateCartItem('user-1', 'ci-1', { quantity: 4 });
      expect(result.message).toBe('Cart item updated successfully');
      expect(prisma.cartItem!.update).toHaveBeenCalledWith({
        where: { id: 'ci-1' },
        data: { quantity: 4 },
      });
    });
  });

  describe('removeCartItem', () => {
    it('should throw NotFoundException if item not found for user', async () => {
      (prisma.cartItem!.findUnique as any).mockResolvedValue({
        id: 'ci-1',
        cart: { userId: 'another-user' },
      });

      await expect(service.removeCartItem('user-1', 'ci-1')).rejects.toThrow(NotFoundException);
    });

    it('should delete cartItem successfully', async () => {
      (prisma.cartItem!.findUnique as any).mockResolvedValue({
        id: 'ci-1',
        cartId: 'cart-1',
        cart: { userId: 'user-1' },
      });
      (prisma.cart!.findUnique as any)
        .mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1' })
        .mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1', items: [] });

      const result = await service.removeCartItem('user-1', 'ci-1');
      expect(result.message).toBe('Item removed from cart successfully');
      expect(prisma.cartItem!.delete).toHaveBeenCalledWith({ where: { id: 'ci-1' } });
    });
  });

  describe('clearCart', () => {
    it('should delete all cart items for user', async () => {
      (prisma.cart!.findUnique as any).mockResolvedValue({ id: 'cart-1', userId: 'user-1' });

      const result = await service.clearCart('user-1');
      expect(result.message).toBe('Cart cleared successfully');
      expect(prisma.cartItem!.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });
    });
  });
});

