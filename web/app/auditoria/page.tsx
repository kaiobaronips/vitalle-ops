import { OpsShell } from '@/components/vitalle/OpsShell';
import { getVitalleAudit, getVitalleMe } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

export default async function AuditoriaPage() {
  const [meResult, auditResult] = await Promise.all([getVitalleMe(), getVitalleAudit()]);
  const me = meResult.data;
  const events = auditResult.data.items ?? [];

  return (
    <OpsShell principal={me} title="Auditoria" subtitle="Eventos append-only de execução, correção e governança.">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Quando</th>
              <th className="px-4 py-3">Evento</th>
              <th className="px-4 py-3">Entidade</th>
              <th className="px-4 py-3">Autor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {events.map((event) => (
              <tr key={event.id}>
                <td className="px-4 py-3 font-semibold text-slate-950">{new Date(event.timestamp).toLocaleString('pt-BR')}</td>
                <td className="px-4 py-3 text-slate-600">{event.event_type}</td>
                <td className="px-4 py-3 text-slate-600">
                  {event.entity_type} / {event.entity_id}
                </td>
                <td className="px-4 py-3 text-slate-600">{event.actor_name || event.actor_user_id || 'Sistema'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </OpsShell>
  );
}
