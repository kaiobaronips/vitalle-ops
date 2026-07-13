import { OpsShell } from '@/components/vitalle/OpsShell';
import { AlertCard, MetricCard, SectorCard, StatusPill, TaskCard } from '@/components/vitalle/VitalleCards';
import { syncOperationAction } from '@/app/vitalle-actions';
import { getVitalleDashboard, getVitalleMe } from '@/lib/vitalle-api';
import type { TaskInstance } from '@/lib/vitalle-types';

export const dynamic = 'force-dynamic';

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function monthLabel(value?: string) {
  const date = value ? new Date(`${value}T12:00:00`) : new Date();
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function monthRange(value?: string) {
  const date = value ? new Date(`${value}T12:00:00`) : new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const format = new Intl.DateTimeFormat('pt-BR');
  return { start: format.format(start), end: format.format(end) };
}

function TaskActionForm({ taskId, label, action }: { taskId: string; label: string; action: string }) {
  return (
    <form action={action as unknown as (formData: FormData) => void}>
      <input type="hidden" name="id" value={taskId} />
      <button type="submit" className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm font-semibold text-[var(--noir)] hover:border-[var(--gold)]">
        {label}
      </button>
    </form>
  );
}

function SummaryTaskList({ tasks }: { tasks: TaskInstance[] }) {
  if (!tasks.length) {
    return <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--paper)] p-6 text-sm text-[var(--stone)]">Nenhuma tarefa crítica pendente.</div>;
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
  const range = monthRange(dashboard.date);

  return (
    <OpsShell
      principal={me}
      title="Visão geral"
      subtitle={monthLabel(dashboard.date)}
      headerAction={
        <form action={syncOperationAction as unknown as () => void}>
          <button type="submit" className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-5 py-2 text-sm font-medium text-[var(--noir)] hover:border-[var(--gold)]">
            Atualizar
          </button>
        </form>
      }
    >
      <section className="flex flex-wrap items-center gap-3">
        <span className="eyebrow mr-2 text-[var(--stone)]">Período</span>
        {['Hoje', 'Ontem', 'Semana', 'Mês', 'Últimos 90 dias'].map((label) => (
          <span
            key={label}
            className={`rounded-full border px-5 py-2 text-sm ${
              label === 'Mês'
                ? 'border-[var(--noir)] bg-[var(--noir)] text-[var(--bone)]'
                : 'border-[var(--line)] bg-[var(--paper)] text-[var(--noir)]'
            }`}
          >
            {label}
          </span>
        ))}
        <span className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-5 py-2 text-sm text-[var(--noir)]">
          {range.start}
        </span>
        <span className="text-sm text-[var(--stone)]">até</span>
        <span className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-5 py-2 text-sm text-[var(--noir)]">
          {range.end}
        </span>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Tarefas do dia" value={dashboard.task_counts.total} detail="instâncias geradas hoje" />
        <MetricCard label="Concluídas" value={dashboard.task_counts.completed} detail={formatPercent(dashboard.compliance.conclusion)} tone="emerald" />
        <MetricCard label="Em andamento" value={dashboard.task_counts.in_progress} detail={formatPercent(dashboard.compliance.punctuality)} tone="blue" />
        <MetricCard label="Atrasadas" value={dashboard.task_counts.overdue} detail="atualização em tempo real" tone="rose" />
        <MetricCard label="Conformidade" value={formatPercent(dashboard.compliance.score)} detail="operacional" tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="eyebrow text-[var(--stone)]">Operação de hoje</div>
              <h3 className="display mt-2 text-3xl text-[var(--noir)]">Agora na clínica</h3>
            </div>
            <form action={syncOperationAction as unknown as () => void}>
              <button type="submit" className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm font-semibold text-[var(--noir)] hover:border-[var(--gold)]">
                Sincronizar
              </button>
            </form>
          </div>

          <div className="mt-5 grid gap-3">
            {nowItems.map((item) => (
              <div key={item.task_id} className="rounded-xl border border-[var(--line)] bg-[#f8f3ec] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="eyebrow text-[var(--stone)]">{item.sector_name}</div>
                    <div className="mt-2 font-semibold text-[var(--noir)]">{item.title}</div>
                  </div>
                  <StatusPill value={item.status} label={item.label} />
                </div>
                <div className="mt-3 text-sm text-[var(--stone)]">
                  {String(item.scheduled_start).slice(0, 5)} - {String(item.scheduled_due).slice(0, 5)}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6">
          <div className="eyebrow text-[var(--stone)]">Operação</div>
          <h3 className="display mt-2 text-3xl text-[var(--noir)]">Sinalizadores</h3>
          <div className="mt-4 grid gap-3">
            {criticalTasks.length ? criticalTasks.map((task) => <TaskCard key={task.id} task={task} />) : <div className="rounded-xl border border-dashed border-[var(--line)] bg-[#f8f3ec] p-5 text-sm text-[var(--stone)]">Nenhuma tarefa crítica pendente.</div>}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="eyebrow text-[var(--stone)]">Setores</div>
              <h3 className="display mt-2 text-3xl text-[var(--noir)]">Status por setor</h3>
            </div>
            <StatusPill value={dashboard.closing_summary?.compliance ? 'EM DIA' : 'ATENCAO'} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {dashboard.sectors.map((sector) => (
              <SectorCard key={sector.id} sector={sector} />
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6">
          <div className="eyebrow text-[var(--stone)]">Alertas</div>
          <h3 className="display mt-2 text-3xl text-[var(--noir)]">Central de alertas</h3>
          <div className="mt-4 grid gap-3">
            {attentionAlerts.length ? attentionAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />) : <div className="rounded-xl border border-dashed border-[var(--line)] bg-[#f8f3ec] p-5 text-sm text-[var(--stone)]">Nenhum alerta crítico ativo.</div>}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6">
          <div className="eyebrow text-[var(--stone)]">Pontos de atenção</div>
          <h3 className="display mt-2 text-3xl text-[var(--noir)]">Falhas recorrentes</h3>
          <div className="mt-4 grid gap-3">
            {(dashboard.recurring_failures ?? []).length ? (
              dashboard.recurring_failures!.map((failure, index) => (
                <div key={`${String(failure.title)}-${index}`} className="rounded-xl border border-[var(--line)] bg-[#f8f3ec] p-4">
                  <div className="font-semibold text-[var(--noir)]">{String(failure.title)}</div>
                  <div className="mt-1 text-sm text-[var(--stone)]">{String(failure.total_failures)} falhas nos últimos 7 dias</div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--line)] bg-[#f8f3ec] p-5 text-sm text-[var(--stone)]">Sem falhas recorrentes identificadas.</div>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6">
          <div className="eyebrow text-[var(--stone)]">Resumo</div>
          <h3 className="display mt-2 text-3xl text-[var(--noir)]">Fechamento operacional</h3>
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
