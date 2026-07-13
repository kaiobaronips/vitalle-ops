'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { completeTaskAction, startTaskAction } from '@/app/vitalle-actions';
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

function actionFormData(taskId: string, comment = '') {
  const formData = new FormData();
  formData.set('id', taskId);
  if (comment) formData.set('comment', comment);
  return formData;
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
  const celebrationTimer = useRef<number | null>(null);
  const [isPending, startTransition] = useTransition();

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

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-[var(--stone)]">Kanban operacional</p>
          <h2 className="display mt-2 text-3xl text-[var(--noir)]">Tarefas do dia</h2>
        </div>
        <div className="flex w-full max-w-md gap-2 sm:w-auto">
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

      <div className="pb-3">
        <div className="grid min-h-[32rem] grid-cols-1 gap-3 lg:grid-cols-3">
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
                          <p className="mt-1.5 text-xs leading-5 text-[var(--stone)]">
                            {task.description_snapshot || task.sector_name_snapshot}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[0.68rem] font-semibold text-[var(--stone)]">
                        <span>
                          {shortTime(task.scheduled_start)} - {shortTime(task.scheduled_due)}
                        </span>
                        <span className="rounded-full bg-[#f6f1ea] px-2.5 py-1">{statusLabel(task)}</span>
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
