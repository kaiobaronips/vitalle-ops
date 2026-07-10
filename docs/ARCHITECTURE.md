# Architecture

## Overview

VITALLE OPS is split into a Python API and a Next.js UI.

- `src/vitalle_ops/api.py` mounts the FastAPI application
- `src/vitalle_ops/router.py` exposes operational endpoints
- `src/vitalle_ops/store.py` owns database persistence
- `src/vitalle_ops/domain.py` owns operational rules
- `web/` contains the user interface

## Domain layers

The system follows a simple domain split:

1. **Templates**
   - recurring POP definitions
   - sector ownership
   - recurrence rules
   - goal metadata

2. **Daily instances**
   - generated per operational day
   - contain snapshots of the template
   - never rewrite prior history

3. **Events and audit**
   - task starts, completions, blockers, goal entries, evidence
   - append-only operational trace

## Server responsibilities

The API is responsible for:

- scope resolution
- RBAC enforcement
- daily generation
- status recalculation
- alert generation
- compliance calculations
- history and audit reads

## UI responsibilities

The UI is responsible for:

- shell navigation
- operational dashboards
- task execution forms
- admin maintenance screens
- mobile-first scanning and action flows

## Key implementation choices

- Daily task instances are generated from templates, not mutated from yesterday's rows.
- Completion stores timestamps and late minutes as immutable facts.
- Alerts are recalculated from operational state.
- Sector health is computed from task state, not manually maintained.
- The UI reads from API aggregations instead of composing many task-level requests.

## Repository isolation

This repository contains only Vitalle Ops code and supporting documentation.
