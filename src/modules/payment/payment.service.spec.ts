import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, OrderStatus, UserRole } from '@prisma/client';
import { PaymentService } from './payment.service.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: Partial<PrismaService>;
  let configService: Partial<ConfigService>;

  beforeEach(() => {
    prisma = {
      order: {
        findUnique: vi.fn(),
        update: vi.fn(),
      } as any,
      payment: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      } as any,
      $transaction: vi.fn(async (cb: any) => (typeof cb === 'function' ? cb(prisma) : Promise.all(cb))) as any,
    };

    configService = {
      get: vi.fn((key: string) => {
        if (key === 'payment.stripeSecretKey') return 'sk_test_mock';
        if (key === 'payment.successUrl') return 'http://localhost:5173/payment/success';
        if (key === 'payment.cancelUrl') return 'http://localhost:5173/payment/cancel';
        return null;
      }),
    };

    service = new PaymentService(prisma as PrismaService, configService as ConfigService);

    // Mock internal stripe SDK calls
    service.stripe = {
      checkout: {
        sessions: {
          create: vi.fn(),
          retrieve: vi.fn(),
        },
      },
    } as any;
  });

  describe('createCheckoutSession', () => {
    it('should throw NotFoundException if order is not found', async () => {
      (prisma.order!.findUnique as any).mockResolvedValue(null);

      await expect(
        service.createCheckoutSession('user-1', { orderId: 'missing-order' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if order belongs to another user', async () => {
      (prisma.order!.findUnique as any).mockResolvedValue({
        id: 'ord-1',
        userId: 'other-user',
        payments: [],
      });

      await expect(
        service.createCheckoutSession('user-1', { orderId: 'ord-1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if order is cancelled', async () => {
      (prisma.order!.findUnique as any).mockResolvedValue({
        id: 'ord-1',
        userId: 'user-1',
        status: OrderStatus.CANCELLED,
        payments: [],
      });

      await expect(
        service.createCheckoutSession('user-1', { orderId: 'ord-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if order already has completed payment', async () => {
      (prisma.order!.findUnique as any).mockResolvedValue({
        id: 'ord-1',
        userId: 'user-1',
        status: OrderStatus.CONFIRMED,
        payments: [{ id: 'p-1', status: PaymentStatus.COMPLETED }],
      });

      await expect(
        service.createCheckoutSession('user-1', { orderId: 'ord-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully create checkout session and return checkoutUrl', async () => {
      (prisma.order!.findUnique as any).mockResolvedValue({
        id: 'ord-1',
        userId: 'user-1',
        status: OrderStatus.PENDING,
        totalAmount: 150.0,
        items: [
          {
            quantity: 1,
            unitPrice: 150.0,
            product: { name: 'Item A', description: 'Desc' },
          },
        ],
        payments: [],
      });
      (prisma.payment!.create as any).mockResolvedValue({
        id: 'pay-1',
        orderId: 'ord-1',
        status: PaymentStatus.PENDING,
      });
      (prisma.payment!.update as any).mockResolvedValue({ id: 'pay-1' });

      (service.stripe.checkout.sessions.create as any).mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });

      const result = await service.createCheckoutSession('user-1', { orderId: 'ord-1' });

      expect(result.message).toBe('Checkout session created successfully');
      expect(result.sessionId).toBe('cs_test_123');
      expect(result.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_123');
      expect(prisma.payment!.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: { transactionId: 'cs_test_123' },
      });
    });
  });

  describe('confirmPayment', () => {
    it('should throw BadRequestException if stripe session is not paid', async () => {
      (service.stripe.checkout.sessions.retrieve as any).mockResolvedValue({
        id: 'cs_test_unpaid',
        payment_status: 'unpaid',
      });

      await expect(
        service.confirmPayment('user-1', { sessionId: 'cs_test_unpaid' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if order belongs to another user', async () => {
      (service.stripe.checkout.sessions.retrieve as any).mockResolvedValue({
        id: 'cs_test_paid',
        payment_status: 'paid',
        client_reference_id: 'ord-1',
      });
      (prisma.order!.findUnique as any).mockResolvedValue({
        id: 'ord-1',
        userId: 'different-user',
        payments: [],
      });

      await expect(
        service.confirmPayment('user-1', { sessionId: 'cs_test_paid' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should settle payment as COMPLETED and order as CONFIRMED', async () => {
      (service.stripe.checkout.sessions.retrieve as any).mockResolvedValue({
        id: 'cs_test_paid',
        payment_status: 'paid',
        payment_intent: 'pi_test_999',
        client_reference_id: 'ord-1',
        amount_total: 15000,
        payment_method_types: ['card'],
      });
      (prisma.order!.findUnique as any).mockResolvedValue({
        id: 'ord-1',
        userId: 'user-1',
        status: OrderStatus.PENDING,
        totalAmount: 150.0,
        payments: [{ id: 'pay-1', transactionId: 'cs_test_paid', status: PaymentStatus.PENDING }],
      });
      (prisma.payment!.update as any).mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.COMPLETED,
        transactionId: 'pi_test_999',
      });
      (prisma.order!.update as any).mockResolvedValue({
        id: 'ord-1',
        status: OrderStatus.CONFIRMED,
      });

      const result = await service.confirmPayment('user-1', { sessionId: 'cs_test_paid' });

      expect(result.message).toBe('Payment confirmed successfully');
      expect(result.data.payment.status).toBe(PaymentStatus.COMPLETED);
      expect(result.data.order.status).toBe(OrderStatus.CONFIRMED);
    });
  });

  describe('getMyPayments', () => {
    it('should return paginated payment records for user', async () => {
      (prisma.payment!.count as any).mockResolvedValue(1);
      (prisma.payment!.findMany as any).mockResolvedValue([
        { id: 'pay-1', amount: 150, status: PaymentStatus.COMPLETED },
      ]);

      const result = await service.getMyPayments('user-1', { page: 1, limit: 10 });
      expect(result.data.length).toBe(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getPaymentDetails', () => {
    it('should throw NotFoundException if payment is missing', async () => {
      (prisma.payment!.findUnique as any).mockResolvedValue(null);

      await expect(
        service.getPaymentDetails('pay-missing', { id: 'user-1', role: UserRole.USER }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own payment and is not admin', async () => {
      (prisma.payment!.findUnique as any).mockResolvedValue({
        id: 'pay-1',
        order: { userId: 'other-user' },
      });

      await expect(
        service.getPaymentDetails('pay-1', { id: 'user-1', role: UserRole.USER }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return payment details if user owns payment', async () => {
      const mockPayment = { id: 'pay-1', order: { userId: 'user-1' } };
      (prisma.payment!.findUnique as any).mockResolvedValue(mockPayment);

      const result = await service.getPaymentDetails('pay-1', {
        id: 'user-1',
        role: UserRole.USER,
      });
      expect(result.data).toEqual(mockPayment);
    });

    it('should return payment details for ADMIN user', async () => {
      const mockPayment = { id: 'pay-1', order: { userId: 'other-user' } };
      (prisma.payment!.findUnique as any).mockResolvedValue(mockPayment);

      const result = await service.getPaymentDetails('pay-1', {
        id: 'admin-1',
        role: UserRole.ADMIN,
      });
      expect(result.data).toEqual(mockPayment);
    });
  });

  describe('getAllPayments (Admin)', () => {
    it('should return all payments across platform for admin', async () => {
      (prisma.payment!.count as any).mockResolvedValue(2);
      (prisma.payment!.findMany as any).mockResolvedValue([
        { id: 'pay-1', amount: 100 },
        { id: 'pay-2', amount: 200 },
      ]);

      const result = await service.getAllPayments({ page: 1, limit: 10 });
      expect(result.data.length).toBe(2);
      expect(result.meta.total).toBe(2);
    });
  });
});

