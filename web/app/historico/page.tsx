import { OpsShell } from '@/components/vitalle/OpsShell';
import { getVitalleHistory, getVitalleMe } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

export default async function HistoricoPage({ searchParams }: { searchParams?: Promise<{ start_date?: string; end_date?: string }> }) {
  const params = (await searchParams) ?? {};
  const [meResult, historyResult] = await Promise.all([getVitalleMe(), getVitalleHistory(params.start_date, params.end_date)]);
  const me = meResult.data;
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

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Concluídas</th>
              <th className="px-4 py-3">Atrasadas</th>
              <th className="px-4 py-3">Bloqueadas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item) => (
              <tr key={item.operational_date}>
                <td className="px-4 py-3 font-semibold text-slate-950">{item.operational_date}</td>
                <td className="px-4 py-3 text-slate-600">{item.operation_status}</td>
                <td className="px-4 py-3">{item.total_tasks}</td>
                <td className="px-4 py-3">{item.completed_tasks}</td>
                <td className="px-4 py-3">{item.overdue_tasks}</td>
                <td className="px-4 py-3">{item.blocked_tasks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </OpsShell>
  );
}
