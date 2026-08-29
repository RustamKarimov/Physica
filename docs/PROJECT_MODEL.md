# Project Model

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns persisted root document structures.

## Scope

Project, PresentationFlow, Scene, EntityDefinition, Representation references, datasets/assets and serialization-facing identity.

## Owned concepts

- Project
- PresentationFlow
- Scene
- EntityDefinition
- Representation identity
- document state

## Dependencies

- `COMPONENT_MODEL.md`
- `SYSTEM_MODEL.md`
- `SERIALIZATION.md`

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

- separate document from runtime state
- use stable IDs
- keep topic-specific data inside components/systems

## This subsystem MUST NOT

- store per-frame runtime simulation state as document mutations
- add topic-specific root fields

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- schema validation
- roundtrip mixed-domain fixtures

## Example Gallery obligations

- `schema-roundtrip`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Required root schema distinctions

The persisted model SHALL distinguish `Project`, `PresentationFlow`, `Scene`, `EntityDefinition`, `ComponentInstance`, `SystemDefinition`, `Representation`, `ClockDefinition`, `EventDefinition`, `Dataset`, `AssetRef` and export presets. `RuntimeStateStore`, derived observables and renderer caches are not embedded as ordinary document state.

`Representation` is registry-driven. Foundation representation IDs include `TextBlock` in addition to scientific diagrams, equations, graphs, fields, images and instruments.

## Normative source material incorporated from the frozen master

The following sections are owned here. Component, runtime-state and system details are intentionally delegated to their dedicated specifications.

## 7.1 Project

```text
Project
├─ schemaVersion
├─ projectId
├─ metadata
├─ curriculumProfiles[]
├─ pluginLock[]
├─ styleTheme
├─ globalVariables[]
├─ assets[]
├─ datasets[]
├─ scenes[]
├─ presentationFlow
└─ exportPresets[]
```

`presentationFlow` defines the ordered/conditional relationship between scenes for presentation and interactive playback.

A simple project may use a linear flow.

The architecture also permits explicit branching transitions without changing the Scene schema.

## 7.2 Scene

```text
Scene
├─ id
├─ name
├─ entityDefinitions[]
├─ systemDefinitions[]
├─ clockDefinitions[]
├─ relationshipDefinitions[]
├─ representations[]
├─ controls[]
├─ datasetRefs[]
├─ equations[]
├─ graphs[]
├─ storyboard
├─ camera
├─ audio
└─ metadata
```

Validation results are derived and are not authoritative persisted state.

Runtime state is held by the Runtime State Store, not by the Scene document.

## 7.3 EntityDefinition

```text
EntityDefinition
├─ id
├─ name
├─ type
├─ componentInstances[]
├─ tags[]
├─ visualDefaults?
└─ metadata{}
```

An entity is a stable identity plus component instances.

It does not contain arbitrary top-level `state{}` or `observables{}` maps.

## 7.8 Representation

A Representation observes state or data.

It may be:

```text
Illustration
VectorDiagram
GeometryDiagram
Trajectory
Trail
VectorArrow
VectorField
ScalarField
ComplexFieldView
FieldLines
Equipotentials
Waveform
Wavefronts
RayBundle
CircuitSchematic
ParticleEnsemble
Graph2D
ParametricGraph
Histogram
Spectrum
Heatmap
ContourMap
DataTable
Equation
FreeBodyDiagram
EnergyDiagram
StateDiagram
EnergyLevelDiagram
InteractionDiagram
DetectorTrace
ImagePlane
ReconstructionView
ScaleDiagram
Timeline
MeasurementInstrument
AudioRepresentation
Annotation
```

Representations never become alternate hidden physics models.

## 7.9 Saved hierarchy versus physical hierarchy

Visual grouping, layout grouping and transform parenting are saved inside representation/visual-node structures.

They do not imply physical parenting unless an explicit physical constraint or relationship exists.

## 7.10 Prefab and library instantiation

Dragging a prefab/library item creates versioned component/entity definitions inside the project.

The project stores source metadata for traceability, but built-in Library updates SHALL NOT silently alter already-created project physics.

A teacher may explicitly upgrade/reapply a prefab version.

---
