'use client';

import { useActionState } from 'react';
import { adminLoginAction } from '@/app/vitalle-actions';

type ActionState = {
  ok: boolean;
  message: string;
};

const initialState: ActionState = { ok: false, message: '' };

export function VitalleLoginForm() {
  const [state, formAction, isPending] = useActionState(adminLoginAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-3 text-left">
        <span className="auth-label text-[var(--bone-60)]">Senha de acesso</span>
        <input
          name="password"
          type="password"
          autoFocus
          required
          placeholder="••••••••"
          className="auth-input"
        />
      </label>

      {state.message ? (
        <p className={`text-sm ${state.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{state.message}</p>
      ) : null}

      <button type="submit" disabled={isPending} className="auth-button">
        {isPending ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
