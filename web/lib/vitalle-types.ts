export type PrincipalContext = {
  principal: {
    role: string;
    user_id: string;
    email: string;
    auth_method: string;
    organization_id?: string;
    unit_id?: string;
    sector_id?: string;
    display_name?: string;
  };
  organization_id: string;
  unit_id: string;
  role: string;
  display_name: string;
  sector_ids: string[];
  admin_like: boolean;
  timezone: string;
  sectors: Sector[];
  settings: SystemSetting[];
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
};

export type Unit = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  timezone: string;
  is_active?: boolean;
};

export type Sector = {
  id: string;
  organization_id: string;
  unit_id: string;
  name: string;
  slug: string;
  description: string;
  responsible_user_id?: string | null;
  responsible_name?: string | null;
  responsible_display_name?: string | null;
  color?: string;
  icon?: string;
  status?: string;
  sort_order?: number;
  metadata_json?: Record<string, unknown>;
  task_count?: number;
  completed_count?: number;
  overdue_count?: number;
  near_due_count?: number;
  health_state?: string;
};

export type SystemSetting = {
  id: string;
  organization_id: string;
  unit_id: string;
  key: string;
  value_json: Record<string, unknown>;
};

export type TaskSubtask = {
  id: string;
  task_template_id: string;
  title: string;
  sort_order: number;
  is_required: boolean;
  is_completed?: boolean;
  completed_at?: string | null;
  completed_by?: string | null;
  notes?: string;
};

export type TaskTemplate = {
  id: string;
  organization_id: string;
  unit_id: string;
  sector_id: string;
  sector_name?: string;
  sector_slug?: string;
  recurrence_rule_id?: string | null;
  title: string;
  description: string;
  task_type: string;
  default_assignee_id?: string | null;
  default_assignee_name?: string | null;
  start_time: string;
  due_time: string;
  priority: string;
  is_critical: boolean;
  goal_target?: number | null;
  goal_unit?: string;
  goal_group_key?: string;
  requires_comment_on_completion?: boolean;
  requires_evidence?: boolean;
  requires_manager_review?: boolean;
  allow_not_applicable?: boolean;
  is_conditional?: boolean;
  instructions?: string;
  active?: boolean;
  archived_at?: string | null;
  recurrence_type?: string;
  weekdays?: number[];
  month_days?: number[];
  weeks_of_month?: number[];
  custom_rule_json?: Record<string, unknown>;
  start_date?: string | null;
  end_date?: string | null;
  subtasks_count?: number;
  subtasks?: TaskSubtask[];
};

export type TaskInstance = {
  id: string;
  task_template_id: string;
  daily_operation_id: string;
  organization_id: string;
  unit_id: string;
  sector_id: string;
  sector_name?: string;
  sector_slug?: string;
  sector_color?: string;
  sector_icon?: string;
  assignee_id?: string | null;
  assignee_name?: string | null;
  operational_date: string;
  occurrence_key: string;
  title_snapshot: string;
  description_snapshot: string;
  instructions_snapshot: string;
  sector_name_snapshot: string;
  assignee_name_snapshot: string;
  task_type_snapshot: string;
  priority_snapshot: string;
  goal_target_snapshot?: number | null;
  goal_unit_snapshot?: string;
  goal_group_key_snapshot?: string;
  goal_current?: number;
  scheduled_start: string;
  scheduled_due: string;
  status: string;
  review_status: string;
  is_critical_snapshot: boolean;
  requires_manager_review: boolean;
  requires_comment_on_completion: boolean;
  requires_evidence: boolean;
  allow_not_applicable: boolean;
  is_conditional: boolean;
  started_at?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  completion_comment?: string;
  blocker_reason?: string;
  blocker_details?: string;
  justification_note?: string;
  not_applicable_reason?: string;
  evidence_count?: number;
  subtasks_total?: number;
  subtasks_completed?: number;
  is_late?: boolean;
  late_minutes?: number;
  display_state?: string;
  display_label?: string;
  overdue_minutes?: number;
  is_overdue?: boolean;
  comments?: TaskComment[];
  goals?: TaskGoalEntry[];
  evidences?: TaskEvidence[];
  subtasks?: TaskSubtaskInstance[];
};

