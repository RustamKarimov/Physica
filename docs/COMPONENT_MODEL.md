# Component Model

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns reusable entity-attached component contracts.

## Scope

Component identity, schema version, config, initial-state contract, capabilities, state-channel ownership, observables, solver compatibility, assumptions, validators and migrations.

## Owned concepts

- ComponentInstance
- capability declarations
- state writer declarations

## Dependencies

- `PROJECT_MODEL.md`
- `RUNTIME_STATE.md`
- `PHYSICS_RUNTIME.md`

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

- declare required/provided capabilities
- declare authoritative output channels
- version every payload

## This subsystem MUST NOT

- write state channels it does not own
- hide solver-specific data in editor structures

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- component schema/migration tests
- state authority conflicts

## Example Gallery obligations

- `component-contract-fixture`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Component contract

Every component declares at minimum:

```text
id
typeId
schemaVersion
configurationSchema
initialStateSchema
runtimeStateSchema
requiredCapabilities[]
providedCapabilities[]
readStateChannels[]
writeStateChannels[]
observableDefinitions[]
solverRequirements[]
assumptions[]
validators[]
migrationHandlers[]
```

A component conflict is a validation error when two active authorities claim the same exclusive state channel and no owning coupled system resolves it.

## Normative source material incorporated from the frozen master

## 7.4 ComponentInstance

```text
ComponentInstance
├─ instanceId
├─ componentTypeId
├─ componentSchemaVersion
├─ configuration{}
├─ initialState{}
├─ bindings[]
├─ sourceLibraryItem?
└─ metadata{}
```

The component type defines:

- parameter/configuration schema;
- initial-state schema;
- runtime-state schema;
- observables;
- required capabilities/components;
- provided capabilities;
- exclusive state channels;
- compatible solvers;
- assumptions;
- validators;
- serialization/migration hooks.
