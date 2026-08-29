# Scientific Validation

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns scientific assumptions, validity conditions, warnings, invariants, reference cases and export-blocking rules.

## Scope

Dimensional/algebraic/invariant/geometric/topological/numerical/statistical checks and model fidelity.

## Owned concepts

- ValidatorRegistry
- ValidationResult
- severity policy

## Dependencies

- `CONSTANTS_AND_PROVENANCE.md`
- `PHYSICS_RUNTIME.md`

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

- make approximations explicit
- block export on invalid physics when severity requires

## This subsystem MUST NOT

- hide scientific warnings in developer logs only

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- reference cases
- conservation/statistical tolerances

## Example Gallery obligations

- `validation-warning-demo`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

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

<!-- Source: Master §38 -->
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

