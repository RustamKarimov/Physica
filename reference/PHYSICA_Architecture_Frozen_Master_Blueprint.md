# PHYSICA
# Greenfield Master Architecture, Product & Development Blueprint

**Document status:** Architecture freeze candidate  
**Planning mode:** Written from scratch as a complete product specification  
**Primary curriculum:** Cambridge International AS & A Level Physics 9702  
**Scope:** Complete physics-teaching authoring, animation, simulation, data and presentation platform  
**Product principle:** No AI dependency. Physics is authoritative.

---

# 0. PURPOSE OF THIS DOCUMENT

This document is the single programmer-facing blueprint for Physica.

It is intentionally not an incremental modification of any earlier plan.

The app, data model, authoring workflow, rendering architecture, solver model, file format, example system, curriculum coverage, testing strategy and development order are defined here as one coherent greenfield design.

The design goal is not merely to implement today's requested demonstrations.

The design goal is:

> **A future physics feature should normally require a new model, component, solver, representation, control or plugin — not a redesign of the central project schema.**

This document removes architectural ambiguity by making concrete decisions now.

Items may be scheduled for later implementation, but their architectural place is already defined.

---

# 1. PRODUCT CONTRACT

Physica is a free, local-first physics teaching authoring application.

It combines:

1. scientific simulation;
2. Manim-style explanatory animation;
3. interactive physics diagrams;
4. equations and semantic equation transformations;
5. live graphs and measurements;
6. experimental-data analysis;
7. classroom presentation;
8. student-interactive activities;
9. deterministic video/still export;
10. an inspectable example gallery.

Physica is designed first for physics teachers, not programmers.

A teacher must be able to create a polished physics explanation without learning Python, JavaScript, TypeScript or another conventional language.

An expert scripting interface is available, but optional.

Physica is not a general-purpose PowerPoint clone, game engine, video editor, CAD package, CFD package or medical device.

---

# 2. NON-NEGOTIABLE SCIENTIFIC PRINCIPLES

1. **Physics state is authoritative.**  
   A velocity arrow reads velocity from the physical model. The model does not infer velocity from the drawn arrow.

2. **One state drives all views.**  
   Objects, arrows, graphs, numbers, equations, detector traces and tables subscribe to the same state/observables.

3. **Physics and layout are separate.**  
   Moving a graph panel must not change a physical coordinate.

4. **Simulation and presentation are separate.**  
   A teacher can pause the simulation and continue explaining with transforms, highlights and equations.

5. **Assumptions are explicit.**  
   Every model declares approximations, validity conditions and warnings.

6. **Analytical models are preferred when they are the intended physics.**  
   Numerical integration is not used simply because it is convenient.

7. **Stochastic models are seedable.**  
   Random decay, Brownian motion and molecular distributions can be replayed.

8. **Visual metaphors are labelled.**  
   Photons, atoms, fields, tissue layers and cosmological analogies are not allowed to imply false literalism.

9. **Curriculum terminology is a profile, not hard-coded physics.**

10. **No AI is required to author, simulate, validate or render physics.**

---

# 3. PRIMARY USERS AND USER MODES

## 3.1 Teacher — Visual Mode

This is the default.

The teacher chooses a physical model, edits physics-aware parameters, enables representations, creates storyboard steps and presents.

No programming is required.

## 3.2 Teacher — Structured Blocks

Optional block-based authoring for users who want deterministic logical control without typing script.

Blocks correspond directly to commands and PhysScript.

## 3.3 Teacher — PhysScript

Optional small domain-specific language.

It is not a general programming language.

Example:

```text
scene "Projectile Motion"

projectile Ball
speed 20 m/s
angle 35 deg
gravity 9.81 m/s^2

show trajectory of Ball
show velocity of Ball
show acceleration of Ball

graph vertical_position of Ball against time
graph vertical_velocity of Ball against time

step "Maximum height"
pause simulation when vertical_velocity of Ball = 0
highlight vertical_velocity
transform equation Eq1 to Eq2
```

## 3.4 Expert / Plugin Developer

Uses typed package APIs and plugin contracts.

This mode is never necessary for normal teaching use.

---

# 4. EXACT PRODUCT PLATFORM DECISION

Physica will be **desktop-first with a shareable web runtime**.

## 4.1 Desktop application

Primary authoring application:

- Tauri 2 shell;
- React + TypeScript frontend;
- Vite build system;
- Windows, macOS and Linux targets.

Reason:

- reliable local project files;
- local asset access;
- heavy computation;
- worker/WASM support;
- deterministic export;
- offline use;
- smaller native shell than a full bundled browser architecture.

## 4.2 Web runtime

The same core and rendering packages build as a browser runtime for:

- example gallery;
- shared interactive simulations;
- student activities;
- read-only project playback;
- selected browser editing later.

The desktop application remains the authoritative full editor.

## 4.3 Local-first

No account and no cloud are required.

Projects are saved as portable `.physica` files.

A small local application database indexes:

- recent projects;
- thumbnails;
- installed plugins;
- user preferences;
- example cache.

The database is **not** the source of truth for project content.

---

# 5. TECHNOLOGY STACK — FROZEN INITIAL CHOICES

## 5.1 UI

- React 19
- TypeScript
- Vite
- custom Physica design system
- Zustand only for ephemeral editor/UI state
- project data lives in the Core Project Store, not React state

## 5.2 Desktop shell

- Tauri 2
- Rust stable toolchain for shell/native services

## 5.3 2D rendering

Two cooperating render paths:

### SVG vector layer

Default for:

- scientific diagrams;
- vectors;
- axes;
- geometry;
- field lines;
- ray diagrams;
- print-quality objects;
- paths intended for SVG export.

### PixiJS/WebGL layer

Used for:

- thousands of particles;
- heatmaps;
- animated wave/field raster layers;
- high-volume sprites;
- GPU effects.

WebGL is the production default.

WebGPU is an optional backend behind the same renderer interface and is never required for correctness.

## 5.4 3D rendering

- Three.js renderer adapter
- WebGL2 baseline
- WebGPU optional when platform support is adequate

The data model is 3D-capable from the beginning even when a scene is displayed in 2D.

## 5.5 Mathematics and equation input

- MathLive Mathfield for interactive formula entry
- MathJSON/semantic expression representation
- Physica semantic equation identity layer above the expression tree
- KaTeX for stable final equation rendering

## 5.6 Rigid-body/contact physics

- Rapier 2D/3D behind a Physica adapter
- never exposed as the public physics-model schema
- used only when a rigid/contact solver is scientifically appropriate

## 5.7 Graphing

- Physica Graph Engine
- SVG for axes, labels, annotations and print
- Canvas/Pixi path for high-density traces/heatmaps
- D3 scale/shape utilities may be used internally
- data/state bindings remain Physica-owned

## 5.8 Persistence

`.physica` is a ZIP-based package:

```text
project.physica
├─ manifest.json
├─ project.json
├─ assets/
├─ datasets/
├─ thumbnails/
└─ plugin-data/
```

ZIP implementation uses `fflate`.

Schemas are versioned and validated with Zod.

## 5.9 Testing

- Vitest: unit/package tests
- Playwright: end-to-end and visual regression
- deterministic snapshot fixtures
- numerical reference tests
- physics invariants

## 5.10 Example gallery

A dedicated `apps/gallery` React/Vite application uses the same viewer runtime as Physica.

Every user-visible feature ships with an example.

This requirement is explained in detail later.

---

# 6. HOW THE APPLICATION LOOKS AND WORKS

## 6.1 Home screen

The home screen contains:

- New Project
- Open Project
- Recent Projects
- Templates
- Examples
- Curriculum Profiles
- Installed Physics Modules
- Settings

No complex dashboard is shown before the teacher chooses a task.

## 6.2 Main editor

