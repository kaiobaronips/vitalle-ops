'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addTaskObservationAction, completeTaskAction, startTaskAction } from '@/app/vitalle-actions';
import type { TaskInstance } from '@/lib/vitalle-types';

type ColumnKind = 'todo' | 'doing' | 'finished' | 'custom';

type KanbanColumn = {
  id: string;
  title: string;
  kind: ColumnKind;
};

type TaskBoardItem = {
  task: TaskInstance;
  columnId: string;
};

type CelebrationKind = 'task' | 'day';

const defaultColumns: KanbanColumn[] = [
  { id: 'todo', title: 'Tarefas', kind: 'todo' },
  { id: 'doing', title: 'Em andamento', kind: 'doing' },
  { id: 'finished', title: 'Finalizadas', kind: 'finished' },
];

function initialColumn(task: TaskInstance) {
  const status = task.status.toUpperCase();
  if (status === 'IN_PROGRESS') return 'doing';
  if (['COMPLETED', 'JUSTIFIED', 'NOT_APPLICABLE'].includes(status)) return 'finished';
  return 'todo';
}

function shortTime(value: string) {
  return String(value || '').slice(0, 5);
}

function statusLabel(task: TaskInstance) {
  if (task.display_label) return task.display_label;
  return task.status.replaceAll('_', ' ');
}

function taskDateTime(operationalDate: string, timeValue: string) {
  const date = String(operationalDate || '').slice(0, 10);
  const time = String(timeValue || '').slice(0, 8) || '00:00:00';
  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function timingBadgeClass(task: TaskInstance, now: Date) {
  const status = task.status.toUpperCase();
  const isFinished = ['COMPLETED', 'JUSTIFIED', 'NOT_APPLICABLE'].includes(status);
  if (isFinished) return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200';

  const dueAt = taskDateTime(task.operational_date, task.scheduled_due);
  if (!dueAt) return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200';

  const minutesToDue = Math.ceil((dueAt.getTime() - now.getTime()) / 60000);
  if (task.display_state === 'OVERDUE' || task.is_overdue || task.is_late || minutesToDue < 0) {
    return 'bg-rose-100 text-rose-800 ring-1 ring-rose-200';
  }

  if (minutesToDue <= 30) return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200';

  return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200';
}

function actionFormData(taskId: string, comment = '') {
  const formData = new FormData();
  formData.set('id', taskId);
  if (comment) formData.set('comment', comment);
  return formData;
}

function NoteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[15px] w-[15px]">
      <path
        d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v8A2.5 2.5 0 0 1 16.5 16H11l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5v-8Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <path d="M8 8h8M8 11.5h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" />
    </svg>
  );
}

