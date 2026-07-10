import { redirect } from 'next/navigation';
import { VitalleLoginForms } from '@/components/vitalle/VitalleLoginForms';
import { getSessionToken } from '@/lib/session';
import { getVitalleDevSession } from '@/lib/vitalle-session';
import { requireSupabaseAuthConfig } from '@/lib/supabase-auth';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const token = await getSessionToken();
  const devSession = await getVitalleDevSession();
  if (token || devSession) {
    redirect('/dashboard');
  }

  const supabaseConfig = requireSupabaseAuthConfig();

  return (
    <main className="min-h-screen bg-[var(--surface)] px-4 py-8 text-[var(--ink)]">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_420px]">
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Vitalle Odontologia & Harmonização</p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 lg:text-7xl">Vitalle Ops</h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            Um sistema operacional para rotina clínica, tarefa diária, auditoria e conformidade operacional.
          </p>
          <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              Painel do meu dia, operação do gestor, alertas e histórico numa única interface.
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              Fluxo por template, instância diária e eventos de auditoria para preservar rastreabilidade.
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Acesso</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Entrar no sistema</h2>
          {!supabaseConfig.ok ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              Supabase Auth não está configurado. O acesso de desenvolvimento continua disponível.
            </p>
          ) : null}
          <div className="mt-5">
            <VitalleLoginForms showSupabase={supabaseConfig.ok} />
          </div>
        </div>
      </section>
    </main>
  );
}