export type TaskSubtaskInstance = {
  id: string;
  daily_task_instance_id: string;
  task_template_subtask_id?: string | null;
  title_snapshot: string;
  sort_order: number;
  is_required: boolean;
  is_completed: boolean;
  completed_at?: string | null;
  completed_by?: string | null;
  notes?: string;
};

export type TaskGoalEntry = {
  id: string;
  daily_task_instance_id: string;
  recorded_by?: string | null;
  quantity: number;
  note: string;
  created_at: string;
};

export type TaskComment = {
  id: string;
  daily_task_instance_id: string;
  user_id?: string | null;
  comment_type: string;
  body: string;
  created_at: string;
  user_name?: string;
};

export type TaskEvidence = {
  id: string;
  daily_task_instance_id: string;
  user_id?: string | null;
  evidence_type: string;
  label: string;
  payload_json: Record<string, unknown>;
  created_at: string;
};

export type Alert = {
  id: string;
  organization_id: string;
  unit_id: string;
  sector_id?: string | null;
  sector_name?: string | null;
  sector_slug?: string | null;
  daily_task_instance_id?: string | null;
  task_title?: string | null;
  task_due?: string | null;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  triggered_at: string;
  resolved_at?: string | null;
  metadata_json: Record<string, unknown>;
};

export type DailyOperation = {
  id: string;
  organization_id: string;
  unit_id: string;
  operational_date: string;
  timezone: string;
  status: string;
};

export type ComplianceSummary = {
  score: number;
  punctuality: number;
  conclusion: number;
  goals: number;
  raw: Record<string, number>;
};

export type DashboardSummary = {
  operation?: DailyOperation;
  date: string;
  now: string;
  task_counts: {
    total: number;
    completed: number;
    in_progress: number;
    overdue: number;
    critical_pending: number;
  };
  compliance: ComplianceSummary;
  buckets: Record<string, TaskInstance[]>;
  sectors: Sector[];
  alerts: Alert[];
  tasks: TaskInstance[];
  operational_now?: Array<{
    task_id: string;
    sector_name: string;
    title: string;
    status: string;
    label: string;
    scheduled_start: string;
    scheduled_due: string;
    completed_at?: string | null;
  }>;
  points_of_attention?: Array<Record<string, unknown>>;
  recurring_failures?: Array<Record<string, unknown>>;
  closing_summary?: Record<string, unknown>;
  sector_health?: Sector[];
  next_task?: TaskInstance | Record<string, never>;
  day_progress?: number;
  date_label?: string;
  scope?: Record<string, unknown>;
};

export type SectorDetail = {
  sector: Sector;
  tasks: Record<string, TaskInstance[]>;
  compliance: ComplianceSummary;
  alerts: Alert[];
};

export type HistoryItem = {
  operational_date: string;
  operation_status: string;
  timezone: string;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  blocked_tasks: number;
  not_applicable_tasks: number;
  sectors?: Array<{
    operational_date: string;
    sector_id: string;
    sector_name: string;
    total_tasks: number;
    completed_tasks: number;
    overdue_tasks: number;
    blocked_tasks: number;
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      scheduled_start: string;
      scheduled_due: string;
      completed_at?: string | null;
      is_late?: boolean;
      blocker_reason?: string;
      blocker_details?: string;
      completion_comment?: string;
    }>;
  }>;
};

export type AuditEvent = {
  id: string;
  organization_id: string;
  unit_id: string;
  sector_id?: string | null;
  entity_type: string;
  entity_id: string;
  event_type: string;
  actor_user_id?: string | null;
  timestamp: string;
  previous_state: Record<string, unknown>;
  new_state: Record<string, unknown>;
  metadata_json: Record<string, unknown>;
  sector_name?: string | null;
  actor_name?: string | null;
};

export type Report = {
  id: string;
  operational_date: string;
  operation_status: string;
  timezone: string;
  operational_observations: string;
  operational_occurrence: string;
  next_shift_notes: string;
  external_form_url: string;
  generated_from_json: Record<string, unknown>;
};

export type PageResponse<T> = {
  items: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};
