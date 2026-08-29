# Mathematics and Units

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns numeric primitives, dimensional quantities, uncertainty and tolerance policy.

## Scope

Real/complex values, vectors, matrices, quaternions, intervals, arrays, functions and SI-canonical quantities.

## Owned concepts

- Quantity
- Vec2/Vec3
- Complex
- Matrix
- Quaternion
- NumericsPolicy

## Dependencies

- No subsystem dependency beyond the Constitution.

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

- canonical SI-compatible internal values
- central tolerances
- semantic dimensionless kinds

## This subsystem MUST NOT

- scatter unit conversion through physics modules
- use visual arrows as vectors

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- dimensional algebra
- zero-vector edge cases
- astronomical/atomic ranges

## Example Gallery obligations

- `units-and-dimensions`
- `vector-operations`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §8 -->
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

