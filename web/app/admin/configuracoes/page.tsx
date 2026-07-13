import Link from 'next/link';
import { OpsShell } from '@/components/vitalle/OpsShell';
import { getVitalleMe } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

const options = [
  {
    href: '/admin/tarefas/nova',
    title: 'Nova Tarefa',
    description: 'Crie uma tarefa específica para um setor, definindo nome, setor responsável e horário.',
    actionLabel: 'Criar tarefa',
  },
  {
    href: '/admin/setores',
    title: 'Novo Setor',
    description: 'Cadastre um novo setor operacional para organizar rotinas, responsáveis e tarefas do dia.',
    actionLabel: 'Criar Setor',
  },
];

export default async function AdminConfiguracoesPage() {
  const meResult = await getVitalleMe();
  const me = meResult.data;

  return (
    <OpsShell principal={me} title="Configurações" subtitle="Adicione e remova opções operacionais do sistema.">
      <section className="grid gap-5 md:grid-cols-2">
        {options.map((option) => (
          <Link
            key={option.href}
            href={option.href}
            className="group rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-7 transition hover:-translate-y-0.5 hover:border-[var(--gold)] hover:shadow-md"
          >
            <h2 className="display text-4xl leading-none text-[var(--noir)]">{option.title}</h2>
            <p className="mt-5 max-w-xl text-sm leading-6 text-[var(--stone)]">{option.description}</p>
            <div className="gold-rule mt-6 w-20" />
            <span className="mt-7 inline-flex rounded-full border border-[var(--line)] px-5 py-2 text-sm font-semibold text-[var(--noir)] group-hover:border-[var(--gold)]">
              {option.actionLabel}
            </span>
          </Link>
        ))}
      </section>
    </OpsShell>
  );
}
