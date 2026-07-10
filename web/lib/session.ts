import { cookies } from 'next/headers';

export const sessionCookieName = 'vitalle_session';
export const refreshCookieName = 'vitalle_refresh';
export const oauthVerifierCookieName = 'vitalle_oauth_verifier';

export async function getSessionToken(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get(sessionCookieName)?.value ?? '';
}