Desktop layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ Project  Undo Redo   Add   Play/Pause   Present   Export   │
├──────────────┬────────────────────────────┬─────────────────┤
│ Library      │                            │ Inspector       │
│              │          STAGE             │                 │
│ Models       │                            │ Model           │
│ Objects      │                            │ Visual          │
│ Graphs       │                            │ Relationships   │
│ Equations    │                            │ Data            │
│ Controls     │                            │ Validation      │
│ Media        │                            │                 │
├──────────────┴────────────────────────────┴─────────────────┤
│ Storyboard  |  Advanced Timeline  |  Simulation Scrubber   │
└─────────────────────────────────────────────────────────────┘
```

## 6.3 Library panel

The Library is semantic.

Example categories:

- Motion
- Forces
- Energy
- Materials
- Waves
- Fields
- Circuits
- Thermal
- Particles
- Quantum
- Nuclear
- Medical
- Astronomy
- Optics
- Practical
- Representations
- Controls
- Media

The teacher drags a **Projectile**, **Spring Oscillator**, **Point Charge**, **Ultrasound Layer Model** or **Hubble Dataset** rather than a generic animation asset when a physical model is intended.

## 6.4 Inspector

Five primary tabs:

### Model

Physical parameters and assumptions.

### Visual

Display style, visual scale, line weights, label positions.

### Relationships

Followers, bindings, constraints, tangents, normals, synchronization.

### Data

Observables, graph feeds, datasets, detector output.

### Validation

Model assumptions, warnings, conservation/consistency checks.

## 6.5 Physical edit versus layout edit

The editor has explicit manipulation modes:

- **Layout Move** — changes only visual placement.
- **Physical Manipulation** — changes a physical parameter or initial state.
- **Measure** — places probes/rulers/angle tools.
- **Connect** — creates physical/topological relationships.

Cursor and inspector state visibly indicate the active mode.

## 6.6 Storyboard

Normal teachers do not manage raw keyframes.

They make steps:

```text
Step 1  Show projectile
Step 2  Show velocity
Step 3  Start simulation
Step 4  Pause at maximum height
Step 5  Reveal v_y graph
Step 6  Transform equation
Step 7  Resume
```

Each step can contain:

- presentation actions;
- simulation commands;
- waits;
- conditions;
- camera actions;
- narration notes;
- interaction pauses.

## 6.7 Advanced timeline

Available when needed.

Shows:

- presentation tracks;
- simulation clock segments;
- camera;
- animation tracks;
- audio;
- detector/acquisition tracks.

Teachers may ignore it entirely.

---

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
# 8. MATHEMATICS AND QUANTITY CORE

The core supports from day one:

- real numbers;
- complex numbers;
- vectors in 2D and 3D;
- matrices;
- quaternions for 3D orientation;
- intervals;
- uncertainties;
- arrays;
- functions;
- sampled series.

Physical Quantity stores:

```text
value
dimension
displayUnit
uncertainty
precisionPolicy
semanticKind
```

`semanticKind` distinguishes useful dimensionless concepts such as angle and refractive index without corrupting dimensional analysis.

All internal physical calculations use SI-compatible canonical units.

Display units are presentation choices.

---

# 9. COORDINATES, FRAMES AND SCALE

The app distinguishes:

1. entity-local physical coordinates;
2. physical world coordinates;
3. reference-frame coordinates;
4. scene/view coordinates;
5. camera coordinates;
6. screen/layout coordinates;
7. graph/data coordinates;
8. image/detector coordinates.

A scene may contain multiple physical reference frames.

The core uses 3D position/orientation types even for 2D models.

Educational visual scaling is explicit:

```text
physicalScale
visualScale
scaleMode: physical | educational | logarithmic
notToScaleWarning
```

This is required for atoms, fields, medical images and astronomy.

---

# 10. CLOCK, SCHEDULING, CHECKPOINT AND SCRUB ARCHITECTURE

Every scene has named clock domains.

Mandatory:

- `simulation`
- `presentation`

Optional registered clocks:

- `acquisition`
- `audio`
- `experiment`
- subsystem clocks

Clocks may be:

- running;
- paused;
- scrubbed;
- scaled;
- linked;
- conditionally synchronized.

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

## 10.4 Scrubbing analytical models

Analytical models evaluate state directly at the target time.

## 10.5 Scrubbing numerical, rigid, particle and stochastic models

Physica uses a Checkpoint/Replay service.

```text
RuntimeCheckpoint
├─ sceneId
├─ clockTimes{}
├─ authoritativeStateSnapshot
├─ solverSnapshot
├─ randomGeneratorState
├─ eventSequenceState
└─ checksum
```

For a scrub target:

1. locate the nearest valid checkpoint before the target;
2. restore solver and PRNG state;
3. replay deterministically to the target;
4. regenerate derived observables and representations.

Checkpoint spacing is performance policy, not project physics.

## 10.6 Stochastic reproducibility

Seed alone is not enough for mid-run scrubbing.

The checkpoint stores the full deterministic random-generator state or a reproducible event-stream position.

## 10.7 Example

The projectile simulation pauses at maximum height while presentation time continues through a graph highlight and equation transform.

A medical scanner may run an acquisition clock while presentation time is paused.

---
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

# 13. DYNAMIC RELATIONSHIP ENGINE

Built-in relationship categories:

- attach;
- follow;
- offset;
- align;
- bind;
- copy;
- scale-by;
- tangent;
- normal;
- project;
- intersect;
- perpendicular;
- parallel;
- lookAt;
- constrain;
- synchronize;
- measure;
- derive.

Relationships form a dependency graph.

Creation-time cycle detection prevents invalid circular reactive dependencies.

Legitimate simultaneous/algebraic constraints are NOT represented as reactive relationship cycles. They belong to the appropriate constraint, network or algebraic solver.

Every binding is dimension/type checked where the source and target carry physical metadata.

Dirty propagation recomputes only affected descendants.

Relationships cannot write a state channel owned by an authoritative physics system unless the relationship itself is explicitly registered as that channel's authority.

Physics-aware relationships include:

- velocity vector follows velocity;
- normal force normal to surface;
- friction tangent to surface;
- tension along string;
- centripetal acceleration points toward centre;
- graph cursor follows simulation time;
- echo marker follows detector event time;
- spectral label follows measured line peak.

---

# 14. PRESENTATION ANIMATION ENGINE

Presentation animation is independent of physical evolution.

## 14.1 Core animation contract

```text
Animation
├─ id
├─ target
├─ clockDomain
├─ duration
├─ easing
├─ startState
├─ endState
├─ reversible
├─ scrubbable
└─ serializationPayload
```

## 14.2 Animation families

The architecture supports:

- appear/disappear;
- fade;
- write/draw/erase;
- grow/shrink;
- translate;
- rotate;
- scale;
- reflect;
- stretch;
- path morph;
- object replacement;
- matched transform;
- camera pan/zoom/follow;
- highlight/dim/isolate;
- stagger;
- parallel;
- sequence;
- delayed actions;
- path-follow;
- reveal masks;
- graph drawing;
- field reveal;
- particle/event emphasis;
- detector acquisition;
- multi-scale zoom.

## 14.3 Composition

```text
Sequence
Parallel
Stagger
Wait
Until
RepeatPresentation
```

No physics loop is implemented as a presentation repeat.

## 14.4 Transform/property stack

A representation resolves its visible state through ordered layers:

```text
physical/world transform
→ relationship-derived transform
→ representation/layout transform
→ presentation-animation transform
→ camera transform
```

Presentation animation normally modifies the presentation layer only.

It cannot silently change physical position, velocity, charge, temperature or another physics state variable.

## 14.5 Animation channel conflicts

Animations target typed channels.

If overlapping animations target the same channel, the scheduler applies an explicit policy:

- sequence;
- replace;
- additive;
- multiplicative;
- reject conflict.

There is no accidental "last callback wins" behavior.

Advanced keyframes may exist as an editor representation of the same Animation contract, but manual keyframing is never required for ordinary teaching.

---

# 15. SEMANTIC EQUATION ENGINE

Equations have three layers:

1. editable input;
2. semantic expression tree;
3. rendered visual fragments.

A rendered equation is never the source of mathematical identity.

## 15.1 Semantic matching

Transform priority:

1. explicit persistent token ID;
2. symbolic identity;
3. structural identity;
4. canonical-expression match;
5. text/glyph fallback;
6. enter/exit animation.

## 15.2 Supported equation animations

- rearrange;
- substitute;
- cancel;
- factor;
- expand;
- collect;
- isolate variable;
- insert numerical values;
- replace units;
- dimensional analysis;
- vector decomposition;
- matrix/complex extension;
- equation-to-graph highlighting.

## 15.3 Teacher workflow

The teacher enters multiple equation states and presses **Animate derivation**.

Physica proposes correspondences.

The teacher can visually override correspondence by selecting source and destination terms.

## 15.4 Stable identity and mathematical validity

Semantic node IDs are Physica identities and are not regenerated merely because a renderer or canonicalizer reformats an expression.

Equation transforms store:

```text
sourceExpression
targetExpression
tokenCorrespondence
equivalenceStatus
verificationMethod
```

`equivalenceStatus` may be:

- `VERIFIED_EQUIVALENT`;
- `VERIFIED_SUBSTITUTION`;
- `TEACHER_DECLARED`;
- `UNVERIFIED_PRESENTATION`.

Where the symbolic engine can verify an algebraic transformation safely, Physica performs the check.

The animation engine never implies mathematical equivalence solely because two expressions were visually transformed.

Custom notation/macros are isolated from semantic identity; unsupported semantics remain renderable but may lose automatic algebra verification.

---

# 16. GRAPH, DATA AND MEASUREMENT ENGINE

Graph types:

- Cartesian x–y;
- time series;
- parametric;
- histogram;
- spectrum;
- heatmap;
- contour;
- vector field;
- error-bar plot;
- event/count plot;
- image/intensity profile.

Capabilities:

- physical units on axes;
- live cursor;
- synchronized simulation time;
- tangent;
- normal;
- gradient triangle;
- area shading/integration;
- maxima/minima;
- intercepts;
- best-fit line;
- uncertainty bars;
- linearisation;
- multiple linked graphs;
- point selection;
- export as SVG/CSV.

Datasets are first-class project resources, not only graph internals.

## 16.1 Sampling is independent of render frames

A dataset/acquisition binding declares:

```text
sourceObservable
clockDomain
samplingPolicy
sampleInterval / eventTrigger
unitMetadata
uncertaintyMetadata
provenance
```

A live graph does not sample merely because the screen rendered a frame.

## 16.2 Data provenance

Imported, simulated and measured datasets preserve:

- source;
- units;
- uncertainty;
- sampling method;
- transformation history;
- model/version when simulated.

## 16.3 Large-data policy

Long traces, spectra, image data and particle-derived statistics may use typed/binary storage and viewport downsampling.

Downsampling changes only display resolution, never the underlying authoritative dataset.

Logarithmic axes are first-class for astronomical and exponential data.

---

# 17. PARTICLE, FIELD, IMAGE AND DETECTOR DATA

To prevent later schema redesign, the core explicitly supports:

## ParticleBuffer

Packed typed arrays for high-volume ensembles.

## ScalarField / VectorField / ComplexField

Continuous function, sampled grid or hybrid representation.

## ImagePlane

2D numeric/image data with physical calibration.

## Detector

Maps physical events/fields/rays to sampled output.

## AcquisitionSeries

Time-ordered samples/projections.

## ReconstructionResult

Image/field reconstructed from acquisitions.

These are needed from the architecture stage even if many are implemented later.

## ProbabilityDistribution / RandomVariable

The mathematics/data layer supports explicit discrete or continuous distributions for:

- counting statistics;
- molecular speeds;
- uncertainty models;
- stochastic decay;
- later quantum/statistical representations.

## AudioSignal

Audio-capable physics may expose a sampled or functional signal with sample-rate/time metadata.

It can feed both waveform representations and offline/live audio rendering.

---

# 18. AUDIO ENGINE

Physics education includes sound.

Physica therefore includes an Audio Representation layer.

Capabilities:

- oscillator/tone;
- sampled audio;
- stereo level;
- amplitude/frequency binding;
- beats;
- Doppler audio extension;
- waveform-to-audio;
- audio synchronized to simulation/presentation clocks.

Audio is generated through Web Audio / offline rendering.

Exported video may include the generated audio track.

---

# 19. PHYSICS COMPONENT, MODEL, ASSET & PREFAB LIBRARY

The Library is a first-class authoring subsystem.

It is not merely a folder of SVG pictures.

Its purpose is to let a teacher search, drag and drop a scientifically meaningful object, model, apparatus or representation onto the Stage and immediately receive the correct default components, anchors, editable parameters, supported relationships and curriculum metadata.

The Library is visible in the left panel of the editor and is searchable by:

- object/model name;
- physics domain;
- Cambridge topic;
- other curriculum profile;
- apparatus type;
- representation type;
- physical quantity;
- example;
- tags such as `projectile`, `field`, `ultrasound`, `lens`, `nuclear`.

## 19.1 Library item classes

The Library contains six distinct item classes.

### A. Smart Physics Models

These carry physical state and behaviour.

Examples:

- `Projectile`
- `SpringOscillator`
- `PointCharge`
- `IdealGas`
- `RadioactiveSample`
- `UltrasoundPulseSource`

Dragging one onto the Stage creates one or more physical entities with registered components and default parameters.

### B. Apparatus / System Prefabs

These are ready-made connected assemblies.

Examples:

- Atwood machine;
- Young modulus apparatus;
- double-slit setup;
- RC charging circuit;
- photoelectric-effect apparatus;
- ultrasound layered-tissue setup.

A prefab may create many entities, connections, representations and default controls in one transaction.

### C. Visual Objects

These are curated visual bodies and scene objects.

Examples:

- car;
- ball;
- trolley;
- Earth;
- satellite;
- star;
- tissue layer;
- X-ray tube.

A Visual Object does not silently invent physics.

If it is dropped independently, it is initially visual-only unless its library definition specifies a default compatible Smart Physics Model.

The teacher may attach or replace physical components explicitly.

### D. Instruments, Sensors and Probes

Examples:

- ruler;
- micrometer;
- stopwatch;
- ammeter;
- voltmeter;
- field probe;
- pressure probe;
- detector;
- oscilloscope;
- spectrum cursor.

These read observables or produce measurement/acquisition data.

### E. Representation Objects

Examples:

- vector arrow;
- trajectory;
- free-body diagram;
- graph;
- histogram;
- field lines;
- equipotentials;
- energy bars;
- detector trace;
- spectrum;
- equation.

Dragging a Representation onto a compatible physical entity should offer automatic binding.

### F. Material / Medium Presets

These package scientifically relevant properties without becoming separate hard-coded topic systems.

Examples:

- air;
- vacuum;
- glass;
- water;
- steel;
- copper;
- dielectric;
- generic tissue layer;
- acoustic medium.

A preset may define density, refractive index, resistivity, elastic properties, permittivity, permeability, sound speed, acoustic impedance or attenuation coefficient when those properties are supported by the active physical model.

## 19.2 Drag-and-drop behaviour

Dragging a Library item onto the Stage invokes a registered creation command.

### Smart Physics Model

```text
drag Projectile
      ↓
create Entity
      ↓
attach TranslationalBody + ProjectileModel
      ↓
apply default parameters
      ↓
create default visual body
      ↓
offer recommended representations
```

### Apparatus Prefab

```text
drag Atwood Machine
      ↓
create Pulley + Mass A + Mass B + String
      ↓
connect constraints
      ↓
attach solver configuration
      ↓
create recommended vectors/labels
```

### Representation

```text
drag Velocity Vector onto Ball
      ↓
detect compatible observable: velocity
      ↓
create VectorArrow representation
      ↓
bind to Ball.velocity
```

### Instrument

```text
drag Voltmeter across two circuit nodes
      ↓
snap to compatible electrical ports
      ↓
create measurement relationship
      ↓
display live potential difference
```

## 19.3 Compatibility and snapping

Library items declare compatible targets and ports.

```text
String
  connectsTo: AttachmentPoint

Voltmeter
  connectsTo: CircuitNode, CircuitNode

Spring
  connectsTo: MechanicalAnchor, MechanicalAnchor

Lens
  interactsWith: RayBundle

FieldProbe
  samples: ScalarField | VectorField

Graph
  bindsTo: Observable | DataSeries
```

While dragging, the Stage highlights compatible anchors and refuses scientifically invalid connections where the incompatibility is unambiguous.

The teacher may still build incomplete scenes while editing, but validation explains what is missing.

## 19.4 Library item metadata contract

Every item is registry-driven.

```text
LibraryItem
├─ id
├─ displayName
├─ itemClass
├─ domainTags[]
├─ curriculumTags[]
├─ topicTags[]
├─ searchTags[]
├─ thumbnail
├─ description
├─ components[]
├─ prefabDefinition?
├─ defaultParameters{}
├─ editableProperties[]
├─ anchors[]
├─ ports[]
├─ compatibleTargets[]
├─ recommendedRepresentations[]
├─ recommendedControls[]
├─ assumptions[]
├─ visualVariants[]
├─ dimensionality: 2D | 3D | BOTH
├─ exampleIds[]
├─ sourcePackage
└─ schemaVersion
```

The editor renders the Library from metadata. Physics packages do not hard-code their cards directly into the editor UI.

## 19.5 Built-in, plugin and user libraries

The visible Library combines three sources.

### Physica Built-in Library

Ships with the application and is version controlled.

### Installed Plugin Library

Physics plugins may register additional items through `LibraryRegistry`.

### My Library

Teachers may save configured objects, apparatus assemblies, custom visual assets, equation layouts, graph styles and complete mini-scenes as reusable local library items.

A user-created prefab contains references to registered components and assets, not arbitrary executable code.

## 19.6 Canonical object reuse

The same object is not duplicated independently for every topic.

For example, the canonical `Ball` visual object may be tagged for Kinematics, Dynamics, Work/Energy, Circular Motion and Oscillations extensions.

Likewise, `Oscilloscope` may be tagged for Waves, Electricity, Alternating Current and Medical Physics.

Part 29 lists each item under every topic where a teacher is likely to search for it, but the underlying Library ID remains canonical.

## 19.7 Library visual quality

Built-in visual objects follow one coherent scientific illustration system.

Each object may have approved variants:

- `schematic`;
- `classroom`;
- `technical`;
- `illustrated`;
- `3D` where useful.

Changing visual variant must not change the physical model.

Objects provide semantic anchors rather than arbitrary bounding-box attachment.

Example Car:

```text
centre
centreOfMass
front
rear
frontWheelCentre
rearWheelCentre
frontGroundContact
rearGroundContact
roofLabelAnchor
```

Example Lens:

```text
opticalCentre
principalAxis
leftSurface
rightSurface
leftFocalPoint
rightFocalPoint
```

## 19.8 Asset import

In addition to the built-in Library, Physica supports native procedural vector objects, curated Physica SVG objects, imported SVG and imported raster images.

No AI asset generation is required.

SVG importer normalizes viewBox, transforms, clipping, stroke widths, unsupported filters and font/text conversion warnings.

Imported visuals can be given user-defined anchors and saved into **My Library**.

## 19.9 Library development rule

A physics feature that introduces a stage-visible entity is not complete until the appropriate Library item exists.

A Library item is complete only when it has:

- metadata;
- thumbnail;
- default visual;
- anchors/ports;
- default parameters;
- validation behavior;
- example project;
- search/curriculum tags;
- serialization test.

The Example Gallery and Physics Library therefore grow together.


## 19.10 Library dependency and provenance policy

Every Library item declares:

- item version;
- required core range;
- required plugin IDs/versions;
- dependent assets;
- license/provenance;
- model provenance/reference where relevant.

When instantiated, a project receives stable component/configuration data plus source metadata.

Updating Physica's built-in Library does not silently alter existing project behavior.

`My Library` prefabs package or reference all required user assets and report missing plugin dependencies before instantiation.

Built-in assets and bundled fonts must use licenses compatible with free redistribution.

## 19.11 Material-property namespaces

Material presets do not use one uncontrolled flat property bag.

Properties have semantic IDs, units and optional validity context such as temperature/frequency when a model supports them.

Examples:

```text
mechanical.density
mechanical.youngModulus
optical.refractiveIndex
electrical.resistivity
acoustic.soundSpeed
acoustic.impedance
medical.attenuationCoefficient
```

A model requests only the properties it understands.


## 19.12 Library registries

The plugin/registry system SHALL include:

```text
LibraryRegistry
PrefabRegistry
MaterialPresetRegistry
InstrumentRegistry
```

in addition to the lower-level model, solver, representation and asset registries.

---


# 20. PLUGIN AND REGISTRY ARCHITECTURE

Registries:

```text
PhysicalModelRegistry
LibraryRegistry
PrefabRegistry
MaterialPresetRegistry
InstrumentRegistry
SolverRegistry
RepresentationRegistry
RelationshipRegistry
AnimationRegistry
ControlRegistry
ObservableRegistry
ValidatorRegistry
CurriculumRegistry
AssetRegistry
ImporterRegistry
ExporterRegistry
ExampleRegistry
```

A plugin declares:

```text
id
version
compatibleCoreRange
models[]
representations[]
solvers[]
examples[]
curriculumTags[]
migrationHandlers[]
```

Unknown plugin component payloads are preserved losslessly when a project is opened without the plugin, but shown as unavailable.

The core must not rely on closed enums for physics model types.

## 20.1 Plugin execution and security model

Physica 1.0 supports:

1. **data/content plugins** — declarative models, Library items, assets, examples and curriculum metadata where no custom executable solver is required;
2. **sandboxed compute plugins** — JavaScript/TypeScript or WASM computation running in a dedicated Worker-like sandbox through the Plugin SDK message API.

Plugins do not inject arbitrary React components into the editor.

Editor UI for plugin models is generated from declarative schemas and metadata.

Plugin compute code receives no direct Tauri filesystem, shell, network, DOM or OS access.

Capabilities requiring files/network are mediated by explicit permission APIs.

Native unrestricted plugins are **not supported in 1.0**.

## 20.2 Namespacing and dependency locking

All plugin-owned IDs are namespaced.

Projects store an exact `pluginLock` containing required plugin IDs, compatible version information and component schema versions.

Missing plugins do not destroy project payloads.

Conflicting registry IDs are rejected.

Plugin migrations are deterministic and independently versioned.

---

# 21. CURRICULUM PROFILE SYSTEM

A Curriculum Profile specifies:

- topic list;
- terminology;
- allowed/required models;
- constants/defaults;
- equations;
- expected practical skills;
- warnings;
- assessment conventions;
- example tags.

Initial mandatory profile:

**Cambridge International AS & A Level Physics 9702 — 25 topics plus practical skills.**

Future profiles:

- IB Physics;
- AP Physics;
- AQA;
- Edexcel;
- custom school profile.

The physics engine remains curriculum-independent where the underlying model is the same.

## 21.1 Constants registry

Physical constants use a versioned `ConstantsRegistry`.

A curriculum profile may choose display precision/default values without changing the underlying constant identity.

A saved project records the constants/profile version needed for reproducible calculation when the value affects results.

## 21.2 Internationalisation and locale

UI text, curriculum terminology and Library descriptions use message keys rather than hard-coded English strings.

Canonical project numbers use locale-independent storage.

Display formatting supports locale decimal/group separators without changing numeric values.

Right-to-left UI and bidirectional text are supported at the design-system level.

Equation semantics remain language-independent.

---

# 22. EXAMPLE GALLERY — MANDATORY DEVELOPMENT CONTRACT

This is a first-class product and development subsystem.

Every user-visible capability is incomplete until a runnable example is committed.

The goal is similar in spirit to a Manim examples gallery: the user can see exactly what a capability does and open the source project.

## 22.1 Example directory contract

```text
examples/
└─ animation/
   └─ equation-rearrangement/
      ├─ example.physica
      ├─ example.physcript
      ├─ metadata.json
      ├─ README.md
      ├─ expected.png
      ├─ preview.webm
      └─ example.spec.ts
