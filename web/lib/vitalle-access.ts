import 'server-only';

import { redirect } from 'next/navigation';
import { getVitalleMe } from './vitalle-api';
import type { PrincipalContext } from './vitalle-types';

export async function requireVitalleSession(): Promise<PrincipalContext> {
  const result = await getVitalleMe();
  const principal = result.data;
  if (!principal.role || !principal.organization_id || !principal.unit_id) redirect('/');
  return principal;
}

export async function requireVitalleAdmin(): Promise<PrincipalContext> {
  const principal = await requireVitalleSession();
  if (!principal.admin_like) redirect('/dashboard');
  return principal;
}
