# Runtime Scheduler

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns deterministic frame/step ordering across commands, physics, events, data, storyboard, animation and rendering.

## Scope

One runtime cycle and worker result ordering.

## Owned concepts

- scheduler phases
- system dependency order
- event ordering key

## Dependencies

- `CLOCKS_AND_TIME.md`
- `COMMANDS_AND_EVENTS.md`
- `RUNTIME_STATE.md`

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

- use frozen 13-stage order
- sort runtime events deterministically

## This subsystem MUST NOT

- let worker completion timing decide semantics

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- same inputs produce same schedule/event order

## Example Gallery obligations

- `scheduler-order-trace`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Frozen update order

1. document/control commands
2. clock advancement
3. authoritative physics
4. event ordering
5. physical event processing
6. observables
7. relationships
8. acquisition/data sampling
9. storyboard conditions
10. presentation animation
11. representation/layout resolution
12. rendering
13. audio/output

The scheduler may parallelize computations only when externally observable semantics remain equivalent to this order.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §10.1–10.3 -->
## 10.1 Render time is not physics time

Browser/request-animation-frame timing is never the authoritative physics clock.

A rendering frame may display zero, one or many solver steps.

Physics results must not depend on monitor refresh rate.

## 10.2 Deterministic execution pipeline

For each runtime update, the default phase order is:

```text
1. apply pending document/control commands
2. resolve clock advancement
3. advance authoritative physics systems/solvers
4. enqueue and deterministically order physical events
5. process physical state-changing events
6. compute/refresh observables
7. evaluate relationship dependency graph
8. sample datasets/detectors scheduled for this time
9. evaluate storyboard conditions/transitions
10. evaluate presentation animations
11. resolve representation/layout transform stack
12. render visual layers
13. emit audio/output work for the corresponding clock interval
```

A subsystem may declare a specialized phase only through the Runtime Scheduler contract.

## 10.3 Deterministic event ordering

Events include:

```text
timestamp
clockDomain
sourceId
eventType
sequenceId
payload
```

Events sharing a timestamp are ordered deterministically using scheduler phase, explicit priority where defined, then stable sequence ID.

No behavior may depend on unordered JavaScript object iteration or worker completion timing.

<!-- Source: Master §27A -->
# 27A. CROSS-CUTTING ARCHITECTURE FREEZE DECISIONS

## 27A.1 Common runtime scheduler

All physics packages use the execution phases defined in Section 10.

No package owns an independent uncontrolled animation/requestAnimationFrame loop.

## 27A.2 Coordinate convention

Canonical physical 3D coordinates are right-handed.

`+y` is physically upward in normal world scenes.

Screen-space conversion may invert y as required by the rendering backend.

2D physics is represented as a plane within the same coordinate framework.

Reference-frame transformations are registry-based so Galilean and later Lorentz frame transforms can be added without replacing coordinates.

## 27A.3 Common picking and hit-testing

SVG, Pixi and Three.js adapters expose a shared Picking Service:

```text
pick(screenPoint) -> PickResult[]
```

A PickResult resolves to the stable representation/entity/library identity used by the editor.

Selection does not depend on renderer-specific object references.

## 27A.4 Deterministic typography

Physica bundles approved redistributable UI/scientific fonts or uses renderer-owned bundled math fonts.

Saved projects refer to semantic typography tokens plus optional packaged user fonts/assets.

Visual regression and deterministic export cannot depend on arbitrary host font substitution.

## 27A.5 Text and localization

Text content is Unicode.

UI/localized strings are separate from physics identifiers.

Diagram labels may specify language/direction, while physical quantity identifiers remain canonical.

## 27A.6 Project save safety

Desktop saving uses an atomic-write strategy:

1. write a new temporary package;
2. validate package structure/checksums;
3. fsync/close where supported;
4. replace the previous file atomically where the platform permits;
5. keep recovery/autosave information separately.

Opening a project never modifies it automatically.

## 27A.7 Internal asset addressing

Assets and binary datasets use project-internal stable URIs and content hashes.

Paths inside a `.physica` package are not interpreted as arbitrary host filesystem paths.

## 27A.8 Licensing policy

Physica maintains machine-readable dependency, font and built-in asset license metadata.

Core releases include only components compatible with free redistribution.

Any optional encoder/plugin with different licensing requirements is clearly separate.

## 27A.9 PhysScript extensibility

PhysScript has a versioned core grammar and AST.

Plugins do not inject arbitrary parser grammar.

Generic core statements refer to registered model/representation/control IDs, while optional aliases expand to the same canonical AST.

This keeps old scripts parseable when plugins evolve.

## 27A.10 Collaboration scope

Realtime multi-user collaborative editing is explicitly outside the 1.0 product contract.

The portable command/document architecture does not intentionally block a later synchronization layer, but no 1.0 design decision depends on CRDT/OT semantics.

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

## 27A.12 Coupled-system policy

Systems declare state-channel inputs and outputs.

If one system consumes another system's outputs, the Runtime Scheduler builds a deterministic system dependency order.

A cyclic multiphysics dependency cannot be "fixed" by callback order.

It must be represented by a registered coupled solver/system that owns the coupled state and convergence policy.

This allows future electromechanical, thermo-mechanical or other coupled teaching models without ambiguous state writers.

## 27A.13 Privacy and diagnostics

Physica is local-first and does not require telemetry.

Crash/diagnostic export is local by default.

Any future telemetry or update analytics must be explicit opt-in and independent of project execution.

---

