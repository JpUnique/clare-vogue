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
  AdjustGarmentPriceDto,
  BlockGarmentDto,
  CancelGarmentDto,
  CancellationSettlementDto,
  ConfirmGarmentPriceDto,
  RecordCancellationRefundDto,
  RecordDeliveryDto,
  RecordFittingDto,
  RecordProgressDto,
  ReverseDeliveryDto,
} from './order.dto.js';
import { OrderService } from './order.service.js';

@ApiTags('orders')
@ApiBearerAuth()
@Controller()
export class GarmentController {
  constructor(private readonly orders: OrderService) {}

  @Get('garments/:garmentId')
  @ApiOperation({ summary: 'Get the current state of a garment' })
  getGarment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('garmentId', new ParseUUIDPipe()) garmentId: string,
  ) {
    return this.orders.getGarment(user, garmentId);
  }

  @Post('garments/:garmentId/price')
  @ApiOperation({
    summary: 'Confirm and audit the agreed price for an unpriced garment',
  })
  confirmGarmentPrice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('garmentId', new ParseUUIDPipe()) garmentId: string,
    @Body() input: ConfirmGarmentPriceDto,
  ) {
    return this.orders.confirmGarmentPrice(user, garmentId, input);
  }

  @Get('garments/:garmentId/price-history')
  @ApiOperation({ summary: 'List the audit history of garment price setting' })
  listGarmentPriceEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('garmentId', new ParseUUIDPipe()) garmentId: string,
  ) {
    return this.orders.listGarmentPriceEvents(user, garmentId);
  }

  @Post('garments/:garmentId/price-adjustments')
  @ApiOperation({
    summary: 'Adjust a confirmed garment price with an audited reason',
  })
  adjustGarmentPrice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('garmentId', new ParseUUIDPipe()) garmentId: string,
    @Body() input: AdjustGarmentPriceDto,
  ) {
    return this.orders.adjustGarmentPrice(user, garmentId, input);
  }

  @Post('garments/:garmentId/cancellation-settlement')
  @ApiOperation({
    summary:
      'Record an agreed refund and retained amount for a cancelled garment',
  })
  createCancellationSettlement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('garmentId', new ParseUUIDPipe()) garmentId: string,
    @Body() input: CancellationSettlementDto,
  ) {
    return this.orders.createCancellationSettlement(user, garmentId, input);
  }

  @Get('garments/:garmentId/cancellation-settlement')
  @ApiOperation({
    summary: 'Get cancellation settlement and actual refund history',
  })
  getCancellationSettlement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('garmentId', new ParseUUIDPipe()) garmentId: string,
  ) {
    return this.orders.getCancellationSettlement(user, garmentId);
  }

  @Post('garments/:garmentId/cancellation-settlement/:settlementId/refunds')
  @ApiOperation({
    summary: 'Record an actual refund against the agreed settlement',
  })
  recordCancellationRefund(
    @CurrentUser() user: AuthenticatedUser,
    @Param('garmentId', new ParseUUIDPipe()) garmentId: string,
    @Param('settlementId', new ParseUUIDPipe()) settlementId: string,
    @Body() input: RecordCancellationRefundDto,
  ) {
    return this.orders.recordCancellationRefund(
      user,
      garmentId,
      settlementId,
      input,
    );
  }

  @Get('garments/:garmentId/progress')
  @ApiOperation({ summary: 'List append-only progress history for a garment' })
  listProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('garmentId', new ParseUUIDPipe()) garmentId: string,
  ) {
    return this.orders.listProgress(user, garmentId);
  }

  @Post('garments/:garmentId/progress')
  @ApiOperation({
    summary: 'Advance, repeat, or record rework on a garment stage',
  })
  recordProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('garmentId', new ParseUUIDPipe()) garmentId: string,
    @Body() input: RecordProgressDto,
  ) {
    return this.orders.recordProgress(user, garmentId, input);
  }

  @Post('garments/:garmentId/block')
  @ApiOperation({ summary: 'Block a garment without changing its stage' })
  block(
    @CurrentUser() user: AuthenticatedUser,
    @Param('garmentId', new ParseUUIDPipe()) garmentId: string,
    @Body() input: BlockGarmentDto,
  ) {
    return this.orders.block(user, garmentId, input);
  }

  @Post('garments/:garmentId/resume')
  @ApiOperation({
    summary: 'Clear a blocker and resume the existing garment stage',
  })
  resume(
    @CurrentUser() user: AuthenticatedUser,
    @Param('garmentId', new ParseUUIDPipe()) garmentId: string,
  ) {
    return this.orders.resume(user, garmentId);
  }

  @Post('garments/:garmentId/cancel')
  @ApiOperation({
    summary: 'Cancel one garment without changing sibling garments',
  })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('garmentId', new ParseUUIDPipe()) garmentId: string,
    @Body() input: CancelGarmentDto,
  ) {
    return this.orders.cancel(user, garmentId, input);
  }

  @Post('garments/:garmentId/fittings')
  @ApiOperation({ summary: 'Record a customer fitting and its outcome' })
  recordFitting(
    @CurrentUser() user: AuthenticatedUser,
    @Param('garmentId', new ParseUUIDPipe()) garmentId: string,
    @Body() input: RecordFittingDto,
  ) {
    return this.orders.recordFitting(user, garmentId, input);
  }

  @Get('garments/:garmentId/fittings')
  @ApiOperation({ summary: 'List the dated fitting history for a garment' })
  listFittings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('garmentId', new ParseUUIDPipe()) garmentId: string,
  ) {
    return this.orders.listFittings(user, garmentId);
  }

  @Get('garments/:garmentId/deliveries')
  @ApiOperation({ summary: 'List delivery and correction history' })
  listDeliveries(
    @CurrentUser() user: AuthenticatedUser,
    @Param('garmentId', new ParseUUIDPipe()) garmentId: string,
  ) {
    return this.orders.listDeliveries(user, garmentId);
  }

  @Post('garments/:garmentId/deliveries')
  @ApiOperation({
    summary: 'Record handover after payment review and delivery arrangement',
  })
  recordDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Param('garmentId', new ParseUUIDPipe()) garmentId: string,
    @Body() input: RecordDeliveryDto,
  ) {
    return this.orders.recordDelivery(user, garmentId, input);
  }

  @Post('garments/:garmentId/deliveries/:deliveryEventId/reverse')
  @ApiOperation({
    summary: 'Correct a mistaken delivery while retaining its history',
  })
  reverseDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Param('garmentId', new ParseUUIDPipe()) garmentId: string,
    @Param('deliveryEventId', new ParseUUIDPipe()) deliveryEventId: string,
    @Body() input: ReverseDeliveryDto,
  ) {
    return this.orders.reverseDelivery(user, garmentId, deliveryEventId, input);
  }
}
