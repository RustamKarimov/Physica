# Performance

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns performance targets, profiling policy and scale tiers.

## Scope

Frame target, interaction latency, project open, particles/PDE, workers, dirty rendering and culling.

## Owned concepts

- performance budgets
- benchmark tiers

## Dependencies

- `COMPUTE_BACKEND.md`
- `RENDERER_ARCHITECTURE.md`

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

- profile heavy scenes
- degrade visual detail without silently changing physical results

## This subsystem MUST NOT

- promise arbitrary particle/PDE scale

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- benchmark suite budgets

## Example Gallery obligations

- `particle-cloud`
- `large-data-graph`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §25 -->
# 25. PERFORMANCE TARGETS

Normal classroom scenes:

- target 60 fps on a mainstream school laptop;
- interactive input response under 100 ms;
- first project open under 2 s for ordinary files after application launch.

Large scenes use performance tiers.

Particle targets are benchmark-specific rather than pretending all computers can simulate arbitrary particle counts.

Heavy solver work runs through the ComputeBackend abstraction in Web Workers or approved WASM/native adapters.

Worker completion order never determines scientific event ordering.

Rendering uses dirty-state updates and visibility culling.

Adaptive visual detail may reduce rendered particles/field samples, but it must not silently alter authoritative physical state or recorded observables.

---

