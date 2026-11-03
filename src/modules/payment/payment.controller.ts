import {
  Controller,
  Get,
  Post,
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
import { PaymentService } from './payment.service.js';
import { CreateCheckoutDto, ConfirmPaymentDto, QueryPaymentDto } from './dtos/index.js';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/index.js';
import { CurrentUser, Roles } from '../../common/decorators/index.js';

@ApiTags('Payment')
@ApiSecurity('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * 1. Customer: Create Stripe Checkout Session
   * POST /api/v1/payment/checkout
   */
  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create Stripe Checkout Session and get hosted payment URL' })
  @ApiResponse({ status: 201, description: 'Checkout session created successfully' })
  @ApiResponse({ status: 400, description: 'Order already paid or cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Not your order' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async createCheckoutSession(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.paymentService.createCheckoutSession(userId, dto);
  }

  /**
   * 2. Customer: Confirm payment callback when redirected from Stripe
   * POST /api/v1/payment/confirm
   */
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm Stripe payment via Session ID and settle order' })
  @ApiResponse({ status: 200, description: 'Payment confirmed and order marked CONFIRMED' })
  @ApiResponse({ status: 400, description: 'Payment not completed or session invalid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Not your order' })
  @ApiResponse({ status: 404, description: 'Order or session not found' })
  async confirmPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.paymentService.confirmPayment(userId, dto);
  }

  /**
   * 3. Customer: Get my payment history
   * GET /api/v1/payment/my-payments
   */
  @Get('my-payments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current customer payment transaction history' })
  @ApiResponse({ status: 200, description: 'Customer payments retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyPayments(
    @CurrentUser('id') userId: string,
    @Query() query: QueryPaymentDto,
  ) {
    return this.paymentService.getMyPayments(userId, query);
  }

  /**
   * 4. Admin: Get all payments across platform
   * GET /api/v1/payment/admin/all
   */
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Get all payments and revenue transactions across platform' })
  @ApiResponse({ status: 200, description: 'All payments retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  async getAllPayments(@Query() query: QueryPaymentDto) {
    return this.paymentService.getAllPayments(query);
  }

  /**
   * 5. Customer / Admin: Get single payment details
   * GET /api/v1/payment/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get payment details by ID (Owner or Admin)' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({ status: 200, description: 'Payment details retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Not your payment' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentDetails(
    @Param('id', ParseUUIDPipe) paymentId: string,
    @CurrentUser() currentUser: { id: string; role: UserRole },
  ) {
    return this.paymentService.getPaymentDetails(paymentId, currentUser);
  }
}
