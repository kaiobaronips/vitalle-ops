# Permissions

## Roles

### ADMINISTRATOR

Full access.

Can manage:

- sectors
- users
- task templates
- recurring rules
- settings
- alerts
- audit history
- reports

### COLLABORATOR

Scoped access.

Can:

- see permitted sectors
- see assigned tasks
- start tasks
- complete tasks
- register blockers
- add comments
- add goal entries
- complete subtasks

## Backend enforcement

Authorization is enforced server-side.

The UI hides actions, but the API still validates:

- principal role
- sector membership
- unit scope
- admin-like access

## Scope resolution

The backend resolves:

- organization
- unit
- sector
- display name
- timezone
- accessible sectors

This is derived from:

- authenticated user context
- development persona headers
- unit defaults

## Development personas

Development login supports these personas:

- admin
- gestor
- avaliador
- asb
- secretaria
- marketing

These are for local use only and are not production identities.

## Security boundaries

- do not expose API keys to the browser
- do not trust the client to hide restricted data
- keep patient-sensitive information out of generic task comments
- prefer explicit blocker reasons and operational notes over free-form clinical detail
