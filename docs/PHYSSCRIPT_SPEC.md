# PhysScript Specification

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns deterministic teacher scripting language and its command mapping.

## Scope

Core grammar, nouns/verbs, parsing, validation, serialization and visual-editor synchronization.

## Owned concepts

- grammar
- AST
- command mapping

## Dependencies

- `COMMANDS_AND_EVENTS.md`
- `REGISTRY_ARCHITECTURE.md`

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

- keep small stable core grammar
- use namespaced model IDs/data-driven options for plugins

## This subsystem MUST NOT

- execute arbitrary JS/Python
- allow plugins to inject arbitrary grammar productions

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- round-trip visual↔script
- syntax errors
- plugin namespaced references

## Example Gallery obligations

- `physcript-projectile`
- `physcript-equation-transform`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §3 -->
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

