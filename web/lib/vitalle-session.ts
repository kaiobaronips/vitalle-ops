import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const vitalleDevSessionCookieName = 'vitalle_dev_session';

export type VitalleDevSession = {
  role: string;
  user_id: string;
  email: string;
  display_name: string;
  organization_id: string;
  unit_id: string;
  sector_id: string;
};

function sessionSecret() {
  return (
    process.env.VITALLE_SESSION_SECRET ||
    process.env.VITALLE_API_KEY ||
    process.env.VITALLE_ADMIN_PASSWORD ||
    process.env.DASHBOARD_PASSWORD ||
    ''
  );
}

export function serializeVitalleDevSession(session: VitalleDevSession): string {
  const secret = sessionSecret();
  if (!secret) throw new Error('VITALLE_SESSION_SECRET não configurado.');
  const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function parseSignedSession(raw: string): VitalleDevSession | null {
  const secret = sessionSecret();
  const [payload, signature, extra] = raw.split('.');
  if (!secret || !payload || !signature || extra) return null;
  const expected = createHmac('sha256', secret).update(payload).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as VitalleDevSession;
    if (!parsed || typeof parsed !== 'object' || !parsed.role || !parsed.organization_id || !parsed.unit_id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getVitalleDevSession(): Promise<VitalleDevSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(vitalleDevSessionCookieName)?.value;
  if (!raw) {
    return null;
  }

  return parseSignedSession(raw);
}

export async function getVitalleAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const cookieStore = await cookies();
  const bearerToken = cookieStore.get('vitalle_session')?.value;

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
    return headers;
  }

  const devSession = await getVitalleDevSession();
  if (devSession) {
    headers['X-Vitalle-Dev-Role'] = devSession.role;
    headers['X-Vitalle-Dev-User-Id'] = devSession.user_id;
    headers['X-Vitalle-Dev-Email'] = devSession.email;
    headers['X-Vitalle-Dev-Display-Name'] = devSession.display_name;
    headers['X-Vitalle-Dev-Organization-Id'] = devSession.organization_id;
    headers['X-Vitalle-Dev-Unit-Id'] = devSession.unit_id;
    headers['X-Vitalle-Dev-Sector-Id'] = devSession.sector_id;
  }

  return headers;
}
