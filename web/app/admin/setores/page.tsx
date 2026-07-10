import { OpsShell } from '@/components/vitalle/OpsShell';
import { SectorForm } from '@/components/vitalle/VitalleForms';
import { StatusPill } from '@/components/vitalle/VitalleCards';
import { getVitalleMe, getVitalleSectors, getVitalleUsers } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

export default async function AdminSetoresPage() {
  const [meResult, sectorsResult, usersResult] = await Promise.all([getVitalleMe(), getVitalleSectors(), getVitalleUsers()]);
  const me = meResult.data;
  const sectors = sectorsResult.data.items ?? [];
  const users = usersResult.data.items ?? [];

  return (
    <OpsShell principal={me} title="Setores" subtitle="Cadastre e edite setores, responsáveis e identidade visual.">
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-950">Novo setor</h3>
          <div className="mt-4">
            <SectorForm users={users as Array<Record<string, unknown>>} />
          </div>
        </div>

        <div className="grid gap-4">
          {sectors.map((sector) => (
            <details key={sector.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" open={false}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{sector.slug}</div>
                  <div className="mt-1 text-lg font-semibold text-slate-950">{sector.name}</div>
                </div>
                <StatusPill value={sector.status || 'active'} />
              </summary>
              <div className="mt-4">
                <SectorForm sector={sector} users={users as Array<Record<string, unknown>>} />
              </div>
            </details>
          ))}
        </div>
      </section>
    </OpsShell>
  );
}
