# Step 8 — Checkpoint and Replay Implementation Specification

**Status:** Audited implementation specification  
**Phase:** Autonomous execution, first unfinished phase after Step 7  
**Owning frozen specification:** `CHECKPOINT_AND_REPLAY.md`  
**Supporting frozen specifications:** `CLOCKS_AND_TIME.md`, `RUNTIME_STATE.md`, `RUNTIME_SCHEDULER.md`, `SOLVER_ARCHITECTURE.md`, `PERFORMANCE.md`  
**Higher authorities:** `PROJECT_CONSTITUTION.md`, approved ADRs in `DECISIONS.md`

---

# 1. Purpose

Step 8 implements correct backward and forward scrubbing for non-analytical runtime models. A scrub never reverses rendered frames. It restores the nearest verified checkpoint at or before the target, restores every registered deterministic continuation state, replays forward through caller-owned runtime stepping, then regenerates derived outputs.

The phase establishes the cache/snapshot contract used later by ODE, rigid, particle, stochastic, acquisition and solver adapters. It does not implement those solvers.

---

# 2. Source-of-truth audit

The design preserves:

- ADR-004: checkpoints are transient/cache runtime data, never ordinary ProjectDocument edits;
- ADR-007: replay targets a named clock and never uses render/request-animation-frame timing as physics time;
- ADR-008: non-analytical backward scrub restores then replays forward, never approximate reverse integration;
- ADR-009: event-sequence state is restored and replayed deterministically;
- ADR-016: future acquisition state participates explicitly and remains clock based;
- ADR-028: dependencies remain acyclic and use public package APIs;
- solver contract: non-analytical solvers expose checkpointable state through Physica-owned adapters;
- stochastic rule: full PRNG state or equivalent deterministic stream position is captured; a seed alone is insufficient.

## 2.1 Package-ownership resolution

`@physica/checkpoints` is the frozen owner of checkpoint cadence, snapshot envelopes, integrity checks, storage selection and replay orchestration.

It depends one way on:

- core-model for branded IDs, JSON values and scene/clock identity;
- clocks for full named-clock runtime snapshots;
- events for event-sequence snapshot/restore;
- runtime-scheduler for authoritative runtime-state snapshots.

Clocks, events and runtime-scheduler do not import checkpoints. Future solver packages may implement the public participant interface without checkpoints importing them. No cycle or editor dependency is introduced.

## 2.2 Complete deterministic state

The frozen conceptual checkpoint fields are represented as:

- `sceneId`;
- full `clockSnapshot` (all named clock states/times/rates/run flags/revisions);
- `authoritativeStateSnapshot` (`RuntimeStateSnapshot`);
- participant snapshots classified as solver, random source, acquisition or runtime continuation;
- `eventSequenceState`;
- deterministic checksum.

Runtime continuation state such as a future non-empty scheduler queue must be registered as a `runtime-continuation` participant. This is an implementation detail inside the frozen snapshot payload, not a new project root concept.

## 2.3 Audit conclusion

No ProjectDocument schema change, migration, ADR change, package inversion, physics-authority change, solver choice or dependency is required. No Architecture Blocker exists.

---

# 3. Exact scope

## 3.1 In scope

- immutable JSON-safe `RuntimeCheckpointV1` envelopes;
- checkpoint IDs and monotonic checkpoint sequence values;
- canonical snapshot normalization and deterministic CRC-32 integrity checksum;
- pure checksum calculation/verification with typed corruption errors;
- validated full clock, authoritative state and event-sequence restore;
- extensible checkpoint participants for solver, PRNG, acquisition and runtime-continuation state;
- preflight validation of all participant snapshots before mutation;
- best-effort atomic restore with captured rollback state;
- in-memory checkpoint store indexed by scene and named primary clock;
- deterministic nearest-checkpoint-at-or-before-target selection;
- cadence policy and bounded per-scene retention as performance policy only;
- fixed-maximum-step deterministic forward replay in selected-clock coordinates;
- verification that every replay callback advances exactly to the requested named-clock time;
- derived-output regeneration callback after restore/replay;
- analytical scrub adapter that evaluates directly at target time without checkpoint replay;
- forward/back equivalence and stochastic stream identity tests;
- required examples `numerical-scrub` and `stochastic-scrub`.

