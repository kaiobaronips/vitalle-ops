create extension if not exists pgcrypto;

create table if not exists organizations (
    id text primary key,
    name text not null,
    slug text not null unique,
    timezone text not null default 'America/Sao_Paulo',
    is_active boolean not null default true,
    metadata_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists units (
    id text primary key,
    organization_id text not null references organizations(id) on delete cascade,
    name text not null,
    slug text not null,
    timezone text not null default 'America/Sao_Paulo',
    is_active boolean not null default true,
    sort_order integer not null default 0,
    metadata_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (organization_id, slug)
);

create table if not exists users (
    id text primary key,
    organization_id text not null references organizations(id) on delete cascade,
    unit_id text references units(id) on delete set null,
    email text not null default '',
    full_name text not null,
    role text not null default 'collaborator',
    is_active boolean not null default true,
    is_demo boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (organization_id, email)
);

create table if not exists user_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references users(id) on delete cascade,
    display_name text not null,
    title text not null default '',
    avatar_url text not null default '',
    phone text not null default '',
    bio text not null default '',
    metadata_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id)
);

create table if not exists sectors (
    id text primary key,
    organization_id text not null references organizations(id) on delete cascade,
    unit_id text not null references units(id) on delete cascade,
    name text not null,
    slug text not null,
    description text not null default '',
    responsible_user_id text references users(id) on delete set null,
    color text not null default '#0f766e',
    icon text not null default 'building-2',
    status text not null default 'active',
    sort_order integer not null default 0,
    metadata_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (unit_id, slug)
);

create table if not exists user_sector_assignments (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references users(id) on delete cascade,
    sector_id text not null references sectors(id) on delete cascade,
    is_primary boolean not null default false,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    unique (user_id, sector_id)
);

