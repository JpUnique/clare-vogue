import { Module } from '@nestjs/common';
import { GarmentController } from './garment.controller.js';
import { OrderController } from './order.controller.js';
import { OrderService } from './order.service.js';
import { PaymentController } from './payment.controller.js';

@Module({
  controllers: [OrderController, GarmentController, PaymentController],
  providers: [OrderService],
})
export class OrderModule {}
