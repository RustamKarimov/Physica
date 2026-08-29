# Product Contract

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns the user-facing definition of Physica, supported authoring modes, platform promise and product boundaries.

## Scope

Product behavior and user promise; not implementation details.

## Owned concepts

- product contract
- user modes
- desktop/web/local-first product promise

## Dependencies

- `PROJECT_CONSTITUTION.md`

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

- make physics state authoritative
- keep conventional programming optional
- remain local-first and free-capable

## This subsystem MUST NOT

- become a generic PowerPoint clone
- require AI
- turn expert APIs into normal-teacher requirements

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- teacher workflow acceptance scenarios

## Example Gallery obligations

- `final product experience scenarios`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §1 -->
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

<!-- Source: Master §4 -->
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

<!-- Source: Master §43 -->
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

<!-- Source: Master §44 -->
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

