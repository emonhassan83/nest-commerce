import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrderStatus, UserRole } from '@prisma/client';
import { OrderService } from './order.service.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: Partial<PrismaService>;

  beforeEach(() => {
    prisma = {
      cart: {
        findUnique: vi.fn(),
      } as any,
      cartItem: {
        deleteMany: vi.fn(),
      } as any,
      product: {
        findUnique: vi.fn(),
        update: vi.fn(),
      } as any,
      order: {
        create: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      } as any,
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(prisma)),
    };

    service = new OrderService(prisma as PrismaService);
  });

  describe('createOrder', () => {
    it('should throw BadRequestException if cart is empty and no items provided', async () => {
      (prisma.cart!.findUnique as any).mockResolvedValue({ id: 'cart-1', items: [] });

      await expect(service.createOrder('user-1', {})).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if a product is not found', async () => {
      (prisma.product!.findUnique as any).mockResolvedValue(null);

      await expect(
        service.createOrder('user-1', {
          items: [{ productId: 'missing-p', quantity: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if product has insufficient stock', async () => {
      (prisma.product!.findUnique as any).mockResolvedValue({
        id: 'p-1',
        name: 'Keyboard',
        stock: 2,
        price: 50,
      });

      await expect(
        service.createOrder('user-1', {
          items: [{ productId: 'p-1', quantity: 5 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully place order from direct items, decrement stock, and calculate total', async () => {
      (prisma.product!.findUnique as any).mockResolvedValue({
        id: 'p-1',
        name: 'Keyboard',
        stock: 10,
        price: 50.0,
      });
      (prisma.product!.update as any).mockResolvedValue({ id: 'p-1', stock: 8 });
      const mockCreatedOrder = {
        id: 'ord-123',
        userId: 'user-1',
        totalAmount: 100.0,
        status: OrderStatus.PENDING,
        items: [{ productId: 'p-1', quantity: 2, unitPrice: 50.0 }],
      };
      (prisma.order!.create as any).mockResolvedValue(mockCreatedOrder);

      const result = await service.createOrder('user-1', {
        items: [{ productId: 'p-1', quantity: 2 }],
      });

      expect(result.message).toBe('Order placed successfully');
      expect(result.data.totalAmount).toBe(100.0);
      expect(prisma.product!.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { stock: { decrement: 2 } },
      });
    });

    it('should place order from cart and clear cart items on checkout', async () => {
      (prisma.cart!.findUnique as any).mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [{ productId: 'p-1', quantity: 1 }],
      });
      (prisma.product!.findUnique as any).mockResolvedValue({
        id: 'p-1',
        name: 'Headphones',
        stock: 5,
        price: 80.0,
      });
      (prisma.order!.create as any).mockResolvedValue({
        id: 'ord-cart',
        userId: 'user-1',
        totalAmount: 80.0,
      });

      const result = await service.createOrder('user-1', {});
      expect(result.message).toBe('Order placed successfully');
      expect(prisma.cartItem!.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });
    });
  });

  describe('getMyOrders', () => {
    it('should return user orders with pagination metadata', async () => {
      const mockOrders = [
        { id: 'ord-1', totalAmount: 100, status: OrderStatus.PENDING },
        { id: 'ord-2', totalAmount: 200, status: OrderStatus.CONFIRMED },
      ];
      (prisma.order!.count as any).mockResolvedValue(2);
      (prisma.order!.findMany as any).mockResolvedValue(mockOrders);

      const result = await service.getMyOrders('user-1', { page: 1, limit: 10 });
      expect(result.data).toEqual(mockOrders);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('getOrderDetails', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      (prisma.order!.findUnique as any).mockResolvedValue(null);

      await expect(
        service.getOrderDetails('ord-unknown', { id: 'user-1', role: UserRole.USER }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not admin and does not own order', async () => {
      (prisma.order!.findUnique as any).mockResolvedValue({
        id: 'ord-1',
        userId: 'different-user',
      });

      await expect(
        service.getOrderDetails('ord-1', { id: 'user-1', role: UserRole.USER }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return order if user owns it', async () => {
      const mockOrder = { id: 'ord-1', userId: 'user-1', totalAmount: 150 };
      (prisma.order!.findUnique as any).mockResolvedValue(mockOrder);

      const result = await service.getOrderDetails('ord-1', { id: 'user-1', role: UserRole.USER });
      expect(result.data).toEqual(mockOrder);
    });

    it('should return order if current user is ADMIN even if not owner', async () => {
      const mockOrder = { id: 'ord-1', userId: 'different-user', totalAmount: 150 };
      (prisma.order!.findUnique as any).mockResolvedValue(mockOrder);

      const result = await service.getOrderDetails('ord-1', { id: 'admin-1', role: UserRole.ADMIN });
      expect(result.data).toEqual(mockOrder);
    });
  });

  describe('cancelMyOrder', () => {
    it('should throw NotFoundException if order does not exist or user is not owner', async () => {
      (prisma.order!.findUnique as any).mockResolvedValue(null);

      await expect(service.cancelMyOrder('ord-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if order is already cancelled', async () => {
      (prisma.order!.findUnique as any).mockResolvedValue({
        id: 'ord-1',
        userId: 'user-1',
        status: OrderStatus.CANCELLED,
      });

      await expect(service.cancelMyOrder('ord-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if order is already shipped or delivered', async () => {
      (prisma.order!.findUnique as any).mockResolvedValue({
        id: 'ord-1',
        userId: 'user-1',
        status: OrderStatus.SHIPPED,
      });

      await expect(service.cancelMyOrder('ord-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should cancel pending order and restore stock in inventory', async () => {
      (prisma.order!.findUnique as any).mockResolvedValue({
        id: 'ord-1',
        userId: 'user-1',
        status: OrderStatus.PENDING,
        items: [{ productId: 'p-1', quantity: 2 }],
      });
      (prisma.product!.update as any).mockResolvedValue({ id: 'p-1', stock: 12 });
      (prisma.order!.update as any).mockResolvedValue({
        id: 'ord-1',
        status: OrderStatus.CANCELLED,
      });

      const result = await service.cancelMyOrder('ord-1', 'user-1');
      expect(result.message).toBe('Order cancelled successfully and stock restored');
      expect(prisma.product!.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { stock: { increment: 2 } },
      });
    });
  });

  describe('getAllOrders (Admin)', () => {
    it('should return all orders with customer info for admin', async () => {
      (prisma.order!.count as any).mockResolvedValue(1);
      (prisma.order!.findMany as any).mockResolvedValue([
        { id: 'ord-1', totalAmount: 300, user: { name: 'John Doe' } },
      ]);

      const result = await service.getAllOrders({ page: 1, limit: 10 });
      expect(result.data.length).toBe(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('updateOrderStatus (Admin)', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      (prisma.order!.findUnique as any).mockResolvedValue(null);

      await expect(
        service.updateOrderStatus('ord-unknown', { status: OrderStatus.SHIPPED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should restore stock when admin updates status to CANCELLED', async () => {
      (prisma.order!.findUnique as any).mockResolvedValue({
        id: 'ord-1',
        status: OrderStatus.PROCESSING,
        items: [{ productId: 'p-1', quantity: 3 }],
      });
      (prisma.order!.update as any).mockResolvedValue({
        id: 'ord-1',
        status: OrderStatus.CANCELLED,
      });

      const result = await service.updateOrderStatus('ord-1', {
        status: OrderStatus.CANCELLED,
      });
      expect(result.message).toBe('Order status updated successfully');
      expect(prisma.product!.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { stock: { increment: 3 } },
      });
    });

    it('should simply update status when not moving to or from CANCELLED', async () => {
      (prisma.order!.findUnique as any).mockResolvedValue({
        id: 'ord-1',
        status: OrderStatus.CONFIRMED,
        items: [{ productId: 'p-1', quantity: 1 }],
      });
      (prisma.order!.update as any).mockResolvedValue({
        id: 'ord-1',
        status: OrderStatus.SHIPPED,
      });

      const result = await service.updateOrderStatus('ord-1', {
        status: OrderStatus.SHIPPED,
      });
      expect(result.message).toBe('Order status updated successfully');
      expect(prisma.order!.update).toHaveBeenCalledWith({
        where: { id: 'ord-1' },
        data: { status: OrderStatus.SHIPPED },
      });
    });
  });

  describe('removeAOrder (Admin)', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      (prisma.order!.findUnique as any).mockResolvedValue(null);

      await expect(service.removeAOrder('ord-unknown')).rejects.toThrow(NotFoundException);
    });

    it('should delete order successfully', async () => {
      (prisma.order!.findUnique as any).mockResolvedValue({ id: 'ord-1' });
      (prisma.order!.delete as any).mockResolvedValue({ id: 'ord-1' });

      const result = await service.removeAOrder('ord-1');
      expect(result.message).toBe('Order deleted successfully');
      expect(prisma.order!.delete).toHaveBeenCalledWith({ where: { id: 'ord-1' } });
    });
  });
});

