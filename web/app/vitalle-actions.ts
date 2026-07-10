'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  addVitalleGoalEntry,
  archiveVitalleTaskTemplate,
  activateVitalleTaskTemplate,
  blockVitalleTask,
  completeVitalleSubtask,
  completeVitalleTask,
  duplicateVitalleTaskTemplate,
  markVitalleTaskNotApplicable,
  reopenVitalleTask,
  resolveVitalleAlert,
  saveVitalleSector,
  saveVitalleSetting,
  saveVitalleTaskTemplate,
  saveVitalleUser,
  startVitalleTask,
  syncVitalleOperation,
} from '@/lib/vitalle-api';
import { vitalleDevSessionCookieName, type VitalleDevSession } from '@/lib/vitalle-session';
import { getSessionToken, refreshCookieName, sessionCookieName } from '@/lib/session';
import { revokeSupabaseSession } from '@/lib/supabase-auth';

export type ActionState = {
  ok: boolean;
  message: string;
};

const initialError: ActionState = { ok: false, message: 'Formulário inválido.' };

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

async function revalidateVitalle() {
  revalidatePath('/dashboard');
  revalidatePath('/meu-dia');
  revalidatePath('/operacao');
  revalidatePath('/setores');
  revalidatePath('/alertas');
  revalidatePath('/historico');
  revalidatePath('/relatorios');
  revalidatePath('/auditoria');
  revalidatePath('/admin/tarefas');
  revalidatePath('/admin/setores');
  revalidatePath('/admin/usuarios');
  revalidatePath('/admin/configuracoes');
}

export async function devLoginAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const persona = text(formData, 'persona');
  const devSessions: Record<string, VitalleDevSession> = {
    admin: {
      role: 'admin',
      user_id: 'demo-admin',
      email: 'admin@vitalle.local',
      display_name: 'Admin Vitalle',
      organization_id: 'vitalle-odontologia',
      unit_id: 'vitalle-main',
      sector_id: 'sector-avaliador',
    },
    gestor: {
      role: 'manager',
      user_id: 'demo-gestor',
      email: 'gestor@vitalle.local',
      display_name: 'Gestor Vitalle',
      organization_id: 'vitalle-odontologia',
      unit_id: 'vitalle-main',
      sector_id: 'sector-avaliador',
    },
    avaliador: {
      role: 'collaborator',
      user_id: 'demo-avaliador',
      email: 'avaliador@vitalle.local',
      display_name: 'Mariana Silva',
      organization_id: 'vitalle-odontologia',
      unit_id: 'vitalle-main',
      sector_id: 'sector-avaliador',
    },
    asb: {
      role: 'collaborator',
      user_id: 'demo-asb',
      email: 'asb@vitalle.local',
      display_name: 'Ana Costa',
      organization_id: 'vitalle-odontologia',
      unit_id: 'vitalle-main',
      sector_id: 'sector-asb',
    },
    secretaria: {
      role: 'collaborator',
      user_id: 'demo-secretaria',
      email: 'secretaria@vitalle.local',
      display_name: 'Maria Ferreira',
      organization_id: 'vitalle-odontologia',
      unit_id: 'vitalle-main',
      sector_id: 'sector-secretaria',
    },
    marketing: {
      role: 'collaborator',
      user_id: 'demo-marketing',
      email: 'marketing@vitalle.local',
      display_name: 'Paula Lima',
      organization_id: 'vitalle-odontologia',
      unit_id: 'vitalle-main',
      sector_id: 'sector-marketing',
    },
  };

  const session = devSessions[persona];
  if (!session) {
    return { ok: false, message: 'Persona de desenvolvimento inválida.' };
  }

  const cookieStore = await cookies();
  cookieStore.set(vitalleDevSessionCookieName, JSON.stringify(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  const token = await getSessionToken();
  await revokeSupabaseSession(token);
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
  cookieStore.delete(refreshCookieName);
  cookieStore.delete(vitalleDevSessionCookieName);
  redirect('/login');
}

export async function syncOperationAction(): Promise<ActionState> {
  const result = await syncVitalleOperation();
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  await revalidateVitalle();
  return { ok: true, message: 'Operação sincronizada.' };
}

export async function saveTaskTemplateAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const subtasks = text(formData, 'subtasks')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((title, index) => ({
      title,
      sort_order: index + 1,
      is_required: true,
    }));
  const payload = {
    id: text(formData, 'id') || undefined,
    sector_id: text(formData, 'sector_id'),
    title: text(formData, 'title'),
    description: text(formData, 'description'),
    task_type: text(formData, 'task_type') || 'STANDARD',
    default_assignee_id: text(formData, 'default_assignee_id') || undefined,
    start_time: text(formData, 'start_time'),
    due_time: text(formData, 'due_time'),
    priority: text(formData, 'priority') || 'NORMAL',
    is_critical: formData.get('is_critical') === 'on',
    goal_target: Number(text(formData, 'goal_target') || '0') || undefined,
    goal_unit: text(formData, 'goal_unit'),
    goal_group_key: text(formData, 'goal_group_key'),
    requires_comment_on_completion: formData.get('requires_comment_on_completion') === 'on',
    requires_evidence: formData.get('requires_evidence') === 'on',
    requires_manager_review: formData.get('requires_manager_review') === 'on',
    allow_not_applicable: formData.get('allow_not_applicable') !== 'off',
    is_conditional: formData.get('is_conditional') === 'on',
    instructions: text(formData, 'instructions'),
    active: formData.get('active') !== 'off',
    recurrence_rule: {
      recurrence_type: text(formData, 'recurrence_type') || 'DAILY',
      interval_value: Number(text(formData, 'interval_value') || '1') || 1,
      weekdays: text(formData, 'weekdays')
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((value) => Number.isFinite(value) && value > 0),
      month_days: text(formData, 'month_days')
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((value) => Number.isFinite(value) && value > 0),
      weeks_of_month: text(formData, 'weeks_of_month')
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((value) => Number.isFinite(value) && value > 0),
      custom_rule_json: {},
      start_date: text(formData, 'start_date') || undefined,
      end_date: text(formData, 'end_date') || undefined,
    },
    subtasks,
  };

  const result = await saveVitalleTaskTemplate(payload);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  await revalidateVitalle();
  return { ok: true, message: 'Tarefa salva.' };
}

