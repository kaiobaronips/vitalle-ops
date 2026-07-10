# Database

## Strategy

PostgreSQL is the source of truth.

The schema is designed around traceability:

- templates define intention
- daily instances define what happened on a specific day
- events define how the state changed

## Core tables

### Organization and access

- `organizations`
- `units`
- `users`
- `user_profiles`
- `user_sector_assignments`
- `sectors`

### Operation

- `task_templates`
- `task_template_subtasks`
- `task_recurrence_rules`
- `daily_operations`
- `daily_task_instances`
- `daily_task_subtask_instances`

### Execution detail

- `task_goal_entries`
- `task_blockers`
- `task_comments`
- `task_evidences`

### Governance

- `alerts`
- `notifications`
- `audit_events`
- `daily_reports`
- `system_settings`

## Snapshot rules

Critical task fields are copied into the daily instance:

- title
- description
- instructions
- sector
- assignee
- type
- priority
- goal target
- goal unit
- criticality

This prevents historical corruption if the template changes later.

## Idempotency

Daily generation uses a uniqueness strategy equivalent to:

- `task_template_id`
- `operational_date`
- `occurrence_key`

This avoids duplicate instances if the generator runs more than once.

## Important indexes

The schema includes indexes for:

- `operational_date`
- `sector_id`
- `status`
- `assignee_id`
- `task_template_id`
- `daily_operation_id`
- `created_at`

## Operational notes

- task histories are append-only from the perspective of audit events
- task comments and evidence are separate from the task row itself
- blocked tasks retain blocker metadata
- alerts can be resolved without deleting the underlying cause

## Seed baseline

The development seed creates:

- one organization
- one unit
- four sectors
- starter POPs
- demo users only for development
