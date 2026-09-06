# AGENTS.md — Physica Studio implementation rules

Physica Studio is a deterministic, physics-first teaching authoring application.

## Before modifying code

1. Read `docs/CURRENT_STATE.md` first.
2. Read `docs/PROJECT_CONSTITUTION.md` and the owning subsystem specification.
3. Follow `docs/PACKAGE_DEPENDENCIES.md` and package ownership.
4. Do not redesign unrelated systems or reverse an approved ADR.
5. Do not add a dependency without a recorded purpose, pinned version, license, replacement strategy, and security review.
6. Physics/domain projects must never depend on Avalonia or editor internals.
7. Preserve document/runtime separation and the single-authoritative-writer rule.
8. Use the shared scheduler, clock, solver, observable, and event contracts; do not invent local alternatives.
9. Add targeted unit, scientific, serialization, accessibility, or visual tests for changed behavior.
10. Every user-visible capability needs a representative example and an honest readiness state.
11. Run targeted tests first; run the broader suite at checkpoint boundaries.
12. Update `docs/CURRENT_STATE.md` after substantial completed work.
13. Stop at mandatory user-review gates.

## Source-of-truth order

1. `docs/PROJECT_CONSTITUTION.md`
2. Approved ADRs in `docs/DECISIONS.md`
3. Owning subsystem specification
4. `docs/CURRENT_STATE.md`
5. The approved product plan and concept images

