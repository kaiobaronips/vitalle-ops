import { notFound } from 'next/navigation';
import { OpsShell } from '@/components/vitalle/OpsShell';
import { SectorKanban } from '@/components/vitalle/SectorKanban';
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
    <OpsShell principal={me} title={detail.sector.name} subtitle="Arraste as tarefas entre os blocos ou marque o check ao concluir.">
      <SectorKanban tasks={orderedTasks} />
    </OpsShell>
  );
}
