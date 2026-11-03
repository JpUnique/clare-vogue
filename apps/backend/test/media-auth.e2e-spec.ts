import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { AuthService } from '../src/auth/auth.service.js';
import type { AuthenticatedUser } from '../src/auth/authenticated-user.js';
import { configureApp } from '../src/configure-app.js';
import { AppModule } from '../src/app.module.js';
import { MediaService } from '../src/media/media.service.js';

describe('Private media authentication (e2e)', () => {
  const user: AuthenticatedUser = {
    id: '7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5',
    sessionId: 'authenticated-media-session',
    assuranceLevel: 'aal2',
  };
  const mediaService = {
    listGarmentMedia: vi.fn().mockResolvedValue([
      {
        id: '4b064d32-c38e-4e95-8197-9e90deaa5f1a',
        status: 'available',
      },
    ]),
  };
  const authService = {
    authenticate: vi.fn(async (token: string) => {
      if (token !== 'valid-aal2-token') {
        throw new UnauthorizedException('The access token is invalid.');
      }
      return user;
    }),
  };
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(authService)
      .overrideProvider(MediaService)
      .useValue(mediaService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an invalid bearer token before calling the media service', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/garments/7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5/media')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(mediaService.listGarmentMedia).not.toHaveBeenCalled();
  });

  it('passes the authenticated AAL2 user to the protected media route', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/garments/7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5/media')
      .set('Authorization', 'Bearer valid-aal2-token')
      .expect(200)
      .expect([
        {
          id: '4b064d32-c38e-4e95-8197-9e90deaa5f1a',
          status: 'available',
        },
      ]);

    expect(mediaService.listGarmentMedia).toHaveBeenCalledWith(
      user,
      '7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5',
    );
  });

  afterAll(async () => {
    await app.close();
  });
});
