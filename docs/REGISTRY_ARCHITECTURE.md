# Registry Architecture

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns extensibility discovery contracts.

## Scope

Model, solver, representation, library, animation, control, observable, validator, curriculum, importer/exporter and example registries.

## Owned concepts

- registry IDs
- registration metadata
- discovery

## Dependencies

- `PLUGIN_ARCHITECTURE.md`
- `COMPONENT_MODEL.md`

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

- use namespaced canonical IDs
- allow editor discovery from metadata

## This subsystem MUST NOT

- use closed central enums for physics model types
- hard-code plugin cards in editor

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- register/unregister test plugin
- duplicate ID rejection

## Example Gallery obligations

- `registry-discovery`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §20 -->
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

<!-- Source: Master §19 -->
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

