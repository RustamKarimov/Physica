# AGENTS.md — Physica Studio implementation rules

Physica Studio is a deterministic, physics-first teaching authoring application.

## Before modifying code

1. Read `docs/CURRENT_STATE.md` first.
2. Read `docs/PROJECT_CONSTITUTION.md` and the owning subsystem specification.
3. For every user-visible change, readiness transition, checkpoint, or completion claim, read and follow `skills/physica-acceptance-audit/SKILL.md` and the active matrix under `docs/acceptance/`.
4. Follow `docs/PACKAGE_DEPENDENCIES.md` and package ownership.
5. Do not redesign unrelated systems or reverse an approved ADR.
6. Do not add a dependency without a recorded purpose, pinned version, license, replacement strategy, and security review.
7. Physics/domain projects must never depend on Avalonia or editor internals.
8. Preserve document/runtime separation and the single-authoritative-writer rule.
9. Use the shared scheduler, clock, solver, observable, and event contracts; do not invent local alternatives.
10. Add targeted unit, scientific, serialization, accessibility, visual, and application-level interaction tests appropriate to changed behavior.
11. Every user-visible capability needs a representative example and an honest readiness state.
12. Never use a passing build, total test count, or direct view-model call as proof that a teacher workflow works.
13. Run targeted tests first; run the broader suite at checkpoint boundaries.
14. Update `docs/CURRENT_STATE.md` and the active acceptance matrix after substantial completed work.
15. Stop at mandatory user-review gates.

## Source-of-truth order

1. `docs/PROJECT_CONSTITUTION.md`
2. Approved ADRs in `docs/DECISIONS.md`
3. Owning subsystem specification
4. `docs/CURRENT_STATE.md`
5. The approved product plan and concept images

