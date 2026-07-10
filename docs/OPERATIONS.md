# Operations

## Daily flow

1. login
2. resolve role, sector and scope
3. load the day’s tasks
4. start the next task
5. complete, block, justify or mark not applicable
6. record goal entries when applicable
7. generate alerts and audit events automatically

## Daily synchronization

The system supports two sync paths:

- automatic job
- fallback sync on first administrative access

Both paths are idempotent.

## What the gestor sees

- tasks for the day
- overdue items
- critical backlog
- sector health
- alerts
- recurring failures
- closing summary

## What the collaborator sees

- sector context
- current task
- next activity
- goal progress
- blockers and required follow-up

## Main operational rules

- a task is not recycled to become tomorrow’s task
- a completion timestamp is a historical fact
- blockers are recorded explicitly
- goal progress is additive
- subtask completion rolls into the parent task

## Routine troubleshooting

- if the dashboard looks empty, sync the day’s operation
- if a task is missing, validate the recurrence rule and the sector assignment
- if alerts seem stale, refresh the day’s runtime state

## Production concerns

- run migrations before seeding
- keep Supabase credentials server-side
- do not enable insecure dev auth outside local development
- use the audit trail for any operational dispute
