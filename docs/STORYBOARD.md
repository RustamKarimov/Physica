# Storyboard and Presentation Flow

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns teacher-friendly step sequencing within scenes and scene-to-scene presentation flow.

## Scope

Storyboard actions, waits/conditions, interaction pauses, notes, PresentationFlow branching and timeline projection.

## Owned concepts

- Storyboard
- StoryboardStep
- PresentationFlow

## Dependencies

- `COMMANDS_AND_EVENTS.md`
- `CLOCKS_AND_TIME.md`
- `ANIMATION_ENGINE.md`

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

- let simulation pause while presentation continues
- serialize conditional flow deterministically

## This subsystem MUST NOT

- require raw keyframes for ordinary lessons

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- step playback
- condition triggers
- multi-scene branch

## Example Gallery obligations

- `projectile-explanation`
- `multi-scene-presentation`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §6 -->
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

<!-- Source: Master §7.1 project flow -->
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

