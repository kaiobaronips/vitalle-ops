'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { removeSectorTaskAction, saveTaskTemplateAction, type ActionState } from '@/app/vitalle-actions';
import type { Sector, TaskTemplate } from '@/lib/vitalle-types';

const initialActionState: ActionState = { ok: false, message: '' };

function shortTime(value?: string | null) {
  return String(value || '').slice(0, 5);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function SubmitButton() {
  return (
    <button
      type="submit"
      className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
    >
      Salvar tarefa
    </button>
  );
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5">
      <path
        d="M4 20h4.2L19 9.2 14.8 5 4 15.8V20Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="m13.8 6 4.2 4.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function TaskQuickCreateModal({
  sector,
  sectors,
  onClose,
}: {
  sector: Sector;
  sectors: Sector[];
  onClose: () => void;
}) {
  const [state, action, isPending] = useActionState(saveTaskTemplateAction, initialActionState);

  useEffect(() => {
    if (!state.ok) return;
    const timeout = window.setTimeout(onClose, 650);
    return () => window.clearTimeout(timeout);
  }, [onClose, state.ok]);

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Criação rápida</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Nova tarefa para {sector.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-xl leading-none text-slate-600 transition hover:border-slate-400 hover:text-slate-950"
            aria-label="Fechar criação rápida"
          >
            ×
          </button>
        </header>

        <form action={action} className="grid gap-5 p-5">
          <input type="hidden" name="id" value="" />
          <input type="hidden" name="task_type" value="STANDARD" />
          <input type="hidden" name="default_assignee_id" value="" />
          <input type="hidden" name="priority" value="NORMAL" />
          <input type="hidden" name="goal_target" value="" />
          <input type="hidden" name="goal_unit" value="" />
          <input type="hidden" name="goal_group_key" value="" />
          <input type="hidden" name="interval_value" value="1" />
          <input type="hidden" name="weekdays" value="" />
          <input type="hidden" name="month_days" value="" />
          <input type="hidden" name="weeks_of_month" value="" />
          <input type="hidden" name="end_date" value="" />
          <input type="hidden" name="instructions" value="" />
          <input type="hidden" name="subtasks" value="" />
          <input type="hidden" name="is_critical" value="" />
          <input type="hidden" name="requires_comment_on_completion" value="" />
          <input type="hidden" name="requires_evidence" value="" />
          <input type="hidden" name="requires_manager_review" value="" />
          <input type="hidden" name="allow_not_applicable" value="on" />
          <input type="hidden" name="is_conditional" value="" />
          <input type="hidden" name="active" value="on" />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Setor</span>
              <select name="sector_id" defaultValue={sector.id} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                {sectors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Título</span>
              <input name="title" required className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>

            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Horário de início</span>
              <input name="start_time" type="time" required className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>

            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Horário do fim</span>
              <input name="due_time" type="time" required className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>

            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recorrência</span>
              <select name="recurrence_type" defaultValue="DAILY" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="DAILY">Diária</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data de início</span>
              <input name="start_date" type="date" defaultValue={today()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
          </div>

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descrição da tarefa</span>
            <textarea name="description" rows={8} className="min-h-44 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm leading-6" />
          </label>

          {state.message ? (
            <p className={`rounded-lg px-3 py-2 text-sm ${state.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
              {state.message}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400">
              Cancelar
            </button>
            <div className={isPending ? 'pointer-events-none opacity-60' : ''}>
              <SubmitButton />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskEditModal({
  task,
  sectors,
  onClose,
  onUpdated,
}: {
  task: TaskTemplate;
  sectors: Sector[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(saveTaskTemplateAction, initialActionState);

  useEffect(() => {
    if (!state.ok) return;
    onUpdated();
    router.refresh();
  }, [onUpdated, router, state.ok]);

  return (
    <div className="fixed inset-0 z-[125] grid place-items-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Editar tarefa</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">{task.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-xl leading-none text-slate-600 transition hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Fechar edição"
          >
            ×
          </button>
        </header>

        <form action={action} className="grid gap-5 p-5">
          <input type="hidden" name="id" value={task.id} />
          <input type="hidden" name="sector_id" value={task.sector_id} />
          <input type="hidden" name="task_type" value={task.task_type || 'STANDARD'} />
          <input type="hidden" name="default_assignee_id" value={task.default_assignee_id || ''} />
          <input type="hidden" name="start_time" value={shortTime(task.start_time)} />
          <input type="hidden" name="due_time" value={shortTime(task.due_time)} />
          <input type="hidden" name="priority" value={task.priority || 'NORMAL'} />
          <input type="hidden" name="goal_target" value={task.goal_target || ''} />
          <input type="hidden" name="goal_unit" value={task.goal_unit || ''} />
          <input type="hidden" name="goal_group_key" value={task.goal_group_key || ''} />
          <input type="hidden" name="interval_value" value="1" />
          <input type="hidden" name="weekdays" value="" />
          <input type="hidden" name="month_days" value="" />
          <input type="hidden" name="weeks_of_month" value="" />
          <input type="hidden" name="end_date" value={task.end_date || ''} />
          <input type="hidden" name="instructions" value={task.instructions || ''} />
          <input type="hidden" name="subtasks" value="" />
          <input type="hidden" name="is_critical" value={task.is_critical ? 'on' : ''} />
          <input type="hidden" name="requires_comment_on_completion" value={task.requires_comment_on_completion ? 'on' : ''} />
          <input type="hidden" name="requires_evidence" value={task.requires_evidence ? 'on' : ''} />
          <input type="hidden" name="requires_manager_review" value={task.requires_manager_review ? 'on' : ''} />
          <input type="hidden" name="allow_not_applicable" value={task.allow_not_applicable === false ? 'off' : 'on'} />
          <input type="hidden" name="is_conditional" value={task.is_conditional ? 'on' : ''} />
          <input type="hidden" name="active" value="on" />
          <input type="hidden" name="recurrence_type" value={task.recurrence_type || 'DAILY'} />
          <input type="hidden" name="start_date" value={task.start_date || today()} />

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Setor</span>
            <select name="sector_id_disabled" value={task.sector_id} disabled className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              {sectors.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Título</span>
            <input name="title" required defaultValue={task.title} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Horário de início</span>
              <input value={shortTime(task.start_time)} disabled className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Horário do fim</span>
              <input value={shortTime(task.due_time)} disabled className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
            </label>
          </div>

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descrição da tarefa</span>
            <textarea name="description" rows={8} defaultValue={task.description || ''} className="min-h-44 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm leading-6" />
          </label>

          {state.message ? (
            <p className={`rounded-lg px-3 py-2 text-sm ${state.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
              {state.message}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Salvando...' : 'Salvar edição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskTemplateCard({
  task,
  onRequestEdit,
  onRequestRemove,
}: {
  task: TaskTemplate;
  onRequestEdit: (task: TaskTemplate) => void;
  onRequestRemove: (task: TaskTemplate) => void;
}) {
  return (
    <div className="rounded-lg border border-[#ded8cf] bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold leading-snug text-[#252525]">{task.title}</h4>
        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-700">
          ativo
        </span>
      </div>
      {task.description ? <p className="mt-2 text-xs leading-5 text-slate-600">{task.description}</p> : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[0.68rem] font-semibold text-slate-500">
        <span>
          {shortTime(task.start_time)} - {shortTime(task.due_time)}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onRequestEdit(task)}
            className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-950"
            aria-label={`Editar ${task.title}`}
            title="Editar tarefa"
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            onClick={() => onRequestRemove(task)}
            className="grid h-7 w-7 place-items-center rounded-full bg-rose-600 text-base font-bold leading-none text-white shadow-sm transition hover:bg-rose-700"
            aria-label={`Remover ${task.title}`}
            title="Remover tarefa"
          >
            -
          </button>
        </div>
      </div>
    </div>
  );
}

function RemoveTaskModal({
  task,
  onClose,
  onRemoved,
}: {
  task: TaskTemplate;
  onClose: () => void;
  onRemoved: (taskId: string) => void;
}) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(removeSectorTaskAction, initialActionState);

  useEffect(() => {
    if (!state.ok) return;
    onRemoved(task.id);
    router.refresh();
  }, [onRemoved, router, state.ok, task.id]);

  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-rose-100 text-2xl font-bold text-rose-700">
          !
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-950">Atenção</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Tem certeza que deseja remover esta tarefa do setor?
        </p>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-950">{task.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            {shortTime(task.start_time)} - {shortTime(task.due_time)}
          </p>
        </div>

        {state.message ? (
          <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${state.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
            {state.message}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          >
            Cancelar
          </button>
          <form action={action}>
            <input type="hidden" name="id" value={task.id} />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Removendo...' : 'Confirmar remoção'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function AdminSectorTaskBoard({
  sectors,
  tasks,
}: {
  sectors: Sector[];
  tasks: TaskTemplate[];
}) {
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<TaskTemplate | null>(null);
  const [taskToRemove, setTaskToRemove] = useState<TaskTemplate | null>(null);
  const [removedTaskIds, setRemovedTaskIds] = useState<Set<string>>(new Set());
  const tasksBySector = useMemo(() => {
    const visibleTasks = tasks
      .filter((task) => task.active !== false && !task.archived_at && !removedTaskIds.has(task.id))
      .sort((a, b) => {
        const left = `${shortTime(a.start_time)}-${shortTime(a.due_time)}-${a.title}`;
        const right = `${shortTime(b.start_time)}-${shortTime(b.due_time)}-${b.title}`;
        return left.localeCompare(right, 'pt-BR');
      });

    return visibleTasks.reduce<Record<string, TaskTemplate[]>>((acc, task) => {
      acc[task.sector_id] = [...(acc[task.sector_id] ?? []), task];
      return acc;
    }, {});
  }, [removedTaskIds, tasks]);

  function handleRemoved(taskId: string) {
    setRemovedTaskIds((current) => new Set(current).add(taskId));
    setTaskToRemove(null);
  }

  function handleUpdated() {
    setTaskToEdit(null);
  }

  return (
    <>
      <section className="overflow-x-auto pb-3">
        <div className="grid min-h-[32rem] grid-flow-col auto-cols-[minmax(18rem,calc(100vw-2.5rem))] gap-3 sm:auto-cols-[20rem] xl:auto-cols-[22rem]">
          {sectors.map((sector) => {
            const sectorTasks = tasksBySector[sector.id] ?? [];
            return (
              <article key={sector.id} className="min-w-0 rounded-2xl border border-[#ece5da] bg-[#f4f2f0] p-2.5">
                <header className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-[#252525]">{sector.name}</h3>
                    <div className="mt-2 min-h-28 rounded-lg border border-[#14110d] bg-[#14110d] px-3 py-2 shadow-sm">
                      <p className="whitespace-normal break-words text-xs leading-5 text-white">
                        {sector.description || 'Descrição do setor não informada.'}
                      </p>
                    </div>
                    <div className="my-3 h-px w-full bg-[#ded6ca]" />
                    <p className="text-xs font-semibold text-slate-500">
                      {sectorTasks.length} {sectorTasks.length === 1 ? 'tarefa' : 'tarefas'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSector(sector)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-950 text-xl leading-none text-white shadow-sm transition hover:bg-[var(--gold)] hover:text-[#14110d]"
                    aria-label={`Criar tarefa para ${sector.name}`}
                    title={`Criar tarefa para ${sector.name}`}
                  >
                    +
                  </button>
                </header>

                <div className="grid gap-3">
                  {sectorTasks.length ? (
                    sectorTasks.map((task) => (
                      <TaskTemplateCard key={task.id} task={task} onRequestEdit={setTaskToEdit} onRequestRemove={setTaskToRemove} />
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-[#d8d0c4] bg-white/70 p-4 text-sm text-slate-500">
                      Nenhuma tarefa cadastrada neste setor.
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {selectedSector ? (
        <TaskQuickCreateModal sector={selectedSector} sectors={sectors} onClose={() => setSelectedSector(null)} />
      ) : null}

      {taskToEdit ? (
        <TaskEditModal task={taskToEdit} sectors={sectors} onClose={() => setTaskToEdit(null)} onUpdated={handleUpdated} />
      ) : null}

      {taskToRemove ? (
        <RemoveTaskModal task={taskToRemove} onClose={() => setTaskToRemove(null)} onRemoved={handleRemoved} />
      ) : null}
    </>
  );
}
