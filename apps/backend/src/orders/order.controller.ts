import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { CreateOrderDto, ListOrdersDto } from './order.dto.js';
import { OrderService } from './order.service.js';

@ApiTags('orders')
@ApiBearerAuth()
@Controller()
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Post('orders')
  @ApiOperation({ summary: 'Create an order and its independent garments' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateOrderDto,
  ) {
    return this.orders.create(user, input);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List orders with derived garment summaries' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListOrdersDto) {
    return this.orders.list(user, query);
  }

  @Get('orders/:orderId')
  @ApiOperation({
    summary: 'Get an order with all independently tracked garments',
  })
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
  ) {
    return this.orders.getById(user, orderId);
  }

  @Get('orders/:orderId/garments')
  @ApiOperation({ summary: 'List garments belonging to an order' })
  listGarments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
  ) {
    return this.orders.listGarments(user, orderId);
  }
}
