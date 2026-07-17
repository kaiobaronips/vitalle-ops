import { notFound } from 'next/navigation';
import { OpsShell } from '@/components/vitalle/OpsShell';
import { TaskTemplateForm } from '@/components/vitalle/VitalleForms';
import { requireVitalleAdmin } from '@/lib/vitalle-access';
import { getVitalleSectors, getVitalleTaskTemplate } from '@/lib/vitalle-api';

export const dynamic = 'force-dynamic';

export default async function EditarTarefaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireVitalleAdmin();
  const [sectorsResult, templateResult] = await Promise.all([getVitalleSectors(), getVitalleTaskTemplate(id)]);
  const sectors = sectorsResult.data.items ?? [];
  const template = templateResult.data;
  if (!template.id) notFound();

  return (
    <OpsShell principal={me} title="Editar tarefa" subtitle={template.title}>
      <TaskTemplateForm template={template} sectors={sectors} />
    </OpsShell>
  );
}
