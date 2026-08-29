# System Model

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns scene-level multi-entity physics and coupling.

## Scope

Circuits, collisions, fields, particle systems, grids, acquisition systems and coupled multiphysics.

## Owned concepts

- SystemDefinition
- system state ownership
- multi-entity membership/coupling

## Dependencies

- `COMPONENT_MODEL.md`
- `RUNTIME_STATE.md`
- `SOLVER_ARCHITECTURE.md`

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

- declare state inputs/outputs
- declare membership
- use registered coupled solver for cyclic coupling

## This subsystem MUST NOT

- resolve coupled systems via callback order
- let reactive relationships replace simultaneous solving

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- state-channel conflict
- coupling DAG/cycle tests

## Example Gallery obligations

- `system-contract-multientity`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Required system categories

The contract must accommodate, without root-schema changes: collision/contact systems, circuit networks, N-body gravitational/electromagnetic systems, particle ensembles, wave/PDE grids, acquisition/detector systems and explicit coupled multiphysics systems.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §7.7 -->
## 7.7 SystemDefinition

Some physics belongs to a scene-level interaction system rather than one entity.

Examples:

- uniform gravity;
- collision world;
- gravitational N-body interaction;
- electric interaction;
- circuit network;
- particle ensemble;
- wave grid;
- acquisition scanner.

```text
SystemDefinition
├─ id
├─ systemTypeId
├─ configuration{}
├─ entityQueries[]
├─ clockDomain
├─ solverBinding?
├─ declaredInputs[]
├─ declaredOutputs[]
└─ metadata{}
```

This is the principal architecture for multi-entity and multiphysics coupling.

<!-- Source: Master §27A.12 -->
## 27A.12 Coupled-system policy

Systems declare state-channel inputs and outputs.

If one system consumes another system's outputs, the Runtime Scheduler builds a deterministic system dependency order.

A cyclic multiphysics dependency cannot be "fixed" by callback order.

It must be represented by a registered coupled solver/system that owns the coupled state and convergence policy.

This allows future electromechanical, thermo-mechanical or other coupled teaching models without ambiguous state writers.

