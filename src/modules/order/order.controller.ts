import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { OrderService } from './order.service.js';
import { CreateOrderDto, UpdateOrderStatusDto, QueryOrderDto } from './dtos/index.js';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/index.js';
import { CurrentUser, Roles } from '../../common/decorators/index.js';

@ApiTags('Order')
@ApiSecurity('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  /**
   * 1. Customer: Place an order from active cart or explicit items
   * POST /api/v1/order
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Place a new order (checkout from cart or direct items)' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed or cart is empty / insufficient stock' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async createOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(userId, dto);
  }

  /**
   * 2. Customer: Get my orders
   * GET /api/v1/order/my-orders
   */
  @Get('my-orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current customer order history with pagination and status filter' })
  @ApiResponse({ status: 200, description: 'User orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyOrders(
    @CurrentUser('id') userId: string,
    @Query() query: QueryOrderDto,
  ) {
    return this.orderService.getMyOrders(userId, query);
  }

  /**
   * 3. Admin: Get all orders across platform
   * GET /api/v1/order/admin/all
   */
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Get all orders across platform with filters and pagination' })
  @ApiResponse({ status: 200, description: 'All orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  async getAllOrders(@Query() query: QueryOrderDto) {
    return this.orderService.getAllOrders(query);
  }

  /**
   * 4. Customer / Admin: Get single order details
   * GET /api/v1/order/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get order details by ID (Owner or Admin)' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order details retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Not your order' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderDetails(
    @Param('id', ParseUUIDPipe) orderId: string,
    @CurrentUser() currentUser: { id: string; role: UserRole },
  ) {
    return this.orderService.getOrderDetails(orderId, currentUser);
  }

  /**
   * 5. Customer: Cancel own order
   * PATCH /api/v1/order/:id/cancel
   */
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer: Cancel pending order and restore stock' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully and stock restored' })
  @ApiResponse({ status: 400, description: 'Cannot cancel order in current state' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelMyOrder(
    @Param('id', ParseUUIDPipe) orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.orderService.cancelMyOrder(orderId, userId);
  }

  /**
   * 6. Admin: Update order status
   * PATCH /api/v1/order/:id/status
   */
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Update order status (CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED)' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateOrderStatus(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateOrderStatus(orderId, dto);
  }

  /**
   * 7. Admin: Delete an order permanently
   * DELETE /api/v1/order/:id
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Delete an order permanently' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async removeAOrder(@Param('id', ParseUUIDPipe) orderId: string) {
    return this.orderService.removeAOrder(orderId);
  }
}
