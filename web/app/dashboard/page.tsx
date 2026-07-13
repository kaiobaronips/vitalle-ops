import { OpsShell } from '@/components/vitalle/OpsShell';
import { getVitalleMe } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const meResult = await getVitalleMe();
  const me = meResult.data;

  if (!me.admin_like) {
    return (
      <OpsShell principal={me} title="OPS" subtitle="Seleção de setor">
        <section className="flex min-h-[calc(100vh-13rem)] items-center justify-center">
          <article className="max-w-md rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-8 py-10 text-center">
            <p className="display text-2xl leading-snug text-[var(--noir)]">
              Selecione qual o seu setor para iniciar o dia, tenha um ótimo dia!
            </p>
            <div className="gold-rule mx-auto mt-6 w-24" />
          </article>
        </section>
      </OpsShell>
    );
  }

  return (
    <OpsShell principal={me} title="Visão geral" subtitle="Tela em construção.">
      <section className="min-h-[calc(100vh-13rem)]" />
    </OpsShell>
  );
}