```

## 22.2 metadata.json

Contains:

```text
id
title
shortDescription
category
features[]
physicsTopics[]
curriculumTags[]
difficulty
sourceProject
sourceScript
thumbnail
preview
expectedDuration
```

## 22.3 Gallery behavior

Each gallery card shows:

- thumbnail;
- title;
- short explanation;
- feature tags;
- Play;
- Open Interactive;
- View PhysScript;
- Download/Open in Physica.

## 22.4 Example generation command

Development tool:

```text
pnpm example:build <example-id>
```

It:

1. loads `example.physica`;
2. validates schema;
3. runs physics validators;
4. renders deterministic preview;
5. captures `expected.png`;
6. renders `preview.webm`;
7. updates generated gallery manifest;
8. runs the example test.

## 22.5 Feature Definition of Done rule

A feature PR cannot be complete without:

- at least one example;
- automated test;
- gallery metadata;
- expected screenshot;
- short README.

Examples double as regression fixtures.

## 22.6 Machine-enforced coverage

Every public feature/model/animation/Library item may declare required example IDs.

CI builds a Feature → Example coverage graph and fails when a required example is absent, invalid or no longer exercises the declared feature.

The gallery runtime is the same viewer runtime used by real exported projects; examples cannot use hidden gallery-only behavior.

---

# 23. EXPORT AND PLAYBACK

## 23.1 Presentation

Full-screen teacher playback:

- next/previous storyboard step;
- play/pause simulation;
- reset;
- live controls;
- presenter notes optional.

## 23.2 Interactive web export

A self-contained static web bundle containing only required runtime/modules/assets.

## 23.3 Still export

- SVG when representation remains vector;
- PNG at selectable resolution;
- PDF later through print/export pipeline.

## 23.4 Deterministic video export

Frame timestamps are calculated from the project timeline.

The exporter does not screen-record real-time playback.

Primary video target:

- WebM VP9 + Opus

A desktop encoding adapter may additionally produce MP4 where an approved platform encoder is available.

Video rendering uses offline deterministic frame evaluation, not realtime screen capture.

Fonts, assets, PRNG state, solver/checkpoint policy and project/plugin versions are fixed for the render job.

The first guaranteed codec/container target is WebM through the approved encoder adapter; additional formats are capabilities, not assumptions of the core project model.

## 23.5 Data export

- CSV;
- JSON;
- image/spectrum data where applicable.

---

# 24. ACCESSIBILITY

Required:

- keyboard-navigable editor controls;
- high-contrast support;
- color-blind-safe semantic modes;
- text alternatives for diagrams where practical;
- MathML accessibility through equation renderer;
- reduced-motion presentation option;
- line/style alternatives to color-only encoding;
- minimum interactive target sizes.

Reduced-motion affects presentation animation, not the correctness of physics state.

---

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

# 26. SECURITY AND SANDBOXING

Physica projects are data, not executable JavaScript.

PhysScript cannot access:

- filesystem directly;
- network;
- OS commands;
- arbitrary JS eval.

Plugins are separately installed packages with manifest permissions.

Imported SVG is sanitized.

Web exports contain no hidden remote dependency by default.

Project ZIP import defends against:

- path traversal;
- zip bombs/excessive expansion;
- duplicate/ambiguous paths;
- invalid content hashes;
- unsupported executable payloads.

A strict content-security policy is used by the desktop/web viewer.

PhysScript is parsed into a defined AST; it is never passed to `eval`, `Function` or an operating-system shell.

---

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

# 28. CORE FUTURE-PROOFING TEST

Before the core schema is frozen, all of these must fit without introducing a new root Project/Scene concept:

- equation morphing;
- vector addition;
- projectile;
- pulley;
- rigid collision;
- gas with thousands of particles;
- Brownian motion;
- standing waves;
- numerical wave field;
- double slit;
- two-lens ray trace;
- electric field;
- charged particle in E and B;
- capacitor transient;
- transformer;
- radioactive stochastic decay;
- detector counts;
- ultrasound layered echoes;
- A-scan;
- tomography projections;
- image reconstruction;
- spectrum/redshift;
- Hubble graph;
- astronomical scale zoom;
- experiment data;
- uncertainty/error bars;
- 3D rigid body;
- a new curriculum plugin;
- a multi-scene presentation with scene transitions;
- a numerical simulation scrubbed backward and forward;
- a plugin project opened while the plugin is missing;
- a project using right-to-left UI/text;
- a scene rendered through mixed SVG/Pixi/Three layers;
- an advanced control that changes live runtime state without overwriting initial conditions.

If any requires a new root concept, architecture review reopens before implementation proceeds.

---
# 29. COMPLETE CAMBRIDGE 9702 CAPABILITY CATALOG

The catalog below is intentionally wider than the minimum examination requirement. Its job is to make the architecture ready for likely teaching requests from the start.

## 29.1 Topic 1 — Physical quantities and units

### Physics/model capabilities

- SI quantity/dimension model
- scalar/vector quantities
- measurement and uncertainty model
- scientific notation and significant-figure formatter

### Animation requirements

- prefix-scale transitions
- scientific-notation digit shift
- scalar versus vector comparison
- vector component reveal
- uncertainty-interval reveal
- dimensional-symbol grouping
- unit cancellation/rearrangement
- orders-of-magnitude zoom

### Simulation / interactive requirements

- unit conversion explorer
- dimensional-analysis checker
- vector component manipulator
- repeat-measurement/uncertainty explorer
- significant-figures sandbox

### Required representations

- quantity card
- unit tree
- vector diagram
- uncertainty interval
- measurement table
- equation

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `PhysicalQuantity`
- `ScalarQuantity`
- `VectorQuantity`
- `Measurement`
- `UncertainQuantity`
- `RepeatedMeasurementSet`
- `CoordinateFrame`

#### Apparatus / System Prefabs

- SI Units Workbench
- Vector Components Workbench
- Repeated Measurement Table
- Uncertainty Comparison Scene

#### Visual Objects / Assets

- measurement marker
- coordinate axes
- scale/ruler graphic
- unit-prefix scale strip
- scientific-notation place-value strip

#### Instruments, Probes and Bound Representations

- metre rule
- vernier caliper
- micrometer screw gauge
- stopwatch
- digital timer
- balance
- protractor
- data table
- uncertainty interval tool

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- value
- dimension
- display unit
- uncertainty
- percentage uncertainty
- vector magnitude/components

### User controls

- unit picker
- prefix picker
- vector handles
- sample-count input
- measurement editor

### Scientific validation

- dimensional homogeneity
- unit compatibility
- illegal conversions
- rounding/display policy

### Mandatory example-gallery projects

- `units-prefixes`
- `dimensional-analysis`
- `vector-components`
- `uncertainty-repeated-measurements`

---

## 29.2 Topic 2 — Kinematics

### Physics/model capabilities

- 1D analytical kinematics
- 2D analytical kinematics
- piecewise motion
- numerically integrated motion extension

### Animation requirements

- position/displacement
- velocity follower
- acceleration follower
- trajectory/trail
- component decomposition
- freeze-and-explain
- graph cursor sync
- gradient/area reveal

### Simulation / interactive requirements

- constant velocity
- constant acceleration
- free fall
- projectile motion
- piecewise motion
- graph-to-motion
- motion-to-graph
- drag extension

### Required representations

- moving body
- number line
- trajectory
- vectors
- x–t graph
- v–t graph
- a–t graph

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `PointParticle`
- `TranslationalBody`
- `ConstantVelocityModel`
- `ConstantAccelerationModel`
- `FreeFallModel`
- `ProjectileModel`
- `PiecewiseMotionModel`
- `NumericalTrajectoryBody`

#### Apparatus / System Prefabs

- Straight Motion Track
- Free-Fall Tower
- Projectile Launcher Setup
- Ticker-Timer Motion Setup
- Motion-Sensor Setup
- Two-Body Motion Comparison

#### Visual Objects / Assets

- ball
- block
- trolley
- car
- cyclist
- person
- train
- lift/elevator
- projectile marker
- ground plane
- track
- launch platform

#### Instruments, Probes and Bound Representations

- motion sensor
- light gate
- ticker timer
- stopwatch
- position marker
- displacement vector
- velocity vector
- acceleration vector
- trajectory
- motion-graph panel

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- position
- displacement
- distance
- velocity
- speed
- acceleration
- time

### User controls

- initial position
- initial velocity
- acceleration
- launch angle
- gravity
- time scrubber

### Scientific validation

- analytical reference cases
- graph/state agreement
- units
- event timing

### Mandatory example-gallery projects

- `constant-velocity`
- `constant-acceleration`
- `free-fall`
- `projectile`
- `motion-graphs-linked`

---

## 29.3 Topic 3 — Dynamics

### Physics/model capabilities

- force registry
- Newtonian translational dynamics
- friction/contact
- impulse
- momentum
- collision/event models
- connected-body constraints

### Animation requirements

- force arrows
- resultant construction
- FBD extraction
- Newton-III pair emphasis
- impulse area
- momentum before/after
- collision event
- constraint tension

### Simulation / interactive requirements

- block under forces
- inclined plane
- static/kinetic friction
- pulley/Atwood
- elastic collision
- inelastic collision
- explosion/separation
- variable-force motion
- terminal-speed extension

### Required representations

- physical scene
- FBD
- momentum vectors
- force-time graph
- before/after panel

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `NewtonianBody`
- `Force`
- `GravityForce`
- `NormalContact`
- `FrictionForce`
- `TensionForce`
- `AppliedForce`
- `DragForce`
- `ImpulseModel`
- `MomentumBody`
- `CollisionModel`
- `StringConstraint`

#### Apparatus / System Prefabs

- Inclined Plane + Block
- Atwood Machine
- Two-Block Pulley System
- Collision Track
- Newton Third-Law Pair
- Impulse Cart Setup
- Explosion/Separation Setup
- Terminal-Speed Extension Setup

#### Visual Objects / Assets

- mass block
- trolley/cart
- rough surface
- smooth surface
- inclined plane
- pulley
- string
- hook
- spring balance
- rocket/expelling body
- collision bumper

#### Instruments, Probes and Bound Representations

- force sensor
- newton meter
- light gate
- momentum vector
- force vector
- resultant-force vector
- free-body diagram
- force-time graph
- impulse-area overlay

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- forces
- resultant force
- momentum
- impulse
- normal force
- friction
- tension

### User controls

- mass
- force magnitude/direction
- coefficient of friction
- restitution
- pulley masses

### Scientific validation

- Newton II
- momentum conservation when applicable
- energy for elastic collision
- constraint error

### Mandatory example-gallery projects

- `forces-fbd`
- `inclined-plane`
- `pulley-system`
- `elastic-collision`
- `inelastic-collision`
- `impulse`

---

## 29.4 Topic 4 — Forces, density and pressure

### Physics/model capabilities

- rigid-body statics
- moments
- centre of mass/gravity
- density
- scalar pressure field
- hydrostatic extension

### Animation requirements

- moment arm
- turning direction
- centre-of-mass marker
- stability/tipping
- pressure arrows
- pressure-depth gradient
- density-volume comparison

### Simulation / interactive requirements

- beam equilibrium
- multi-load moments
- movable pivot
- stability
- density/mass/volume
- pressure-depth
- manometer extension
- buoyancy extension

### Required representations

- beam/pivot
- COM marker
- pressure probe
- fluid container
- moment equation
- pressure graph

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `RigidBodyStatics`
- `CentreOfMassModel`
- `PivotConstraint`
- `MomentTorqueModel`
- `DensityBody`
- `PressureField`
- `HydrostaticPressureModel`

#### Apparatus / System Prefabs

- Moments Beam
- Multiple-Load Balance
- Centre-of-Gravity Plumb-Line Setup
- Stability/Tipping Setup
- Density Measurement Setup
- Pressure-Depth Vessel
- U-Tube Manometer Extension
- Hydraulic System Extension

#### Visual Objects / Assets

- beam
- pivot
- support
- hanging mass
- irregular lamina
- plumb line
- cube
- cylinder
- liquid container
- fluid column
- piston
- pressure surface

#### Instruments, Probes and Bound Representations

- balance
- measuring cylinder
- ruler
- pressure probe
- pressure gauge
- manometer
- centre-of-mass marker
- perpendicular-distance marker
- moment arrow

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- moment
- resultant moment
- centre of mass
- density
- pressure
- depth

### User controls

- pivot position
- load positions
- masses
- density
- fluid density
- depth

### Scientific validation

- force/moment equilibrium
- density relation
- hydrostatic relation in extension

### Mandatory example-gallery projects

- `moments-balance`
- `centre-of-mass-stability`
- `density`
- `pressure-depth`

---

## 29.5 Topic 5 — Work, energy and power

### Physics/model capabilities

- work-energy ledger
- kinetic/gravitational/elastic energy
- power
- efficiency
- variable-force work

### Animation requirements

- energy bars
- energy transfer flow
- force-displacement area
- KE↔PE exchange
- spring energy
- power-rate visualization
- efficiency flow

### Simulation / interactive requirements

- falling body energy
- spring energy
- variable-force work
- power in motion
- dissipative energy
- roller-coaster extension

### Required representations

- energy bars
- Sankey-like flow
- F–x graph
- power meter
- equations

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `EnergyLedger`
- `WorkProcess`
- `KineticEnergyModel`
- `GravitationalPotentialEnergyModel`
- `ElasticEnergyModel`
- `PowerModel`
- `EfficiencyModel`
- `DissipationModel`

#### Apparatus / System Prefabs

- Lifted Load
- Hoist/Motor Setup
- Spring Compression Setup
- Ramp Energy Setup
- Pendulum Energy Setup
- Variable-Force Work Setup
- Efficiency/Energy-Flow Setup

#### Visual Objects / Assets

- load/mass
- motor
- winch
- ramp
- spring
- height marker
- moving cart
- energy reservoir icon
- dissipation/heating symbol

#### Instruments, Probes and Bound Representations

- energy bars
- energy-flow diagram
- power meter
- work meter
- force-displacement graph
- area-under-graph tool
- height probe
- speed probe

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- work
- KE
- GPE
- EPE
- power
- efficiency
- dissipated energy

### User controls

- mass
- speed
- height
- spring constant
- extension
- force curve

### Scientific validation

- energy conservation when model states so
- work-energy theorem
- power consistency

### Mandatory example-gallery projects

- `energy-conservation`
- `spring-energy`
- `work-area`
- `power-efficiency`

---

## 29.6 Topic 6 — Deformation of solids

### Physics/model capabilities

- Hooke spring
- material specimen
- stress/strain
- elastic/plastic constitutive curve
- loading/unloading extension

### Animation requirements

- sample extension
- spring extension
- microscopic lattice schematic
- loading graph
- elastic limit
- plastic deformation
- stress/strain labels
- area shading

### Simulation / interactive requirements

- Hooke law
- wire extension
- Young modulus
- force-extension experiment
- stress-strain explorer
- hysteresis extension

### Required representations

- spring/specimen
- force-extension graph
- stress-strain graph
- measurement apparatus
- energy area

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `LinearSpring`
- `ElasticWire`
- `MaterialSpecimen`
- `StressStrainMaterial`
- `ElasticPlasticMaterial`
- `LoadingPathModel`

#### Apparatus / System Prefabs

- Hooke-Law Spring Rig
- Force-Extension Apparatus
- Young-Modulus Wire Apparatus
- Stress-Strain Demonstration
- Loading/Unloading Extension Setup

#### Visual Objects / Assets

- helical spring
- wire
- rod
- material strip
- clamp
- support stand
- mass hanger
- slotted masses
- reference marker
- extension pointer

#### Instruments, Probes and Bound Representations

- ruler
- micrometer
- vernier caliper
- force sensor
- extensometer
- force-extension graph
- stress-strain graph
- elastic-limit marker
- area-under-curve tool

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- force
- extension
- spring constant
- stress
- strain
- Young modulus
- stored energy

### User controls

- length
- area
- force
- spring constant
- material curve

### Scientific validation

- Hooke region
- dimension checks
- energy area
- Young modulus relation

### Mandatory example-gallery projects

- `hooke-law`
- `young-modulus`
- `stress-strain`
- `elastic-energy`

---

## 29.7 Topic 7 — Waves

### Physics/model capabilities

- analytical harmonic wave
- pulse model
- longitudinal medium model
- boundary model
- sampled/grid wave extension

### Animation requirements

- transverse wave propagation
- longitudinal compression/rarefaction
- medium particle motion
- phase markers
- wavefronts
- pulse reflection
- transmission
- energy-direction distinction

### Simulation / interactive requirements

- traveling wave
- pulse
- string wave
- longitudinal sound
- boundary reflection
- refraction extension
- dispersion extension

### Required representations

- waveform
- wavefronts
- particle row
- displacement-time
- displacement-position
- phase diagram
- audio output extension

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `HarmonicWave`
- `WavePulse`
- `LongitudinalWaveMedium`
- `WaveSource`
- `WaveBoundary`
- `WavefrontSource`
- `SampledWaveField`

#### Apparatus / System Prefabs

- String/Rope Wave Setup
- Slinky Longitudinal Wave
- Ripple Tank
- Tuning-Fork Sound Setup
- Speaker–Microphone Setup
- Pulse Reflection Boundary
- Two-Medium Wave Boundary

#### Visual Objects / Assets

- rope/string
- slinky
- water surface
- wave paddle
- oscillator
- tuning fork
- loudspeaker
- microphone
- boundary line
- medium region
- wavefront lines

#### Instruments, Probes and Bound Representations

- displacement probe
- phase marker
- wavelength ruler
- frequency/period marker
- oscilloscope
- waveform graph
- wavefront display
- particle-motion arrows

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- amplitude
- frequency
- period
- wavelength
- speed
- phase
- displacement
- intensity

### User controls

- amplitude
- frequency
- wavelength
- phase
- speed
- boundary type

### Scientific validation

- v=fλ
- phase consistency
- medium versus pattern motion

### Mandatory example-gallery projects

- `progressive-wave`
- `longitudinal-wave`
- `pulse-reflection`
- `wave-parameters`

---

## 29.8 Topic 8 — Superposition

### Physics/model capabilities

- linear superposition
- coherent sources
- standing-wave model
- interference intensity
- diffraction analytical models
- complex amplitude extension

### Animation requirements

- wave addition
- constructive/destructive interference
- standing-wave buildup
- nodes/antinodes
- path difference
- phase difference
- Huygens wavelets
- fringe formation

### Simulation / interactive requirements

- two-wave superposition
- standing waves
- two-source interference
- single slit
- double slit
- grating extension
- beats
- air-column/string resonance extensions

### Required representations

- component waves
- resultant wave
- standing wave
- source geometry
- screen intensity
- heatmap
- phase/path diagram

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `SuperpositionSystem`
- `CoherentWaveSource`
- `StandingWaveModel`
- `InterferenceSourcePair`
- `SlitAperture`
- `DiffractionModel`
- `InterferenceScreen`

#### Apparatus / System Prefabs

- Two-Wave Superposition
- Standing-Wave String
- Two-Source Ripple Tank
- Two-Speaker Interference
- Single-Slit Setup
- Double-Slit Setup
- Diffraction-Grating Extension
- Air-Column Resonance Extension

#### Visual Objects / Assets

- fixed-end string
- wave source pair
- slit barrier
- single slit
- double slit
- multi-slit grating
- screen
- ripple sources
- speaker pair
- air column/tube

#### Instruments, Probes and Bound Representations

- path-difference ruler
- phase-difference indicator
- node/antinode markers
- screen-intensity strip
- intensity graph
- wavefront overlay
- resultant-wave graph
- fringe-spacing ruler

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- resultant displacement
- phase difference
- path difference
- intensity
- node positions
- fringe spacing

### User controls

- source separation
- wavelength
- phase
- slit width
- screen distance
- number of sources

### Scientific validation

- superposition identity
- node positions
- fringe relations
- approximation disclosure

### Mandatory example-gallery projects

- `superposition`
- `standing-wave`
- `two-source-interference`
- `single-slit`
- `double-slit`

---

## 29.9 Topic 9 — Electricity

### Physics/model capabilities

- charge/current bookkeeping
- potential difference
- resistor/component models
- resistivity
- electrical power

### Animation requirements

- charge-transfer concept
- current arrows
- potential-energy-per-charge explanation
- I–V trace
- resistance geometry
- power flow

### Simulation / interactive requirements

- Q–I–t
- ohmic resistor
- filament-lamp characteristic
- resistivity explorer
- electrical power
- thermistor/LDR extensions
- drift-speed conceptual extension

### Required representations

- component
- I–V graph
- charge counter
- potential marker
- power meter
- conductor geometry

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `ChargeReservoir`
- `CurrentModel`
- `Conductor`
- `OhmicResistor`
- `NonOhmicComponent`
- `ResistivityModel`
- `ElectricalPowerModel`
- `ChargeCarrierRepresentation`

#### Apparatus / System Prefabs

- Current–Charge–Time Setup
- Ohmic I–V Apparatus
- Filament-Lamp I–V Apparatus
- Resistivity-Wire Apparatus
- Electrical Power Setup
- Sensor-Component Extension

#### Visual Objects / Assets

- wire/conductor
- resistor
- filament lamp
- thermistor
- LDR
- cell
- battery
- electron/charge-carrier token
- metal lattice schematic

#### Instruments, Probes and Bound Representations

- ammeter
- voltmeter
- current probe
- potential probe
- power meter
- I–V graph
- resistance readout
- length/area geometry markers

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- charge
- current
- potential difference
- resistance
- resistivity
- power
- energy

### User controls

- voltage
- resistance
- length
- area
- temperature/component parameter

### Scientific validation

- V=IR where model applicable
- P=VI
- resistivity geometry
- units

### Mandatory example-gallery projects

- `charge-current`
- `ohmic-resistor`
- `iv-characteristics`
- `resistivity`
- `electrical-power`

---

## 29.10 Topic 10 — D.C. circuits

### Physics/model capabilities

- graph-topology circuit
- component ports
- DC network solver
- emf/internal resistance
- potential divider
- meter models

### Animation requirements

- schematic build
- switch state
- current-path highlight
- node potential coloring
- meter readings
- potential-divider marker
- internal loss

### Simulation / interactive requirements

- series/parallel networks
- Kirchhoff network
- emf/internal resistance
- potential divider
- sensor divider
- variable resistor
- bridge extension
- fault analysis extension

### Required representations

- circuit schematic
- node-voltage overlay
- current labels
- meters
- I–V/data graph

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `CircuitNode`
- `CircuitBranch`
- `IdealWire`
- `DCVoltageSource`
- `CellWithInternalResistance`
- `Resistor`
- `VariableResistor`
- `Switch`
- `PotentialDivider`
- `IdealAmmeter`
- `IdealVoltmeter`

#### Apparatus / System Prefabs

- Series Circuit
- Parallel Circuit
- Kirchhoff Multi-Loop Circuit
- Internal-Resistance Circuit
- Potential Divider
- Sensor Potential Divider
- Variable-Resistor Circuit
- Bridge Extension

#### Visual Objects / Assets

- cell
- battery
- switch
- resistor
- variable resistor
- potentiometer
- junction
- wire
- load/lamp
- meter body
- terminal

#### Instruments, Probes and Bound Representations

- ammeter
- voltmeter
- galvanometer extension
- current-path highlighter
- node-potential overlay
- circuit equation panel
- power-per-component overlay

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- branch currents
- node potentials
- terminal pd
- lost volts
- power per component

### User controls

- switch
- component values
- source emf
- internal resistance
- slider contact

### Scientific validation

- KCL/KVL
- network singularity
- short/open warnings
- meter idealization

### Mandatory example-gallery projects

- `series-parallel`
- `kirchhoff-network`
- `internal-resistance`
- `potential-divider`

---

## 29.11 Topic 11 — Particle physics

### Physics/model capabilities

- fundamental particle species registry
- quark composition
- discrete interaction/decay event graph
- conservation-rule engine

### Animation requirements

- particle family map
- quark composition build
- interaction/decay reveal
- conservation table
- track schematic
- exchange-particle schematic

### Simulation / interactive requirements

- particle-property explorer
- conservation checker
- decay/reaction builder
- quark builder
- simple scattering event extension
- detector-track extension

### Required representations

- particle cards
- interaction diagram
- quark composition
- conservation table
- track view

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `FundamentalParticle`
- `Quark`
- `Lepton`
- `Hadron`
- `Baryon`
- `Meson`
- `ParticleReaction`
- `DecayEvent`
- `ConservationRuleSet`

#### Apparatus / System Prefabs

- Particle Family Board
- Quark Composition Builder
- Reaction/Decay Builder
- Conservation-Law Workbench
- Detector-Track Extension Scene

#### Visual Objects / Assets

- proton
- neutron
- electron
- positron
- neutrino/antineutrino tokens
- quark tokens
- antiquark tokens
- interaction vertex
- particle track
- detector chamber schematic

#### Instruments, Probes and Bound Representations

- particle property card
- charge counter
- baryon-number counter
- lepton-number counter
- reaction balance table
- interaction/decay diagram

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- charge
- baryon/lepton numbers
- mass/energy labels
- particle species
- reaction balance

### User controls

- particle selection
- reaction participants
- energy/context parameters

### Scientific validation

- charge conservation
- baryon/lepton conservation as curriculum model requires
- valid compositions

### Mandatory example-gallery projects

- `particle-families`
- `quark-composition`
- `conservation-reaction`

---

## 29.12 Topic 12 — Motion in a circle

### Physics/model capabilities

- circular path constraint
- angular state
- centripetal acceleration/force
- rotating-frame representation

### Animation requirements

- velocity tangent
- radial acceleration
- inward force
- radius sweep
- angular arc
- rotating vector

### Simulation / interactive requirements

- uniform circular motion
- speed/radius explorer
- centripetal force
- conical pendulum extension
- vertical circle extension
- banked-track extension

### Required representations

- orbit circle
- vectors
- angular arc
- force diagram
- graphs

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `CircularPathConstraint`
- `CircularMotionBody`
- `AngularState`
- `CentripetalAccelerationModel`
- `CentripetalForceModel`
- `RotatingFrame`

#### Apparatus / System Prefabs

- Ball-on-String Circular Motion
- Car on Circular Track
- Rotating Table
- Conical-Pendulum Extension
- Vertical-Circle Extension
- Centripetal-Force Apparatus

#### Visual Objects / Assets

- ball
- string
- circular track
- car
- rotating platform
- centre marker
- radius line
- angular arc

#### Instruments, Probes and Bound Representations

- velocity vector
- centripetal-acceleration vector
- force vector
- angular-position marker
- radius ruler
- period timer
- circular-motion graph

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- angle
- angular speed
- linear speed
- radius
- centripetal acceleration
- centripetal force

### User controls

- radius
- speed
- mass
- angular speed

### Scientific validation

- a=v²/r
- v=ωr where used
- direction constraints

### Mandatory example-gallery projects

- `uniform-circular-motion`
- `centripetal-force`
- `velocity-acceleration-followers`

---

## 29.13 Topic 13 — Gravitational fields

### Physics/model capabilities

- Newtonian point-mass gravity
- scalar gravitational potential
- field superposition
- orbital integrator
- circular orbit analytical model

### Animation requirements

- field arrows
- field lines
- equipotential reveal
- moving probe
- potential curve
- superposition
- orbit
- energy in orbit
- escape extension

### Simulation / interactive requirements

- single-mass field
- two-mass field
- zero-field point
- potential
- circular orbit
- satellite altitude
- escape speed extension
- multi-body orbit extension

### Required representations

- vector field
- field lines
- equipotentials
- potential graph
- orbit
- energy bars

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `PointMassGravitySource`
- `SphericalGravitySource`
- `GravitationalField`
- `GravitationalPotential`
- `OrbitalBody`
- `CircularOrbitModel`
- `NumericalOrbitModel`

#### Apparatus / System Prefabs

- Earth–Satellite System
- Earth–Moon System
- Two-Mass Field Setup
- Multi-Source Field Scene
- Circular Orbit Setup
- Escape-Trajectory Extension

#### Visual Objects / Assets

- Earth
- Moon
- planet
- star
- satellite
- spacecraft
- point mass
- orbit path
- planet surface

#### Instruments, Probes and Bound Representations

- gravitational-field probe
- potential probe
- field-vector grid
- field lines
- equipotential curves
- potential graph
- orbital velocity vector
- energy panel

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- g
- potential
- potential energy
- orbital speed
- period
- energy

### User controls

- source masses
- positions
- test point
- orbital radius
- initial velocity

### Scientific validation

- inverse square
- potential gradient consistency
- circular-orbit relations
- energy invariants

### Mandatory example-gallery projects

- `gravity-field`
- `two-mass-zero-point`
- `gravitational-potential`
- `circular-orbit`

---

## 29.14 Topic 14 — Temperature

### Physics/model capabilities

- macroscopic thermal state
- temperature scale
- thermometric property
- thermal equilibrium

### Animation requirements

- thermometer calibration
- Celsius↔Kelvin
- thermal contact
- equilibrium approach
- particle distribution schematic

### Simulation / interactive requirements

- temperature-scale converter
- calibration curve
- thermal equilibration
- thermometric property explorer

### Required representations

- thermometer
- calibration graph
- thermal bodies
- temperature readout

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `ThermalBody`
- `TemperatureState`
- `ThermometricProperty`
- `LiquidThermometerModel`
- `ResistanceThermometerModel`
- `ThermocoupleModel`
- `ThermalEquilibriumModel`

#### Apparatus / System Prefabs

- Thermometer Calibration Setup
- Ice/Steam Fixed-Point Setup
- Two-Body Thermal Contact
- Water-Bath Temperature Setup
- Thermometric-Property Explorer

#### Visual Objects / Assets

- liquid-in-glass thermometer
- digital thermometer
- resistance thermometer
- thermocouple
- thermal block
- beaker
- water bath
- ice point
- steam point

#### Instruments, Probes and Bound Representations

- temperature probe
- calibration graph
- Celsius scale
- Kelvin scale
- thermal-equilibrium readout

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- temperature
- thermometric property
- equilibrium difference

### User controls

- initial temperatures
- calibration points
- property selection

### Scientific validation

- absolute scale conversions
- equilibrium convergence

### Mandatory example-gallery projects

- `temperature-scales`
- `thermometer-calibration`
- `thermal-equilibrium`

---

## 29.15 Topic 15 — Ideal gases

### Physics/model capabilities

- ideal-gas macroscopic state
- kinetic-model observables
- 2D hard-disk teaching gas
- statistical distribution extension

### Animation requirements

- molecular collisions
- wall impulses
- piston compression
- speed histogram
- pressure indicator
- temperature/speed ensemble relation
- mixing

### Simulation / interactive requirements

- pV=nRT explorer
- fixed volume heating
- fixed pressure
- isothermal change
- 2D elastic gas
- distribution extension
- diffusion
- Brownian tracer

### Required representations

- container/piston
- particle ensemble
- P–V graph
- histogram
- pressure gauge
- temperature readout

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `IdealGasState`
- `GasContainer`
- `MovablePiston`
- `GasParticle`
- `HardDiskGas`
- `BrownianTracer`
- `StatisticalGasObservable`

#### Apparatus / System Prefabs

- Fixed-Volume Gas Container
- Weighted-Piston Gas
- Isothermal Gas Setup
- 2D Molecular Gas Box
- Brownian Motion Cell
- Gas Mixing/Diffusion Extension

#### Visual Objects / Assets

- gas container
- piston
- weights
- molecule/particle
- large Brownian particle
- heater
- cooling bath
- container wall

#### Instruments, Probes and Bound Representations

- pressure gauge
- thermometer
- volume scale
- piston-position ruler
- speed histogram
- pressure-vs-time graph
- P–V graph
- particle velocity vectors

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- P
- V
- T
- n
- mean KE
- speed distribution
- wall impulse rate

### User controls

- particle count
- volume
- temperature
- piston position
- seed

### Scientific validation

- ideal gas equation for analytical model
- energy/momentum in elastic gas
- model disclosure

### Mandatory example-gallery projects

- `ideal-gas-law`
- `gas-particles`
- `gas-compression`
- `speed-distribution`
- `brownian-tracer`

---

## 29.16 Topic 16 — Thermodynamics

### Physics/model capabilities

- thermodynamic state/process path
- internal-energy ledger
- heat/work transfers
- P–V process

### Animation requirements

- system boundary
- heat arrows
- work by/on gas
- P–V path
- area shading
- energy ledger
- process comparison

### Simulation / interactive requirements

- first-law explorer
- constant pressure
- constant volume
- isothermal
- cycle extension
- adiabatic extension
- heat-engine extension

### Required representations

- P–V graph
- energy-flow diagram
- system boundary
- state table
- equation

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `ThermodynamicSystem`
- `ThermodynamicState`
- `ProcessPath`
- `HeatTransfer`
- `WorkTransfer`
- `InternalEnergyLedger`
- `ThermalReservoir`

#### Apparatus / System Prefabs

- Constant-Volume Process
- Constant-Pressure Piston
- Isothermal Process
- P–V Process Explorer
- Thermodynamic Cycle Extension
- Heat-Engine Extension

#### Visual Objects / Assets

- gas cylinder
- piston
- heater
- hot reservoir
- cold reservoir
- system boundary
- work weight
- thermal arrow

#### Instruments, Probes and Bound Representations

- P–V graph
- area/work shader
- temperature probe
- pressure probe
- volume probe
- energy ledger
- heat/work transfer arrows

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- Q
- W
- ΔU
- P
- V
- T
- path work

### User controls

- initial state
- process type
- final parameter

### Scientific validation

- first law under chosen sign convention
- process equations
- area/work consistency

### Mandatory example-gallery projects

- `first-law`
- `pv-process`
- `isothermal-process`
- `thermodynamic-cycle-extension`

---

## 29.17 Topic 17 — Oscillations

### Physics/model capabilities

- analytical SHM
- pendulum small-angle
- damped oscillator ODE
- driven oscillator
- coupled extension

### Animation requirements

- oscillator motion
- equilibrium/extremes
- x/v/a followers
- linked graphs
- phase
- energy exchange
- damping envelope
- resonance buildup
- driving phase

### Simulation / interactive requirements

- mass-spring SHM
- pendulum
- SHM energy
- damping
- driven oscillation
- resonance
- coupled oscillator extension
- nonlinear pendulum extension

### Required representations

- oscillator
- x/v/a vectors
- time graphs
- energy graphs
- phase-space extension
- resonance graph

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `SHMOscillator`
- `MassSpringOscillator`
- `SmallAnglePendulum`
- `DampedOscillator`
- `DrivenOscillator`
- `ResonanceModel`
- `CoupledOscillatorExtension`

#### Apparatus / System Prefabs

- Horizontal Mass–Spring
- Vertical Mass–Spring
- Simple Pendulum
- Damped Oscillator
- Driven Spring Oscillator
- Resonance Demonstration
- Coupled-Oscillator Extension

#### Visual Objects / Assets

- mass
- spring
- pendulum bob
- string
- support
- damper
- driver/motor
- oscillating platform
- equilibrium marker

#### Instruments, Probes and Bound Representations

- displacement vector
- velocity vector
- acceleration vector
- force vector
- x–t graph
- v–t graph
- a–t graph
- energy graph
- resonance curve
- phase indicator

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- x
- v
- a
- ω
- T
- energy
- driving amplitude
- phase difference

### User controls

- amplitude
- frequency
- damping
- driving frequency
- spring constant
- mass

### Scientific validation

- a=-ω²x in SHM
- phase relations
- energy conservation/dissipation
- numerical tolerance

### Mandatory example-gallery projects

- `shm-linked-views`
- `pendulum-shm`
- `damped-oscillator`
- `resonance`

---

## 29.18 Topic 18 — Electric fields

### Physics/model capabilities

- point-charge field
- uniform field
- potential
- multi-charge superposition
- charged-particle dynamics
- numerical potential extension

### Animation requirements

- field arrows
- field lines
- equipotentials
- moving probe
- test charge
- potential graph
- plate field
- charged-particle trajectory

### Simulation / interactive requirements

- single charge
- multiple charges
- zero-field point
- electric potential
- uniform field plates
- charged particle between plates
- electron deflection
- numerical field-map extension

### Required representations

- vector field
- field lines
- equipotentials
- potential graph
- charge sprites
- trajectory

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `PointCharge`
- `ChargedSphereSource`
- `UniformElectricField`
- `ElectricPotential`
- `MultiChargeField`
- `ChargedParticle`
- `ElectricForceModel`

#### Apparatus / System Prefabs

- Single Point Charge
- Two-Charge Field
- Multi-Charge Field
- Parallel-Plate Field
- Charged Particle Between Plates
- Electron-Beam Deflection Setup
- Zero-Field Point Setup

#### Visual Objects / Assets

- positive charge
- negative charge
- charged sphere
- parallel plates
- electron
- proton/test charge
- electron gun
- screen
- field region

#### Instruments, Probes and Bound Representations

- electric-field probe
- potential probe
- vector-field grid
- field lines
- equipotential curves
- potential graph
- force vector
- particle trajectory

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- E
- V
- force
- potential energy
- particle state

### User controls

- charges
- source positions
- test point
- plate voltage/separation
- particle velocity

### Scientific validation

- Coulomb law
- superposition
- E=-grad V consistency where calculated
- trajectory reference cases

### Mandatory example-gallery projects

- `point-charge-field`
- `two-charge-field`
- `electric-potential`
- `charged-particle-plates`

---

## 29.19 Topic 19 — Capacitance

### Physics/model capabilities

- capacitor component
- Q–V relation
- energy
- parallel plate
- RC transient
- dielectric extension

### Animation requirements

- charge accumulation
- field between plates
- plate separation change
- energy storage
- charging/discharging curve
- circuit transient
- dielectric insertion extension

### Simulation / interactive requirements

- Q=CV
- capacitor energy
- series/parallel
- parallel plate
- RC charge/discharge
- dielectric extension

### Required representations

- capacitor plates
- charge symbols
- field
- circuit
- Q–V graph
- V–t/I–t graphs
- energy

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `Capacitor`
- `ParallelPlateCapacitor`
- `CapacitorNetwork`
- `RCTransientModel`
- `DielectricMaterial`
- `StoredElectricalEnergyModel`

#### Apparatus / System Prefabs

- Adjustable Parallel-Plate Capacitor
- Capacitors in Series
- Capacitors in Parallel
- RC Charging Circuit
- RC Discharging Circuit
- Dielectric-Insertion Extension

#### Visual Objects / Assets

- capacitor symbol
- parallel plates
- charge symbols
- dielectric slab
- resistor
- switch
- cell/source
- connecting wire

#### Instruments, Probes and Bound Representations

- voltmeter
- ammeter
- charge readout
- electric-field display
- Q–V graph
- V–t graph
- I–t graph
- energy display
- time-constant marker

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- Q
- C
- V
- energy
- current
- time constant

### User controls

- capacitance
- voltage
- resistance
- plate geometry
- dielectric parameter

### Scientific validation

- Q=CV
- energy formulas
- RC analytical reference
- network rules

### Mandatory example-gallery projects

- `capacitance-qv`
- `capacitor-energy`
- `capacitors-combinations`
- `rc-charging`

---

## 29.20 Topic 20 — Magnetic fields

### Physics/model capabilities

- magnetic vector field
- Lorentz force
- force on current
- charged-particle motion
- flux/induction submodule
- solenoid approximation

### Animation requirements

- field lines/arrows
- force direction
- wire force
- particle curvature
- solenoid field
- flux change
- induced emf direction
- motional emf

### Simulation / interactive requirements

- force on wire
- charged particle in B
- velocity selector extension
- mass spectrometer extension
- solenoid
- induction coil
- motional emf

### Required representations

- B field
- vectors
- wire/current
- particle path
- flux surface
- coil
- emf graph

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `UniformMagneticField`
- `MagneticDipole`
- `CurrentCarryingWire`
- `CurrentLoop`
- `Solenoid`
- `MovingChargeInMagneticField`
- `MagneticForceModel`
- `FluxSurface`
- `InductionModel`

#### Apparatus / System Prefabs

- Force on Current-Carrying Wire
- Charged Particle in Uniform B
- Velocity-Selector Extension
- Mass-Spectrometer Extension
- Solenoid Field
- Induction Coil Pair
- Motional-EMF Extension

#### Visual Objects / Assets

- bar magnet
- horseshoe magnet
- compass
- straight wire
- wire loop
- solenoid
- coil
- iron core
- electron/proton
- magnetic pole markers

#### Instruments, Probes and Bound Representations

- Hall/magnetic-field probe
- compass needle
- B-field vector grid
- field lines
- force vector
- velocity vector
- flux surface
- flux/emf graph

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- B
- force
- radius
- flux
- flux linkage
- emf

### User controls

- B
- charge
- velocity
- current
- wire length
- coil turns
- geometry

### Scientific validation

- Lorentz force
- qvB circular radius
- F=BIL cases
- Faraday/Lenz relations

### Mandatory example-gallery projects

- `force-on-current`
- `charged-particle-b`
- `solenoid-field`
- `electromagnetic-induction`

---

## 29.21 Topic 21 — Alternating currents

### Physics/model capabilities

- sinusoidal source
- rms
- transformer
- periodic circuit source
- phasor/frequency extension

### Animation requirements

- AC waveform
- direction reversal
- RMS construction
- transformer flux
- input/output waveforms
- phasor extension
- rectification extension

### Simulation / interactive requirements

- AC source
- rms explorer
- transformer ratio
- power transmission
- rectification extension
- RLC extension

### Required representations

- waveform
- transformer
- phasor extension
- circuit
- power flow

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `SinusoidalVoltageSource`
- `SinusoidalCurrentSource`
- `ACLoad`
- `RMSModel`
- `IdealTransformer`
- `PeriodicSignal`
- `RectifierExtension`

#### Apparatus / System Prefabs

- AC Source + Oscilloscope
- RMS Explorer
- Step-Up Transformer
- Step-Down Transformer
- Power Transmission Setup
- Rectifier/Smoothing Extension
- RLC Extension

#### Visual Objects / Assets

- AC generator/source
- coil
- transformer core
- primary coil
- secondary coil
- load
- transmission line
- diode extension
- capacitor extension

#### Instruments, Probes and Bound Representations

- oscilloscope
- AC voltmeter
- AC ammeter
- waveform graph
- RMS marker
- turns counter
- flux display
- power-flow panel
- phasor extension

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- instantaneous V/I
- peak
- rms
- frequency
- turns ratio
- power

### User controls

- amplitude
- frequency
- turns
- load

### Scientific validation

- rms sinusoid
- transformer ratios under ideal model
- power relations

### Mandatory example-gallery projects

- `ac-waveform-rms`
- `transformer`
- `power-transmission`

---

## 29.22 Topic 22 — Quantum physics

### Physics/model capabilities

- photon energy
- photoelectric event model
- energy levels
- spectral transitions
- de Broglie relation
- discrete quantum-state extension

### Animation requirements

- photon symbol
- photoelectron emission
- threshold frequency
- stopping potential
- energy-level transition
- spectral-line formation
- matter-wave schematic

### Simulation / interactive requirements

- photoelectric explorer
- photon energy
- stopping-potential graph
- energy-level builder
- spectrum generator
- de Broglie explorer
- probability extension

### Required representations

- apparatus
- energy levels
- spectrum
- photon/event symbols
- graphs

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `Photon`
- `Photoelectron`
- `PhotoelectricSurface`
- `PhotonSource`
- `QuantumState`
- `EnergyLevelSystem`
- `TransitionEvent`
- `SpectrumEmitter`
- `deBroglieParticle`

#### Apparatus / System Prefabs

- Photoelectric-Effect Apparatus
- Stopping-Potential Setup
- Energy-Level Transition Board
- Emission Spectrum Setup
- Absorption Spectrum Setup
- de Broglie Explorer

#### Visual Objects / Assets

- photon symbol
- electron
- metal surface
- light source
- photocell
- collector/anode
- atom schematic
- energy-level ladder
- spectral line

#### Instruments, Probes and Bound Representations

- variable potential supply
- ammeter/current detector
- frequency/wavelength control
- stopping-potential meter
- spectrum display
- energy-level diagram
- photon-energy readout

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- photon energy
- max KE
- stopping potential
- transition energy
- wavelength

### User controls

- frequency
- work function
- potential
- level energies
- particle momentum

### Scientific validation

- Einstein photoelectric relation
- transition-energy/wavelength
- de Broglie relation
- schematic warnings

### Mandatory example-gallery projects

- `photoelectric-effect`
- `energy-levels-spectrum`
- `de-broglie`

---

## 29.23 Topic 23 — Nuclear physics

### Physics/model capabilities

- nuclear species
- mass defect/binding energy
- analytical decay
- seeded stochastic decay events
- activity
- reaction/Q-value
- decay chains extension

### Animation requirements

- nucleus composition
- binding-energy curve
- random decay
- ensemble decay
- activity counter
- half-life construction
- reaction/fission/fusion schematic

### Simulation / interactive requirements

- exponential decay
- individual seeded nuclei
- detector counting
- half-life explorer
- binding energy
- reaction energy
- decay-chain extension
- attenuation extension

### Required representations

- nucleus
- decay event
- N–t/A–t graphs
- binding-energy graph
- reaction equation
- detector count

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `Nucleus`
- `Isotope`
- `RadioactiveSample`
- `DecayEvent`
- `DecayChain`
- `ActivityModel`
- `NuclearReaction`
- `BindingEnergyModel`
- `RadiationParticle`
- `CountingDetector`

#### Apparatus / System Prefabs

- Radioactive Sample + Counter
- Half-Life Demonstration
- Seeded Nucleus Ensemble
- Absorption/Attenuation Setup
- Binding-Energy Explorer
- Fission/Fusion Reaction Setup
- Decay-Chain Extension

#### Visual Objects / Assets

- nucleus
- proton/neutron cluster
- alpha particle
- beta particle/electron
- gamma photon symbol
- radioactive source
- absorber sheet
- shielding block
- fission fragments

#### Instruments, Probes and Bound Representations

- Geiger–Müller tube
- counter/ratemeter
- activity readout
- N–t graph
- A–t graph
- binding-energy graph
- reaction energy/Q-value panel
- event timeline

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- N
- activity
- decay constant
- half-life
- binding energy
- Q value
- event times

### User controls

- initial nuclei
- half-life/λ
- seed
- isotope parameters
- reaction participants

### Scientific validation

- exponential law
- Poisson/statistical expectations
- mass-energy bookkeeping
- reaction conservation

### Mandatory example-gallery projects

- `radioactive-decay-analytical`
- `radioactive-decay-stochastic`
- `half-life`
- `binding-energy`
- `nuclear-reaction`

---

## 29.24 Topic 24 — Medical physics

### Physics/model capabilities

- layered acoustic propagation
- acoustic impedance/reflection
- attenuation
- pulse/echo detector
- X-ray attenuation
- source-detector acquisition
- tomography forward/reconstruction conceptual model
- tracer counting extension

### Animation requirements

- ultrasound pulse
- boundary reflection/transmission
- echo return
- time-of-flight depth
- A-scan
- attenuation
- scan sweep
- X-ray path attenuation
- source-detector rotation
- projection acquisition
- reconstruction buildup

### Simulation / interactive requirements

- acoustic impedance reflection
- multi-layer ultrasound
- time-of-flight
- attenuation
- A-scan generation
- X-ray exponential attenuation
- contrast explorer
- simple tomography projections
- back-projection conceptual reconstruction
- tracer counts

### Required representations

- transducer/tissue layers
- pulse
- detector trace
- A-scan
- ray path
- attenuation graph
- image plane
- sinogram extension
- reconstruction heatmap

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `AcousticMedium`
- `TissueLayer`
- `UltrasoundPulseSource`
- `AcousticBoundary`
- `AttenuatingMedium`
- `EchoDetector`
- `XraySource`
- `XrayAttenuationMedium`
- `RadiationDetector`
- `ProjectionScanner`
- `ReconstructionModel`
- `TracerSourceExtension`

#### Apparatus / System Prefabs

- Ultrasound Single-Interface Setup
- Layered-Tissue Ultrasound
- A-Scan Apparatus
- X-Ray Attenuation Setup
- Source–Detector Imaging Geometry
- CT/Tomography Concept Scanner
- Radioactive-Tracer Extension

#### Visual Objects / Assets

- ultrasound transducer
- tissue layer
- skin/fat/muscle generic layer presets
- organ/body cross-section schematic
- X-ray tube
- collimator
- detector panel
- CT gantry/ring
- patient table
- tracer marker

#### Instruments, Probes and Bound Representations

- oscilloscope/A-scan display
- echo-time cursor
- depth ruler
- signal-amplitude meter
- attenuation graph
- detector array
- projection plot
- image plane
- sinogram extension
- reconstruction heatmap

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- echo times
- echo amplitudes
- reflection coefficient
- attenuation
- transmitted intensity
- detector counts
- projection data

### User controls

- frequency
- layer thickness
- sound speed
- impedance
- attenuation coefficient
- source/detector geometry

### Scientific validation

- time-of-flight geometry
- reflection coefficient model
- exponential attenuation
- clinical-disclaimer metadata

### Mandatory example-gallery projects

- `ultrasound-time-of-flight`
- `ultrasound-layered-echo`
- `xray-attenuation`
- `tomography-concept`

---

## 29.25 Topic 25 — Astronomy and cosmology

### Physics/model capabilities

- inverse-square flux
- stellar luminosity/radius/temperature relations
- blackbody/spectrum extension
- redshift
- Hubble relation
- expanding-coordinate model
- parallax/orbit extensions
- astronomical scale model

### Animation requirements

- flux spreading
- star scale/temperature
- spectrum peak shift
- spectral redshift
- line matching
- galaxy recession vectors
- Hubble plot population
- expanding-grid analogy
- powers-of-ten zoom
- telescope collection geometry

### Simulation / interactive requirements

- luminosity-flux-distance
- stellar temperature/spectrum
- Wien/Stefan relations as profile requires
- redshift calculator
- Hubble dataset
- Hubble constant/age approximation
- expansion coordinate model
- parallax extension
- HR diagram extension

### Required representations

- star/galaxy
- spectrum
- spectral lines
- Hubble graph
- log-scale axis
- expansion grid
- telescope/detector

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `LuminousSource`
- `StarModel`
- `BlackbodySpectrumModel`
- `FluxDetector`
- `GalaxyModel`
- `SpectrumSource`
- `SpectralLineSet`
- `RedshiftModel`
- `HubbleRelationModel`
- `CosmologicalScaleModel`
- `ExpansionCoordinateModel`

#### Apparatus / System Prefabs

- Star–Observer Flux Setup
- Stellar Spectrum Explorer
- Redshift Spectroscopy Setup
- Hubble Dataset Scene
- Expanding-Grid Cosmology Scene
- Telescope Light-Collection Setup
- Parallax Extension

#### Visual Objects / Assets

- star
- Sun
- Earth
- planet
- galaxy types
- galaxy cluster
- telescope
- detector
- spectroscope
- spectral line strip
- distance scale
- expanding coordinate grid

#### Instruments, Probes and Bound Representations

- flux meter
- spectrum display
- spectral-line cursor
- redshift ruler
- Hubble graph
- logarithmic axis
- scientific-notation distance readout
- temperature/spectrum graph
- multi-scale camera marker

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- luminosity
- flux
- distance
- temperature
- peak wavelength
- redshift
- recession speed
- Hubble parameter

### User controls

- distance
- luminosity
- temperature
- redshift
- Hubble parameter
- dataset selection

### Scientific validation

- inverse square
- spectral-shift relation
- Hubble relation under model
- analogy limitation warning

### Mandatory example-gallery projects

- `inverse-square-flux`
- `stellar-spectrum`
- `redshift`
- `hubble-law`
- `cosmic-expansion-analogy`

---

# 30. EXTENDED PHYSICS CAPABILITY CATALOG

These modules are planned into the architecture even when they are not part of the active Cambridge 9702 profile.

## 30.1 Geometrical optics

### Model scope

- reflection/refraction/TIR
- plane and curved mirrors
- thin lenses
- multiple lenses
- prisms
- ray bundles
- optical instruments

### Animation families

- ray propagation
- normal construction
- critical-angle transition
- principal rays
- image formation
- focus tracking

### Simulations/interactives

- mirror explorer
- Snell-law boundary
- thin lens
- two-lens system
- prism
- microscope/telescope conceptual

### Example-gallery seed project

- `geometrical-optics-overview`

---

## 30.2 Physical optics

### Model scope

- single/multiple slit
- double slit
- diffraction grating
- polarization
- thin films
- Fresnel extension
- Fourier-optics extension

### Animation families

- Huygens wavelets
- phase-front evolution
- fringes
- diffraction envelope
- polarizer/analyzer vectors
- thin-film path difference

### Simulations/interactives

- single slit
- double slit
- grating
- Malus law
- thin-film interference
- Fresnel grid simulation extension

### Example-gallery seed project

- `physical-optics-overview`

---

## 30.3 Rotational dynamics

### Model scope

- angular kinematics
- torque
- moment of inertia
- rotational energy
- angular momentum
- rolling
- precession extension

### Animation families

- angular displacement
- torque vector
- rotation
- rolling translation+rotation
- angular-momentum vector

### Simulations/interactives

- constant angular acceleration
- torque/inertia
- rolling
- flywheel
- angular momentum
- gyroscope extension

### Example-gallery seed project

- `rotational-dynamics-overview`

---

## 30.4 Fluid mechanics

### Model scope

- fluid statics
- buoyancy
- continuity
- Bernoulli
- efflux
- viscosity/drag
- simple laminar profiles

### Animation families

- pressure field
- streamlines
- velocity field
- narrowing flow
- buoyant force
- terminal speed

### Simulations/interactives

- hydrostatic pressure
- buoyancy
- Venturi
- Bernoulli
- efflux
- terminal speed
- simple laminar flow

### Example-gallery seed project

- `fluid-mechanics-overview`

---

## 30.5 Electronics and semiconductors

### Model scope

- diodes
- rectification
- smoothing
- transistors
- logic gates
- op-amps
- sensor circuits
- band model extension

### Animation families

- signal paths
- diode state
- rectified waveform
- capacitor smoothing
- transistor switching
- logic propagation

### Simulations/interactives

- diode I–V
- rectifier
- smoothing
- transistor switch
- logic gates
- ideal op-amp

### Example-gallery seed project

- `electronics-and-semiconductors-overview`

---

## 30.6 Communications physics

### Model scope

- carriers
- AM/FM concepts
- sampling
- digital pulses
- bandwidth
- noise
- filters

### Animation families

- modulation
- sampling markers
- aliasing
- pulse encoding
- spectrum/bandwidth
- noise overlay

### Simulations/interactives

- AM/FM conceptual
- sampling/aliasing
- digital pulse channel
- SNR
- filter extension

### Example-gallery seed project

- `communications-physics-overview`

---

## 30.7 Acoustics and Doppler

### Model scope

- sound waves
- beats
- Doppler
- air columns
- harmonics
- Fourier synthesis
- intensity

### Animation families

- moving wavefronts
- source/observer motion
- beats
- mode shapes
- harmonic build

### Simulations/interactives

- Doppler
- beats
- air-column resonance
- harmonics
- Fourier synthesis

### Example-gallery seed project

- `acoustics-and-doppler-overview`

---

## 30.8 Relativity

### Model scope

- Lorentz factor
- time dilation
- length contraction
- simultaneity
- spacetime diagrams
- relativistic energy/momentum

### Animation families

- light clock
- moving frames
- worldlines
- simultaneity slices
- coordinate transform

### Simulations/interactives

- Lorentz-factor explorer
- time dilation
- length contraction
- spacetime-event transform

### Example-gallery seed project

- `relativity-overview`

---

## 30.9 Advanced electromagnetism

### Model scope

- Lorentz dynamics
- flux
- induction
- RL/RLC
- EM-wave relationships
- advanced field maps

### Animation families

- changing fields
- flux surfaces
- induction direction
- phasors
- EM vector relationships

### Simulations/interactives

- Lorentz trajectory
- induction
- RL/RLC
- field superposition
- EM-wave extension

### Example-gallery seed project

- `advanced-electromagnetism-overview`

---

## 30.10 Advanced mechanics

### Model scope

- drag
- coupled oscillators
- non-inertial frames
- chaos
- multi-body gravitation
- rigid-body 3D

### Animation families

- phase portraits
- coupled mode shapes
- rotating frames
- chaotic divergence
- 3D orientation

### Simulations/interactives

- quadratic drag
- coupled oscillators
- double pendulum
- N-body orbit
- rigid-body 3D

### Example-gallery seed project

- `advanced-mechanics-overview`

---

## 30.11 Extended atomic/modern physics

### Model scope

- Bohr-style models
- X-ray spectra
- potential wells
- tunnelling
- semiconductor bands
- matter waves

### Animation families

- energy-level transitions
- spectra
- probability-density schematic
- tunnelling visualization
- band diagrams

### Simulations/interactives

- spectra
- simple well
- tunnelling conceptual/numerical
- band diagrams

### Example-gallery seed project

- `extended-atomic-modern-physics-overview`

---

## 30.12 Practical and experimental physics

### Model scope

- measurement
- uncertainty
- graphing
- linearisation
- sensor/data acquisition
- experiment design

### Animation families

- instrument readings
- data accumulation
- best-fit reveal
- error bars
- gradient/intercept
- apparatus sequence

### Simulations/interactives

- measurement tools
- uncertainty calculator
- graph fit
- linearisation
- investigation planner

### Example-gallery seed project

- `practical-and-experimental-physics-overview`

---


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

# 32. DEVELOPMENT WORKFLOW

Every engineering task follows:

```text
SPECIFICATION
      ↓
