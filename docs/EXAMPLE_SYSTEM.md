# Example Gallery System

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns mandatory runnable examples and CI feature→example coverage.

## Scope

Example directory contract, metadata, preview generation, gallery behavior, IDs/versioning.

## Owned concepts

- ExampleRegistry
- example manifest
- build command
- coverage CI

## Dependencies

- `EXPORT.md`
- `TESTING.md`

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

- ship example with every user-visible feature
- use same viewer/runtime as real projects

## This subsystem MUST NOT

- treat examples as optional documentation

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- schema/physics/visual/example build
- coverage manifest

## Example Gallery obligations

- `all public examples`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §22 -->
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

<!-- Source: Master §36 -->
# 36. EXAMPLE NAMING AND VERSION POLICY

Example IDs never change after public release.

If an example changes materially, its content version increments.

Example metadata includes minimum Physica version.

Examples are tested when the core changes.

This makes the gallery a living compatibility suite.

---

<!-- Source: Master §32 -->
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

