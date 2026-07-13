import type { ReactNode } from 'react';
import {
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

const sectorIconOptions = [
  { value: 'building-2', label: 'Clínica' },
  { value: 'clipboard-check', label: 'Checklist' },
  { value: 'user-round-check', label: 'Atendimento' },
  { value: 'stethoscope', label: 'Saúde' },
  { value: 'megaphone', label: 'Comercial' },
  { value: 'calendar-days', label: 'Agenda' },
];

function SectorIconPreview({ value }: { value: string }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const paths: Record<string, ReactNode> = {
    'building-2': (
      <>
        <path {...common} d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
        <path {...common} d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1M4 21h16" />
      </>
    ),
    'clipboard-check': (
      <>
        <path {...common} d="M9 4h6l1 2h2v15H6V6h2l1-2Z" />
        <path {...common} d="m9 13 2 2 4-5" />
      </>
    ),
    'user-round-check': (
      <>
        <path {...common} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path {...common} d="M4 21a8 8 0 0 1 9.5-7.8" />
        <path {...common} d="m16 18 2 2 4-5" />
      </>
    ),
    stethoscope: (
      <>
        <path {...common} d="M6 4v5a4 4 0 0 0 8 0V4" />
        <path {...common} d="M10 13v2a5 5 0 0 0 10 0v-1" />
        <circle {...common} cx="20" cy="13" r="1.5" />
      </>
    ),
    megaphone: (
      <>
        <path {...common} d="M4 13h3l9 4V7l-9 4H4v2Z" />
        <path {...common} d="M7 14v4a2 2 0 0 0 2 2h1" />
        <path {...common} d="M19 9a4 4 0 0 1 0 6" />
      </>
    ),
    'calendar-days': (
      <>
        <path {...common} d="M7 3v4M17 3v4M4 8h16M5 5h14v16H5z" />
        <path {...common} d="M8 12h2M12 12h2M16 12h1M8 16h2M12 16h2M16 16h1" />
      </>
    ),
  };

  return <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">{paths[value] ?? paths['building-2']}</svg>;
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
      <input type="hidden" name="task_type" value={template?.task_type ?? 'STANDARD'} />
      <input type="hidden" name="default_assignee_id" value={template?.default_assignee_id ?? ''} />
      <input type="hidden" name="priority" value={template?.priority ?? 'NORMAL'} />
      <input type="hidden" name="goal_target" value={template?.goal_target ?? ''} />
      <input type="hidden" name="goal_unit" value={template?.goal_unit ?? ''} />
      <input type="hidden" name="goal_group_key" value={template?.goal_group_key ?? ''} />
      <input type="hidden" name="interval_value" value="1" />
      <input type="hidden" name="weekdays" value={csv(template?.weekdays)} />
      <input type="hidden" name="month_days" value={csv(template?.month_days)} />
      <input type="hidden" name="weeks_of_month" value={csv(template?.weeks_of_month)} />
      <input type="hidden" name="end_date" value={template?.end_date ?? ''} />
      <input type="hidden" name="instructions" value={template?.instructions ?? ''} />
      <input type="hidden" name="subtasks" value={taskTemplateSubtasks(template)} />
      <input type="hidden" name="is_critical" value={template?.is_critical ? 'on' : ''} />
      <input type="hidden" name="requires_comment_on_completion" value={template?.requires_comment_on_completion ? 'on' : ''} />
      <input type="hidden" name="requires_evidence" value={template?.requires_evidence ? 'on' : ''} />
      <input type="hidden" name="requires_manager_review" value={template?.requires_manager_review ? 'on' : ''} />
      <input type="hidden" name="allow_not_applicable" value={template?.allow_not_applicable === false ? 'off' : 'on'} />
      <input type="hidden" name="is_conditional" value={template?.is_conditional ? 'on' : ''} />
      <input type="hidden" name="active" value={template?.active === false ? 'off' : 'on'} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Setor">
          <select name="sector_id" defaultValue={template?.sector_id ?? sectors[0]?.id ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Título">
          <input name="title" defaultValue={template?.title ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Horário de início">
          <input name="start_time" type="time" defaultValue={toTime(template?.start_time)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Horário do fim">
          <input name="due_time" type="time" defaultValue={toTime(template?.due_time)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Recorrência">
          <select name="recurrence_type" defaultValue={template?.recurrence_type ?? 'DAILY'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="DAILY">Diária</option>
          </select>
        </Field>
        <Field label="Data de início">
          <input name="start_date" type="date" defaultValue={template?.start_date ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
      </div>

      <Field label="Descrição da tarefa">
        <textarea name="description" defaultValue={template?.description ?? ''} rows={10} className="min-h-56 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm leading-6" />
      </Field>

      <div>
        <button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          Salvar tarefa
        </button>
      </div>
    </form>
  );
}

export function SectorForm({
  sector,
}: {
  sector?: Sector;
}) {
  const selectedIcon = sector?.icon ?? 'building-2';
  const metadataResponsibleName = typeof sector?.metadata_json?.responsible_name === 'string' ? sector.metadata_json.responsible_name : '';
  const responsibleName = sector?.responsible_display_name ?? sector?.responsible_name ?? metadataResponsibleName;
  return (
    <form action={saveSectorAction as unknown as (formData: FormData) => void} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="id" value={sector?.id ?? ''} />
      <input type="hidden" name="slug" value={sector?.slug ?? ''} />
      <input type="hidden" name="color" value={sector?.color ?? '#0f766e'} />
      <input type="hidden" name="sort_order" value={sector?.sort_order ?? 0} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome do Setor">
          <input name="name" defaultValue={sector?.name ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Responsável pelo setor">
          <input name="responsible_name" defaultValue={responsibleName ?? ''} placeholder="Digite o nome do responsável" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={sector?.status ?? 'active'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ícone</span>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sectorIconOptions.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input className="peer sr-only" type="radio" name="icon" value={option.value} defaultChecked={selectedIcon === option.value} />
              <span className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition peer-checked:border-[var(--gold)] peer-checked:bg-[#f6f1ea] peer-checked:text-[var(--noir)] hover:border-[var(--gold)]">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#f6f1ea] text-[var(--gold)]">
                  <SectorIconPreview value={option.value} />
                </span>
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>
      <Field label="Descrição do setor">
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
