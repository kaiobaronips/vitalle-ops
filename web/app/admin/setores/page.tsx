import { OpsShell } from '@/components/vitalle/OpsShell';
import { AdminSectorTaskBoard } from '@/components/vitalle/AdminSectorTaskBoard';
import { requireVitalleAdmin } from '@/lib/vitalle-access';
import { getVitalleSectors, getVitalleTaskTemplates } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

export default async function AdminSetoresPage() {
  const me = await requireVitalleAdmin();
  const [sectorsResult, tasksResult] = await Promise.all([getVitalleSectors(), getVitalleTaskTemplates()]);
  const sectors = sectorsResult.data.items ?? [];
  const tasks = tasksResult.data.items ?? [];

  return (
    <OpsShell principal={me} title="Setores" subtitle="Base operacional de tarefas por setor. Alterações aqui refletem em todo o sistema.">
      <AdminSectorTaskBoard sectors={sectors} tasks={tasks} />
    </OpsShell>
  );
}
