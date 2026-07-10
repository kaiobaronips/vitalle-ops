import { notFound } from 'next/navigation';
import { OpsShell } from '@/components/vitalle/OpsShell';
import { TaskTemplateForm } from '@/components/vitalle/VitalleForms';
import { getVitalleMe, getVitalleSectors, getVitalleTaskTemplate } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

export default async function EditarTarefaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [meResult, sectorsResult, templateResult] = await Promise.all([getVitalleMe(), getVitalleSectors(), getVitalleTaskTemplate(id)]);
  const me = meResult.data;
  const sectors = sectorsResult.data.items ?? [];
  const template = templateResult.data;
  if (!template.id) notFound();

  return (
    <OpsShell principal={me} title="Editar tarefa" subtitle={template.title}>
      <TaskTemplateForm template={template} sectors={sectors} />
    </OpsShell>
  );
}
