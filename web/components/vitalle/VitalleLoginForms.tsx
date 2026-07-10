'use client';

import { useActionState } from 'react';
import { loginAction as supabaseLoginAction } from '@/app/actions';
import { devLoginAction } from '@/app/vitalle-actions';
import type { ActionState } from '@/app/vitalle-actions';

const initialState: ActionState = { ok: false, message: '' };

function SubmitButton({ label }: { label: string }) {
  return (
    <button type="submit" className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
      {label}
    </button>
  );
}

export function VitalleLoginForms({ showSupabase = true }: { showSupabase?: boolean }) {
  const [supabaseState, supabaseAction] = useActionState(supabaseLoginAction, initialState);
  const [devState, devAction] = useActionState(devLoginAction, initialState);

  return (
    <div className="grid gap-4">
      {showSupabase ? (
        <form action={supabaseAction} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Acesso real</div>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">Entrar com Supabase</h2>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              E-mail
              <input name="email" type="email" required className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-0 focus:border-slate-500" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Senha
              <input name="password" type="password" required className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-0 focus:border-slate-500" />
            </label>
            <SubmitButton label="Entrar" />
          </div>
          {supabaseState.message ? <p className={`mt-3 text-sm ${supabaseState.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{supabaseState.message}</p> : null}
        </form>
      ) : null}

      <form action={devAction} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Desenvolvimento</div>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">Entrar por persona local</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Usado para testar o fluxo sem depender de uma conta Supabase configurada.</p>
        <div className="mt-4 grid gap-2">
          <button name="persona" value="admin" className="rounded-lg border border-slate-300 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50">Administrador</button>
          <button name="persona" value="gestor" className="rounded-lg border border-slate-300 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50">Gestor</button>
          <button name="persona" value="avaliador" className="rounded-lg border border-slate-300 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50">Avaliador</button>
          <button name="persona" value="asb" className="rounded-lg border border-slate-300 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50">ASB</button>
          <button name="persona" value="secretaria" className="rounded-lg border border-slate-300 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50">Secretaria</button>
          <button name="persona" value="marketing" className="rounded-lg border border-slate-300 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50">Marketing</button>
        </div>
        {devState.message ? <p className={`mt-3 text-sm ${devState.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{devState.message}</p> : null}
      </form>
    </div>
  );
}

