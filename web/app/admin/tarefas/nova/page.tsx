import { OpsShell } from '@/components/vitalle/OpsShell';
import { TaskTemplateForm } from '@/components/vitalle/VitalleForms';
import { requireVitalleAdmin } from '@/lib/vitalle-access';
import { getVitalleSectors } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

export default async function NovaTarefaPage() {
  const me = await requireVitalleAdmin();
  const sectorsResult = await getVitalleSectors();
  const sectors = sectorsResult.data.items ?? [];

  return (
    <OpsShell principal={me} title="Nova Tarefa" subtitle="Crie uma tarefa diária para um setor.">
      <TaskTemplateForm sectors={sectors} />
    </OpsShell>
  );
}
