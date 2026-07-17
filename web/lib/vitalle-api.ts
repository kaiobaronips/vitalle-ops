import { getVitalleAuthHeaders } from './vitalle-session';
import {
  addDirectTaskComment,
  canUseDirectDatabase,
  deleteDirectDailyTask,
  getDirectSectorRewardSummary,
  getDirectMe,
  getDirectSectors,
  getDirectTaskTemplates,
  removeDirectTaskTemplateEverywhere,
  saveDirectSector,
  saveDirectTaskTemplate,
} from './vitalle-db-direct';
import type {
  Alert,
  AuditEvent,
  DashboardSummary,
  HistoryItem,
  PageResponse,
  PrincipalContext,
  Report,
  Sector,
  SectorDetail,
  SectorRewardDaySummary,
  SystemSetting,
  TaskComment,
  TaskInstance,
  TaskTemplate,
} from './vitalle-types';

const apiBaseUrl = (process.env.NEXT_PUBLIC_VITALLE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  detail?: string;
};

export type ApiResult<T> = {
  data: T;
  offline: boolean;
  status?: number;
  message?: string;
};

export type ApiMutationResult<T> = {
  ok: boolean;
  status: number;
  data?: T;
  message: string;
};

async function headers(): Promise<Record<string, string>> {
  const base = await getVitalleAuthHeaders();
  const apiKey = process.env.VITALLE_API_KEY;
  if (!base.Authorization && !base['X-Vitalle-Dev-Role'] && apiKey) {
    base['X-API-Key'] = apiKey;
  }
  return base;
}

async function getRaw<T>(path: string, fallback: T): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: await headers(),
      cache: 'no-store',
    });
    const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
    if (!response.ok) {
      return { data: fallback, offline: true, status: response.status, message: payload.detail ?? `HTTP ${response.status}` };
    }
    return { data: (payload.data ?? fallback) as T, offline: false, status: response.status };
  } catch (error) {
    return {
      data: fallback,
      offline: true,
      status: 0,
      message: error instanceof Error ? error.message : 'Falha na requisição',
    };
  }
}

async function directOrApi<T>(loader: () => Promise<T | null>, path: string, fallback: T): Promise<ApiResult<T>> {
  if (canUseDirectDatabase()) {
    try {
      const data = await loader();
      if (data) {
        return { data, offline: false, status: 200 };
      }
    } catch (error) {
      console.warn('vitalle_direct_db_failed', path, error);
    }
  }
  return getRaw<T>(path, fallback);
}

