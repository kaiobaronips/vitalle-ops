import { OpsShell } from '@/components/vitalle/OpsShell';
import { MetricCard } from '@/components/vitalle/VitalleCards';
import { requireVitalleAdmin } from '@/lib/vitalle-access';
import { getVitalleDashboard, getVitalleReports } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

export default async function RelatoriosPage() {
  const me = await requireVitalleAdmin();
  const [dashboardResult, reportsResult] = await Promise.all([getVitalleDashboard(), getVitalleReports()]);
  const dashboard = dashboardResult.data;
  const reports = reportsResult.data.items ?? [];

  return (
    <OpsShell principal={me} title="Relatórios" subtitle="Resumo diário e relatórios operacionais gerados pelo sistema.">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Conformidade" value={`${Math.round(dashboard.compliance.score)}%`} tone="emerald" />
        <MetricCard label="Pontualidade" value={`${Math.round(dashboard.compliance.punctuality)}%`} tone="blue" />
        <MetricCard label="Conclusão" value={`${Math.round(dashboard.compliance.conclusion)}%`} tone="amber" />
        <MetricCard label="Metas" value={`${Math.round(dashboard.compliance.goals)}%`} tone="rose" />
      </section>

      <section className="grid gap-4">
        {reports.length ? (
          reports.map((report) => (
            <article key={report.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{report.operational_date}</div>
                  <h3 className="mt-1 text-lg font-semibold text-slate-950">Relatório do dia</h3>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">{report.operation_status}</div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observações</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{report.operational_observations || 'Sem observações.'}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Próximo turno</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{report.next_shift_notes || 'Sem notas.'}</p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">Nenhum relatório encontrado.</div>
        )}
      </section>
    </OpsShell>
  );
}