create table if not exists task_recurrence_rules (
    id text primary key,
    organization_id text not null references organizations(id) on delete cascade,
    unit_id text not null references units(id) on delete cascade,
    recurrence_type text not null,
    interval_value integer not null default 1,
    weekdays integer[] not null default '{}'::integer[],
    month_days integer[] not null default '{}'::integer[],
    weeks_of_month integer[] not null default '{}'::integer[],
    custom_rule_json jsonb not null default '{}'::jsonb,
    start_date date,
    end_date date,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists task_templates (
    id text primary key,
    organization_id text not null references organizations(id) on delete cascade,
    unit_id text not null references units(id) on delete cascade,
    sector_id text not null references sectors(id) on delete cascade,
    recurrence_rule_id text references task_recurrence_rules(id) on delete set null,
    title text not null,
    description text not null default '',
    task_type text not null default 'STANDARD',
    default_assignee_id text references users(id) on delete set null,
    start_time time not null,
    due_time time not null,
    priority text not null default 'NORMAL',
    is_critical boolean not null default false,
    goal_target integer,
    goal_unit text not null default '',
    goal_group_key text not null default '',
    requires_comment_on_completion boolean not null default false,
    requires_evidence boolean not null default false,
    requires_manager_review boolean not null default false,
    allow_not_applicable boolean not null default true,
    is_conditional boolean not null default false,
    instructions text not null default '',
    active boolean not null default true,
    archived_at timestamptz,
    created_by text references users(id) on delete set null,
    updated_by text references users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists task_template_subtasks (
    id text primary key,
    task_template_id text not null references task_templates(id) on delete cascade,
    title text not null,
    sort_order integer not null default 0,
    is_required boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (task_template_id, sort_order)
);

create table if not exists daily_operations (
    id uuid primary key default gen_random_uuid(),
    organization_id text not null references organizations(id) on delete cascade,
    unit_id text not null references units(id) on delete cascade,
    operational_date date not null,
    timezone text not null default 'America/Sao_Paulo',
    status text not null default 'OPEN',
    opened_at timestamptz not null default now(),
    closed_at timestamptz,
    sync_source text not null default 'manual',
    generated_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (unit_id, operational_date)
);

create table if not exists daily_task_instances (
    id uuid primary key default gen_random_uuid(),
    task_template_id text not null references task_templates(id) on delete cascade,
    daily_operation_id uuid not null references daily_operations(id) on delete cascade,
    organization_id text not null references organizations(id) on delete cascade,
    unit_id text not null references units(id) on delete cascade,
    sector_id text not null references sectors(id) on delete cascade,
    assignee_id text references users(id) on delete set null,
    operational_date date not null,
    occurrence_key text not null default 'default',
    title_snapshot text not null,
    description_snapshot text not null default '',
    instructions_snapshot text not null default '',
    sector_name_snapshot text not null,
    assignee_name_snapshot text not null default '',
    task_type_snapshot text not null,
    priority_snapshot text not null,
    goal_target_snapshot integer,
    goal_unit_snapshot text not null default '',
    goal_group_key_snapshot text not null default '',
    goal_current integer not null default 0,
    scheduled_start time not null,
    scheduled_due time not null,
    status text not null default 'PENDING',
    review_status text not null default 'NONE',
    is_critical_snapshot boolean not null default false,
    requires_manager_review boolean not null default false,
    requires_comment_on_completion boolean not null default false,
    requires_evidence boolean not null default false,
    allow_not_applicable boolean not null default true,
    is_conditional boolean not null default false,
    started_at timestamptz,
    completed_at timestamptz,
    completed_by text references users(id) on delete set null,
    completion_comment text not null default '',
    blocker_reason text not null default '',
    blocker_details text not null default '',
    justification_note text not null default '',
    not_applicable_reason text not null default '',
    evidence_count integer not null default 0,
    subtasks_total integer not null default 0,
    subtasks_completed integer not null default 0,
    is_late boolean not null default false,
    late_minutes integer not null default 0,
    external_report_state jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (task_template_id, operational_date, occurrence_key)
);

create table if not exists daily_task_subtask_instances (
    id uuid primary key default gen_random_uuid(),
    daily_task_instance_id uuid not null references daily_task_instances(id) on delete cascade,
    task_template_subtask_id text references task_template_subtasks(id) on delete set null,
    title_snapshot text not null,
    sort_order integer not null default 0,
    is_required boolean not null default true,
    is_completed boolean not null default false,
    completed_at timestamptz,
    completed_by text references users(id) on delete set null,
    notes text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (daily_task_instance_id, sort_order)
);

create table if not exists task_goal_entries (
    id uuid primary key default gen_random_uuid(),
    daily_task_instance_id uuid not null references daily_task_instances(id) on delete cascade,
    recorded_by text references users(id) on delete set null,
    quantity integer not null,
    note text not null default '',
    created_at timestamptz not null default now()
);

create table if not exists task_blockers (
    id uuid primary key default gen_random_uuid(),
    daily_task_instance_id uuid not null references daily_task_instances(id) on delete cascade,
    reported_by text references users(id) on delete set null,
    reason_type text not null,
    details text not null default '',
    status text not null default 'ACTIVE',
    resolved_at timestamptz,
    resolved_by text references users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists task_comments (
    id uuid primary key default gen_random_uuid(),
    daily_task_instance_id uuid not null references daily_task_instances(id) on delete cascade,
    user_id text references users(id) on delete set null,
    comment_type text not null default 'comment',
    body text not null,
    created_at timestamptz not null default now()
);

create table if not exists task_evidences (
    id uuid primary key default gen_random_uuid(),
    daily_task_instance_id uuid not null references daily_task_instances(id) on delete cascade,
    user_id text references users(id) on delete set null,
    evidence_type text not null default 'text',
    label text not null default '',
    payload_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists task_events (
    id uuid primary key default gen_random_uuid(),
    organization_id text not null references organizations(id) on delete cascade,
    unit_id text not null references units(id) on delete cascade,
    sector_id text references sectors(id) on delete set null,
    daily_task_instance_id uuid references daily_task_instances(id) on delete cascade,
    event_type text not null,
    actor_user_id text references users(id) on delete set null,
    previous_state jsonb not null default '{}'::jsonb,
    new_state jsonb not null default '{}'::jsonb,
    metadata_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists alerts (
    id uuid primary key default gen_random_uuid(),
    organization_id text not null references organizations(id) on delete cascade,
    unit_id text not null references units(id) on delete cascade,
    sector_id text references sectors(id) on delete set null,
    daily_task_instance_id uuid references daily_task_instances(id) on delete cascade,
    alert_type text not null,
    severity text not null default 'info',
    title text not null,
    description text not null default '',
    status text not null default 'active',
    dedup_key text not null default '',
    triggered_at timestamptz not null default now(),
    resolved_at timestamptz,
    resolved_by text references users(id) on delete set null,
    metadata_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (unit_id, dedup_key)
);

create table if not exists notifications (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references users(id) on delete cascade,
    alert_id uuid references alerts(id) on delete set null,
    notification_type text not null,
    title text not null,
    body text not null default '',
    status text not null default 'unread',
    read_at timestamptz,
    metadata_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists audit_events (
    id uuid primary key default gen_random_uuid(),
    organization_id text not null references organizations(id) on delete cascade,
    unit_id text not null references units(id) on delete cascade,
    sector_id text references sectors(id) on delete set null,
    entity_type text not null,
    entity_id text not null,
    event_type text not null,
    actor_user_id text references users(id) on delete set null,
    timestamp timestamptz not null default now(),
    previous_state jsonb not null default '{}'::jsonb,
    new_state jsonb not null default '{}'::jsonb,
    metadata_json jsonb not null default '{}'::jsonb
);

create table if not exists daily_reports (
    id uuid primary key default gen_random_uuid(),
    daily_operation_id uuid not null references daily_operations(id) on delete cascade,
    created_by text references users(id) on delete set null,
    operational_observations text not null default '',
    operational_occurrence text not null default '',
    next_shift_notes text not null default '',
    external_form_url text not null default '',
    generated_from_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (daily_operation_id)
);

create table if not exists system_settings (
    id uuid primary key default gen_random_uuid(),
    organization_id text not null references organizations(id) on delete cascade,
    unit_id text not null references units(id) on delete cascade,
    key text not null,
    value_json jsonb not null default '{}'::jsonb,
    updated_by text references users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (unit_id, key)
);

create index if not exists idx_units_org_active on units (organization_id, is_active, sort_order);
create index if not exists idx_users_org_role on users (organization_id, role, is_active);
create index if not exists idx_users_unit on users (unit_id);
create index if not exists idx_user_profiles_user on user_profiles (user_id);
create index if not exists idx_sectors_unit_status on sectors (unit_id, status, sort_order);
create index if not exists idx_user_sector_assignments_user on user_sector_assignments (user_id, is_active);
create index if not exists idx_user_sector_assignments_sector on user_sector_assignments (sector_id, is_active);
create index if not exists idx_task_templates_unit_active on task_templates (unit_id, active, priority, task_type);
create index if not exists idx_task_templates_sector_active on task_templates (sector_id, active);
create index if not exists idx_task_template_subtasks_template on task_template_subtasks (task_template_id, sort_order);
create index if not exists idx_daily_operations_unit_date on daily_operations (unit_id, operational_date desc);
create index if not exists idx_daily_task_instances_operation on daily_task_instances (daily_operation_id, status, scheduled_due);
create index if not exists idx_daily_task_instances_assignee on daily_task_instances (assignee_id, operational_date desc);
create index if not exists idx_daily_task_instances_sector on daily_task_instances (sector_id, operational_date desc, status);
create index if not exists idx_daily_task_instances_due on daily_task_instances (unit_id, operational_date desc, scheduled_due, status);
create index if not exists idx_daily_task_subtasks_instance on daily_task_subtask_instances (daily_task_instance_id, sort_order);
create index if not exists idx_task_goal_entries_task on task_goal_entries (daily_task_instance_id, created_at desc);
create index if not exists idx_task_blockers_task on task_blockers (daily_task_instance_id, status);
create index if not exists idx_task_comments_task on task_comments (daily_task_instance_id, created_at desc);
create index if not exists idx_task_evidences_task on task_evidences (daily_task_instance_id, created_at desc);
create index if not exists idx_task_events_task on task_events (daily_task_instance_id, created_at desc);
create index if not exists idx_alerts_unit_status on alerts (unit_id, status, severity, triggered_at desc);
create index if not exists idx_notifications_user_status on notifications (user_id, status, created_at desc);
create index if not exists idx_audit_events_operational on audit_events (organization_id, unit_id, timestamp desc);
create index if not exists idx_daily_reports_operation on daily_reports (daily_operation_id);
create index if not exists idx_system_settings_unit_key on system_settings (unit_id, key);
