# Package Dependency Rules

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns allowed dependency direction and architecture-lint rules.

## Scope

All workspace packages and plugin SDK boundaries.

## Owned concepts

- dependency DAG
- public import rules

## Dependencies

- `PROJECT_CONSTITUTION.md`

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

- fail CI on cycles
- use package public APIs

## This subsystem MUST NOT

- import editor from physics
- import domain physics from renderer
- use package-internal paths across boundaries

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- architecture dependency test

## Example Gallery obligations

- No standalone user-visible example required unless this subsystem exposes a user-visible feature.

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §27A.11 -->
## 27A.11 Package dependency direction

Core dependency direction is enforced.

Conceptually:

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

Cross-cutting registries/SDKs expose interfaces without importing the editor.

Rules:

- physics domain packages do not import React/editor code;
- renderer packages do not calculate domain physics;
- the editor does not import package-internal implementation paths;
- plugins compile against `plugin-sdk`, not editor internals;
- package cycles fail architecture linting/CI.

<!-- Source: Master §31 -->
# 31. REPOSITORY STRUCTURE

```text
Physica/
├─ apps/
│  ├─ desktop/
│  ├─ web-viewer/
│  └─ gallery/
├─ packages/
│  ├─ core-model/
│  ├─ commands/
│  ├─ serialization/
│  ├─ units/
│  ├─ mathematics/
│  ├─ clocks/
│  ├─ runtime-scheduler/
│  ├─ checkpoints/
│  ├─ events/
│  ├─ relationships/
│  ├─ equations/
│  ├─ graphs/
│  ├─ data/
│  ├─ constants/
│  ├─ i18n/
│  ├─ licensing/
│  ├─ audio/
│  ├─ renderer-core/
│  ├─ renderer-svg/
│  ├─ renderer-pixi/
│  ├─ renderer-three/
│  ├─ picking/
│  ├─ typography/
│  ├─ assets/
│  ├─ controls/
│  ├─ storyboard/
│  ├─ physics-core/
│  ├─ solver-analytical/
│  ├─ solver-algebraic/
│  ├─ compute-backend/
│  ├─ solver-ode/
│  ├─ solver-rigid/
│  ├─ solver-particles/
│  ├─ solver-grid/
│  ├─ solver-rays/
│  ├─ solver-circuits/
│  ├─ solver-stochastic/
│  ├─ solver-reconstruction/
│  ├─ physics-mechanics/
│  ├─ physics-materials/
│  ├─ physics-waves/
│  ├─ physics-optics/
│  ├─ physics-electricity/
│  ├─ physics-fields/
│  ├─ physics-thermal/
│  ├─ physics-particles/
│  ├─ physics-quantum/
│  ├─ physics-nuclear/
│  ├─ physics-medical/
│  ├─ physics-astronomy/
│  ├─ physics-practical/
│  ├─ curriculum/
│  ├─ plugin-sdk/
│  ├─ validation/
│  ├─ export/
│  └─ example-runtime/
├─ examples/
├─ benchmarks/
├─ docs/
├─ tests/
└─ tools/
```

---

