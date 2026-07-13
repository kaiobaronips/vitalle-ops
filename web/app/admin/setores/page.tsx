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
    <OpsShell principal={me} title="Setores" subtitle="Base operacional de tarefas por setor. Alterações aqui refletem em todo o sistema.">
      <AdminSectorTaskBoard sectors={sectors} tasks={tasks} />
    </OpsShell>
  );
}