IMPLEMENTATION
      ↓
UNIT/PHYSICS TESTS
      ↓
EXAMPLE PROJECT
      ↓
EXPECTED SCREENSHOT
      ↓
GALLERY ENTRY
      ↓
VISUAL/SCIENTIFIC REVIEW
      ↓
MERGE
```

A task is not merged merely because the API exists.

The user-visible proof is part of the task.

---

# 33. COMPLETE DEVELOPMENT PLAN

The following sequence is mandatory because later phases depend on the contracts established earlier.

## PHASE 0 — Product freeze and repository

### Step 0.1 — Create repository and monorepo toolchain

**Implement**

- Git repository;
- pnpm workspace;
- TypeScript strict mode;
- Vite apps;
- Tauri desktop shell;
- lint/format/test commands;
- CI test skeleton;
- docs and examples folders.

**Problems anticipated**

Dependency choices can spread across packages and become inconsistent.

**Solution**

Central package policy and workspace lockfile. Dependency additions require package-level rationale.

**Acceptance**

All apps build an empty shell on Windows, macOS CI target and Linux CI target.

**Example output**

`examples/system/hello-stage`

A tiny scene displays one circle and one text label.

---

### Step 0.2 — Freeze schemas and package boundaries

**Implement**

- Project, PresentationFlow, Scene, EntityDefinition, ComponentInstance, SystemDefinition, Representation, Clock, EventRule, RuntimeEvent and Dataset TypeScript interfaces;
- Zod schemas;
- registry contracts;
- package public API rules.

**Problems anticipated**

Topic-specific needs may leak into root schema.

**Solution**

Run the Future-Proofing Test in section 28 using schema-only mock payloads.

**Acceptance**

All listed scenarios serialize using the same root schemas.

**Example output**

`examples/system/schema-roundtrip`

Creates, saves, reloads and compares a mixed scene fixture.

---

### Step 0.3 — Command and undo/redo core

**Implement**

- command interface;
- transactions;
- undo;
- redo;
- command history;
- dirty-state tracking.

**Problems anticipated**

Simulation state must not become permanent editor history on every frame.

**Solution**

Commands modify document/initial state; runtime simulation state is separate unless explicitly committed.

**Acceptance**

100-command randomized round-trip test returns the exact initial document.

**Example output**

`examples/system/undo-redo`

---

## PHASE 1 — Mathematics, units and clocks

### Step 1.1 — Quantity and unit engine

Implement SI dimensions, unit parsing, conversion, semantic dimensionless kinds, display precision and uncertainty container.

Problem: radians and ratios are dimensionless but semantically different.

Solution: `semanticKind`.

Acceptance: dimensional algebra and conversion tests.

Example: `examples/math/units-and-dimensions`.

### Step 1.2 — Vector/matrix/complex math

Implement Vec2, Vec3, matrices, complex numbers, quaternions and numeric tolerance policy.

Problem: inconsistent tolerances.

Solution: central `NumericsPolicy`.

Example: `examples/math/vector-operations`.

### Step 1.3 — Clock graph, scheduler and checkpoints

Implement named clock domains, pause/run/scrub/rate, synchronization and child clocks.

Implement the deterministic runtime phase scheduler and Checkpoint/Replay service.

Problem: feedback loops between clock bindings.

Solution: clock sync graph is acyclic and validated.

Example: `examples/time/two-clocks` where a projectile is frozen while presentation highlighting continues.

---

## PHASE 2 — Renderer foundation

### Step 2.1 — Stage, camera and coordinate transforms

Implement physical/world/view/layout transforms, zoom, pan, fit, resize and resolution.

Problem: layout coordinates and physics coordinates may be confused.

Solution: distinct typed coordinate APIs.

Example: `examples/rendering/coordinate-spaces`.

### Step 2.2 — SVG scientific primitives

Implement point, line, path, circle, ellipse, polygon, arc, arrow, bracket, text-anchor, grid and group.

Problem: line/arrow appearance changes with camera zoom.

Solution: support physical stroke and screen-constant stroke modes.

Examples:
- `line-and-arrow`
- `arc-and-angle`
- `scientific-grid`

### Step 2.3 — Pixi high-volume layer

Implement renderer adapter and compositing with SVG stage.

Problem: two renderers can drift under camera transforms.

Solution: one Camera service provides transform matrices to every renderer.

Example: `examples/rendering/particle-cloud`.

### Step 2.4 — Three.js 3D layer

Implement camera bridge, scene mapping, basic meshes and 3D vector arrows.

Problem: 2D overlays over 3D coordinates.

Solution: projection service maps world 3D anchor to overlay coordinates.

Example: `examples/rendering/3d-vector-scene`.

### Step 2.5 — Common picking, typography, asset and anchor system

Implement cross-renderer Picking Service and deterministic typography/font policy.

Implement asset and anchor system.

Implement procedural objects, SVG import/sanitization and semantic anchors.

Example: `examples/assets/car-force-anchors`.


### Step 2.6 — Physics Library browser and registry

**Implement**

- `LibraryRegistry`;
- built-in item manifest;
- semantic categories;
- curriculum/topic tags;
- full-text/tag search;
- thumbnail service;
- drag payloads;
- compatible-target highlighting;
- recent/favourite items;
- Built-in / Plugins / My Library sources.

**Problem anticipated**

The editor can become coupled to every physics package if library cards are hard-coded.

**Solution**

The editor renders every Library entry from the `LibraryItem` metadata contract in Section 19.

**Acceptance**

A test plugin can register a Smart Model, Prefab and Instrument and all three appear in the Library without editing the editor application.

**Examples**

- `examples/library/drag-smart-model`
- `examples/library/drag-prefab`
- `examples/library/bind-instrument`
- `examples/library/save-to-my-library`

### Step 2.7 — Built-in foundational object pack

Implement the common objects reused by many topics before domain packages expand:

- ball;
- block;
- trolley;
- car;
- mass;
- string;
- spring;
- pulley;
- support;
- ground/surface;
- ruler;
- stopwatch;
- vector arrow;
- coordinate axes;
- graph panel;
- equation panel.

Every definition must already use canonical IDs, anchors and registry metadata.

**Example**

- `examples/library/foundation-object-pack`

---

## PHASE 3 — Presentation animation

### Step 3.1 — Animation scheduler

Implement animations on presentation clocks, easing, scrubbing, reverse and serialization.

Example: `examples/animation/move-scale-rotate`.

### Step 3.2 — Draw/write/reveal/highlight

Implement path-length drawing, masks, opacity and emphasis.

Examples:
- `draw-vector`
- `write-label`
- `highlight-diagram`

### Step 3.3 — Morph and matched transform

Implement path normalization, shape morph and ID-based matched transform.

Problem: arbitrary paths have different point counts.

Solution: canonical path resampling for compatible morphs; semantic replacement for incompatible objects.

Example: `examples/animation/circle-to-ellipse`.

### Step 3.4 — Camera animation

Pan, zoom, fit object, follow target, powers-of-ten zoom.

Example: `examples/animation/camera-follow`.

---

## PHASE 4 — Equations and graphs

### Step 4.1 — Math editor + semantic equation tree

Integrate MathLive input, semantic token IDs and canonical expression.

Example: `examples/equations/edit-and-render`.

### Step 4.2 — Equation transform engine

Implement semantic matching, FLIP/motion of matched tokens, enter/exit terms and overrides.

Examples:
- `v-u-at-rearrangement`
- `substitution`
- `cancel-and-simplify`

This is a release gate: the gallery example must look presentation-grade before proceeding.

### Step 4.3 — Graph engine

Axes, units, scales, curves, cursor, points and annotations.

Examples:
- `graph-basic`
- `graph-live-cursor`

### Step 4.4 — Graph analysis overlays

Tangent, gradient triangle, area, maximum, fit line, error bars, histogram, spectrum.

Examples:
- `graph-gradient`
- `graph-area`
- `histogram-live`

---

## PHASE 5 — Relationships, controls and storyboard

### Step 5.1 — Dependency relationship engine

Implement attach, follow, bind, offset, tangent, normal and derived property.

Example: `examples/relationships/tangent-follower`.

### Step 5.2 — Physics-aware vectors

Vector representation reads mathematical vector observable.

Example: `examples/relationships/velocity-vector`.

### Step 5.3 — Interactive controls

Sliders, number/unit field, toggle, button, vector handle, physical drag, layout drag, probe.

Example: `examples/controls/live-parameter-binding`.

### Step 5.4 — Storyboard

Step actions, simulation commands, conditions, interaction pauses and notes.

Example: `examples/storyboard/projectile-explanation`.

---

## PHASE 6 — Physics runtime and solver adapters

### Step 6.1 — Universal model runtime

Lifecycle:

```text
initialize
validateParameters
createInitialState
evaluate/step
emitEvents
computeObservables
validateState
reset
```

Example: `examples/physics/custom-model-contract`.

### Step 6.2 — Analytical and algebraic services

Implement analytical evaluator plus shared algebraic/root/linear-system numerical services.

Example: `constant-acceleration-analytical`.
Example: `algebraic-root-service`.

### Step 6.3 — ComputeBackend and ODE adapters

Implement main-thread/Worker compute adapter boundary.

Then implement ODE adapters.

Implement and test semi-implicit Euler, Verlet, RK4 and adaptive RK45.

Example: `damped-oscillator-solver-comparison`.

### Step 6.4 — Rapier adapter

Rigid/contact mapping plus snapshot state.

Example: `rigid-two-block-collision`.

### Step 6.5 — Particle solver

Spatial hash, hard particles, boundaries.

Example: `elastic-gas-1000`.

### Step 6.6 — Grid/PDE adapter

Scalar/complex grid, boundary conditions and time stepping.

Example: `wave-equation-string-grid`.

### Step 6.7 — Ray solver

Intersection, reflection, refraction and path sequence.

Example: `ray-refraction-boundary`.

### Step 6.8 — Circuit solver

Graph topology, DC solve, transient adapter.

Example: `dc-series-parallel`.

### Step 6.9 — Stochastic solver

Seeded event scheduling and Monte-Carlo samples.

Example: `random-decay-events`.

### Step 6.10 — Reconstruction adapter

Forward projection + simple back-projection framework.

Example: `tomography-two-object-concept`.

---

## PHASE 7 — Teacher editor completion

### Step 7.1 — Home/library/templates

Implement the product home and semantic library.

### Step 7.2 — Inspector tabs

Model, Visual, Relationships, Data, Validation.

### Step 7.3 — Drag modes

Clear layout vs physics manipulation.

### Step 7.4 — Advanced timeline

Animation, clocks, audio and acquisition tracks.

### Step 7.5 — PhysScript

Parser, validator, serializer and bidirectional commands.

Examples:
- `physcript-projectile`
- `physcript-equation-transform`

---

## PHASE 8 — Mechanics curriculum package

Implement Cambridge Topics 1–6 and 12 using the capability catalog.

Order:

1. quantities/units/practical measurement foundation;
2. kinematics;
3. dynamics/FBD;
4. statics/density/pressure;
5. energy/power;
6. deformation;
7. circular motion.

Each topic is not complete until every mandatory example in section 29 exists.

**Mechanics Alpha release gate**

A teacher must be able to produce, without scripting:

- a projectile lesson;
- an inclined-plane FBD;
- a pulley;
- collision momentum analysis;
- energy transfer;
- a stress-strain explanation;
- uniform circular motion.

---

## PHASE 9 — Waves, superposition and optics

Implement Topics 7–8 plus Extended Geometrical/Physical Optics.

Includes:

- analytical wave;
- standing wave;
- two-source interference;
- single/double slit;
- grating;
- ray optics;
- lenses;
- polarization extension;
- sound/audio representations.

**Wave/Optics release gate**

Double-slit screen intensity and graph must derive from one physical model and update from the same wavelength/slit parameters.

---

## PHASE 10 — Electricity, circuits and capacitance

Implement Topics 9, 10 and 19.

Include:

- component registry;
- DC network;
- meters;
- internal resistance;
- potential divider;
- capacitor models;
- RC transient.

Extended electronics plugs into the same circuit core.

---

## PHASE 11 — Fields, gravitation, magnetism and AC

Implement Topics 13, 18, 20, 21.

Include:

- scalar/vector fields;
- field lines;
- equipotentials;
- particle trajectories;
- orbital motion;
- magnetic force;
- induction;
- transformer;
- AC graphs.

3D field data is supported even when the first classroom representation is 2D.

---

## PHASE 12 — Thermal, gases and thermodynamics

Implement Topics 14–16 plus particle/statistical tools.

Include:

- temperature;
- ideal gas analytical model;
- hard-particle teaching gas;
- Brownian tracer;
- thermodynamic process paths;
- P–V work.

---

## PHASE 13 — Oscillations and advanced periodic systems

Implement Topic 17 and extended damping/resonance/coupled systems.

Release gate example:

one SHM scene where mass, velocity, acceleration, force, energy and all linked graphs remain synchronized during scrub.

---

## PHASE 14 — Fundamental particles and quantum physics

Implement Topics 11 and 22.

Discrete species/event architecture is exercised here.

Visual metaphors must carry schematic metadata.

---

## PHASE 15 — Nuclear physics

Implement Topic 23.

Both analytical and seeded stochastic radioactive decay are mandatory.

Release gate:

the stochastic ensemble statistically approaches the analytical expectation without pretending each nucleus has a predictable decay time.

---

## PHASE 16 — Medical physics

Implement Topic 24 and imaging infrastructure.

Order:

1. layered acoustic medium;
2. pulse propagation;
3. reflection/transmission;
4. attenuation;
5. detector;
6. A-scan;
7. X-ray attenuation;
8. source-detector acquisition;
9. tomography conceptual reconstruction.

Medical features are explicitly educational and never clinical.

---

## PHASE 17 — Astronomy and cosmology

Implement Topic 25.

Order:

1. astronomical quantity/scale formatting;
2. inverse-square flux;
3. stellar radiation/spectrum tools;
4. redshift;
5. Hubble dataset;
6. expansion representation;
7. logarithmic/multi-scale camera.

Release gate:

the cosmological expansion example must state the limitations of its analogy.

---

## PHASE 18 — Practical physics and data analysis

Complete practical toolkit:

- virtual measuring instruments for explanation;
- uncertainty;
- tables;
- best fit;
- gradients;
- intercepts;
- linearisation;
- experiment planning;
- sensor/data import.

This supplements, not replaces, laboratory work.

---

## PHASE 19 — Extended modules

Implement in fixed order:

1. rotational dynamics;
2. fluid mechanics;
3. acoustics/Doppler;
4. electronics;
5. communications;
6. relativity;
7. advanced electromagnetism;
8. advanced mechanics;
9. extended modern physics.

These use existing registries and are a proof that the core architecture is extensible.

---

## PHASE 20 — Export, gallery and distribution

### Step 20.1 — Web viewer packaging

### Step 20.2 — SVG/PNG/data export

### Step 20.3 — deterministic WebM video export with audio

### Step 20.4 — example gallery production build

### Step 20.5 — installers and auto-update channel

### Step 20.6 — offline documentation bundle

---

# 34. DEFINITION OF DONE — EVERY FEATURE

A user-visible feature is done only when:

1. specification exists;
2. public API/schema is documented;
3. units/dimensions are handled;
4. model assumptions are declared;
5. implementation exists;
6. unit tests pass;
7. physics reference tests pass where relevant;
8. runtime validation exists;
9. serialization round-trip passes;
10. undo/redo works for document edits;
11. representation is usable;
12. controls are usable where relevant;
13. storyboard integration works;
14. accessibility review passes;
15. performance benchmark passes;
16. appropriate Physics Library item/prefab/instrument exists for every stage-visible capability;
17. Library item has metadata, thumbnail, tags, anchors/ports and serialization coverage;
18. example `.physica` exists;
19. example PhysScript exists when applicable;
20. example screenshot exists;
21. preview exists;
22. gallery entry exists;
23. visual regression passes;
24. documentation is written.

---

# 35. DEFINITION OF DONE — PHYSICS TOPIC

A curriculum topic is `SUPPORTED` only when:

- all required models are implemented;
- all mandatory animations in the approved minimum set are available;
- all mandatory simulations are available;
- required representations are available;
- examples exist;
- curriculum terminology is mapped;
- scientific validators pass;
- teacher usability scenario passes.

Coverage states:

```text
NOT_STARTED
FOUNDATION_ONLY
PARTIAL
SUPPORTED
VALIDATED
```

A release may claim full Cambridge 9702 support only when all 25 topics are `VALIDATED`.

---

# 36. EXAMPLE NAMING AND VERSION POLICY

Example IDs never change after public release.

If an example changes materially, its content version increments.

Example metadata includes minimum Physica version.

Examples are tested when the core changes.

This makes the gallery a living compatibility suite.

---

# 37. PROJECT FILE MIGRATION

Every component payload has its own schema version.

The package manifest contains project ID, schema version, plugin lock, asset/dataset entries and content hashes.

Assets/datasets are addressed internally; host filesystem paths are not authoritative project references.

Migration runs:

```text
package format migration
→ project migration
→ component migrations
→ plugin migrations
```

The original file is never overwritten during a failed migration.

Unknown plugin payloads remain stored.

Save is atomic/recoverable as defined in Section 27A.

Autosave/recovery creates a separate recoverable working copy and never silently overwrites the user's last explicit save.

Asset de-duplication may use content hashes without changing logical asset IDs.

---

# 38. ERROR AND WARNING UX

Four levels:

- Info
- Educational warning
- Validation error
- Runtime failure

Examples:

**Educational warning:** Not drawn to scale.

**Validation error:** Slit width must be positive.

**Runtime failure:** Grid solver did not converge.

Scientific warnings are written for teachers, not as developer stack traces.

---

# 39. BENCHMARK SUITE

Permanent cross-release benchmarks include:

- B01 Units/dimensions
- B02 Vector addition
- B03 Constant velocity
- B04 Constant acceleration
- B05 Projectile
- B06 Inclined plane
- B07 Pulley
- B08 Collision
- B09 Energy
- B10 Stress-strain
- B11 Progressive wave
- B12 Standing wave
- B13 Double slit
- B14 Ray lens
- B15 DC network
- B16 RC transient
- B17 Circular motion
- B18 Gravity field
- B19 Orbit
- B20 Electric field
- B21 Charged particle
- B22 Magnetic trajectory
- B23 Transformer
- B24 Ideal gas
- B25 Particle gas
- B26 Thermodynamics P–V
- B27 SHM
- B28 Resonance
- B29 Particle reaction
- B30 Photoelectric effect
- B31 Radioactive decay
- B32 Ultrasound
- B33 X-ray attenuation
- B34 Tomography concept
- B35 Stellar spectrum
- B36 Redshift
- B37 Hubble law
- B38 Experimental uncertainty
- B39 Equation transformation
- B40 3D vector scene

Each benchmark defines:

- reference project;
- expected observables;
- numerical tolerances;
- screenshot;
- performance target.

---

# 40. PROGRAMMER TASK TEMPLATE

Every implementation ticket uses:

```text
TASK ID
TITLE

