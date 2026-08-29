# Roadmap

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns implementation phases and release gates.

## Scope

Phase 0 through full curriculum/extended modules/export and releases 0.1→1.0.

## Owned concepts

- phase order
- release gates

## Dependencies

- `CURRENT_STATE.md`

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

- implement platform foundations before curriculum packages
- require examples in every phase

## This subsystem MUST NOT

- skip architecture prerequisites for a flashy physics feature

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- phase checklist

## Example Gallery obligations

- No standalone user-visible example required unless this subsystem exposes a user-visible feature.

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §33 -->
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

<!-- Source: Master §41 -->
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

