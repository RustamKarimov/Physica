# Checkpoint and Replay

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns backward/forward scrubbing for non-analytical simulations.

## Scope

ODE, rigid, particle, stochastic and acquisition state snapshots/replay.

## Owned concepts

- checkpoint cadence
- snapshot payload
- replay algorithm
- seed state

## Dependencies

- `CLOCKS_AND_TIME.md`
- `RUNTIME_STATE.md`
- `SOLVER_ARCHITECTURE.md`

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

- restore nearest checkpoint then replay deterministically
- capture PRNG state

## This subsystem MUST NOT

- fake backward playback by reversing visuals only

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- scrub forward/back equivalence
- stochastic replay identity

## Example Gallery obligations

- `numerical-scrub`
- `stochastic-scrub`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §10.4–10.6 -->
## 10.4 Scrubbing analytical models

Analytical models evaluate state directly at the target time.

## 10.5 Scrubbing numerical, rigid, particle and stochastic models

Physica uses a Checkpoint/Replay service.

```text
RuntimeCheckpoint
├─ sceneId
├─ clockTimes{}
├─ authoritativeStateSnapshot
├─ solverSnapshot
├─ randomGeneratorState
├─ eventSequenceState
└─ checksum
```

For a scrub target:

1. locate the nearest valid checkpoint before the target;
2. restore solver and PRNG state;
3. replay deterministically to the target;
4. regenerate derived observables and representations.

Checkpoint spacing is performance policy, not project physics.

## 10.6 Stochastic reproducibility

Seed alone is not enough for mid-run scrubbing.

The checkpoint stores the full deterministic random-generator state or a reproducible event-stream position.

## 10.7 Example

The projectile simulation pauses at maximum height while presentation time continues through a graph highlight and equation transform.

A medical scanner may run an acquisition clock while presentation time is paused.

---

