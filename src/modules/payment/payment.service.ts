import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PaymentStatus, OrderStatus, UserRole } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { CreateCheckoutDto, ConfirmPaymentDto, QueryPaymentDto } from './dtos/index.js';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  public stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const stripeKey =
      this.configService.get<string>('payment.stripeSecretKey') ||
      process.env.STRIPE_API_SECRET ||
      process.env.STRIPE_SECRET_KEY ||
      'sk_test_placeholder';

    this.stripe = new Stripe(stripeKey);
  }

  /**
   * 1. Customer: Create Stripe Checkout Session for an Order
   */
  async createCheckoutSession(userId: string, dto: CreateCheckoutDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${dto.orderId}' not found`);
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Access denied: You do not have permission to pay for this order');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot initiate payment for a cancelled order');
    }

    const completedPayment = order.payments.find(
      (p) => p.status === PaymentStatus.COMPLETED,
    );
    if (completedPayment) {
      throw new BadRequestException('This order has already been paid successfully');
    }

    // Reuse existing pending payment record or create a new one
    let payment = order.payments.find((p) => p.status === PaymentStatus.PENDING);
    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          orderId: order.id,
          amount: order.totalAmount,
          status: PaymentStatus.PENDING,
          paymentMethod: 'CARD',
        },
      });
    }

    const baseSuccessUrl =
      this.configService.get<string>('payment.successUrl') ||
      'http://localhost:5173/payment/success';
    const baseCancelUrl =
      this.configService.get<string>('payment.cancelUrl') ||
      'http://localhost:5173/payment/cancel';

    const successUrl = `${baseSuccessUrl}?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`;
    const cancelUrl = `${baseCancelUrl}?order_id=${order.id}`;

    // Map order items to Stripe line items
    const lineItems = order.items.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.product.name,
          description: item.product.description || undefined,
        },
        unit_amount: Math.round(Number(item.unitPrice) * 100),
      },
      quantity: item.quantity,
    }));

    const items: Stripe.Checkout.SessionCreateParams.LineItem[] =
      lineItems.length > 0
        ? lineItems
        : [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `Order #${order.id.slice(0, 8)}`,
                },
                unit_amount: Math.round(Number(order.totalAmount) * 100),
              },
              quantity: 1,
            },
          ];

    const session = await this.stripe.checkout.sessions.create({
      line_items: items,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: order.id,
      metadata: {
        orderId: order.id,
        userId,
        paymentId: payment.id,
      },
    });

    // Save session ID as initial transaction reference
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        transactionId: session.id,
      },
    });

    this.logger.log(
      `Stripe checkout session created: ${session.id} for order: ${order.id}`,
    );

    return {
      message: 'Checkout session created successfully',
      checkoutUrl: session.url,
      sessionId: session.id,
      paymentId: payment.id,
    };
  }

  /**
   * 2. Customer: Confirm payment when redirected from Stripe
   */
  async confirmPayment(userId: string, dto: ConfirmPaymentDto) {
    const session = await this.stripe.checkout.sessions.retrieve(dto.sessionId);

    if (!session) {
      throw new NotFoundException('Stripe checkout session not found');
    }

    if (session.payment_status !== 'paid') {
      throw new BadRequestException(
        `Payment has not been completed. Current payment status is '${session.payment_status}'.`,
      );
    }

    const orderId = session.client_reference_id || session.metadata?.orderId;
    if (!orderId) {
      throw new BadRequestException('Stripe session is missing valid order reference');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found`);
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Access denied: You do not own this order');
    }

    const finalTransactionId =
      (typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id) || session.id;

    const paidAmount = session.amount_total
      ? Number((session.amount_total / 100).toFixed(2))
      : Number(order.totalAmount);

    const paymentMethod =
      (session as any).payment_method_types?.[0]?.toUpperCase() || 'CARD';

    const result = await this.prisma.$transaction(async (tx) => {
      let targetPayment = order.payments.find(
        (p) =>
          p.transactionId === session.id ||
          p.id === session.metadata?.paymentId ||
          p.status === PaymentStatus.PENDING,
      );

      let settledPayment;
      if (targetPayment) {
        settledPayment = await tx.payment.update({
          where: { id: targetPayment.id },
          data: {
            status: PaymentStatus.COMPLETED,
            transactionId: finalTransactionId,
            paymentMethod,
            amount: paidAmount,
          },
        });
      } else {
        settledPayment = await tx.payment.create({
          data: {
            orderId: order.id,
            status: PaymentStatus.COMPLETED,
            transactionId: finalTransactionId,
            paymentMethod,
            amount: paidAmount,
          },
        });
      }

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status:
            order.status === OrderStatus.PENDING
              ? OrderStatus.CONFIRMED
              : order.status,
        },
      });

      return {
        payment: settledPayment,
        order: updatedOrder,
      };
    });

    this.logger.log(
      `Payment confirmed: ${result.payment.id} for order: ${order.id} with transaction: ${finalTransactionId}`,
    );

    return {
      message: 'Payment confirmed successfully',
      data: result,
    };
  }

  /**
   * 3. Customer: Get my payment history
   */
  async getMyPayments(userId: string, query: QueryPaymentDto) {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {
      order: {
        userId,
      },
      ...(query.status && { status: query.status }),
      ...(query.orderId && { orderId: query.orderId }),
      ...(query.search && {
        transactionId: { contains: query.search.trim(), mode: 'insensitive' },
      }),
    };

    const [total, payments] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              totalAmount: true,
              status: true,
              createdAt: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 4. Customer / Admin: Get single payment details
   */
  async getPaymentDetails(
    paymentId: string,
    currentUser: { id: string; role: UserRole },
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                  },
                },
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID '${paymentId}' not found`);
    }

    if (
      currentUser.role !== UserRole.ADMIN &&
      payment.order.userId !== currentUser.id
    ) {
      throw new ForbiddenException(
        'Access denied: You do not have permission to view this payment',
      );
    }

    return {
      data: payment,
    };
  }

  /**
   * 5. Admin: Get all payments across platform
   */
  async getAllPayments(query: QueryPaymentDto) {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.orderId) {
      where.orderId = query.orderId;
    }

    if (query.search && query.search.trim() !== '') {
      const search = query.search.trim();
      where.OR = [
        { transactionId: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
        { order: { user: { name: { contains: search, mode: 'insensitive' } } } },
        { order: { user: { email: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [total, payments] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        include: {
          order: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
