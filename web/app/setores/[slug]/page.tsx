import { notFound } from 'next/navigation';
import { CandyRewardTracker, type CandyRewardDay } from '@/components/vitalle/CandyRewardTracker';
import { OpsShell } from '@/components/vitalle/OpsShell';
import { SectorKanban } from '@/components/vitalle/SectorKanban';
import { getVitalleMe, getVitalleSector, getVitalleSectorRewardSummary } from '@/lib/vitalle-api';
import type { SectorRewardDaySummary, TaskInstance } from '@/lib/vitalle-types';

export const dynamic = 'force-dynamic';

const completedStatuses = new Set(['COMPLETED', 'JUSTIFIED', 'NOT_APPLICABLE']);
const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

function timeZoneDate(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function formatDate(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function weekRange(today: string) {
  const current = parseDate(today);
  const day = current.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const monday = addDays(current, -daysSinceMonday);
  const saturday = addDays(monday, 5);
  return {
    start: formatDate(monday),
    end: formatDate(saturday),
    dates: Array.from({ length: 6 }, (_, index) => formatDate(addDays(monday, index))),
  };
}

function buildCandyRewardDays({
  tasks,
  rewardSummary,
  today,
}: {
  tasks: TaskInstance[];
  rewardSummary: SectorRewardDaySummary[];
  today: string;
}): CandyRewardDay[] {
  const range = weekRange(today);
  const byDate = new Map<string, { totalTasks: number; completedTasks: number }>();

  for (const item of rewardSummary) {
    byDate.set(String(item.operational_date).slice(0, 10), {
      totalTasks: Number(item.total_tasks ?? 0),
      completedTasks: Number(item.completed_tasks ?? 0),
    });
  }

  const todayCompletedTasks = tasks.filter((task) => completedStatuses.has(task.status.toUpperCase())).length;
  byDate.set(today, {
    totalTasks: tasks.length,
    completedTasks: todayCompletedTasks,
  });

  return range.dates.map((date, index) => {
    const stats = byDate.get(date) ?? { totalTasks: 0, completedTasks: 0 };
    return {
      date,
      label: dayLabels[index] ?? date,
      complete: stats.totalTasks > 0 && stats.completedTasks >= stats.totalTasks,
      isToday: date === today,
      totalTasks: stats.totalTasks,
      completedTasks: stats.completedTasks,
    };
  });
}

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
  const today = orderedTasks[0]?.operational_date?.slice(0, 10) || timeZoneDate(me.timezone || 'America/Sao_Paulo');
  const range = weekRange(today);
  const rewardResult = await getVitalleSectorRewardSummary(detail.sector.id, range.start, range.end);
  const rewardDays = buildCandyRewardDays({
    tasks: orderedTasks,
    rewardSummary: rewardResult.data.items ?? [],
    today,
  });

  return (
    <OpsShell
      principal={me}
      title={detail.sector.name}
      subtitle="Arraste as tarefas entre os blocos ou marque o check ao concluir."
      headerAction={<CandyRewardTracker days={rewardDays} />}
    >
      <SectorKanban tasks={orderedTasks} />
    </OpsShell>
  );
}
