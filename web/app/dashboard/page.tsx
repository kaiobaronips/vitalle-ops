import { OpsShell } from '@/components/vitalle/OpsShell';
import { AlertCard, MetricCard, SectorCard, StatusPill, TaskCard } from '@/components/vitalle/VitalleCards';
import { syncOperationAction } from '@/app/vitalle-actions';
import { getVitalleDashboard, getVitalleMe } from '@/lib/vitalle-api';
import type { TaskInstance } from '@/lib/vitalle-types';

export const dynamic = 'force-dynamic';

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function TaskActionForm({ taskId, label, action }: { taskId: string; label: string; action: string }) {
  return (
    <form action={action as unknown as (formData: FormData) => void}>
      <input type="hidden" name="id" value={taskId} />
      <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
        {label}
      </button>
    </form>
  );
}

function SummaryTaskList({ tasks }: { tasks: TaskInstance[] }) {
  if (!tasks.length) {
    return <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">Nenhuma tarefa crítica pendente.</div>;
  }
  return (
    <div className="grid gap-4">
      {tasks.slice(0, 5).map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          actions={
            <>
              <TaskActionForm taskId={task.id} label="Iniciar" action="/dashboard" />
              <TaskActionForm taskId={task.id} label="Concluir" action="/dashboard" />
            </>
          }
        />
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const [meResult, dashboardResult] = await Promise.all([getVitalleMe(), getVitalleDashboard()]);
  const me = meResult.data;
  const dashboard = dashboardResult.data;
  const currentDayProgress = dashboard.task_counts.total > 0 ? Math.round((dashboard.task_counts.completed / dashboard.task_counts.total) * 100) : 0;
  const criticalTasks = dashboard.tasks.filter((task) => task.is_critical_snapshot && (task.is_late || task.status === 'BLOCKED' || task.status === 'PENDING')).slice(0, 4);
  const attentionAlerts = dashboard.alerts.filter((alert) => alert.severity !== 'info').slice(0, 5);
  const nowItems = dashboard.operational_now?.slice(0, 6) ?? [];

  return (
    <OpsShell
      principal={me}
      title="Opere a clínica em segundos"
      subtitle="Visão geral, tarefas críticas, setores e alertas ativos."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Tarefas do dia" value={dashboard.task_counts.total} detail="instâncias geradas hoje" />
        <MetricCard label="Concluídas" value={dashboard.task_counts.completed} detail={formatPercent(dashboard.compliance.conclusion)} tone="emerald" />
        <MetricCard label="Em andamento" value={dashboard.task_counts.in_progress} detail={formatPercent(dashboard.compliance.punctuality)} tone="blue" />
        <MetricCard label="Atrasadas" value={dashboard.task_counts.overdue} detail="atualização em tempo real" tone="rose" />
        <MetricCard label="Conformidade" value={formatPercent(dashboard.compliance.score)} detail="operacional" tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Operação de hoje</div>
              <h3 className="mt-1 text-2xl font-semibold text-slate-950">Agora na clínica</h3>
            </div>
            <form action={syncOperationAction as unknown as () => void}>
              <button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Sincronizar
              </button>
            </form>
          </div>

          <div className="mt-5 grid gap-3">
            {nowItems.map((item) => (
              <div key={item.task_id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.sector_name}</div>
                    <div className="mt-1 font-semibold text-slate-950">{item.title}</div>
                  </div>
                  <StatusPill value={item.status} label={item.label} />
                </div>
                <div className="mt-3 text-sm text-slate-600">
                  {String(item.scheduled_start).slice(0, 5)} - {String(item.scheduled_due).slice(0, 5)}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Operação</div>
          <h3 className="mt-1 text-2xl font-semibold text-slate-950">Sinalizadores</h3>
          <div className="mt-4 grid gap-3">
            {criticalTasks.length ? criticalTasks.map((task) => <TaskCard key={task.id} task={task} />) : <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">Nenhuma tarefa crítica pendente.</div>}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Setores</div>
              <h3 className="mt-1 text-2xl font-semibold text-slate-950">Status por setor</h3>
            </div>
            <StatusPill value={dashboard.closing_summary?.compliance ? 'EM DIA' : 'ATENCAO'} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {dashboard.sectors.map((sector) => (
              <SectorCard key={sector.id} sector={sector} />
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Alertas</div>
          <h3 className="mt-1 text-2xl font-semibold text-slate-950">Central de alertas</h3>
          <div className="mt-4 grid gap-3">
            {attentionAlerts.length ? attentionAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />) : <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">Nenhum alerta crítico ativo.</div>}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Pontos de atenção</div>
          <h3 className="mt-1 text-2xl font-semibold text-slate-950">Falhas recorrentes</h3>
          <div className="mt-4 grid gap-3">
            {(dashboard.recurring_failures ?? []).length ? (
              dashboard.recurring_failures!.map((failure, index) => (
                <div key={`${String(failure.title)}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="font-semibold text-slate-950">{String(failure.title)}</div>
                  <div className="mt-1 text-sm text-slate-600">{String(failure.total_failures)} falhas nos últimos 7 dias</div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">Sem falhas recorrentes identificadas.</div>
            )}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Resumo</div>
          <h3 className="mt-1 text-2xl font-semibold text-slate-950">Fechamento operacional</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <MetricCard label="Pontualidade" value={formatPercent(dashboard.compliance.punctuality)} tone="blue" />
            <MetricCard label="Conclusão" value={formatPercent(dashboard.compliance.conclusion)} tone="emerald" />
            <MetricCard label="Metas atingidas" value={formatPercent(dashboard.compliance.goals)} tone="amber" />
            <MetricCard label="Tarefas críticas" value={dashboard.task_counts.critical_pending} tone="rose" />
          </div>
        </article>
      </section>
    </OpsShell>
  );
}
