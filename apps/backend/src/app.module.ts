import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/environment.js';
import { AuthModule } from './auth/auth.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health/health.controller.js';
import { CustomerModule } from './customers/customer.module.js';
import { OrderModule } from './orders/order.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnvironment,
    }),
    AuthModule,
    DatabaseModule,
    CustomerModule,
    OrderModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
