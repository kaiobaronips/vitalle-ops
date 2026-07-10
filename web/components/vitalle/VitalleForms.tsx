import type { ReactNode } from 'react';
import {
  activateTaskAction,
  archiveTaskAction,
  duplicateTaskAction,
  saveSectorAction,
  saveSettingAction,
  saveTaskTemplateAction,
  saveUserAction,
} from '@/app/vitalle-actions';
import type { Sector, SystemSetting, TaskTemplate } from '@/lib/vitalle-types';

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-slate-500">{hint}</span> : null}
    </label>
  );
}

function Toggle({
  name,
  label,
  defaultChecked = false,
  hint,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="mt-1 h-4 w-4 rounded border-slate-300" />
      <span className="grid gap-1">
        <span className="text-sm font-semibold text-slate-900">{label}</span>
        {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      </span>
    </label>
  );
}

function toTime(value?: string | null) {
  return value ? String(value).slice(0, 5) : '';
}

function csv(value?: number[] | string[] | null) {
  return (value ?? []).join(', ');
}

function taskTemplateSubtasks(template?: TaskTemplate) {
  return (template?.subtasks ?? []).map((subtask) => subtask.title).join('\n');
}

export function TaskTemplateForm({
  template,
  sectors,
}: {
  template?: TaskTemplate;
  sectors: Sector[];
}) {
  return (
    <form action={saveTaskTemplateAction as unknown as (formData: FormData) => void} className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="id" value={template?.id ?? ''} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Título">
          <input name="title" defaultValue={template?.title ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Setor">
          <select name="sector_id" defaultValue={template?.sector_id ?? sectors[0]?.id ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipo de tarefa">
          <select name="task_type" defaultValue={template?.task_type ?? 'STANDARD'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {['STANDARD', 'GOAL', 'CHECKLIST', 'CONDITIONAL', 'REVIEW', 'CLOSING', 'OPENING'].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Responsável padrão">
          <input name="default_assignee_id" defaultValue={template?.default_assignee_id ?? ''} placeholder="user-id" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Horário de início">
          <input name="start_time" type="time" defaultValue={toTime(template?.start_time)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Prazo">
          <input name="due_time" type="time" defaultValue={toTime(template?.due_time)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Criticidade">
          <select name="priority" defaultValue={template?.priority ?? 'NORMAL'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {['LOW', 'NORMAL', 'HIGH', 'CRITICAL'].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Meta quantitativa">
          <input name="goal_target" type="number" min="0" defaultValue={template?.goal_target ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Unidade da meta">
          <input name="goal_unit" defaultValue={template?.goal_unit ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Chave da meta">
          <input name="goal_group_key" defaultValue={template?.goal_group_key ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Recorrência">
          <select name="recurrence_type" defaultValue={template?.recurrence_type ?? 'DAILY'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {['DAILY', 'WEEKDAYS', 'WEEKLY', 'MONTHLY', 'CUSTOM', 'SPECIFIC_WEEKDAYS'].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dias da semana" hint="CSV com números ISO, ex: 1, 3, 5">
          <input name="weekdays" defaultValue={csv(template?.weekdays)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Dias do mês" hint="CSV, ex: 1, 15, 30">
          <input name="month_days" defaultValue={csv(template?.month_days)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Semanas do mês" hint="CSV, ex: 1, 3">
          <input name="weeks_of_month" defaultValue={csv(template?.weeks_of_month)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Data inicial">
          <input name="start_date" type="date" defaultValue={template?.start_date ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Data final">
          <input name="end_date" type="date" defaultValue={template?.end_date ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
      </div>

      <Field label="Descrição">
        <textarea name="description" defaultValue={template?.description ?? ''} rows={4} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
      </Field>

      <Field label="Instruções">
        <textarea name="instructions" defaultValue={template?.instructions ?? ''} rows={4} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
      </Field>

      <Field label="Subtarefas" hint="Uma por linha">
        <textarea name="subtasks" defaultValue={taskTemplateSubtasks(template)} rows={8} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
      </Field>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Toggle name="is_critical" label="Tarefa crítica" defaultChecked={template?.is_critical ?? false} />
        <Toggle name="requires_comment_on_completion" label="Exigir comentário" defaultChecked={template?.requires_comment_on_completion ?? false} />
        <Toggle name="requires_evidence" label="Exigir evidência" defaultChecked={template?.requires_evidence ?? false} />
        <Toggle name="requires_manager_review" label="Exigir revisão" defaultChecked={template?.requires_manager_review ?? false} />
        <Toggle name="allow_not_applicable" label="Permitir não aplicável" defaultChecked={template?.allow_not_applicable ?? true} />
        <Toggle name="is_conditional" label="Tarefa condicional" defaultChecked={template?.is_conditional ?? false} />
        <Toggle name="active" label="Ativa" defaultChecked={template?.active ?? true} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          Salvar tarefa
        </button>
        {template?.id ? (
          <>
            <button formAction={duplicateTaskAction as unknown as (formData: FormData) => void} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              Duplicar
            </button>
            <button formAction={archiveTaskAction as unknown as (formData: FormData) => void} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              Arquivar
            </button>
            <button formAction={activateTaskAction as unknown as (formData: FormData) => void} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              Ativar
            </button>
          </>
        ) : null}
      </div>
    </form>
  );
}

export function SectorForm({
  sector,
  users,
}: {
  sector?: Sector;
  users: Array<Record<string, unknown>>;
}) {
  return (
    <form action={saveSectorAction as unknown as (formData: FormData) => void} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="id" value={sector?.id ?? ''} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome">
          <input name="name" defaultValue={sector?.name ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Slug">
          <input name="slug" defaultValue={sector?.slug ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Responsável">
          <select name="responsible_user_id" defaultValue={sector?.responsible_user_id ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="">Setor sem responsável</option>
            {users.map((user) => (
              <option key={String(user.id)} value={String(user.id)}>
                {String(user.full_name ?? user.display_name ?? user.email ?? user.id)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cor">
          <input name="color" type="color" defaultValue={sector?.color ?? '#0f766e'} className="h-10 rounded-lg border border-slate-300 bg-white px-3 py-2" />
        </Field>
        <Field label="Ícone">
          <input name="icon" defaultValue={sector?.icon ?? 'building-2'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Ordem">
          <input name="sort_order" type="number" defaultValue={sector?.sort_order ?? 0} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={sector?.status ?? 'active'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </Field>
      </div>
      <Field label="Descrição">
        <textarea name="description" defaultValue={sector?.description ?? ''} rows={4} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
      </Field>
      <button type="submit" className="w-fit rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
        Salvar setor
      </button>
    </form>
  );
}

export function UserForm({
  user,
  sectors,
}: {
  user?: Record<string, unknown>;
  sectors: Sector[];
}) {
  const selectedSectorIds = String(user?.sector_ids ?? user?.sector_slugs ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return (
    <form action={saveUserAction as unknown as (formData: FormData) => void} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="id" value={String(user?.id ?? '')} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome completo">
          <input name="full_name" defaultValue={String(user?.full_name ?? '')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Nome de exibição">
          <input name="display_name" defaultValue={String(user?.display_name ?? '')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Email">
          <input name="email" type="email" defaultValue={String(user?.email ?? '')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Função">
          <select name="role" defaultValue={String(user?.role ?? 'collaborator')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {['admin', 'manager', 'collaborator'].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unidade">
          <input name="unit_id" defaultValue={String(user?.unit_id ?? '')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Cargo">
          <input name="title" defaultValue={String(user?.title ?? '')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Avatar URL">
          <input name="avatar_url" defaultValue={String(user?.avatar_url ?? '')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Telefone">
          <input name="phone" defaultValue={String(user?.phone ?? '')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
      </div>
      <Field label="Bio">
        <textarea name="bio" defaultValue={String(user?.bio ?? '')} rows={4} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
      </Field>
      <Field label="Setores vinculados" hint="IDs separados por vírgula">
        <textarea
          name="sector_ids"
          defaultValue={selectedSectorIds.length ? selectedSectorIds.join(', ') : sectors.map((sector) => sector.id).join(', ')}
          rows={3}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Toggle name="is_active" label="Usuário ativo" defaultChecked={user?.is_active !== false} />
        <Toggle name="is_demo" label="Usuário demo" defaultChecked={Boolean(user?.is_demo)} />
      </div>
      <button type="submit" className="w-fit rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
        Salvar usuário
      </button>
    </form>
  );
}

export function SettingForm({ setting }: { setting?: SystemSetting }) {
  return (
    <form action={saveSettingAction as unknown as (formData: FormData) => void} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <Field label="Chave">
        <input name="key" defaultValue={setting?.key ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
      </Field>
      <Field label="Valor JSON" hint="Use JSON válido.">
        <textarea name="value_json" defaultValue={setting ? JSON.stringify(setting.value_json, null, 2) : '{}'} rows={8} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm" />
      </Field>
      <button type="submit" className="w-fit rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
        Salvar configuração
      </button>
    </form>
  );
}
