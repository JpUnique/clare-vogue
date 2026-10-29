import { UnauthorizedException } from '@nestjs/common';
import { verifySupabaseIdentity } from './authenticated-user.js';

const claims = {
  sub: 'owner-id',
  iss: 'https://project.supabase.co/auth/v1',
  aud: 'authenticated',
  role: 'authenticated',
  aal: 'aal2',
  amr: [{ method: 'totp' }],
  session_id: 'session-id',
};
const user = {
  id: 'owner-id',
  email_confirmed_at: '2026-01-01T00:00:00Z',
};

describe('verifySupabaseIdentity', () => {
  it('accepts a verified owner identity with AAL2', () => {
    expect(
      verifySupabaseIdentity(
        claims,
        user,
        'https://project.supabase.co/auth/v1',
      ),
    ).toEqual({
      id: 'owner-id',
      sessionId: 'session-id',
      assuranceLevel: 'aal2',
    });
  });

  it.each([
    ['wrong issuer', { ...claims, iss: 'https://attacker.example/auth/v1' }],
    ['wrong audience', { ...claims, aud: 'other' }],
    ['wrong role', { ...claims, role: 'service_role' }],
    ['insufficient MFA assurance', { ...claims, aal: 'aal1' }],
    ['non-authenticator MFA', { ...claims, amr: [{ method: 'phone' }] }],
    ['anonymous token', { ...claims, is_anonymous: true }],
    ['missing session ID', { ...claims, session_id: undefined }],
    ['different user', { ...claims, sub: 'different-id' }],
  ])('rejects %s', (_case, invalidClaims) => {
    expect(() =>
      verifySupabaseIdentity(
        invalidClaims,
        user,
        'https://project.supabase.co/auth/v1',
      ),
    ).toThrow(UnauthorizedException);
  });

  it('rejects unconfirmed identities and anonymous users', () => {
    expect(() =>
      verifySupabaseIdentity(
        claims,
        { id: 'owner-id' },
        'https://project.supabase.co/auth/v1',
      ),
    ).toThrow(UnauthorizedException);

    expect(() =>
      verifySupabaseIdentity(
        claims,
        { ...user, is_anonymous: true },
        'https://project.supabase.co/auth/v1',
      ),
    ).toThrow(UnauthorizedException);
  });
});
