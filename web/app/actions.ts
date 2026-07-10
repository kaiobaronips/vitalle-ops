'use server';

import { redirect } from 'next/navigation';
import { authErrorMessage, requireSupabaseAuthConfig, setSessionCookie, type SupabaseTokenPayload } from '@/lib/supabase-auth';

export type ActionState = {
  ok: boolean;
  message: string;
};

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

export async function loginAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const email = text(formData, 'email');
  const password = text(formData, 'password');
  if (!email || !password) {
    return { ok: false, message: 'Informe e-mail e senha.' };
  }

  const authConfig = requireSupabaseAuthConfig();
  if (!authConfig.ok) {
    return { ok: false, message: authConfig.message };
  }

  let response: globalThis.Response;
  try {
    response = await fetch(`${authConfig.config.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: authConfig.config.anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Falha ao conectar no Supabase Auth.' };
  }

  const payload = (await response.json().catch(() => ({}))) as SupabaseTokenPayload;
  if (!response.ok || !payload.access_token) {
    return { ok: false, message: authErrorMessage(payload) };
  }

  const stored = await setSessionCookie(payload);
  if (!stored) {
    return { ok: false, message: 'Não foi possível gravar a sessão.' };
  }

  redirect('/dashboard');
}
