import Link from 'next/link';
import { OpsShell } from '@/components/vitalle/OpsShell';
import { StatusPill } from '@/components/vitalle/VitalleCards';
import { archiveTaskAction, activateTaskAction, duplicateTaskAction } from '@/app/vitalle-actions';
import { getVitalleMe, getVitalleTaskTemplates } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

function TaskTemplateActions({ id, active }: { id: string; active?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={duplicateTaskAction as unknown as (formData: FormData) => void}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          Duplicar
        </button>
      </form>
      {active ? (
        <form action={archiveTaskAction as unknown as (formData: FormData) => void}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            Arquivar
          </button>
        </form>
      ) : (
        <form action={activateTaskAction as unknown as (formData: FormData) => void}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            Ativar
          </button>
        </form>
      )}
    </div>
  );
}

export default async function AdminTarefasPage() {
  const [meResult, templatesResult] = await Promise.all([getVitalleMe(), getVitalleTaskTemplates()]);
  const me = meResult.data;
  const templates = templatesResult.data.items ?? [];

  return (
    <OpsShell principal={me} title="Tarefas e POPs" subtitle="Crie, edite e governe os templates operacionais da clínica.">
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/tarefas/nova" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          Criar tarefa
        </Link>
        <Link href="/admin/setores" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
          Setores
        </Link>
      </div>

      <section className="grid gap-4">
        {templates.map((template) => (
          <article key={template.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{template.sector_name}</div>
                <h3 className="mt-1 text-lg font-semibold text-slate-950">{template.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{template.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill value={template.active ? 'ATIVA' : 'INATIVA'} />
                <StatusPill value={template.priority || 'NORMAL'} />
                {template.is_critical ? <StatusPill value="CRITICAL" /> : null}
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
              <div>Horário: {String(template.start_time).slice(0, 5)}</div>
              <div>Prazo: {String(template.due_time).slice(0, 5)}</div>
              <div>Recorrência: {template.recurrence_type || 'DAILY'}</div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Link href={`/admin/tarefas/${template.id}`} className="text-sm font-semibold text-slate-700 underline underline-offset-4">
                Editar
              </Link>
              <TaskTemplateActions id={template.id} active={template.active} />
            </div>
          </article>
        ))}
      </section>
    </OpsShell>
  );
}
