import { OpsShell } from '@/components/vitalle/OpsShell';
import { AlertCard, MetricCard, SectorCard, StatusPill, TaskCard } from '@/components/vitalle/VitalleCards';
import { getVitalleDashboard, getVitalleMe } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

export default async function OperacaoPage() {
  const [meResult, dashboardResult] = await Promise.all([getVitalleMe(), getVitalleDashboard()]);
  const me = meResult.data;
  const dashboard = dashboardResult.data;
  const criticalTasks = dashboard.tasks.filter((task) => task.is_critical_snapshot && task.status !== 'COMPLETED').slice(0, 4);

  return (
    <OpsShell principal={me} title="Operação de hoje" subtitle="Acompanhe o estado operacional da clínica em tempo real.">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Tarefas do dia" value={dashboard.task_counts.total} detail="instâncias geradas" />
        <MetricCard label="Concluídas" value={dashboard.task_counts.completed} detail="execução acumulada" tone="emerald" />
        <MetricCard label="Em andamento" value={dashboard.task_counts.in_progress} detail="ativa no momento" tone="blue" />
        <MetricCard label="Atrasadas" value={dashboard.task_counts.overdue} detail="atenção imediata" tone="rose" />
        <MetricCard label="Conformidade" value={`${Math.round(dashboard.compliance.score)}%`} detail="operacional" tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Cronologia</div>
              <h3 className="mt-1 text-2xl font-semibold text-slate-950">Agora na clínica</h3>
            </div>
            <StatusPill value={dashboard.closing_summary?.compliance ? 'EM DIA' : 'ATENCAO'} />
          </div>
          <div className="mt-4 grid gap-3">
            {dashboard.operational_now?.map((item) => (
              <div key={item.task_id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.sector_name}</div>
                    <div className="mt-1 font-semibold text-slate-950">{item.title}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {String(item.scheduled_start).slice(0, 5)} - {String(item.scheduled_due).slice(0, 5)}
                    </div>
                  </div>
                  <StatusPill value={item.status} label={item.label} />
                </div>
              </div>
            )) ?? <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">Sem itens na cronologia.</div>}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Sinalizadores</div>
          <h3 className="mt-1 text-2xl font-semibold text-slate-950">Tarefas críticas</h3>
          <div className="mt-4 grid gap-3">
            {criticalTasks.length ? criticalTasks.map((task) => <TaskCard key={task.id} task={task} />) : <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">Nenhuma tarefa crítica pendente.</div>}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Setores</div>
          <h3 className="mt-1 text-2xl font-semibold text-slate-950">Status por setor</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {dashboard.sectors.map((sector) => (
              <SectorCard key={sector.id} sector={sector} />
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Alertas</div>
          <h3 className="mt-1 text-2xl font-semibold text-slate-950">Alertas ativos</h3>
          <div className="mt-4 grid gap-3">
            {(dashboard.alerts ?? []).slice(0, 6).map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </article>
      </section>
    </OpsShell>
  );
}
