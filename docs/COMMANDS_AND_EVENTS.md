# Commands, History and Events

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns document commands, undo/redo, physical runtime events and event-triggered actions.

## Scope

Transactions, history, EventDefinition/RuntimeEvent separation and runtime controls.

## Owned concepts

- Command
- Transaction
- EventDefinition
- RuntimeEvent

## Dependencies

- `PROJECT_MODEL.md`
- `RUNTIME_SCHEDULER.md`

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

- keep editor commands separate from physical events
- deterministic event identity/order

## This subsystem MUST NOT

- record every simulation frame as undo history

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- 100-command undo roundtrip
- event deterministic ordering

## Example Gallery obligations

- `undo-redo`
- `runtime-event`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §11 -->
# 11. COMMAND, HISTORY, EVENTS AND RUNTIME ACTIONS

The UI never directly mutates the project.

Document changes are Commands:

```text
AddEntity
RemoveEntity
SetParameter
SetInitialState
AddRepresentation
CreateRelationship
AddStoryboardStep
TransformEquation
ConnectCircuitPorts
AddDataset
InstantiateLibraryItem
```

Command transactions provide:

- undo;
- redo;
- macro operations;
- deterministic document replays;
- scripting synchronization.

Simulation frames do not generate undo-history entries.

## 11.1 Event definitions versus runtime events

The document may contain Event Rules / Triggers.

Runtime event instances live in the Runtime Event Queue/Log.

Physical runtime events include:

```text
Collision
ThresholdCrossed
ContactLost
DecayOccurred
PulseReachedBoundary
PhotonDetected
SwitchChanged
DetectorSampled
SolverWarning
```

Events may:

- modify authoritative runtime state through an owning system;
- trigger acquisition;
- trigger an explicitly configured presentation/storyboard action;
- create/remove runtime entities when the model contract permits it.

They do not mutate the saved document unless an explicit user/document command commits a change.

## 11.2 Runtime controls

A control binding declares whether it changes:

- document parameter;
- initial state;
- live runtime control input;
- presentation property;
- layout property.

This prevents a slider from accidentally changing a saved initial condition when it was intended only as a live actuator.

---

