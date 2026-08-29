# Dynamic Relationship Engine

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns reactive dependencies between observables and representations/layout.

## Scope

Attach, follow, bind, tangent, normal, projection, synchronization, cycle checks and dirty propagation.

## Owned concepts

- Relationship
- dependency DAG

## Dependencies

- `RUNTIME_STATE.md`
- `PROJECT_MODEL.md`

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

- remain reactive and derived
- reject illegal dependency cycles

## This subsystem MUST NOT

- replace coupled simultaneous physics solver
- become state authority unless contract explicitly says so

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- cycle detection
- dirty propagation
- tangent/normal correctness

## Example Gallery obligations

- `tangent-follower`
- `velocity-vector`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §13 -->
# 13. DYNAMIC RELATIONSHIP ENGINE

Built-in relationship categories:

- attach;
- follow;
- offset;
- align;
- bind;
- copy;
- scale-by;
- tangent;
- normal;
- project;
- intersect;
- perpendicular;
- parallel;
- lookAt;
- constrain;
- synchronize;
- measure;
- derive.

Relationships form a dependency graph.

Creation-time cycle detection prevents invalid circular reactive dependencies.

Legitimate simultaneous/algebraic constraints are NOT represented as reactive relationship cycles. They belong to the appropriate constraint, network or algebraic solver.

Every binding is dimension/type checked where the source and target carry physical metadata.

Dirty propagation recomputes only affected descendants.

Relationships cannot write a state channel owned by an authoritative physics system unless the relationship itself is explicitly registered as that channel's authority.

Physics-aware relationships include:

- velocity vector follows velocity;
- normal force normal to surface;
- friction tangent to surface;
- tension along string;
- centripetal acceleration points toward centre;
- graph cursor follows simulation time;
- echo marker follows detector event time;
- spectral label follows measured line peak.

---

