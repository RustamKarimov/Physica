# Project Migration

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns version upgrade chain for package/project/components/plugins.

## Scope

Migration ordering, backup/failure behavior and compatibility tests.

## Owned concepts

- migration registry
- migration chain

## Dependencies

- `SERIALIZATION.md`
- `COMPONENT_MODEL.md`
- `PLUGIN_ARCHITECTURE.md`

## Global dependency direction

```text
mathematics / units / schemas
        ↓
core-model / commands / clocks / events / data
        ↓
runtime / solver interfaces / relationships
        ↓
renderers / equations / graphs / controls / storyboard
        ↓
physics domain packages
        ↓
editor / viewer / gallery
```

Cross-cutting registries and SDK packages expose interfaces without importing editor internals. Package cycles are forbidden.

## Invariants / required behavior

- migrate package→project→components→plugins
- never overwrite original on failed migration

## This subsystem MUST NOT

- silently drop unknown fields/plugin data

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- every released version fixture→current
- failure rollback

## Example Gallery obligations

- `migration-fixture`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §37 -->
# 37. PROJECT FILE MIGRATION

Every component payload has its own schema version.

The package manifest contains project ID, schema version, plugin lock, asset/dataset entries and content hashes.

Assets/datasets are addressed internally; host filesystem paths are not authoritative project references.

Migration runs:

```text
package format migration
→ project migration
→ component migrations
→ plugin migrations
```

The original file is never overwritten during a failed migration.

Unknown plugin payloads remain stored.

Save is atomic/recoverable as defined in Section 27A.

Autosave/recovery creates a separate recoverable working copy and never silently overwrites the user's last explicit save.

Asset de-duplication may use content hashes without changing logical asset IDs.

---

