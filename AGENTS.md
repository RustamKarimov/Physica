# AGENTS.md — Physica implementation rules

Physica is a deterministic, physics-first teaching authoring application.

## Before modifying code

1. Read `docs/CURRENT_STATE.md` first.
2. Read only the subsystem specifications named by the current task, plus `docs/PROJECT_CONSTITUTION.md` when needed.
3. Follow `docs/PACKAGE_DEPENDENCIES.md` and package ownership.
4. Do not redesign unrelated systems or reverse an ADR.
5. Do not add a dependency without task-level justification and license compatibility.
6. Physics/domain packages must not depend on React/editor internals.
7. Preserve document/runtime separation and the single-authoritative-writer rule.
8. Use the Runtime Scheduler, clock, solver and event contracts rather than inventing local alternatives.
9. Add targeted unit/scientific/serialization tests for changed behavior.
10. Every user-visible feature must ship its required Example Gallery artifacts.
11. Run targeted tests first; run broader suites only when the task requires them.
12. Update `docs/CURRENT_STATE.md` after substantial completed work.
13. Stop when the assigned task is complete. Do not opportunistically implement the next phase.

## Source-of-truth order

1. `docs/PROJECT_CONSTITUTION.md`
2. approved ADRs in `docs/DECISIONS.md`
3. owning subsystem specification
4. `docs/CURRENT_STATE.md` for current operational status
5. Architecture-Frozen Master Blueprint for broader context

## User-visible Definition of Done

A user-visible capability is not complete without its specified example project, metadata, README, expected screenshot/preview and automated example test.
