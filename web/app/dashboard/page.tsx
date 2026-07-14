import Link from 'next/link';
import { OpsShell } from '@/components/vitalle/OpsShell';
import { getVitalleMe, getVitalleSectors, getVitalleTaskTemplates } from '@/lib/vitalle-api';
import type { Sector, TaskTemplate } from '@/lib/vitalle-types';

export const dynamic = 'force-dynamic';

function shortTime(value?: string | null) {
  return String(value || '').slice(0, 5);
}

function TaskCountCard({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <article className="rounded-xl border border-[#e7dfd4] bg-white px-4 py-4 shadow-sm sm:px-5">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 break-words font-display text-3xl leading-none text-[#17130f] sm:text-4xl">{value}</p>
      <div className="mt-4 h-px w-14 bg-[var(--gold)]" />
      <p className="mt-3 text-sm text-slate-600">{detail}</p>
    </article>
  );
}

function sectorTaskSummary(sectors: Sector[], tasks: TaskTemplate[]) {
  return sectors
    .filter((sector) => sector.status !== 'inactive')
    .map((sector) => {
      const sectorTasks = tasks.filter((task) => task.sector_id === sector.id);
      const firstTask = sectorTasks[0];
      const lastTask = sectorTasks[sectorTasks.length - 1];
      return {
        sector,
        count: sectorTasks.length,
        range: firstTask && lastTask ? `${shortTime(firstTask.start_time)} - ${shortTime(lastTask.due_time)}` : 'Sem rotina',
      };
    });
}

export default async function DashboardPage() {
  const [meResult, sectorsResult, tasksResult] = await Promise.all([
    getVitalleMe(),
    getVitalleSectors(),
    getVitalleTaskTemplates(),
  ]);
  const me = meResult.data;
  const sectors = sectorsResult.data.items ?? [];
  const tasks = (tasksResult.data.items ?? [])
    .filter((task) => task.active !== false && !task.archived_at)
    .sort((a, b) => {
      const left = `${shortTime(a.start_time)}-${a.sector_name || ''}-${a.title}`;
      const right = `${shortTime(b.start_time)}-${b.sector_name || ''}-${b.title}`;
      return left.localeCompare(right, 'pt-BR');
    });

  if (!me.admin_like) {
    return (
      <OpsShell principal={me} title="OPS" subtitle="Seleção de setor">
        <section className="flex min-h-[calc(100vh-13rem)] items-center justify-center">
          <article className="max-w-md rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-8 py-10 text-center">
            <p className="display text-2xl leading-snug text-[var(--noir)]">
              Selecione qual o seu setor para iniciar o dia, tenha um ótimo dia!
            </p>
            <div className="gold-rule mx-auto mt-6 w-24" />
          </article>
        </section>
      </OpsShell>
    );
  }

  const activeSectors = sectors.filter((sector) => sector.status !== 'inactive');
  const summary = sectorTaskSummary(activeSectors, tasks);
  const configuredSectors = summary.filter((item) => item.count > 0).length;
  const emptySectors = summary.filter((item) => item.count === 0);
  const firstTask = tasks[0];
  const lastTask = tasks[tasks.length - 1];
  const dailyRange = firstTask && lastTask ? `${shortTime(firstTask.start_time)} - ${shortTime(lastTask.due_time)}` : 'Sem tarefas';
  const nextTasks = tasks.slice(0, 8);

  return (
    <OpsShell principal={me} title="Visão geral" subtitle="Resumo simples da base operacional configurada.">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TaskCountCard label="Setores" value={activeSectors.length} detail={`${configuredSectors} com tarefas cadastradas`} />
        <TaskCountCard label="Tarefas" value={tasks.length} detail="rotina diária ativa" />
        <TaskCountCard label="Cobertura" value={`${activeSectors.length ? Math.round((configuredSectors / activeSectors.length) * 100) : 0}%`} detail="setores com rotina" />
        <TaskCountCard label="Horário" value={dailyRange} detail="primeira e última tarefa" />
      </section>

      {emptySectors.length ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <span className="font-semibold">Atenção:</span>{' '}
          {emptySectors.map((item) => item.sector.name).join(', ')} sem tarefas cadastradas.
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-xl border border-[#e7dfd4] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Setores</p>
              <h2 className="mt-1 text-xl font-semibold text-[#17130f]">Base por setor</h2>
            </div>
            <Link href="/admin/setores" className="w-full rounded-lg border border-[#d9cbb8] px-3 py-2 text-center text-sm font-semibold text-[#17130f] transition hover:border-[#c99b55] sm:w-auto">
              Ver setores
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            {summary.map((item) => (
              <div key={item.sector.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#eee7dc] bg-[#fbfaf8] px-4 py-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-[#17130f]">{item.sector.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.range}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[#17130f] px-3 py-1 text-xs font-semibold text-white">
                  {item.count} {item.count === 1 ? 'tarefa' : 'tarefas'}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-[#e7dfd4] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Agenda</p>
              <h2 className="mt-1 text-xl font-semibold text-[#17130f]">Primeiras tarefas do dia</h2>
            </div>
            <Link href="/admin/configuracoes" className="w-full rounded-lg border border-[#d9cbb8] px-3 py-2 text-center text-sm font-semibold text-[#17130f] transition hover:border-[#c99b55] sm:w-auto">
              Configurar
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            {nextTasks.length ? (
              nextTasks.map((task) => (
                <div key={task.id} className="grid grid-cols-[3.75rem_1fr] gap-3 rounded-lg border border-[#eee7dc] bg-[#fbfaf8] px-4 py-3 sm:grid-cols-[4.5rem_1fr]">
                  <p className="text-sm font-semibold text-[#17130f]">{shortTime(task.start_time)}</p>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-[#17130f]">{task.title}</p>
                    <p className="mt-1 break-words text-xs text-slate-500">{task.sector_name}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-[#d8d0c4] bg-[#fbfaf8] p-4 text-sm text-slate-500">
                Nenhuma tarefa cadastrada.
              </div>
            )}
          </div>
        </article>
      </section>
    </OpsShell>
  );
}
