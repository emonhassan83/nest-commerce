import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Prisma, OrderStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { CreateOrderDto, UpdateOrderStatusDto, QueryOrderDto } from './dtos/index.js';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Create a new order (from user's active cart or explicit items) in a database transaction
   */
  async createOrder(userId: string, dto: CreateOrderDto) {
    let itemsToProcess: Array<{ productId: string; quantity: number }> = [];
    let isFromCart = false;
    let userCartId: string | null = null;

    if (dto.items && dto.items.length > 0) {
      itemsToProcess = dto.items;
    } else {
      const cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: {
          items: true,
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException(
          'Your shopping cart is empty. Please add items to cart before placing an order.',
        );
      }

      itemsToProcess = cart.items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
      }));
      isFromCart = true;
      userCartId = cart.id;
    }

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
      }> = [];

      for (const item of itemsToProcess) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID '${item.productId}' not found`);
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Product '${product.name}' has insufficient stock. Requested: ${item.quantity}, Available: ${product.stock}`,
          );
        }

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        const price = Number(product.price);
        const subtotal = price * item.quantity;
        totalAmount += subtotal;

        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: price,
        });
      }

      const order = await tx.order.create({
        data: {
          userId,
          totalAmount: Number(totalAmount.toFixed(2)),
          status: OrderStatus.PENDING,
          items: {
            create: orderItemsData.map((data) => ({
              productId: data.productId,
              quantity: data.quantity,
              unitPrice: data.unitPrice,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  description: true,
                },
              },
            },
          },
        },
      });

      if (isFromCart && userCartId) {
        await tx.cartItem.deleteMany({
          where: { cartId: userCartId },
        });
      }

      return order;
    });

    this.logger.log(`Order placed successfully: ${createdOrder.id} by user: ${userId}`);

    return {
      message: 'Order placed successfully',
      data: createdOrder,
    };
  }

  /**
   * 2. Customer: Get my orders with pagination and status filtering
   */
  async getMyOrders(userId: string, query: QueryOrderDto) {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      userId,
      ...(query.status && { status: query.status }),
    };

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  description: true,
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
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 3. Get single order details (Enforces User Ownership or Admin access)
   */
  async getOrderDetails(
    orderId: string,
    currentUser: { id: string; role: UserRole },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                description: true,
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
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found`);
    }

    if (currentUser.role !== UserRole.ADMIN && order.userId !== currentUser.id) {
      throw new ForbiddenException('Access denied: You do not have permission to view this order');
    }

    return {
      data: order,
    };
  }

  /**
   * 4. Customer: Cancel own order (allowed if status is PENDING or CONFIRMED) and restore inventory
   */
  async cancelMyOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException(`Order with ID '${orderId}' not found`);
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot cancel order with current status '${order.status}'. Only PENDING or CONFIRMED orders can be cancelled.`,
      );
    }

    const cancelledOrder = await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
          },
        });
      }

      return tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
        },
      });
    });

    this.logger.log(`Order ${orderId} cancelled by user ${userId} and inventory restored`);

    return {
      message: 'Order cancelled successfully and stock restored',
      data: cancelledOrder,
    };
  }

  /**
   * 5. Admin: Get all orders with search, user filtering, and pagination
   */
  async getAllOrders(query: QueryOrderDto) {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.search && query.search.trim() !== '') {
      const search = query.search.trim();
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
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
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 6. Admin: Update order status (with auto stock restore if cancelled)
   */
  async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found`);
    }

    if (order.status === dto.status) {
      return {
        message: 'Order status unchanged',
        data: order,
      };
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // If moving to CANCELLED from non-cancelled status, restore stock
      if (dto.status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
            },
          });
        }
      }

      // If moving from CANCELLED to an active status, verify and decrement stock
      if (order.status === OrderStatus.CANCELLED && dto.status !== OrderStatus.CANCELLED) {
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product || product.stock < item.quantity) {
            throw new BadRequestException(
              `Cannot reactivate order: Product '${product?.name || item.productId}' has insufficient stock.`,
            );
          }

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { decrement: item.quantity },
            },
          });
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: {
          status: dto.status,
        },
      });
    });

    this.logger.log(`Order ${orderId} status updated to ${dto.status}`);

    return {
      message: 'Order status updated successfully',
      data: updatedOrder,
    };
  }

  /**
   * 7. Admin: Delete an order permanently
   */
  async removeAOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found`);
    }

    await this.prisma.order.delete({
      where: { id: orderId },
    });

    this.logger.log(`Order deleted: ${orderId}`);

    return {
      message: 'Order deleted successfully',
    };
  }
}
