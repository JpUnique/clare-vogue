import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { ApiExceptionFilter } from './common/http/api-exception.filter.js';
import { requestIdMiddleware } from './common/http/request-id.middleware.js';
import { parseCorsOrigins } from './config/environment.js';

export function configureApp(
  app: INestApplication,
  config: ConfigService,
): void {
  const environment = config.getOrThrow<string>('NODE_ENV');

  app.useLogger(new ConsoleLogger({ json: true }));
  app.use(requestIdMiddleware);
  app.use(helmet());
  app.enableCors({
    origin: parseCorsOrigins(config.getOrThrow<string>('CORS_ORIGINS')),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  if (environment !== 'production') {
    const openApiConfig = new DocumentBuilder()
      .setTitle('Clare Vogue API')
      .setDescription('Private business workflow API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, openApiConfig);
    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: 'api/docs-json',
    });
  }
}
