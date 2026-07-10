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

export async function getVitalleDevSession(): Promise<VitalleDevSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(vitalleDevSessionCookieName)?.value;
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as VitalleDevSession;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
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