PURPOSE
Why this capability exists.

READ FIRST
Exact architecture/spec files.

PACKAGE OWNERSHIP
Packages permitted to change.

INPUT CONTRACT
Types and units.

OUTPUT CONTRACT
State/observables/events.

MODEL / ALGORITHM
Exact scientific model.

ASSUMPTIONS
Explicit approximations.

DO NOT CHANGE
Out-of-scope systems.

ERROR CASES
Invalid inputs/runtime conditions.

ACCEPTANCE TESTS
Measurable conditions.

PHYSICS TESTS
Reference cases/invariants.

EXAMPLE REQUIRED
Exact example ID.

GALLERY OUTPUT
Thumbnail/preview/description.

DOCUMENTATION
Files to update.

DONE WHEN
All checks complete.
```

Programmers are not asked to infer cross-system architecture from a vague feature name.

---

# 41. RELEASE PLAN

## 0.1 Foundation Preview

Core schema, renderer, units, clocks, commands.

## 0.2 Animation Preview

Manim-like basic transitions and camera.

## 0.3 Equation/Graph Preview

Semantic equations and graphs.

## 0.4 Physics Runtime Preview

Solver adapters, relationships and controls.

## 0.5 Mechanics Alpha

Topics 1–6 and 12.

## 0.6 Waves/Optics Alpha

Topics 7–8 + optics.

## 0.7 Electricity/Fields Alpha

Topics 9–10, 13, 18–21.

## 0.8 Thermal/Oscillations Alpha

Topics 14–17.

## 0.9 Modern/Medical/Astronomy Alpha

Topics 11, 22–25.

## 0.10 Practical + Extended Alpha

Practical toolkit and first extended modules.

## 1.0 Stable

All 25 Cambridge topics `VALIDATED`.

Example gallery complete.

Desktop apps stable.

Web viewer stable.

Project migrations tested.

Export stable.

---

# 42. FINAL ARCHITECTURE FREEZE CHECKLIST

Before application feature coding begins, the team must answer **yes** to every item:

- Is persistent Document State separate from Runtime State and derived observables?
- Is there exactly one authoritative writer per mutable physical state channel?
- Can scene-level systems represent multi-entity interactions without entity-schema changes?
- Can numerical/stochastic simulations scrub through checkpoint/replay deterministically?
- Is physics stepping independent of render refresh rate?
- Is runtime event ordering deterministic across workers?
- Can a project sequence and transition between multiple scenes?
- Do SVG/Pixi/Three renderers share camera transforms and picking identities?
- Can presentation transforms move a representation without silently changing physics?
- Are data sampling and detector acquisition independent of render FPS?
- Can Library/prefab updates avoid silently changing existing projects?
- Are plugins sandboxed/declarative enough to avoid editor and OS coupling?
- Are constants, scientific model versions and provenance reproducible?
- Can projects display localized/RTL UI/text without changing canonical physics identifiers?
- Are fonts/assets/license metadata deterministic and redistributable?
- Can one schema represent 2D and 3D state?
- Can it represent scalar/vector/complex fields?
- Can it represent thousands of particles?
- Can it represent graph topology?
- Can it represent constraints?
- Can it represent stochastic events?
- Can it represent detector samples and images?
- Can it represent reconstruction results?
- Can it represent experimental datasets?
- Can it represent multiple clocks?
- Can it represent audio?
- Can it represent astronomical logarithmic scale?
- Can topic modules add components without root-schema edits?
- Can unknown plugin data survive save/reopen?
- Can every observable feed a graph, label or equation?
- Can simulation pause while presentation continues?
- Can an example project use the same runtime as the editor?
- Can a deterministic preview be generated from every example?
- Can every Cambridge topic map to existing solver/representation classes?
- Can every extended topic map to the same classes?
- Can every stage-visible physics entity be created through the Physics Library without editor-specific hard-coding?
- Can plugin packages add Library items and prefabs without modifying the central editor?

If any answer is no, the schema is not frozen.

---

# 43. FINAL PRODUCT EXPERIENCE

A teacher should eventually be able to do this:

1. Open Physica.
2. Choose **New Physics Scene → Projectile Motion**.
3. Enter `20 m/s`, `35°`, `g = 9.81 m/s²`.
4. Turn on trajectory, velocity, acceleration and graph.
5. Add an equation.
6. Add a storyboard step to pause at maximum height.
7. Transform the vertical-motion equation.
8. Press Present.
9. Save the project.
10. Export the interactive lesson or video.

The same authoring system should also allow:

- gas particles;
- Brownian motion;
- diffraction;
- ray optics;
- field lines;
- circuits;
- nuclear decay;
- ultrasound echoes;
- tomography concepts;
- spectral redshift;
- Hubble graphs;
- experimental data.

The user should experience these as different **physics modules inside the same coherent application**, not as unrelated mini-programs.

---

# 44. FINAL PRINCIPLE

Physica does not begin with drawing objects and later attach physics.

It begins with:

```text
PHYSICAL MODEL
      ↓
STATE + EVENTS + OBSERVABLES
      ↓
REPRESENTATIONS
      ↓
INTERACTIONS
      ↓
STORYBOARD / PRESENTATION
      ↓
EXPORT
```

The example gallery proves each layer as it is built.

That is the architecture to implement.