## 3.2 Out of scope

- ODE, rigid-body, particle, grid, circuit, ray, stochastic or reconstruction solver implementations;
- a production PRNG algorithm/catalog;
- persistence of checkpoint caches inside `.physica` files;
- compression, binary snapshot formats, disk spilling or network transfer;
- reverse numerical integration;
- interpolation between checkpoints;
- background checkpoint workers;
- runtime scheduler queue serialization beyond the participant extension point;
- rendering, graph, observable, storyboard or representation regeneration logic;
- scrubber/timeline UI;
- installer/executable packaging;
- project-schema or command-history changes.

---

# 4. Packages and files allowed to change

Primary:

- `packages/checkpoints`.

Integration-only:

- `packages/clocks` for pure snapshot validation before restore;
- `packages/events` for typed event-sequence validation/restore;
- `packages/runtime-scheduler` for pure RuntimeStateSnapshot validation before restore;
- root test configuration;
- `examples/time/numerical-scrub`;
- `examples/time/stochastic-scrub`;
- `examples/pending-artifacts.json`;
- `docs/CURRENT_STATE.md`;
- `Launch Physica.bat` only to preserve the verified development launch path.

No workspace package or third-party dependency is added.

---

# 5. Dependency direction

```text
core-model
   ↑       ↑        ↑
clocks   events   runtime-scheduler
   ↑       ↑        ↑
        checkpoints
```

`@physica/checkpoints` imports public types/APIs only. It does not import commands, serialization, solver implementations, physics domains, renderers, React, Tauri or editor internals.

---

# 6. Public identifiers and results

```ts
export type RuntimeCheckpointId = Brand<string, "RuntimeCheckpointId">;
export type CheckpointParticipantId = Brand<string, "CheckpointParticipantId">;

export type CheckpointResult<T> = Result<T, CheckpointError>;
```

IDs use the canonical namespaced registered-ID grammar. `CheckpointSequence` is a non-negative safe integer allocated monotonically by the service. Sequence exhaustion returns a typed result.

Required error kinds include:

- `invalid-checkpoint`, `invalid-checkpoint-policy`;
- `duplicate-checkpoint`, `checkpoint-not-found`;
- `checkpoint-sequence-exhausted`;
- `checksum-mismatch`;
- `scene-mismatch`, `clock-not-found`;
- `snapshot-validation-failed`, `participant-not-found`;
- `participant-capture-failed`, `participant-restore-failed`;
- `restore-rollback-failed`;
- `invalid-scrub-target`, `invalid-replay-step`;
- `replay-step-failed`, `replay-clock-diverged`;
- `derived-regeneration-failed`, `analytical-evaluation-failed`.

Errors carry stable codes/messages and related canonical IDs. Normal validation and scientific replay failures return results, not exceptions. Participant/callback exceptions are caught and converted without nondeterministic stack text.

---

# 7. Runtime checkpoint envelope

```ts
export interface RuntimeCheckpointV1 {
  readonly schemaVersion: 1;
  readonly checkpointId: RuntimeCheckpointId;
  readonly sequence: number;
  readonly sceneId: SceneId;
  readonly primaryClockId: ClockId;
  readonly clockSnapshot: ClockRuntimeSnapshot;
  readonly authoritativeStateSnapshot: RuntimeStateSnapshot;
  readonly participantSnapshots: readonly CheckpointParticipantSnapshot[];
  readonly eventSequenceState: number;
  readonly checksum: string;
}

export interface CheckpointParticipantSnapshot {
  readonly participantId: CheckpointParticipantId;
  readonly kind:
    | "solver"
    | "random-source"
    | "acquisition"
    | "runtime-continuation";
  readonly schemaVersion: number;
  readonly state: JsonValue;
}
```