async function mutate<T>(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<ApiMutationResult<T>> {
  try {
    const requestHeaders = await headers();
    requestHeaders['Content-Type'] = 'application/json';
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
    const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
    if (!response.ok) {
      return { ok: false, status: response.status, message: payload.detail ?? `HTTP ${response.status}` };
    }
    return { ok: true, status: response.status, data: payload.data, message: 'Operação concluída.' };
  } catch (error) {
    return { ok: false, status: 0, message: error instanceof Error ? error.message : 'Falha na mutação' };
  }
}

export async function getVitalleMe(): Promise<ApiResult<PrincipalContext>> {
  const fallback = {
    principal: {
      role: '',
      user_id: '',
      email: '',
      auth_method: '',
    },
    organization_id: '',
    unit_id: '',
    role: '',
    display_name: '',
    sector_ids: [],
    admin_like: false,
    timezone: 'America/Sao_Paulo',
    sectors: [],
    settings: [],
  };
  return directOrApi<PrincipalContext>(getDirectMe, '/v1/vitalle/me', fallback);
}

export async function getVitalleDashboard(): Promise<ApiResult<DashboardSummary>> {
  return getRaw<DashboardSummary>('/v1/vitalle/dashboard', {
    date: '',
    now: '',
    task_counts: { total: 0, completed: 0, in_progress: 0, overdue: 0, critical_pending: 0 },
    compliance: { score: 0, punctuality: 0, conclusion: 0, goals: 0, raw: {} },
    buckets: { OVERDUE: [], NOW: [], IN_PROGRESS: [], UPCOMING: [], COMPLETED: [] },
    sectors: [],
    alerts: [],
    tasks: [],
    operational_now: [],
    points_of_attention: [],
    recurring_failures: [],
    closing_summary: {},
    sector_health: [],
  });
}

export async function getVitalleMeuDia(): Promise<ApiResult<DashboardSummary>> {
  return getRaw<DashboardSummary>('/v1/vitalle/meu-dia', {
    date: '',
    now: '',
    task_counts: { total: 0, completed: 0, in_progress: 0, overdue: 0, critical_pending: 0 },
    compliance: { score: 0, punctuality: 0, conclusion: 0, goals: 0, raw: {} },
    buckets: { OVERDUE: [], NOW: [], IN_PROGRESS: [], UPCOMING: [], COMPLETED: [] },
    sectors: [],
    alerts: [],
    tasks: [],
    next_task: {},
    day_progress: 0,
    date_label: '',
  });
}

export async function getVitalleSectors(): Promise<ApiResult<PageResponse<Sector>>> {
  return directOrApi<PageResponse<Sector>>(getDirectSectors, '/v1/vitalle/setores', { items: [] });
}

export async function getVitalleSector(slug: string): Promise<ApiResult<SectorDetail>> {
  return getRaw<SectorDetail>(`/v1/vitalle/setores/${slug}`, {
    sector: {
      id: '',
      organization_id: '',
      unit_id: '',
      name: '',
      slug,
      description: '',
    },
    tasks: { OVERDUE: [], NOW: [], IN_PROGRESS: [], UPCOMING: [], COMPLETED: [] },
    compliance: { score: 0, punctuality: 0, conclusion: 0, goals: 0, raw: {} },
    alerts: [],
  });
}

export async function getVitalleAlerts(status?: string): Promise<ApiResult<PageResponse<Alert>>> {
  const suffix = status ? `?status=${encodeURIComponent(status)}` : '';
  return getRaw<PageResponse<Alert>>(`/v1/vitalle/alertas${suffix}`, { items: [] });
}

export async function getVitalleHistory(startDate?: string, endDate?: string): Promise<ApiResult<PageResponse<HistoryItem>>> {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  return getRaw<PageResponse<HistoryItem>>(`/v1/vitalle/historico${params.toString() ? `?${params.toString()}` : ''}`, { items: [] });
}

export async function getVitalleSectorRewardSummary(
  sectorId: string,
  startDate: string,
  endDate: string,
): Promise<ApiResult<PageResponse<SectorRewardDaySummary>>> {
  if (canUseDirectDatabase()) {
    try {
      const data = await getDirectSectorRewardSummary(sectorId, startDate, endDate);
      return { data, offline: false, status: 200 };
    } catch (error) {
      console.warn('vitalle_direct_db_failed', 'sector-reward-summary', error);
    }
  }

  const history = await getVitalleHistory(startDate, endDate);
  const items = (history.data.items ?? []).flatMap((item) => {
    const sector = (item.sectors ?? []).find((historySector) => historySector.sector_id === sectorId);
    if (!sector) return [];
    return [
      {
        operational_date: String(item.operational_date).slice(0, 10),
        total_tasks: Number(sector.total_tasks ?? 0),
        completed_tasks: Number(sector.completed_tasks ?? 0),
      },
    ];
  });

  return {
    data: { items },
    offline: history.offline,
    status: history.status,
    message: history.message,
  };
}

export async function getVitalleReports(): Promise<ApiResult<PageResponse<Report>>> {
  return getRaw<PageResponse<Report>>('/v1/vitalle/relatorios', { items: [] });
}

export async function getVitalleAudit(): Promise<ApiResult<PageResponse<AuditEvent>>> {
  return getRaw<PageResponse<AuditEvent>>('/v1/vitalle/auditoria', { items: [] });
}

export async function getVitalleTaskTemplates(): Promise<ApiResult<PageResponse<TaskTemplate>>> {
  return directOrApi<PageResponse<TaskTemplate>>(getDirectTaskTemplates, '/v1/vitalle/admin/tarefas', { items: [] });
}

export async function getVitalleTaskTemplate(taskTemplateId: string): Promise<ApiResult<TaskTemplate>> {
  return getRaw<TaskTemplate>(`/v1/vitalle/admin/tarefas/${taskTemplateId}`, {
    id: '',
    organization_id: '',
    unit_id: '',
    sector_id: '',
    title: '',
    description: '',
    task_type: 'STANDARD',
    start_time: '09:00:00',
    due_time: '09:30:00',
    priority: 'NORMAL',
    is_critical: false,
    subtasks: [],
  });
}

export async function getVitalleUsers(): Promise<ApiResult<PageResponse<Record<string, unknown>>>> {
  return getRaw<PageResponse<Record<string, unknown>>>('/v1/vitalle/admin/usuarios', { items: [] });
}

export async function getVitalleSettings(): Promise<ApiResult<PageResponse<SystemSetting>>> {
  return getRaw<PageResponse<SystemSetting>>('/v1/vitalle/admin/configuracoes', { items: [] });
}

export async function saveVitalleTaskTemplate(payload: Record<string, unknown>): Promise<ApiMutationResult<TaskTemplate>> {
  if (canUseDirectDatabase()) {
    try {
      const data = await saveDirectTaskTemplate(payload);
      return { ok: true, status: 200, data, message: 'Operação concluída.' };
    } catch (error) {
      console.warn('vitalle_direct_db_mutation_failed', '/v1/vitalle/admin/tarefas', error);
    }
  }
  return mutate<TaskTemplate>('/v1/vitalle/admin/tarefas', 'POST', payload);
}

export async function duplicateVitalleTaskTemplate(taskTemplateId: string): Promise<ApiMutationResult<TaskTemplate>> {
  return mutate<TaskTemplate>(`/v1/vitalle/admin/tarefas/${taskTemplateId}/duplicar`, 'POST');
}

export async function archiveVitalleTaskTemplate(taskTemplateId: string): Promise<ApiMutationResult<TaskTemplate>> {
  return mutate<TaskTemplate>(`/v1/vitalle/admin/tarefas/${taskTemplateId}/arquivar`, 'POST');
}

export async function activateVitalleTaskTemplate(taskTemplateId: string): Promise<ApiMutationResult<TaskTemplate>> {
  return mutate<TaskTemplate>(`/v1/vitalle/admin/tarefas/${taskTemplateId}/ativar`, 'POST');
}

export async function saveVitalleSector(payload: Record<string, unknown>): Promise<ApiMutationResult<Sector>> {
  if (canUseDirectDatabase()) {
    try {
      const data = await saveDirectSector(payload);
      return { ok: true, status: 200, data, message: 'Operação concluída.' };
    } catch (error) {
      console.warn('vitalle_direct_db_mutation_failed', '/v1/vitalle/admin/setores', error);
    }
  }
  return mutate<Sector>('/v1/vitalle/admin/setores', 'POST', payload);
}

export async function saveVitalleUser(payload: Record<string, unknown>): Promise<ApiMutationResult<Record<string, unknown>>> {
  return mutate<Record<string, unknown>>('/v1/vitalle/admin/usuarios', 'POST', payload);
}

export async function saveVitalleSetting(payload: Record<string, unknown>): Promise<ApiMutationResult<SystemSetting>> {
  return mutate<SystemSetting>('/v1/vitalle/admin/configuracoes', 'POST', payload);
}

export async function syncVitalleOperation(): Promise<ApiMutationResult<DashboardSummary>> {
  return mutate<DashboardSummary>('/v1/vitalle/operacao/sincronizar', 'POST');
}

export async function startVitalleTask(taskId: string): Promise<ApiMutationResult<TaskInstance>> {
  return mutate<TaskInstance>(`/v1/vitalle/tarefas/${taskId}/iniciar`, 'POST');
}

export async function completeVitalleTask(taskId: string, comment = ''): Promise<ApiMutationResult<TaskInstance>> {
  return mutate<TaskInstance>(`/v1/vitalle/tarefas/${taskId}/concluir`, 'POST', { comment });
}

export async function addVitalleTaskComment(taskId: string, comment: string): Promise<ApiMutationResult<TaskComment>> {
  if (canUseDirectDatabase()) {
    try {
      const data = await addDirectTaskComment(taskId, comment, 'observation');
      return { ok: true, status: 200, data, message: 'Observação salva.' };
    } catch (error) {
      console.warn('vitalle_direct_db_mutation_failed', '/v1/vitalle/tarefas/comentarios', error);
    }
  }
  return mutate<TaskComment>(`/v1/vitalle/tarefas/${taskId}/comentarios`, 'POST', { comment });
}

export async function removeVitalleDailyTask(taskId: string): Promise<ApiMutationResult<TaskInstance>> {
  if (canUseDirectDatabase()) {
    try {
      const data = await deleteDirectDailyTask(taskId);
      return { ok: true, status: 200, data, message: 'Operação concluída.' };
    } catch (error) {
      console.warn('vitalle_direct_db_mutation_failed', 'daily_task_instances.delete', error);
    }
  }
  return mutate<TaskInstance>(`/v1/vitalle/tarefas/${taskId}`, 'DELETE');
}

export async function removeVitalleTaskTemplateEverywhere(taskTemplateId: string): Promise<ApiMutationResult<TaskTemplate>> {
  if (canUseDirectDatabase()) {
    try {
      const data = await removeDirectTaskTemplateEverywhere(taskTemplateId);
      return { ok: true, status: 200, data, message: 'Operação concluída.' };
    } catch (error) {
      console.warn('vitalle_direct_db_mutation_failed', 'task_templates.remove_everywhere', error);
    }
  }
  return mutate<TaskTemplate>(`/v1/vitalle/admin/tarefas/${taskTemplateId}`, 'DELETE');
}

export async function blockVitalleTask(taskId: string, reasonType: string, details: string): Promise<ApiMutationResult<Record<string, unknown>>> {
  return mutate<Record<string, unknown>>(`/v1/vitalle/tarefas/${taskId}/bloquear`, 'POST', { reason_type: reasonType, details });
}

export async function markVitalleTaskNotApplicable(taskId: string, comment: string): Promise<ApiMutationResult<TaskInstance>> {
  return mutate<TaskInstance>(`/v1/vitalle/tarefas/${taskId}/nao-aplicavel`, 'POST', { comment });
}

export async function reopenVitalleTask(taskId: string, comment: string): Promise<ApiMutationResult<TaskInstance>> {
  return mutate<TaskInstance>(`/v1/vitalle/tarefas/${taskId}/reabrir`, 'POST', { comment });
}

export async function addVitalleGoalEntry(taskId: string, quantity: number, note: string): Promise<ApiMutationResult<TaskInstance>> {
  return mutate<TaskInstance>(`/v1/vitalle/tarefas/${taskId}/meta`, 'POST', { quantity, note });
}

export async function completeVitalleSubtask(taskId: string, subtaskId: string, comment = ''): Promise<ApiMutationResult<TaskInstance>> {
  return mutate<TaskInstance>(`/v1/vitalle/tarefas/${taskId}/subtarefas/${subtaskId}/concluir`, 'POST', { comment });
}

export async function resolveVitalleAlert(alertId: string): Promise<ApiMutationResult<Alert>> {
  return mutate<Alert>(`/v1/vitalle/alertas/${alertId}/resolver`, 'POST');
}
