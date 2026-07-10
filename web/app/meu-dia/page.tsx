import Link from 'next/link';
import { OpsShell } from '@/components/vitalle/OpsShell';
import { GoalProgress, MetricCard, StatusPill, TaskCard } from '@/components/vitalle/VitalleCards';
import {
  addGoalAction,
  blockTaskAction,
  completeTaskAction,
  markNotApplicableAction,
  startTaskAction,
} from '@/app/vitalle-actions';
import { getVitalleMe, getVitalleMeuDia } from '@/lib/vitalle-api';
import type { TaskInstance } from '@/lib/vitalle-types';

export const dynamic = 'force-dynamic';

function ActionButton({
  label,
  action,
  taskId,
  tone = 'slate',
}: {
  label: string;
  action: (formData: FormData) => Promise<unknown>;
  taskId: string;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose';
}) {
  const toneClasses: Record<typeof tone, string> = {
    slate: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    emerald: 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
    amber: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
    rose: 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100',
  };
  return (
    <form action={action as unknown as (formData: FormData) => void}>
      <input type="hidden" name="id" value={taskId} />
      <button type="submit" className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${toneClasses[tone]}`}>
        {label}
      </button>
    </form>
  );
}

function GoalForm({ taskId, current, target, unit }: { taskId: string; current: number; target: number; unit: string }) {
  if (!target) return null;
  return (
    <form action={addGoalAction as unknown as (formData: FormData) => void} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <input type="hidden" name="id" value={taskId} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Quantidade
          <input name="quantity" type="number" min="1" defaultValue={1} className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex-1 grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Observação
          <input name="note" defaultValue="" className="min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          + Registrar
        </button>
      </div>
      <div className="mt-3">
        <GoalProgress current={current} target={target} unit={unit} />
      </div>
    </form>
  );
}

function TaskActionGroup({ task }: { task: TaskInstance }) {
  const goalTarget = task.goal_target_snapshot ?? 0;
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton taskId={task.id} label="Iniciar" action={startTaskAction} />
      <ActionButton taskId={task.id} label="Concluir" action={completeTaskAction} tone="emerald" />
      <ActionButton taskId={task.id} label="Bloquear" action={blockTaskAction} tone="rose" />
      <ActionButton taskId={task.id} label="Não aplicável" action={markNotApplicableAction} tone="amber" />
      {goalTarget > 0 ? <GoalForm taskId={task.id} current={task.goal_current ?? 0} target={goalTarget} unit={task.goal_unit_snapshot || ''} /> : null}
    </div>
  );
}

export default async function MeuDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const [meResult, dayResult] = await Promise.all([getVitalleMe(), getVitalleMeuDia()]);
  const me = meResult.data;
  const day = dayResult.data;
  const tabs = [
    { href: '/meu-dia?view=pipeline', label: 'Pipeline' },
    { href: '/meu-dia?view=timeline', label: 'Timeline' },
    { href: '/meu-dia?view=list', label: 'Lista' },
  ];
  const selected = view || 'pipeline';
  const orderedTasks: TaskInstance[] = [
    ...(day.buckets.OVERDUE ?? []),
    ...(day.buckets.NOW ?? []),
    ...(day.buckets.IN_PROGRESS ?? []),
    ...(day.buckets.UPCOMING ?? []),
    ...(day.buckets.COMPLETED ?? []),
  ];

  return (
    <OpsShell
      principal={me}
      title="Painel do meu dia"
      subtitle="Visualize a próxima atividade, veja o que está em atraso e execute a rotina sem abrir outro sistema."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Meu dia" value={day.day_progress ?? 0} detail="progresso acumulado" tone="emerald" />
        <MetricCard label="Tarefas" value={day.task_counts.total} detail="instâncias do dia" />
        <MetricCard label="Atrasadas" value={day.task_counts.overdue} detail="precisam de atenção" tone="rose" />
        <MetricCard label="Conformidade" value={`${Math.round(day.compliance.score)}%`} detail="execução operacional" tone="amber" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Bom dia, {me.display_name}.</div>
            <h2 className="mt-1 text-3xl font-semibold text-slate-950">{me.sectors[0]?.name || 'Meu setor'}</h2>
            <p className="mt-2 text-sm text-slate-600">{day.date_label}</p>
          </div>
          {day.next_task?.id ? (
            <div className="max-w-md rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Próxima atividade</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{day.next_task.title_snapshot}</div>
              <div className="mt-2 text-sm text-slate-600">
                {String(day.next_task.scheduled_start).slice(0, 5)} - {String(day.next_task.scheduled_due).slice(0, 5)}
              </div>
              {day.next_task.goal_target_snapshot ? (
                <div className="mt-3">
                  <GoalProgress
                    current={day.next_task.goal_current ?? 0}
                    target={day.next_task.goal_target_snapshot}
                    unit={day.next_task.goal_unit_snapshot || ''}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-full border px-3 py-2 text-sm font-semibold ${
                selected === tab.label.toLowerCase() ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-700'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Execução</div>
          <h3 className="mt-1 text-2xl font-semibold text-slate-950">O que fazer agora</h3>
          <div className="mt-4 grid gap-4">
            {selected === 'list' ? (
              orderedTasks.map((task) => <TaskCard key={task.id} task={task} actions={<TaskActionGroup task={task} />} />)
            ) : selected === 'timeline' ? (
              <>
                {orderedTasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{task.sector_name_snapshot}</div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">{task.title_snapshot}</div>
                        <div className="mt-1 text-sm text-slate-600">{task.display_label || task.status}</div>
                      </div>
                      <StatusPill value={task.display_state || task.status} label={task.display_label || task.status} />
                    </div>
                    <div className="mt-3 text-sm text-slate-600">
                      {String(task.scheduled_start).slice(0, 5)} - {String(task.scheduled_due).slice(0, 5)}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {(['OVERDUE', 'NOW', 'IN_PROGRESS', 'UPCOMING', 'COMPLETED'] as const).map((bucket) => (
                  <div key={bucket} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{bucket}</div>
                    <div className="mt-3 grid gap-3">
                      {(day.buckets[bucket] ?? []).map((task) => (
                        <div key={task.id} className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="text-sm font-semibold text-slate-950">{task.title_snapshot}</div>
                          <div className="mt-1 text-xs text-slate-500">{String(task.scheduled_start).slice(0, 5)} - {String(task.scheduled_due).slice(0, 5)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Resumo</div>
          <h3 className="mt-1 text-2xl font-semibold text-slate-950">Meu setor hoje</h3>
          <div className="mt-4 grid gap-3">
            {me.sectors.map((sector) => (
              <div key={sector.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{sector.slug}</div>
                    <div className="mt-1 font-semibold text-slate-950">{sector.name}</div>
                  </div>
                  <StatusPill value={sector.health_state || 'ATENCAO'} />
                </div>
                <div className="mt-3 text-sm text-slate-600">{sector.description}</div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </OpsShell>
  );
}
