import { OpsShell } from '@/components/vitalle/OpsShell';
import { requireVitalleAdmin } from '@/lib/vitalle-access';
import { getVitalleHistory } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

function shortTime(value: string) {
  return String(value || '').slice(0, 5);
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    COMPLETED: 'Finalizada',
    IN_PROGRESS: 'Em andamento',
    PENDING: 'Pendente',
    BLOCKED: 'Bloqueada',
    OVERDUE: 'Atrasada',
    JUSTIFIED: 'Justificada',
    NOT_APPLICABLE: 'Não aplicável',
  };
  return labels[value] ?? value.replaceAll('_', ' ');
}

export default async function HistoricoPage({ searchParams }: { searchParams?: Promise<{ start_date?: string; end_date?: string }> }) {
  const params = (await searchParams) ?? {};
  const me = await requireVitalleAdmin();
  const historyResult = await getVitalleHistory(params.start_date, params.end_date);
  const items = historyResult.data.items ?? [];

  return (
    <OpsShell principal={me} title="Histórico" subtitle="Consulte o fechamento e a execução de dias anteriores.">
      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4" method="get">
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          <span className="text-xs uppercase tracking-wide text-slate-500">Data inicial</span>
          <input type="date" name="start_date" defaultValue={params.start_date ?? ''} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          <span className="text-xs uppercase tracking-wide text-slate-500">Data final</span>
          <input type="date" name="end_date" defaultValue={params.end_date ?? ''} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <div className="flex items-end">
          <button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            Filtrar
          </button>
        </div>
      </form>

      <section className="grid gap-4">
        {items.map((item) => (
          <details key={item.operational_date} className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <summary className="cursor-pointer list-none px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Relatório do dia</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">{item.operational_date}</h2>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs sm:min-w-[28rem]">
                  <span className="rounded-lg bg-slate-50 px-3 py-2"><b className="block text-slate-950">{item.total_tasks}</b>Total</span>
                  <span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800"><b className="block">{item.completed_tasks}</b>Finalizadas</span>
                  <span className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800"><b className="block">{item.overdue_tasks}</b>Atrasadas</span>
                  <span className="rounded-lg bg-rose-50 px-3 py-2 text-rose-800"><b className="block">{item.blocked_tasks}</b>Bloqueadas</span>
                </div>
              </div>
            </summary>

            <div className="grid gap-4 border-t border-slate-100 p-5">
              {(item.sectors ?? []).map((sector) => (
                <article key={`${item.operational_date}-${sector.sector_id}`} className="rounded-lg border border-slate-200">
                  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <h3 className="font-semibold text-slate-950">{sector.sector_name}</h3>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">{sector.total_tasks} tarefas</span>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">{sector.completed_tasks} finalizadas</span>
                      {sector.blocked_tasks ? <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-800">{sector.blocked_tasks} bloqueadas</span> : null}
                    </div>
                  </header>
                  <div className="divide-y divide-slate-100">
                    {sector.tasks.map((task) => (
                      <div key={task.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[1fr_auto_auto] md:items-center">
                        <div>
                          <p className="font-medium text-slate-950">{task.title}</p>
                          {task.blocker_details ? <p className="mt-1 text-xs text-rose-700">{task.blocker_details}</p> : null}
                          {(task.comments ?? []).filter((comment) => comment.comment_type === 'observation').length ? (
                            <div className="mt-2 grid gap-1.5">
                              {(task.comments ?? [])
                                .filter((comment) => comment.comment_type === 'observation')
                                .map((comment) => (
                                  <p key={comment.id} className="rounded-lg border border-[#eadfce] bg-[#fbfaf8] px-3 py-2 text-xs leading-5 text-slate-700">
                                    <span className="font-semibold text-slate-950">Observação:</span> {comment.body}
                                  </p>
                                ))}
                            </div>
                          ) : null}
                        </div>
                        <span className="text-xs text-slate-500">{shortTime(task.scheduled_start)} - {shortTime(task.scheduled_due)}</span>
                        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${task.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : task.status === 'BLOCKED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>
                          {statusLabel(task.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </details>
        ))}
      </section>
    </OpsShell>
  );
}
