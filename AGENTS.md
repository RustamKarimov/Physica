# Physica Development Instructions

Physica is a deterministic physics-teaching application.

## Source of Truth

Before making substantial changes:

1. Read `docs/CURRENT_STATE.md`.
2. Read `docs/PROJECT_CONSTITUTION.md`.
3. Read only the specifications relevant to the current task.
4. Check `docs/DECISIONS.md` for existing architectural decisions.

## Development Rules

- Do not redesign unrelated systems.
- Do not implement features outside the current task.
- Do not introduce dependencies without explicit justification.
- Do not invent missing physics specifications.
- Do not invent missing product requirements.
- Physics correctness takes priority over implementation convenience.
- Visual representations must ultimately derive from the physical model where physically meaningful.
- Teachers must not be required to know a conventional programming language to use Physica.
- AI must not be required for Physica's authoring or physics systems.
- Prefer small, testable changes.
- Run relevant tests before declaring an implementation complete.
- Update `docs/CURRENT_STATE.md` after substantial implementation work.
- Record significant architectural decisions in `docs/DECISIONS.md`.

## Scope Control

If a requested implementation requires a decision that is not defined in the specifications, stop and report the missing decision instead of silently choosing an architecture.
