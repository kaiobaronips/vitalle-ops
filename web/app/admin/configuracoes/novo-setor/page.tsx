import Link from 'next/link';
import { OpsShell } from '@/components/vitalle/OpsShell';
import { SectorForm } from '@/components/vitalle/VitalleForms';
import { requireVitalleAdmin } from '@/lib/vitalle-access';

export const dynamic = 'force-dynamic';

export default async function NovoSetorConfiguracoesPage() {
  const me = await requireVitalleAdmin();

  return (
    <OpsShell principal={me} title="Configurações" subtitle="Cadastre um novo setor operacional.">
      <section className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow text-[var(--stone)]">Novo Setor</p>
            <h2 className="display mt-2 text-3xl text-[var(--noir)]">Criar setor</h2>
          </div>
          <Link href="/admin/configuracoes" className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm font-semibold text-[var(--noir)]">
            Voltar
          </Link>
        </div>

        <div className="max-w-4xl">
          <SectorForm />
        </div>
      </section>
    </OpsShell>
  );
}
