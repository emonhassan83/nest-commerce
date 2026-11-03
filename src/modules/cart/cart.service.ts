import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { AddToCartDto, UpdateCartItemDto } from './dtos/index.js';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper: Retrieve or create a cart for the user (Lazy Initialization)
   */
  async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
      this.logger.log(`Created new cart for user: ${userId} (${cart.id})`);
    }

    return cart;
  }

  /**
   * 1. Get current authenticated user's cart with calculated totals
   */
  async getMyCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    const fullCart = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const items = fullCart?.items ?? [];

    let totalQuantity = 0;
    let grandTotal = 0;

    const formattedItems = items.map((item) => {
      const price = Number(item.product.price);
      const subtotal = Number((price * item.quantity).toFixed(2));
      totalQuantity += item.quantity;
      grandTotal += subtotal;

      const isStockAvailable = item.product.stock >= item.quantity;

      return {
        id: item.id,
        productId: item.productId,
        name: item.product.name,
        description: item.product.description,
        price,
        category: item.product.category,
        quantity: item.quantity,
        subtotal,
        availableStock: item.product.stock,
        isStockAvailable,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    return {
      data: {
        id: cart.id,
        userId: cart.userId,
        items: formattedItems,
        totalItems: formattedItems.length,
        totalQuantity,
        grandTotal: Number(grandTotal.toFixed(2)),
        updatedAt: fullCart?.updatedAt ?? cart.updatedAt,
      },
    };
  }

  /**
   * 2. Add product to cart with stock validation
   */
  async addToCart(userId: string, dto: AddToCartDto) {
    const quantity = dto.quantity && dto.quantity > 0 ? dto.quantity : 1;

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${dto.productId}' not found`);
    }

    if (product.stock <= 0) {
      throw new BadRequestException(`Product '${product.name}' is out of stock`);
    }

    if (quantity > product.stock) {
      throw new BadRequestException(
        `Requested quantity (${quantity}) exceeds available stock (${product.stock})`,
      );
    }

    const cart = await this.getOrCreateCart(userId);

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock) {
        throw new BadRequestException(
          `Cannot add ${quantity} more. Total quantity (${newQuantity}) exceeds available stock (${product.stock})`,
        );
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });

      this.logger.log(
        `Updated quantity for item ${existingItem.id} in cart ${cart.id} to ${newQuantity}`,
      );
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          quantity,
        },
      });

      this.logger.log(`Added product ${dto.productId} to cart ${cart.id}`);
    }

    const cartSummary = await this.getMyCart(userId);

    return {
      message: 'Item added to cart successfully',
      ...cartSummary,
    };
  }

  /**
   * 3. Update cart item quantity
   */
  async updateCartItem(userId: string, cartItemId: string, dto: UpdateCartItemDto) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true,
        product: true,
      },
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      throw new NotFoundException(`Cart item with ID '${cartItemId}' not found`);
    }

    if (dto.quantity > cartItem.product.stock) {
      throw new BadRequestException(
        `Requested quantity (${dto.quantity}) exceeds available stock (${cartItem.product.stock})`,
      );
    }

    await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: dto.quantity },
    });

    this.logger.log(`Cart item ${cartItemId} quantity updated to ${dto.quantity}`);

    const cartSummary = await this.getMyCart(userId);

    return {
      message: 'Cart item updated successfully',
      ...cartSummary,
    };
  }

  /**
   * 4. Remove item from cart
   */
  async removeCartItem(userId: string, cartItemId: string) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true,
      },
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      throw new NotFoundException(`Cart item with ID '${cartItemId}' not found`);
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    this.logger.log(`Cart item ${cartItemId} removed from cart ${cartItem.cartId}`);

    const cartSummary = await this.getMyCart(userId);

    return {
      message: 'Item removed from cart successfully',
      ...cartSummary,
    };
  }

  /**
   * 5. Clear all items from user's cart
   */
  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (cart) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
      this.logger.log(`Cleared all items from cart ${cart.id}`);
    }

    return {
      message: 'Cart cleared successfully',
      data: {
        items: [],
        totalItems: 0,
        totalQuantity: 0,
        grandTotal: 0,
      },
    };
  }
}