Participant snapshots sort by participant ID. Clock states retain ClockDefinition order. Runtime-state entries retain canonical channel-key order. Every number is finite; sequence/revision/schema numbers are safe integers in their defined ranges.

The checkpoint is immutable. Capture deep-clones JSON values so later participant mutation cannot change stored history.

---

# 8. Integrity checksum

`canonicalizeCheckpointBody` excludes `checksum`, recursively sorts object keys and preserves array order. The built-in checksum is standard CRC-32 over UTF-8 canonical JSON, formatted `crc32:<eight lowercase hexadecimal digits>`.

CRC-32 is an integrity/corruption check, not a security signature. Checkpoint data is local transient cache data. No claim of tamper resistance is made.

Checksum calculation is synchronous, deterministic, browser-safe and dependency-free. Every store insertion, nearest lookup used for replay and restore verifies it. Altered state produces `checksum-mismatch` before runtime mutation.

---

# 9. Checkpoint participants

```ts
export interface CheckpointParticipant {
  readonly participantId: CheckpointParticipantId;
  readonly kind: CheckpointParticipantKind;
  readonly schemaVersion: number;
  capture(): CheckpointResult<JsonValue>;
  validate(snapshot: CheckpointParticipantSnapshot): CheckpointResult<void>;
  restore(snapshot: CheckpointParticipantSnapshot): CheckpointResult<void>;
}
```

Participant IDs are unique within a service. Registration order never controls capture/restore semantics; participants are processed lexically by ID.

Examples:

- solver adapter internal arrays/integrator state → `solver`;
- full xorshift/PCG/etc. state or stream position → `random-source`;
- detector sampling cursor/buffer state → `acquisition`;
- scheduler pending events/cycle continuation when required → `runtime-continuation`.

Unknown participant IDs or schema versions fail restore. The service never interprets opaque state. A plugin implements its adapter through the registry/public interface without injecting editor code.

---

# 10. Built-in runtime validation and restore

Step 8 adds pure validation APIs:

```ts
ClockRuntime.validateSnapshot(snapshot): ClockResult<void>;
RuntimeStateStore.validateSnapshot(snapshot): SchedulerResult<void>;
RuntimeEventSequence.validatePosition(position): EventResult<void>;
RuntimeEventSequence.restore(position): EventResult<number>;
```

Existing restore methods delegate to their validators. Validation checks the exact scene/channel/clock identity set and finite revision/value invariants without mutation.

Checkpoint restore order after full preflight:

1. capture current clocks, authoritative state, event sequence and participant states as rollback data;
2. restore clocks;
3. restore authoritative state;
4. restore event sequence;
5. restore participants in lexical ID order;
6. return a verified restore report.

If mutation unexpectedly fails after preflight, restore all captured rollback snapshots. If rollback itself fails, return `restore-rollback-failed`; do not claim a valid runtime.

---

# 11. Checkpoint capture

Capture requires a scene ID and primary replay clock ID. It validates:

- runtime state scene matches;
- primary clock exists;
- participants are unique and valid;
- event sequence position is valid;
- all snapshots are JSON-safe;
- checksum recomputes exactly.

Checkpoint IDs are deterministic from service namespace and sequence, for example `physica.checkpoint:<sequence-base36>`. They are runtime cache identities, not persisted UUID project nodes.

Capture does not pause clocks or execute a scheduler cycle. Callers capture at a deterministic safe boundary after all state for the selected time is coherent. A future scheduler-continuation participant must be registered when pending work is semantically required.

---

# 12. Cadence and store

```ts
export interface CheckpointCadencePolicy {
  readonly minimumClockIntervalSeconds: number;
  readonly maxCheckpointsPerScene: number;
}
```

