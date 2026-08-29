# Testing Strategy

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns unit, physics, integration, visual, E2E, migration, architecture and benchmark test obligations.

## Scope

All packages/apps and release gates.

## Owned concepts

- test pyramid
- visual reference policy
- benchmark fixtures

## Dependencies

- `VALIDATION.md`
- `EXAMPLE_SYSTEM.md`

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

- test known-answer physics
- run visual regressions for presentations
- enforce package dependency direction

## This subsystem MUST NOT

- use screenshots as only physics test

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- this document defines tests

## Example Gallery obligations

- `benchmarks B01-B40`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §5 -->
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

<!-- Source: Master §39 -->
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

<!-- Source: Master §34 -->
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

<!-- Source: Master §42 -->
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

