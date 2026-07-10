import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OpsShell } from '@/components/vitalle/OpsShell';
import { AlertCard, GoalProgress, StatusPill, TaskCard } from '@/components/vitalle/VitalleCards';
import { getVitalleMe, getVitalleSector } from '@/lib/vitalle-api';
import type { TaskInstance } from '@/lib/vitalle-types';

export const dynamic = 'force-dynamic';

export default async function SectorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [meResult, sectorResult] = await Promise.all([getVitalleMe(), getVitalleSector(slug)]);
  const me = meResult.data;
  const detail = sectorResult.data;
  if (!detail.sector?.id) notFound();
  const orderedTasks: TaskInstance[] = [
    ...(detail.tasks.OVERDUE ?? []),
    ...(detail.tasks.NOW ?? []),
    ...(detail.tasks.IN_PROGRESS ?? []),
    ...(detail.tasks.UPCOMING ?? []),
    ...(detail.tasks.COMPLETED ?? []),
  ];

  return (
    <OpsShell principal={me} title={detail.sector.name} subtitle={detail.sector.description}>
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</div>
          <div className="mt-2">
            <StatusPill value={detail.compliance.score >= 90 ? 'EM DIA' : 'ATENCAO'} />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conformidade</div>
          <div className="mt-2 text-3xl font-semibold text-slate-950">{Math.round(detail.compliance.score)}%</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pontualidade</div>
          <div className="mt-2 text-3xl font-semibold text-slate-950">{Math.round(detail.compliance.punctuality)}%</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conclusão</div>
          <div className="mt-2 text-3xl font-semibold text-slate-950">{Math.round(detail.compliance.conclusion)}%</div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Operação</div>
          <h3 className="mt-1 text-2xl font-semibold text-slate-950">Tarefas do setor</h3>
          <div className="mt-4 grid gap-4">
            {orderedTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </article>

        <article className="grid gap-6">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Meta</div>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950">Acompanhamento</h3>
            <div className="mt-4 grid gap-3">
              {orderedTasks.filter((task) => (task.goal_target_snapshot ?? 0) > 0).map((task) => (
                <div key={task.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="font-semibold text-slate-950">{task.title_snapshot}</div>
                  <div className="mt-2">
                    <GoalProgress current={task.goal_current ?? 0} target={task.goal_target_snapshot ?? 0} unit={task.goal_unit_snapshot || ''} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Alertas</div>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950">Ocorrências do setor</h3>
            <div className="mt-4 grid gap-3">
              {(detail.alerts ?? []).map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
              {!(detail.alerts ?? []).length ? <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">Sem alertas ativos para este setor.</div> : null}
            </div>
          </div>
        </article>
      </section>

      <div>
        <Link href="/setores" className="text-sm font-semibold text-slate-700 underline underline-offset-4">
          Voltar para setores
        </Link>
      </div>
    </OpsShell>
  );
}
