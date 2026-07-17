import { OpsShell } from '@/components/vitalle/OpsShell';
import { AlertCard, StatusPill } from '@/components/vitalle/VitalleCards';
import { resolveAlertAction } from '@/app/vitalle-actions';
import { requireVitalleAdmin } from '@/lib/vitalle-access';
import { getVitalleAlerts } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

function ResolveButton({ id }: { id: string }) {
  return (
    <form action={resolveAlertAction as unknown as (formData: FormData) => void}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
        Resolver
      </button>
    </form>
  );
}

export default async function AlertasPage({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  const params = (await searchParams) ?? {};
  const me = await requireVitalleAdmin();
  const alertResult = await getVitalleAlerts(params.status);
  const alerts = alertResult.data.items ?? [];

  return (
    <OpsShell principal={me} title="Central de alertas" subtitle="Alertas ativos, resolvidos e histórico operacional.">
      <div className="flex flex-wrap gap-2">
        {[
          { href: '/alertas', label: 'Todos' },
          { href: '/alertas?status=active', label: 'Ativos' },
          { href: '/alertas?status=resolved', label: 'Resolvidos' },
        ].map((item) => (
          <a key={item.href} href={item.href} className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            {item.label}
          </a>
        ))}
      </div>

      <section className="grid gap-4">
        {alerts.length ? (
          alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill value={alert.status} />
                  {alert.status === 'active' ? <ResolveButton id={alert.id} /> : null}
                </div>
              }
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">Nenhum alerta encontrado.</div>
        )}
      </section>
    </OpsShell>
  );
}