export async function saveSectorAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const result = await saveVitalleSector({
    id: text(formData, 'id') || undefined,
    name: text(formData, 'name'),
    slug: text(formData, 'slug') || undefined,
    description: text(formData, 'description'),
    responsible_user_id: text(formData, 'responsible_user_id') || undefined,
    color: text(formData, 'color') || '#0f766e',
    icon: text(formData, 'icon') || 'building-2',
    status: text(formData, 'status') || 'active',
    sort_order: Number(text(formData, 'sort_order') || '0') || 0,
  });
  if (!result.ok) return { ok: false, message: result.message };
  await revalidateVitalle();
  return { ok: true, message: 'Setor salvo.' };
}

export async function saveUserAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const result = await saveVitalleUser({
    id: text(formData, 'id') || undefined,
    email: text(formData, 'email'),
    full_name: text(formData, 'full_name'),
    role: text(formData, 'role') || 'collaborator',
    unit_id: text(formData, 'unit_id') || undefined,
    is_active: formData.get('is_active') !== 'off',
    is_demo: formData.get('is_demo') === 'on',
    display_name: text(formData, 'display_name') || undefined,
    title: text(formData, 'title'),
    avatar_url: text(formData, 'avatar_url'),
    phone: text(formData, 'phone'),
    bio: text(formData, 'bio'),
    sector_ids: text(formData, 'sector_ids')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  });
  if (!result.ok) return { ok: false, message: result.message };
  await revalidateVitalle();
  return { ok: true, message: 'Usuário salvo.' };
}

