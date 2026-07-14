import 'server-only';

import { Pool, type PoolClient } from 'pg';
import { getVitalleDevSession } from './vitalle-session';
import type { PageResponse, PrincipalContext, Sector, SectorRewardDaySummary, SystemSetting, TaskInstance, TaskTemplate } from './vitalle-types';

const organizationId = 'vitalle-odontologia';
const unitId = 'vitalle-main';
const timezone = 'America/Sao_Paulo';

let pool: Pool | null = null;

function databaseUrl() {
  return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '';
}

export function canUseDirectDatabase() {
  return Boolean(databaseUrl());
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl(),
      max: Number(process.env.VITALLE_WEB_DB_POOL_MAX_SIZE || '3'),
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 8_000,
    });
  }
  return pool;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}

function idFrom(name: string) {
  return `${slugify(name)}::${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`;
}

function dateOnly(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function jsonRow<T>(row: T): T {
  return JSON.parse(JSON.stringify(row)) as T;
}

async function query<T>(sql: string, params: unknown[] = []) {
  const result = await getPool().query(sql, params);
  return result.rows.map((row) => jsonRow(row as T));
}

async function withClient<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const value = await fn(client);
    await client.query('commit');
    return value;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function getDirectSectors(): Promise<PageResponse<Sector>> {
  const items = await query<Sector>(
    `
    select
      s.id,
      s.organization_id,
      s.unit_id,
      s.name,
      s.slug,
      s.description,
      s.responsible_user_id,
      s.color,
      s.icon,
      s.status,
      s.sort_order,
      s.metadata_json,
      s.created_at,
      s.updated_at,
      u.full_name as responsible_name,
      p.display_name as responsible_display_name
    from sectors s
    left join users u on u.id = s.responsible_user_id
    left join user_profiles p on p.user_id = u.id
    where s.unit_id = $1
    order by s.sort_order asc, s.name asc
    `,
    [unitId],
  );
  return { items };
}

export async function getDirectSettings(): Promise<PageResponse<SystemSetting>> {
  const items = await query<SystemSetting>(
    `
    select id, organization_id, unit_id, key, value_json, updated_by, created_at, updated_at
    from system_settings
    where unit_id = $1
    order by key asc
    `,
    [unitId],
  );
  return { items };
}

export async function getDirectMe(): Promise<PrincipalContext | null> {
  const session = await getVitalleDevSession();
  if (!session && !process.env.VITALLE_API_KEY) {
    return null;
  }
  const role = session?.role || 'admin';
  const adminLike = ['admin', 'owner', 'manager', 'gestor'].includes(role.toLowerCase());
  const [sectors, settings] = await Promise.all([getDirectSectors(), getDirectSettings()]);
  return {
    principal: {
      role,
      user_id: session?.user_id || '',
      email: session?.email || '',
      auth_method: session ? 'dev-db' : 'api-key-db',
      organization_id: session?.organization_id || organizationId,
      unit_id: session?.unit_id || unitId,
      sector_id: session?.sector_id || '',
      display_name: session?.display_name || 'Administrador Vitalle',
    },
    organization_id: session?.organization_id || organizationId,
    unit_id: session?.unit_id || unitId,
    role,
    display_name: session?.display_name || 'Administrador Vitalle',
    sector_ids: adminLike ? sectors.items.map((sector) => sector.id) : session?.sector_id ? [session.sector_id] : [],
    admin_like: adminLike,
    timezone,
    sectors: sectors.items,
    settings: settings.items,
  };
}

export async function getDirectTaskTemplates(): Promise<PageResponse<TaskTemplate>> {
  const items = await query<TaskTemplate>(
    `
    select
      t.id,
      t.organization_id,
      t.unit_id,
      t.sector_id,
      s.name as sector_name,
      s.slug as sector_slug,
      t.recurrence_rule_id,
      t.title,
      t.description,
      t.task_type,
      t.default_assignee_id,
      u.full_name as default_assignee_name,
      t.start_time,
      t.due_time,
      t.priority,
      t.is_critical,
      t.goal_target,
      t.goal_unit,
      t.goal_group_key,
      t.requires_comment_on_completion,
      t.requires_evidence,
      t.requires_manager_review,
      t.allow_not_applicable,
      t.is_conditional,
      t.instructions,
      t.active,
      t.archived_at,
      t.created_by,
      t.updated_by,
      t.created_at,
      t.updated_at,
      r.recurrence_type,
      r.interval_value,
      r.weekdays,
      r.month_days,
      r.weeks_of_month,
      r.custom_rule_json,
      r.start_date,
      r.end_date,
      coalesce(subs.subtasks_count, 0) as subtasks_count
    from task_templates t
    join sectors s on s.id = t.sector_id
    left join users u on u.id = t.default_assignee_id
    left join task_recurrence_rules r on r.id = t.recurrence_rule_id
    left join (
      select task_template_id, count(*) as subtasks_count
      from task_template_subtasks
      group by task_template_id
    ) subs on subs.task_template_id = t.id
    where t.unit_id = $1
      and t.active = true
      and t.archived_at is null
    order by s.sort_order asc, t.start_time asc, t.created_at asc
    `,
    [unitId],
  );
  return { items: items.map((item) => ({ ...item, start_date: dateOnly(item.start_date), end_date: dateOnly(item.end_date) })) };
}

export async function saveDirectSector(payload: Record<string, unknown>): Promise<Sector> {
  const name = String(payload.name || '').trim();
  if (!name) throw new Error('Nome do setor é obrigatório.');
  const id = String(payload.id || '') || idFrom(name);
  const responsibleName = String(payload.responsible_name || '').trim();
  const rows = await query<Sector>(
    `
    insert into sectors (
      id, organization_id, unit_id, name, slug, description, responsible_user_id, color, icon, status, sort_order, metadata_json
    ) values ($1, $2, $3, $4, $5, $6, null, $7, $8, $9, $10, $11::jsonb)
    on conflict (id) do update set
      name = excluded.name,
      slug = excluded.slug,
      description = excluded.description,
      responsible_user_id = excluded.responsible_user_id,
      color = excluded.color,
      icon = excluded.icon,
      status = excluded.status,
      sort_order = excluded.sort_order,
      metadata_json = excluded.metadata_json,
      updated_at = now()
    returning *
    `,
    [
      id,
      organizationId,
      unitId,
      name,
      String(payload.slug || '') || slugify(name),
      String(payload.description || ''),
      String(payload.color || '#0f766e'),
      String(payload.icon || 'building-2'),
      String(payload.status || 'active'),
      Number(payload.sort_order || 0),
      JSON.stringify({ responsible_name: responsibleName }),
    ],
  );
  return rows[0];
}

export async function saveDirectTaskTemplate(payload: Record<string, unknown>): Promise<TaskTemplate> {
  const title = String(payload.title || '').trim();
  const sectorId = String(payload.sector_id || '').trim();
  if (!title || !sectorId) throw new Error('Setor e título são obrigatórios.');
  const id = String(payload.id || '') || idFrom(title);
  const recurrence = (payload.recurrence_rule || {}) as Record<string, unknown>;
  const existing = await query<{ recurrence_rule_id?: string | null }>('select recurrence_rule_id from task_templates where id = $1 limit 1', [id]);
  const recurrenceRuleId = existing[0]?.recurrence_rule_id || `${id}::recurrence`;

  await withClient(async (client) => {
    await client.query(
      `
      insert into task_recurrence_rules (
        id, organization_id, unit_id, recurrence_type, interval_value, weekdays, month_days, weeks_of_month, custom_rule_json, start_date, end_date
      ) values ($1, $2, $3, $4, $5, $6::integer[], $7::integer[], $8::integer[], $9::jsonb, $10, $11)
      on conflict (id) do update set
        recurrence_type = excluded.recurrence_type,
        interval_value = excluded.interval_value,
        weekdays = excluded.weekdays,
        month_days = excluded.month_days,
        weeks_of_month = excluded.weeks_of_month,
        custom_rule_json = excluded.custom_rule_json,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        updated_at = now()
      `,
      [
        recurrenceRuleId,
        organizationId,
        unitId,
        String(recurrence.recurrence_type || 'DAILY'),
        Number(recurrence.interval_value || 1),
        recurrence.weekdays || [],
        recurrence.month_days || [],
        recurrence.weeks_of_month || [],
        JSON.stringify(recurrence.custom_rule_json || {}),
        recurrence.start_date || null,
        recurrence.end_date || null,
      ],
    );

    await client.query(
      `
      insert into task_templates (
        id, organization_id, unit_id, sector_id, recurrence_rule_id, title, description, task_type,
        default_assignee_id, start_time, due_time, priority, is_critical, goal_target, goal_unit,
        goal_group_key, requires_comment_on_completion, requires_evidence, requires_manager_review,
        allow_not_applicable, is_conditional, instructions, active, archived_at, created_by, updated_by
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8,
        null, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21, $22, null, $23, $24
      )
      on conflict (id) do update set
        sector_id = excluded.sector_id,
        recurrence_rule_id = excluded.recurrence_rule_id,
        title = excluded.title,
        description = excluded.description,
        task_type = excluded.task_type,
        start_time = excluded.start_time,
        due_time = excluded.due_time,
        priority = excluded.priority,
        is_critical = excluded.is_critical,
        goal_target = excluded.goal_target,
        goal_unit = excluded.goal_unit,
        goal_group_key = excluded.goal_group_key,
        requires_comment_on_completion = excluded.requires_comment_on_completion,
        requires_evidence = excluded.requires_evidence,
        requires_manager_review = excluded.requires_manager_review,
        allow_not_applicable = excluded.allow_not_applicable,
        is_conditional = excluded.is_conditional,
        instructions = excluded.instructions,
        active = excluded.active,
        updated_by = excluded.updated_by,
        updated_at = now()
      `,
      [
        id,
        organizationId,
        unitId,
        sectorId,
        recurrenceRuleId,
        title,
        String(payload.description || ''),
        String(payload.task_type || 'STANDARD'),
        String(payload.start_time || '09:00'),
        String(payload.due_time || '09:30'),
        String(payload.priority || 'NORMAL'),
        Boolean(payload.is_critical),
        payload.goal_target ? Number(payload.goal_target) : null,
        String(payload.goal_unit || ''),
        String(payload.goal_group_key || ''),
        Boolean(payload.requires_comment_on_completion),
        Boolean(payload.requires_evidence),
        Boolean(payload.requires_manager_review),
        payload.allow_not_applicable !== false,
        Boolean(payload.is_conditional),
        String(payload.instructions || ''),
        payload.active !== false,
        '',
        '',
      ],
    );
  });

  const templates = await getDirectTaskTemplates();
  const template = templates.items.find((item) => item.id === id);
  if (!template) throw new Error('Tarefa salva, mas não foi possível recarregar o registro.');
  return template;
}

export async function deleteDirectDailyTask(taskId: string): Promise<TaskInstance> {
  const rows = await query<TaskInstance>(
    `
    delete from daily_task_instances
    where id::text = $1
      and unit_id = $2
    returning *
    `,
    [taskId, unitId],
  );
  const task = rows[0];
  if (!task) throw new Error('Tarefa não encontrada.');
  return task;
}

export async function removeDirectTaskTemplateEverywhere(templateId: string): Promise<TaskTemplate> {
  let removedTemplate: TaskTemplate | null = null;
  await withClient(async (client) => {
    const existing = await client.query<TaskTemplate>('select * from task_templates where id = $1 and unit_id = $2 limit 1', [templateId, unitId]);
    if (!existing.rowCount) throw new Error('Tarefa não encontrada.');
    removedTemplate = jsonRow(existing.rows[0] as TaskTemplate);

    const dailyTasks = await client.query<{ id: string }>(
      'select id::text as id from daily_task_instances where task_template_id = $1 and unit_id = $2',
      [templateId, unitId],
    );
    const dailyTaskIds = dailyTasks.rows.map((row) => row.id);
    if (dailyTaskIds.length) {
      await client.query(
        "delete from audit_events where unit_id = $1 and entity_type = 'daily_task_instance' and entity_id = any($2::text[])",
        [unitId, dailyTaskIds],
      );
    }
    await client.query('delete from audit_events where unit_id = $1 and entity_id = $2', [unitId, templateId]);
    await client.query('delete from task_templates where id = $1 and unit_id = $2', [templateId, unitId]);

    const recurrenceRuleId = removedTemplate?.recurrence_rule_id;
    if (recurrenceRuleId) await client.query('delete from task_recurrence_rules where id = $1', [recurrenceRuleId]);
  });

  if (!removedTemplate) throw new Error('Tarefa não encontrada.');
  return removedTemplate;
}

export async function getDirectSectorRewardSummary(
  sectorId: string,
  startDate: string,
  endDate: string,
): Promise<PageResponse<SectorRewardDaySummary>> {
  const items = await query<SectorRewardDaySummary>(
    `
    select
      operational_date::text as operational_date,
      count(*)::int as total_tasks,
      count(*) filter (where status in ('COMPLETED', 'JUSTIFIED', 'NOT_APPLICABLE'))::int as completed_tasks
    from daily_task_instances
    where unit_id = $1
      and sector_id = $2
      and operational_date between $3 and $4
    group by operational_date
    order by operational_date asc
    `,
    [unitId, sectorId, startDate, endDate],
  );
  return { items };
}
