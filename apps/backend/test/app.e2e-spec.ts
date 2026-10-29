import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/configure-app.js';

describe('Backend API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();
  });

  it('serves the liveness endpoint with a request ID', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health/live')
      .expect(200)
      .expect('x-request-id', /^[A-Za-z0-9._-]{1,128}$/)
      .expect({ status: 'ok' });
  });

  it('reports the API as not ready when the database is not configured', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(503)
      .expect((response) => {
        expect(response.body).toMatchObject({
          statusCode: 503,
          error: 'Service Unavailable',
          message: 'Database is not configured.',
        });
      });
  });

  it('requires authentication on customer routes', () => {
    return request(app.getHttpServer())
      .get('/api/v1/customers')
      .expect(401)
      .expect((response) => {
        expect(response.body).toMatchObject({
          statusCode: 401,
          message: 'A bearer access token is required.',
        });
      });
  });

  it('requires authentication on order and garment routes', () => {
    return request(app.getHttpServer())
      .get('/api/v1/orders')
      .expect(401)
      .expect((response) => {
        expect(response.body).toMatchObject({
          statusCode: 401,
          message: 'A bearer access token is required.',
        });
      });
  });

  it('requires authentication on payment and delivery routes', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/orders/7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5/payments')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/garments/7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5/deliveries')
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/garments/7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5/price')
      .send({ agreedPrice: '10.00', reason: 'Confirmed' })
      .expect(401);
    await request(app.getHttpServer())
      .post(
        '/api/v1/garments/7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5/cancellation-settlement',
      )
      .send({
        amountToRefund: '10.00',
        amountRetained: '0.00',
        reason: 'Cancellation',
        customerAgreement: 'Agreed',
      })
      .expect(401);
    await request(app.getHttpServer())
      .post(
        '/api/v1/orders/7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5/payments/7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5/allocations/7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5/reverse',
      )
      .send({ reason: 'Corrected entry' })
      .expect(401);
    await request(app.getHttpServer())
      .post(
        '/api/v1/orders/7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5/payments/7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5/void',
      )
      .send({ reason: 'Duplicate receipt' })
      .expect(401);
  });

  it('returns a consistent error response with a request ID', () => {
    return request(app.getHttpServer())
      .get('/api/v1/does-not-exist')
      .expect(404)
      .expect((response) => {
        expect(response.body).toMatchObject({
          statusCode: 404,
          error: 'Not Found',
          path: '/api/v1/does-not-exist',
        });
        expect(response.body.requestId).toBe(response.headers['x-request-id']);
        expect(response.body.timestamp).toEqual(expect.any(String));
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