export async function saveSettingAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const raw = text(formData, 'value_json');
  let parsed: unknown = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    return { ok: false, message: 'JSON inválido.' };
  }
  const result = await saveVitalleSetting({
    key: text(formData, 'key'),
    value_json: parsed,
  });
  if (!result.ok) return { ok: false, message: result.message };
  await revalidateVitalle();
  return { ok: true, message: 'Configuração salva.' };
}

export async function duplicateTaskAction(formData: FormData): Promise<ActionState> {
  const result = await duplicateVitalleTaskTemplate(text(formData, 'id'));
  if (!result.ok) return { ok: false, message: result.message };
  await revalidateVitalle();
  return { ok: true, message: 'Tarefa duplicada.' };
}

export async function archiveTaskAction(formData: FormData): Promise<ActionState> {
  const result = await archiveVitalleTaskTemplate(text(formData, 'id'));
  if (!result.ok) return { ok: false, message: result.message };
  await revalidateVitalle();
  return { ok: true, message: 'Tarefa arquivada.' };
}

export async function activateTaskAction(formData: FormData): Promise<ActionState> {
  const result = await activateVitalleTaskTemplate(text(formData, 'id'));
  if (!result.ok) return { ok: false, message: result.message };
  await revalidateVitalle();
  return { ok: true, message: 'Tarefa ativada.' };
}

export async function startTaskAction(formData: FormData): Promise<ActionState> {
  const result = await startVitalleTask(text(formData, 'id'));
  if (!result.ok) return { ok: false, message: result.message };
  await revalidateVitalle();
  return { ok: true, message: 'Tarefa iniciada.' };
}

export async function completeTaskAction(formData: FormData): Promise<ActionState> {
  const result = await completeVitalleTask(text(formData, 'id'), text(formData, 'comment'));
  if (!result.ok) return { ok: false, message: result.message };
  await revalidateVitalle();
  return { ok: true, message: 'Tarefa concluída.' };
}

export async function blockTaskAction(formData: FormData): Promise<ActionState> {
  const result = await blockVitalleTask(text(formData, 'id'), text(formData, 'reason_type'), text(formData, 'details'));
  if (!result.ok) return { ok: false, message: result.message };
  await revalidateVitalle();
  return { ok: true, message: 'Impedimento registrado.' };
}

export async function markNotApplicableAction(formData: FormData): Promise<ActionState> {
  const result = await markVitalleTaskNotApplicable(text(formData, 'id'), text(formData, 'comment'));
  if (!result.ok) return { ok: false, message: result.message };
  await revalidateVitalle();
  return { ok: true, message: 'Tarefa marcada como não aplicável.' };
}

export async function reopenTaskAction(formData: FormData): Promise<ActionState> {
  const result = await reopenVitalleTask(text(formData, 'id'), text(formData, 'comment'));
  if (!result.ok) return { ok: false, message: result.message };
  await revalidateVitalle();
  return { ok: true, message: 'Tarefa reaberta.' };
}

export async function addGoalAction(formData: FormData): Promise<ActionState> {
  const result = await addVitalleGoalEntry(text(formData, 'id'), Number(text(formData, 'quantity') || '0') || 0, text(formData, 'note'));
  if (!result.ok) return { ok: false, message: result.message };
  await revalidateVitalle();
  return { ok: true, message: 'Meta registrada.' };
}

export async function completeSubtaskAction(formData: FormData): Promise<ActionState> {
  const result = await completeVitalleSubtask(text(formData, 'task_id'), text(formData, 'subtask_id'), text(formData, 'comment'));
  if (!result.ok) return { ok: false, message: result.message };
  await revalidateVitalle();
  return { ok: true, message: 'Subtarefa concluída.' };
}

export async function resolveAlertAction(formData: FormData): Promise<ActionState> {
  const result = await resolveVitalleAlert(text(formData, 'id'));
  if (!result.ok) return { ok: false, message: result.message };
  await revalidateVitalle();
  return { ok: true, message: 'Alerta resolvido.' };
}
