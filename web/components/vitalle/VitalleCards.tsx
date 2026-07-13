import type { ReactNode } from 'react';
import type { Alert, Sector, TaskInstance } from '@/lib/vitalle-types';

export function MetricCard({
  label,
  value,
  detail,
  tone = 'slate',
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: 'slate' | 'emerald' | 'amber' | 'blue' | 'rose';
}) {
  const toneClasses: Record<typeof tone, string> = {
    slate: 'border-[var(--line)] bg-[var(--paper)] text-[var(--noir)]',
    emerald: 'border-[var(--line)] bg-[var(--paper)] text-[var(--noir)]',
    amber: 'border-[var(--line)] bg-[var(--paper)] text-[var(--noir)]',
    blue: 'border-[var(--line)] bg-[var(--paper)] text-[var(--noir)]',
    rose: 'border-[var(--line)] bg-[var(--paper)] text-[var(--noir)]',
  };
  return (
    <article className={`rounded-2xl border px-6 py-6 ${toneClasses[tone]}`}>
      <div className="eyebrow text-[var(--stone)]">{label}</div>
      <div className="metric-figure mt-4 text-4xl leading-none tracking-normal">{value}</div>
      <div className="gold-rule mt-5 w-16" />
      {detail ? <div className="mt-4 text-sm text-[var(--stone)]">{detail}</div> : null}
    </article>
  );
}

export function StatusPill({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  const key = value.toUpperCase();
  const palette =
    key.includes('CRIT') || key.includes('ATRAS') || key.includes('BLOCK')
      ? 'bg-rose-100 text-rose-800 border-rose-200'
      : key.includes('ATEN') || key.includes('PEND') || key.includes('AGUARD')
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : key.includes('CONCL') || key.includes('EM DIA') || key.includes('OK')
          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
          : key.includes('EM AND') || key.includes('AGORA')
            ? 'bg-blue-100 text-blue-800 border-blue-200'
            : 'bg-slate-100 text-slate-700 border-slate-200';
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${palette}`}>{label ?? value}</span>;
}

export function GoalProgress({
  current,
  target,
  unit,
}: {
  current: number;
  target: number;
  unit: string;
}) {
  const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">
          {current} / {target} {unit}
        </span>
        <span className="font-semibold text-slate-900">{percentage}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#ece5da]">
        <div className="h-full rounded-full bg-[var(--gold)]" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export function TaskCard({
  task,
  actions,
}: {
  task: TaskInstance;
  actions?: ReactNode;
}) {
  const isCritical = task.is_critical_snapshot;
  const isBlocked = task.status === 'BLOCKED';
  const isOverdue = task.is_late || task.display_state === 'OVERDUE';
  const statusLabel = task.display_label || task.status;
  const goalCurrent = task.goal_current ?? 0;
  const goalTarget = task.goal_target_snapshot ?? 0;
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow text-[var(--stone)]">
            {task.sector_name_snapshot || task.sector_name || task.sector_slug}
          </div>
          <h3 className="mt-2 text-lg font-medium text-[var(--noir)]">{task.title_snapshot}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill value={statusLabel} />
          {isCritical ? <StatusPill value="CRITICAL" /> : null}
          {isBlocked ? <StatusPill value="BLOCKED" /> : null}
          {isOverdue ? <StatusPill value={`ATRASADA ${task.late_minutes ?? 0} MIN`} /> : null}
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-[var(--stone)]">{task.description_snapshot}</p>

      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <div>
          <dt className="eyebrow text-[var(--stone)]">Horário</dt>
          <dd className="mt-1 font-semibold text-[var(--noir)]">{String(task.scheduled_start).slice(0, 5)} - {String(task.scheduled_due).slice(0, 5)}</dd>
        </div>
        <div>
          <dt className="eyebrow text-[var(--stone)]">Responsável</dt>
          <dd className="mt-1 font-semibold text-[var(--noir)]">{task.assignee_name_snapshot || task.assignee_name || 'Setor'}</dd>
        </div>
        <div>
          <dt className="eyebrow text-[var(--stone)]">Criticidade</dt>
          <dd className="mt-1 font-semibold text-[var(--noir)]">{task.priority_snapshot}</dd>
        </div>
        <div>
          <dt className="eyebrow text-[var(--stone)]">Status</dt>
          <dd className="mt-1 font-semibold text-[var(--noir)]">{statusLabel}</dd>
        </div>
      </dl>

      {goalTarget > 0 ? (
        <div className="mt-4">
          <GoalProgress current={goalCurrent} target={goalTarget} unit={task.goal_unit_snapshot || ''} />
        </div>
      ) : null}

      {task.subtasks_total ? (
        <div className="mt-4 text-sm text-[var(--stone)]">
          {task.subtasks_completed ?? 0} de {task.subtasks_total} subtarefas concluídas
        </div>
      ) : null}

      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}

export function AlertCard({ alert, actions }: { alert: Alert; actions?: ReactNode }) {
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow text-[var(--stone)]">{alert.sector_name || 'Clínica'}</div>
          <h3 className="mt-2 text-base font-semibold text-[var(--noir)]">{alert.title}</h3>
        </div>
        <StatusPill value={alert.severity} />
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--stone)]">{alert.description}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-[var(--stone)]">
        <span>{alert.alert_type}</span>
        <span>{new Date(alert.triggered_at).toLocaleString('pt-BR')}</span>
      </div>
      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}

export function SectorCard({ sector }: { sector: Sector }) {
  const state = sector.health_state || sector.status || 'ATENCAO';
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow text-[var(--stone)]">{sector.slug}</div>
          <h3 className="mt-2 text-lg font-semibold text-[var(--noir)]">{sector.name}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--stone)]">{sector.description}</p>
        </div>
        <StatusPill value={state} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-lg bg-[#f6f1ea] p-3">
          <div className="text-xs uppercase tracking-wide text-[var(--stone)]">Total</div>
          <div className="mt-1 font-semibold text-[var(--noir)]">{sector.task_count ?? 0}</div>
        </div>
        <div className="rounded-lg bg-[#f6f1ea] p-3">
          <div className="text-xs uppercase tracking-wide text-[var(--stone)]">Pendentes</div>
          <div className="mt-1 font-semibold text-[var(--noir)]">{Math.max((sector.task_count ?? 0) - (sector.completed_count ?? 0), 0)}</div>
        </div>
        <div className="rounded-lg bg-[#f6f1ea] p-3">
          <div className="text-xs uppercase tracking-wide text-[var(--stone)]">Atrasadas</div>
          <div className="mt-1 font-semibold text-[var(--noir)]">{sector.overdue_count ?? 0}</div>
        </div>
      </div>
    </article>
  );
}
