import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthGuard } from './auth.guard.js';
import type { AuthenticatedUser } from './authenticated-user.js';
import { AuthService } from './auth.service.js';
import { IS_PUBLIC_KEY } from './auth.constants.js';

interface TestRequest extends Request {
  user?: AuthenticatedUser;
}

function createContext(
  request: TestRequest,
  handler: object = () => undefined,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => class TestController {},
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  const reflector = new Reflector();
  const principal: AuthenticatedUser = {
    id: 'owner-id',
    sessionId: 'session-id',
    assuranceLevel: 'aal2',
  };
  const auth = {
    authenticate: vi.fn().mockResolvedValue(principal),
  } as unknown as AuthService;
  const guard = new AuthGuard(reflector, auth);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects requests without a bearer token', async () => {
    const request = { headers: {} } as TestRequest;

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(auth.authenticate).not.toHaveBeenCalled();
  });

  it('attaches the verified user to authenticated requests', async () => {
    const request = {
      headers: { authorization: 'Bearer access-token' },
    } as TestRequest;

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(auth.authenticate).toHaveBeenCalledWith('access-token');
    expect(request.user).toEqual(principal);
  });

  it('allows explicitly public routes without authentication', async () => {
    const handler = () => undefined;
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);

    await expect(
      guard.canActivate(createContext({ headers: {} } as TestRequest, handler)),
    ).resolves.toBe(true);
    expect(auth.authenticate).not.toHaveBeenCalled();
  });
});
