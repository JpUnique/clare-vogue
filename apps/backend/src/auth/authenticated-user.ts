import { UnauthorizedException } from '@nestjs/common';

export interface AuthenticatedUser {
  id: string;
  sessionId: string;
  assuranceLevel: 'aal2';
}

interface SupabaseIdentityClaims {
  sub?: unknown;
  iss?: unknown;
  aud?: unknown;
  role?: unknown;
  aal?: unknown;
  amr?: unknown;
  session_id?: unknown;
  is_anonymous?: unknown;
}

interface SupabaseIdentityUser {
  id: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  is_anonymous?: boolean;
}

export function verifySupabaseIdentity(
  claims: SupabaseIdentityClaims,
  user: SupabaseIdentityUser,
  expectedIssuer: string,
): AuthenticatedUser {
  const audience = claims.aud;
  const hasAuthenticatedAudience =
    audience === 'authenticated' ||
    (Array.isArray(audience) && audience.includes('authenticated'));
  const usedAuthenticatorApp =
    Array.isArray(claims.amr) &&
    claims.amr.some(
      (method) =>
        typeof method === 'object' &&
        method !== null &&
        'method' in method &&
        method.method === 'totp',
    );

  if (
    claims.iss !== expectedIssuer ||
    !hasAuthenticatedAudience ||
    claims.role !== 'authenticated' ||
    claims.aal !== 'aal2' ||
    !usedAuthenticatorApp ||
    claims.is_anonymous === true ||
    user.is_anonymous === true ||
    typeof claims.sub !== 'string' ||
    claims.sub !== user.id ||
    typeof claims.session_id !== 'string' ||
    claims.session_id.length === 0 ||
    (!user.email_confirmed_at && !user.phone_confirmed_at)
  ) {
    throw new UnauthorizedException('A verified AAL2 session is required.');
  }

  return {
    id: user.id,
    sessionId: claims.session_id,
    assuranceLevel: 'aal2',
  };
}
