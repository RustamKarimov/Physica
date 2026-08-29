# Physics Runtime

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns physical model/system lifecycle and integration with runtime state/events/observables.

## Scope

Initialize, validate, create initial state, evaluate/step, emit events, compute observables, reset.

## Owned concepts

- PhysicalModelRuntime
- SystemRuntime
- observable publication

## Dependencies

- `RUNTIME_STATE.md`
- `SOLVER_ARCHITECTURE.md`
- `VALIDATION.md`

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

- declare assumptions/state channels/observables
- be deterministic when model class requires

## This subsystem MUST NOT

- import editor/rendering packages
- write unowned state channels

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- model lifecycle
- reset
- observable agreement

## Example Gallery obligations

- `custom-model-contract`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §7 -->
# 7. UNIVERSAL PROJECT, DOCUMENT AND RUNTIME MODEL

Physica uses a component-based, registry-driven document model.

There are no topic-specific columns in the root schema.

A mandatory distinction exists between:

- **Document State** — saved authoring information;
- **Runtime State** — transient evolving simulation state;
- **Derived Observables** — values computed from runtime/document state;
- **Cached Runtime Data** — checkpoints, render caches and acceleration structures that may be regenerated.

Per-frame simulation state and derived observables SHALL NOT be written back into the persistent project document on every frame.

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

<!-- Source: Master §12 -->
# 12. SOLVER ARCHITECTURE

No single solver is used for all physics.

Every model declares a Solver Adapter.

## 12.0 Solver contract and compute backend

Every solver is accessed through a Physica-owned adapter.

The adapter declares:

```text
solverTypeId
supportedStateTypes
supportedDimensions
determinismPolicy
checkpointCapability
workerCapability
precisionPolicy
inputSchema
outputSchema
```

Heavy computation runs through a `ComputeBackend` abstraction.

Initial backends:

- main-thread TypeScript for light analytical work;
- Web Worker TypeScript/WASM for heavy browser/desktop computation;
- optional Rust/WASM/native service adapters behind the same contract.

A physics model cannot depend directly on worker APIs, GPU APIs, Rapier or a native shell.

Scene systems declare read/write state channels. The scheduler derives system order from those declarations. Cyclic dependencies require an explicit coupled-system solver rather than implicit callback iteration.

## 12.0.1 Algebraic / root / linear-system service

In addition to time-evolution solvers, Physica provides shared deterministic numerical mathematics for:

- linear systems;
- polynomial/root finding;
- one-dimensional bracketing/root search;
- nonlinear equation solving where a model explicitly requires it;
- interpolation;
- numerical differentiation/integration.

This service is used by models that need a solved state but do not naturally fit an ODE.

## 12.1 Analytical evaluator

For exact curriculum models.

## 12.2 ODE integrator

For drag, damping, arbitrary fields, coupled systems, thermal evolution.

Supported algorithms:

- semi-implicit Euler;
- velocity Verlet;
- RK4;
- adaptive RK45.

The model declares its recommended integrator and error tolerance.

## 12.3 Constraint and rigid-body solver

Rapier adapter for appropriate 2D/3D rigid/contact systems.

Physica owns the semantic model.

## 12.4 Many-body particle solver

Data-oriented particle arrays, spatial hashing/broad phase, boundary interactions, statistical observables.

## 12.5 Grid/PDE solver

Generic grid fields for:

- wave equations;
- heat diffusion;
- numerical potential fields;
- advanced diffraction;
- later simple fluid fields.

Supports boundary-condition registry.

## 12.6 Ray/path solver

For geometrical optics and any path-intersection model.

## 12.7 Circuit/network solver

Graph topology, component constitutive laws, DC/transient/AC adapters.

## 12.8 Statistical/Monte-Carlo solver

For radioactive decay, counting statistics, random walks, uncertainty simulations.

## 12.9 Reconstruction/inverse solver

For imaging/tomography and later inverse-data problems.

## 12.10 Spectral/FFT service

A shared numerical service for:

- Fourier synthesis;
- spectra;
- wave analysis;
- diffraction extensions;
- signal processing.

## 12.11 Solver independence and precision

- Solver stepping is independent of render FPS.
- Models specify supported precision and tolerances.
- Numerical models expose convergence/error diagnostics.
- Solver snapshots are compatible with the Checkpoint/Replay service.
- Third-party engines are pinned by exact dependency version and hidden behind adapters.
- Rapier is treated as an implementation detail because its public releases may introduce breaking changes before 1.0.

---

<!-- Source: Master §27 -->
# 27. SCIENTIFIC VALIDATION SYSTEM

Every model declares:

```text
assumptions[]
validityConditions[]
warnings[]
approximationLevel
conservationChecks[]
referenceCases[]
curriculumTags[]
```

Validators may be:

- dimensional;
- algebraic;
- invariant/conservation;
- geometry;
- topology;
- numerical error;
- statistical;
- approximation range.

A red validation error blocks export if it means the shown physics is invalid.

A yellow educational warning may allow export but remains visible in authoring.

## 27.1 Model provenance and fidelity

Every scientific model declares:

- model ID/version;
- educational/analytical/numerical category;
- assumptions;
- validity conditions;
- curriculum tags;
- reference/provenance notes;
- solver/tolerance policy.

Model compatibility validation detects conflicting assumptions or incompatible state authorities where possible.

A visual metaphor can be tagged `SCHEMATIC` independently of the mathematical model's fidelity.

## 27.2 Validation of numerical and stochastic models

Numerical models can report:

- local/global error estimate where available;
- convergence failure;
- constraint error;
- conservation drift.

Stochastic models can expose statistical reference checks without treating individual random outcomes as errors.

---

