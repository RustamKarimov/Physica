# Renderer Architecture

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns hybrid SVG/Pixi/Three rendering, semantic layers and export-compatible visual scene resolution.

## Scope

Stage, Camera, renderer adapters, visual layers, transforms and 2D/3D overlay bridging.

## Owned concepts

- RendererAdapter
- Camera service
- render layers
- projection service

## Dependencies

- `PROJECT_MODEL.md`
- `COORDINATES_AND_FRAMES.md`
- `TYPOGRAPHY_AND_I18N.md`
- `PICKING_AND_SELECTION.md`

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

- share Camera transforms across renderers
- keep SVG for print/scientific vector paths
- support deterministic render state

## This subsystem MUST NOT

- calculate domain physics
- maintain alternative physical state

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- cross-renderer camera alignment
- visual regression

## Example Gallery obligations

- `line-and-arrow`
- `particle-cloud`
- `3d-vector-scene`

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