The interval is finite and non-negative. Maximum count is a positive safe integer. `captureIfDue` compares the selected primary-clock time against the latest valid checkpoint on that scene/clock. Cadence affects only cache frequency/performance, never solver step size or physical results.

The in-memory store:

- rejects duplicate checkpoint IDs;
- stores immutable verified checkpoints;
- selects nearest time `<= targetTimeSeconds`;
- breaks equal-time ties by higher checkpoint sequence;
- evicts the lowest sequence first when the per-scene limit is exceeded;
- lists checkpoints by scene, primary clock, primary-clock time and sequence deterministically;
- may be cleared per scene or globally without touching ProjectDocument.

There is no persistence/disk policy in Step 8.

---

# 13. Replay algorithm

```ts
export interface ReplayStepRequest {
  readonly clockId: ClockId;
  readonly fromTimeSeconds: number;
  readonly toTimeSeconds: number;
}

export interface ReplayDriver {
  replayStep(request: ReplayStepRequest): CheckpointResult<void>;
  regenerateDerived(): CheckpointResult<void>;
}

export interface ScrubRequest {
  readonly sceneId: SceneId;
  readonly clockId: ClockId;
  readonly targetTimeSeconds: number;
  readonly maximumStepSeconds: number;
}
```

Algorithm:

1. validate finite target and positive finite maximum step;
2. select/verify nearest checkpoint on the same scene/clock with checkpoint time at or before target;
3. restore the checkpoint completely;
4. read the selected clock time from restored state;
5. repeatedly request `to = min(current + maximumStepSeconds, target)` in selected-clock coordinates;
6. after each callback, read the actual clock and require exact equality with `to`;
7. stop at exact target with no overshoot;
8. call `regenerateDerived` once;
9. return checkpoint ID, restored time, target, replay-step count and final snapshots.

The replay driver normally runs the shared Runtime Scheduler/solver stack. It owns mapping selected-clock targets onto runtime cycles, including linked/rate-scaled clock semantics. The service never invents a wall/display delta.

If the target is earlier than current runtime time, the algorithm still restores a prior checkpoint then replays forward. It never integrates backward or reverses visuals.

If no checkpoint exists at/before target, return `checkpoint-not-found`. A real scene should retain its deterministic initial checkpoint.

---

# 14. Analytical scrub

Analytical models do not need replay:

```ts
export interface AnalyticalScrubAdapter {
  evaluateAt(clockId: ClockId, targetTimeSeconds: number): CheckpointResult<void>;
  regenerateDerived(): CheckpointResult<void>;
}
```

`scrubAnalytical` validates target, evaluates directly once, verifies the selected clock reaches the target through adapter-owned semantics, then regenerates derived values. This helper shares typed reporting but creates/restores no checkpoint.

---

# 15. Document/runtime boundary and serialization

Checkpoint envelopes are runtime/cache snapshots. They are not:

- ProjectDocument fields;
- command transactions;
- undo/redo entries;
- dirty/save-token changes;
- ordinary `.physica` project JSON.

Their JSON-safe shape supports tests, diagnostics and a future explicitly owned cache/persistence format. Step 8 does not promise long-term checkpoint compatibility or add a project migration. Opening/saving a project remains unaffected.

Tests compare canonical ProjectDocument serialization before and after capture, replay, backward scrub and stochastic replay.

---

# 16. State-channel authority

Checkpoint capture is read-only. Restore replaces a validated whole authoritative snapshot; it does not create a competing physical writer. Replay advances only through the existing Runtime Scheduler and registered owning systems/solvers.

Participants may restore only their own private continuation state. They do not receive a generic ProjectDocument mutation API. Representations cannot write physical state during scrub.

---

# 17. Clocks and time

- all target/checkpoint times are finite canonical seconds in a named clock domain;
- full named-clock state is restored, so presentation/acquisition/audio clocks retain their relationship to simulation time;
- render refresh rate is absent from the service;
- maximum replay step is selected-clock performance policy, not a visual frame interval;
- exact target landing uses a final partial replay step;
- callers cannot scrub a missing clock;
- active linked-clock constraints remain governed by the clock/runtime adapter, not bypassed locally.