export function SectorKanban({ tasks }: { tasks: TaskInstance[] }) {
  const router = useRouter();
  const [columns, setColumns] = useState<KanbanColumn[]>(defaultColumns);
  const [items, setItems] = useState<TaskBoardItem[]>(() =>
    tasks.map((task) => ({
      task,
      columnId: initialColumn(task),
    })),
  );
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [celebration, setCelebration] = useState<CelebrationKind | null>(null);
  const [noteTask, setNoteTask] = useState<TaskInstance | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteMessage, setNoteMessage] = useState('');
  const [observedTaskIds, setObservedTaskIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => new Date());
  const celebrationTimer = useRef<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isNotePending, startNoteTransition] = useTransition();

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  const taskCountByColumn = useMemo(() => {
    return columns.reduce<Record<string, number>>((acc, column) => {
      acc[column.id] = items.filter((item) => item.columnId === column.id).length;
      return acc;
    }, {});
  }, [columns, items]);

  function showCelebration(kind: CelebrationKind) {
    if (celebrationTimer.current) {
      window.clearTimeout(celebrationTimer.current);
    }

    setCelebration(null);
    window.requestAnimationFrame(() => {
      setCelebration(kind);
      celebrationTimer.current = window.setTimeout(() => {
        setCelebration(null);
        celebrationTimer.current = null;
      }, kind === 'day' ? 3600 : 2400);
    });
  }

  function moveTask(taskId: string, column: KanbanColumn) {
    const currentItem = items.find((item) => item.task.id === taskId);
    const currentColumn = columns.find((itemColumn) => itemColumn.id === currentItem?.columnId);
    if (!currentItem || !currentColumn || currentItem.columnId === column.id) return;

    if (currentColumn.kind === 'finished' && column.kind !== 'finished') {
      setMessage('Tarefas finalizadas não podem ser movidas para outro bloco.');
      return;
    }

    if (currentColumn.kind === 'doing' && column.kind !== 'doing' && column.kind !== 'finished') {
      setMessage('Tarefas em andamento só podem ser movidas para Finalizadas.');
      return;
    }

    const nextItems = items.map((item) => (item.task.id === taskId ? { ...item, columnId: column.id } : item));
    setItems(nextItems);
    const task = currentItem.task;
    if (column.kind === 'finished') {
      const finishedColumnIds = new Set(columns.filter((itemColumn) => itemColumn.kind === 'finished').map((itemColumn) => itemColumn.id));
      const allTasksFinished = nextItems.length > 0 && nextItems.every((item) => finishedColumnIds.has(item.columnId));
      showCelebration(allTasksFinished ? 'day' : 'task');
    }

    startTransition(async () => {
      setMessage('');
      const result =
        column.kind === 'doing'
          ? await startTaskAction(actionFormData(taskId))
          : column.kind === 'finished'
            ? await completeTaskAction(actionFormData(taskId, 'Concluída pelo Kanban.'))
            : { ok: true, message: '' };

      if (!result.ok) {
        setMessage(result.message);
        setItems((current) => current.map((item) => (item.task.id === taskId ? { ...item, columnId: initialColumn(task) } : item)));
        if (column.kind === 'finished' && celebrationTimer.current) {
          window.clearTimeout(celebrationTimer.current);
          celebrationTimer.current = null;
          setCelebration(null);
        }
        return;
      }

      if (column.kind === 'doing' || column.kind === 'finished') {
        router.refresh();
      }
    });
  }

  function completeTask(taskId: string) {
    const finishedColumn = columns.find((column) => column.kind === 'finished') ?? defaultColumns[2];
    moveTask(taskId, finishedColumn);
  }

  function createColumn() {
    const title = newColumnTitle.trim();
    if (!title) return;
    const id = `custom-${Date.now()}`;
    setColumns((current) => [...current, { id, title, kind: 'custom' }]);
    setNewColumnTitle('');
  }

  function openNote(task: TaskInstance) {
    setNoteTask(task);
    setNoteText('');
    setNoteMessage('');
  }

  function closeNote() {
    if (isNotePending) return;
    setNoteTask(null);
    setNoteText('');
    setNoteMessage('');
  }

  function saveNote() {
    if (!noteTask) return;
    const cleanNote = noteText.trim();
    if (!cleanNote) {
      setNoteMessage('Digite a observação da tarefa.');
      return;
    }
    const formData = actionFormData(noteTask.id, cleanNote);
    startNoteTransition(async () => {
      const result = await addTaskObservationAction(formData);
      if (!result.ok) {
        setNoteMessage(result.message);
        return;
      }
      setObservedTaskIds((current) => new Set(current).add(noteTask.id));
      setNoteTask(null);
      setNoteText('');
      setNoteMessage('');
      router.refresh();
    });
  }

  return (
    <section className="space-y-5">
      {celebration ? (
        <div className="pointer-events-none fixed inset-0 z-[100] grid place-items-center">
          <div className={`celebration-burst ${celebration === 'day' ? 'day-complete' : ''}`}>
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <strong>
              {celebration === 'day' ? (
                <>
                  <i className="bonbon-icon" aria-hidden="true" />
                  <em>Parabéns, seu dia ficou mais doce</em>
                </>
              ) : (
                'Parabéns!'
              )}
            </strong>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow text-[var(--stone)]">Kanban operacional</p>
          <h2 className="display mt-2 text-2xl text-[var(--noir)] sm:text-3xl">Tarefas do dia</h2>
        </div>
        <div className="flex w-full gap-2 sm:w-auto sm:max-w-md">
          <input
            value={newColumnTitle}
            onChange={(event) => setNewColumnTitle(event.target.value)}
            placeholder="Novo bloco"
            className="min-h-11 min-w-0 flex-1 rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 text-sm text-[var(--noir)] outline-none focus:border-[var(--gold)]"
          />
          <button
            type="button"
            onClick={createColumn}
            className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-5 text-sm font-semibold text-[var(--noir)] hover:border-[var(--gold)]"
          >
            Criar
          </button>
        </div>
      </div>

      {message ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{message}</p> : null}

      {noteTask ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Observação da tarefa</p>
                <h3 className="mt-1 text-lg font-semibold leading-snug text-slate-950">{noteTask.title_snapshot}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {shortTime(noteTask.scheduled_start)} - {shortTime(noteTask.scheduled_due)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeNote}
                disabled={isNotePending}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-xl leading-none text-slate-600 transition hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Fechar observação"
              >
                ×
              </button>
            </div>

            <label className="mt-5 grid gap-2 text-sm font-semibold text-slate-700">
              <span>Digite a observação</span>
              <textarea
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                rows={6}
                placeholder="Ex.: paciente pediu retorno, confirmou interesse, ficou de enviar documento..."
                className="min-h-36 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[var(--gold)]"
              />
            </label>

            {noteMessage ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{noteMessage}</p> : null}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeNote}
                disabled={isNotePending}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveNote}
                disabled={isNotePending}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isNotePending ? 'Salvando...' : 'Salvar observação'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto pb-3">
        <div className="grid min-h-[29rem] grid-flow-col auto-cols-[minmax(17rem,calc(100vw-2rem))] gap-3 sm:auto-cols-[19rem] lg:grid-flow-row lg:grid-cols-3 lg:auto-cols-auto">
          {columns.map((column) => (
            <article
              key={column.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const taskId = draggedTaskId || event.dataTransfer.getData('text/plain');
                if (taskId) moveTask(taskId, column);
              }}
              className="min-w-0 rounded-2xl border border-[#ece5da] bg-[#f4f2f0] p-2.5"
            >
              <header className="mb-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-[#252525]">{column.title}</h3>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[var(--stone)]">
                    {taskCountByColumn[column.id] ?? 0}
                  </span>
                </div>
              </header>

              <div className="grid gap-3">
                {items
                  .filter((item) => item.columnId === column.id)
                  .map(({ task }) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(event) => {
                        setDraggedTaskId(task.id);
                        event.dataTransfer.setData('text/plain', task.id);
                      }}
                      onDragEnd={() => setDraggedTaskId('')}
                      className="group rounded-lg border border-[#ded8cf] bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => completeTask(task.id)}
                          disabled={isPending || column.kind === 'finished'}
                          className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border text-sm transition ${
                            column.kind === 'finished'
                              ? 'border-[var(--gold)] bg-[var(--gold)] text-[#14110d]'
                              : 'border-[#cfc7bd] bg-[#fbf9f5] text-transparent hover:border-[var(--gold)] hover:text-[var(--gold)]'
                          }`}
                          aria-label={`Concluir ${task.title_snapshot}`}
                        >
                          ✓
                        </button>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold leading-snug text-[#252525]">{task.title_snapshot}</h4>
                          <p className="mt-1.5 break-words text-xs leading-5 text-[var(--stone)]">
                            {task.description_snapshot || task.sector_name_snapshot}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[0.68rem] font-semibold text-[var(--stone)]">
                        <span>
                          {shortTime(task.scheduled_start)} - {shortTime(task.scheduled_due)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openNote(task)}
                            className={`grid h-7 w-7 place-items-center rounded-full border transition ${
                              observedTaskIds.has(task.id)
                                ? 'border-[#c99e67] bg-[#f4eadb] text-[#14110d]'
                                : 'border-[#ded8cf] bg-[#fbf9f5] text-slate-500 hover:border-[#c99e67] hover:text-[#14110d]'
                            }`}
                            aria-label={`Adicionar observação em ${task.title_snapshot}`}
                            title="Adicionar observação"
                          >
                            <NoteIcon />
                          </button>
                          <span className={`rounded-full px-2.5 py-1 ${timingBadgeClass(task, now)}`}>{statusLabel(task)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
