# Clocks and Time Domains

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns named time domains and their relationships.

## Scope

Simulation, presentation, acquisition, audio, experiment and child clocks.

## Owned concepts

- ClockDefinition
- clock graph
- pause/run/scrub/rate/link

## Dependencies

- `RUNTIME_STATE.md`

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

- separate render time from physics time
- validate clock sync graph

## This subsystem MUST NOT

- advance physics directly from display refresh rate

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- two-clock synchronization
- pause/scrub/rate

## Example Gallery obligations

- `two-clocks`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §10 -->
# 10. CLOCK, SCHEDULING, CHECKPOINT AND SCRUB ARCHITECTURE

Every scene has named clock domains.

Mandatory:

- `simulation`
- `presentation`

Optional registered clocks:

- `acquisition`
- `audio`
- `experiment`
- subsystem clocks

Clocks may be:

- running;
- paused;
- scrubbed;
- scaled;
- linked;
- conditionally synchronized.

## 10.1 Render time is not physics time

Browser/request-animation-frame timing is never the authoritative physics clock.

A rendering frame may display zero, one or many solver steps.

Physics results must not depend on monitor refresh rate.

## 10.2 Deterministic execution pipeline

For each runtime update, the default phase order is:

```text
1. apply pending document/control commands
2. resolve clock advancement
3. advance authoritative physics systems/solvers
4. enqueue and deterministically order physical events
5. process physical state-changing events
6. compute/refresh observables
7. evaluate relationship dependency graph
8. sample datasets/detectors scheduled for this time
9. evaluate storyboard conditions/transitions
10. evaluate presentation animations
11. resolve representation/layout transform stack
12. render visual layers
13. emit audio/output work for the corresponding clock interval
```

A subsystem may declare a specialized phase only through the Runtime Scheduler contract.

## 10.3 Deterministic event ordering

Events include:

```text
timestamp
clockDomain
sourceId
eventType
sequenceId
payload
```

Events sharing a timestamp are ordered deterministically using scheduler phase, explicit priority where defined, then stable sequence ID.

No behavior may depend on unordered JavaScript object iteration or worker completion timing.

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

