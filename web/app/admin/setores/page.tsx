import { OpsShell } from '@/components/vitalle/OpsShell';
import { AdminSectorTaskBoard } from '@/components/vitalle/AdminSectorTaskBoard';
import { getVitalleDashboard, getVitalleMe, getVitalleSectors } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

export default async function AdminSetoresPage() {
  const [meResult, sectorsResult, dashboardResult] = await Promise.all([
    getVitalleMe(),
    getVitalleSectors(),
    getVitalleDashboard(),
  ]);
  const me = meResult.data;
  const sectors = sectorsResult.data.items ?? [];
  const tasks = dashboardResult.data.tasks ?? [];

  return (
    <OpsShell principal={me} title="Setores" subtitle="Acompanhe as tarefas operacionais de hoje por setor e crie novas rotinas rapidamente.">
      <AdminSectorTaskBoard sectors={sectors} tasks={tasks} />
    </OpsShell>
  );
}