---

# 18. Events and stochastic state

`eventSequenceState` is mandatory and restored before replay. Duplicate future event identities cannot arise merely because time was scrubbed.

Every stochastic model registers a random-source participant containing full deterministic state or an equivalent reproducible stream cursor. A document seed may initialize a run but does not replace the checkpointed state.

Events generated during replay use the shared Runtime Scheduler/events contract and therefore regain the same ordering. The checkpoint service emits no physical event of its own.

---

# 19. Observables and derived output

Derived observables, graph caches, representation transforms and render handles are not authoritative checkpoint state unless an owning subsystem later registers required continuation data. After exact target state is reached, `regenerateDerived` is mandatory and called once.

Failure to regenerate returns a typed error and does not claim scrub completion.

---

# 20. Assumptions and validation

- checkpoints are captured only at coherent runtime boundaries;
- registered participants collectively cover every non-reconstructible continuation state;
- replay drivers are deterministic for identical restored state and step targets;
- solver snapshot schema compatibility is checked by participant ID/schema version;
- replay callbacks synchronously complete one requested deterministic step;
- initial checkpoints exist for targets near scene start in production use.

Invalid configuration/state returns typed results. Programmer callback exceptions are contained. `NaN`, infinities, unsafe integers, malformed IDs, duplicate participants, mismatched scenes/clocks/channels, altered checksums and non-progressing/overshooting replay all fail before completion.

---

# 21. Extensibility and plugins

Participants are registry-style public contracts with namespaced IDs and opaque JSON state. Plugins do not modify checkpoint grammar, inject editor callbacks or persist arbitrary native objects. Future participant kinds require architecture-compatible registry evolution; unknown kinds in V1 are rejected.

No third-party solver, PRNG or compression format becomes public Physica schema.

---

# 22. Performance considerations

- cadence and retention are explicit bounded policies;
- capture/checksum cost is proportional to snapshot size;
- nearest lookup is deterministic and may use sorted per-scene arrays;
- checkpoint spacing never changes physics, solver tolerance or recorded observables;
- no arbitrary large-scene promise is made;
- Step 8 performs no compression/copy-on-write optimization;
- replay step count is reported for later benchmarks;
- heavy future capture/compression may use ComputeBackend only if semantic ordering remains identical.

Required benchmark-oriented tests cover bounded eviction, thousands of deterministic nearest lookups and replay step-count correctness, without setting unsupported release performance promises.

---

# 23. Accessibility and teacher experience

The core service is non-visual. Errors and reports use teacher-readable language suitable for a future scrubber status/diagnostic surface. Example previews explain restore → replay → regenerate without relying on color alone and include SVG title/description text.

Future UI must expose keyboard-operable scrub controls, current/target time and replay progress; UI implementation is outside Step 8.

---

# 24. Units and dimensions

Checkpoint/replay uses canonical finite seconds for clock coordinates. It does not introduce a new unit system. Opaque participant states retain their owning model's canonical quantities/units and are not reinterpreted by checkpoints.

---

# 25. Physics Library requirements

Checkpoint/Replay is infrastructure and adds no stage-visible Physics Library card, prefab, instrument, visual object or material preset. Future checkpointable physics items declare capability through their model/solver metadata rather than editor hard-coding.

---

# 26. Example Gallery artifacts

## 26.1 `examples/time/numerical-scrub`

An executable deterministic numerical toy runtime captures an initial and intermediate checkpoint, advances farther, scrubs backward by restoring the nearest checkpoint and replaying forward in fixed maximum steps, and proves equality with a direct forward baseline. It records restored time, target time, step count, final authoritative value and unchanged ProjectDocument.

## 26.2 `examples/time/stochastic-scrub`

