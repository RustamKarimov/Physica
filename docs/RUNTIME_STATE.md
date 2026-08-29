# Runtime State

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns transient simulation state, caches and state-authority rules.

## Scope

Runtime State Store, per-clock state, derived observables, checkpoints/caches versus document state.

## Owned concepts

- RuntimeStateStore
- authoritative state channels
- derived state/cache rules

## Dependencies

- `PROJECT_MODEL.md`
- `COMPONENT_MODEL.md`
- `SYSTEM_MODEL.md`
- `CLOCKS_AND_TIME.md`

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

- single authoritative writer per state channel
- rebuild runtime from document + deterministic runtime inputs

## This subsystem MUST NOT

- persist frame-by-frame state as ordinary project edits
- let representations write physical state

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- runtime reset/rebuild
- state writer conflict

## Example Gallery obligations

- `runtime-state-reset`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §7.5–7.6 -->
## 7.5 Runtime State Store

At runtime:

```text
RuntimeStateStore
├─ sceneId
├─ entityComponentState[]
├─ systemState[]
├─ clockState[]
├─ eventQueue
├─ randomSourceState[]
├─ acquisitionState[]
└─ runtimeDiagnostics
```

The Runtime State Store may be reset or reconstructed from the document.

It is never treated as the project document.

## 7.6 State Authority

Every mutable physical state channel has exactly one authoritative writer in a given clock domain.

Examples:

```text
Ball.position
Ball.velocity
Capacitor.charge
Sample.undecayedCount
```

A `ProjectileModel` and a rigid-body solver cannot simultaneously own `Ball.position`.

The component/system compatibility validator rejects ambiguous ownership before playback.

Forces, fields and other contributors may have many producers when the authoritative dynamics system explicitly aggregates them.

