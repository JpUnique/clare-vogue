import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import {
  AllocatePaymentDto,
  FinancialCorrectionDto,
  RecordPaymentDto,
} from './order.dto.js';
import { OrderService } from './order.service.js';

@ApiTags('orders')
@ApiBearerAuth()
@Controller()
export class PaymentController {
  constructor(private readonly orders: OrderService) {}

  @Post('orders/:orderId/payments')
  @ApiOperation({
    summary: 'Record a payment and allocate any amount to order garments',
  })
  recordPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Body() input: RecordPaymentDto,
  ) {
    return this.orders.recordPayment(user, orderId, input);
  }

  @Get('orders/:orderId/payments')
  @ApiOperation({ summary: 'List payments and their garment allocations' })
  listPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
  ) {
    return this.orders.listPayments(user, orderId);
  }

  @Post('orders/:orderId/payments/:paymentId/allocations')
  @ApiOperation({
    summary: 'Allocate an unallocated payment amount to order garments',
  })
  allocatePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
    @Body() input: AllocatePaymentDto,
  ) {
    return this.orders.allocatePayment(user, orderId, paymentId, input);
  }

  @Post('orders/:orderId/payments/:paymentId/allocations/:allocationId/reverse')
  @ApiOperation({
    summary: 'Reverse a mistaken payment allocation with an audit reason',
  })
  reversePaymentAllocation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
    @Param('allocationId', new ParseUUIDPipe()) allocationId: string,
    @Body() input: FinancialCorrectionDto,
  ) {
    return this.orders.reversePaymentAllocation(
      user,
      orderId,
      paymentId,
      allocationId,
      input,
    );
  }

  @Post('orders/:orderId/payments/:paymentId/void')
  @ApiOperation({
    summary: 'Void a mistaken payment after reversing all allocations',
  })
  voidPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
    @Body() input: FinancialCorrectionDto,
  ) {
    return this.orders.voidPayment(user, orderId, paymentId, input);
  }
}
