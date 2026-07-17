import Link from 'next/link';
import { redirect } from 'next/navigation';
import { OpsShell } from '@/components/vitalle/OpsShell';
import { StatusPill } from '@/components/vitalle/VitalleCards';
import { requireVitalleSession } from '@/lib/vitalle-access';

export const dynamic = 'force-dynamic';

export default async function SetoresPage() {
  const me = await requireVitalleSession();
  if (me.admin_like) {
    redirect('/admin/setores');
  }

  return (
    <OpsShell principal={me} title="Setores" subtitle="Visão dos setores configurados na unidade.">
      <section className="grid gap-4 md:grid-cols-2">
        {me.sectors.map((sector) => (
          <Link key={sector.id} href={`/setores/${sector.slug}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{sector.slug}</div>
                <h3 className="mt-1 text-lg font-semibold text-slate-950">{sector.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{sector.description}</p>
              </div>
              <StatusPill value={sector.health_state || 'ATENCAO'} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Total</div>
                <div className="mt-1 font-semibold text-slate-950">{sector.task_count ?? 0}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Pendentes</div>
                <div className="mt-1 font-semibold text-slate-950">{Math.max((sector.task_count ?? 0) - (sector.completed_count ?? 0), 0)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Atrasadas</div>
                <div className="mt-1 font-semibold text-slate-950">{sector.overdue_count ?? 0}</div>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </OpsShell>
  );
}
