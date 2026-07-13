import { OpsShell } from '@/components/vitalle/OpsShell';
import { TaskTemplateForm } from '@/components/vitalle/VitalleForms';
import { getVitalleMe, getVitalleSectors } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

export default async function NovaTarefaPage() {
  const [meResult, sectorsResult] = await Promise.all([getVitalleMe(), getVitalleSectors()]);
  const me = meResult.data;
  const sectors = sectorsResult.data.items ?? [];

  return (
    <OpsShell principal={me} title="Nova Tarefa" subtitle="Crie uma tarefa diária para um setor.">
      <TaskTemplateForm sectors={sectors} />
    </OpsShell>
  );
}