An executable xorshift32 demonstration captures full random-source state plus event sequence, advances a stream, restores and replays, then proves identical random values/event IDs. It explicitly demonstrates that replay identity comes from full continuation state rather than seed-only reconstruction.

Each directory contains metadata, README, executable run module, deterministic expected JSON, accessible expected SVG preview and automated test. `.physica`, PNG, WebM and gallery-browser artifacts remain in `examples/pending-artifacts.json` until their owners exist.

The examples are infrastructure proofs, not claims that a production ODE or stochastic physics model has been implemented.

---

# 27. Test matrix

Required targeted tests:

- canonical checkpoint checksum stability across object key order;
- corruption detection before mutation;
- immutable deep-cloned capture;
- participant lexical capture/validate/restore order;
- duplicate participant ID/schema mismatch/missing participant rejection;
- full clock/runtime/event-sequence restore;
- failed participant restore rollback and rollback-failure reporting;
- nearest checkpoint before/equal target and no-prior-checkpoint error;
- deterministic equal-time sequence tie-break;
- cadence due/not-due and bounded eviction;
- forward scrub equals uninterrupted forward execution;
- backward scrub restores prior checkpoint then only replays forward;
- exact target landing with final partial step;
- non-progress/overshoot/wrong-clock detection;
- derived regeneration exactly once and failure reporting;
- analytical direct evaluation path without checkpoint lookup;
- stochastic full-state replay produces identical value/event streams;
- restoring only a seed is shown insufficient after mid-stream capture;
- ProjectDocument canonical serialization/history remains unchanged;
- 10,000 seeded capture/lookup/replay selections are deterministic;
- both required examples match expected output;
- clean-PATH `Launch Physica.bat --check` succeeds.

Run package tests first, then affected examples, architecture lint, repository typechecks/tests/builds and full CI.

---

# 28. Implementation order

1. preserve and verify the Corepack-aware development launcher repair;
2. add pure snapshot validators to clocks/runtime-state and restore support to event sequence;
3. implement checkpoint errors, IDs, canonicalization and CRC-32 checksum;
4. implement participant registry and immutable checkpoint capture;
5. implement verified in-memory store, cadence and nearest lookup;
6. implement preflight/rollback restore;
7. implement numerical replay and analytical direct-scrub services;
8. add the two examples and pending-artifact records;
9. run software-architecture, scientific-computing, teacher and UX/accessibility self-review;
10. fix current-phase defects, run full CI and update `CURRENT_STATE.md`;
11. commit/push the verified Step 8 checkpoint;
12. continue autonomously to the rendering foundation.

---

# 29. Definition of Done

Step 8 is complete only when:

- the audited package direction remains acyclic;
- complete immutable runtime checkpoints include clocks, authoritative state, participant state, event sequence and verified checksum;
- nearest-before-target restore/replay is deterministic and never reverses physics;
- full PRNG continuation state reproduces stochastic streams;
- corrupted/incompatible snapshots fail before runtime mutation;
- restore failure attempts rollback and reports unrecoverable rollback explicitly;
- cadence/retention alter performance only;
- ProjectDocument, command history and dirty state remain untouched;
- required targeted/determinism/serialization tests pass;
- both honest example artifact sets exist;
- the repaired development launcher passes its clean-PATH self-check;
- formatting, lint, architecture checks, typechecks, tests and builds pass;
- `CURRENT_STATE.md` records exact results and names rendering foundation as next phase;
- the verified checkpoint is committed and pushed to `origin/main`.

---

# 30. Explicit non-implementation boundary

Do not implement during Step 8:

- real solver algorithms or physics models;
- rendering/camera/picking;
- persistent checkpoint files or project migrations;
- checkpoint compression/workers;
- timeline/editor scrub UI;
- graph/observable/storyboard/audio behavior;
- installer or executable packaging;
- any rendering-foundation capability.

Stop Step 8 when its Definition of Done is met, record/push the checkpoint, then continue under `docs/AUTONOMOUS_EXECUTION_PROTOCOL.md` to the rendering foundation.
