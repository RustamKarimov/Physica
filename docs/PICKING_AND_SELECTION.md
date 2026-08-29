# Picking and Selection

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns one editor selection/hit-test contract across SVG, Pixi and Three.

## Scope

Hit targets, z/layer ordering, 2D/3D picking and semantic selection mapping.

## Owned concepts

- PickingService
- PickResult

## Dependencies

- `RENDERER_ARCHITECTURE.md`
- `PROJECT_MODEL.md`

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

- return canonical entity/representation IDs
- respect renderer layer order

## This subsystem MUST NOT

- expose renderer-internal objects to editor state

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- overlapping cross-renderer picks
- 3D projected picks

## Example Gallery obligations

- `mixed-renderer-selection`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §27A.3 -->
## 27A.3 Common picking and hit-testing

SVG, Pixi and Three.js adapters expose a shared Picking Service:

```text
pick(screenPoint) -> PickResult[]
```

A PickResult resolves to the stable representation/entity/library identity used by the editor.

Selection does not depend on renderer-specific object references.

