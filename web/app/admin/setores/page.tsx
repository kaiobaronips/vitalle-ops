import { OpsShell } from '@/components/vitalle/OpsShell';
import { SectorForm } from '@/components/vitalle/VitalleForms';
import { getVitalleMe, getVitalleSectors } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

function SectorStatusBadge({ status }: { status?: string }) {
  const isActive = (status ?? 'active').toLowerCase() === 'active';
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${isActive ? 'border-emerald-200 bg-emerald-100 text-emerald-800' : 'border-rose-200 bg-rose-100 text-rose-800'}`}>
      {isActive ? 'ativo' : 'inativo'}
    </span>
  );
}

export default async function AdminSetoresPage() {
  const [meResult, sectorsResult] = await Promise.all([getVitalleMe(), getVitalleSectors()]);
  const me = meResult.data;
  const sectors = sectorsResult.data.items ?? [];

  return (
    <OpsShell principal={me} title="Setores" subtitle="Cadastre e edite setores, responsáveis e status operacional.">
      <section className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-950">Novo setor</h3>
          <div className="mt-4">
            <SectorForm />
          </div>
        </div>

        <div className="grid content-start gap-3 sm:grid-cols-2">
          {sectors.map((sector) => (
            <details key={sector.id} className="rounded-lg border border-slate-200 bg-white shadow-sm" open={false}>
              <summary className="flex min-h-20 cursor-pointer list-none flex-col justify-between gap-3 px-4 py-3">
                <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{sector.name}</h3>
                <SectorStatusBadge status={sector.status} />
              </summary>
              <div className="border-t border-slate-100 p-4">
                <SectorForm sector={sector} />
              </div>
            </details>
          ))}
        </div>
      </section>
    </OpsShell>
  );
}
