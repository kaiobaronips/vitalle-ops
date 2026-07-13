import { OpsShell } from '@/components/vitalle/OpsShell';
import { AdminSectorTaskBoard } from '@/components/vitalle/AdminSectorTaskBoard';
import { getVitalleMe, getVitalleSectors, getVitalleTaskTemplates } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

export default async function AdminSetoresPage() {
  const [meResult, sectorsResult, tasksResult] = await Promise.all([
    getVitalleMe(),
    getVitalleSectors(),
    getVitalleTaskTemplates(),
  ]);
  const me = meResult.data;
  const sectors = sectorsResult.data.items ?? [];
  const tasks = tasksResult.data.items ?? [];

  return (
    <OpsShell principal={me} title="Setores" subtitle="Acompanhe as tarefas cadastradas por setor e crie novas rotinas rapidamente.">
      <AdminSectorTaskBoard sectors={sectors} tasks={tasks} />
    </OpsShell>
  );
}
