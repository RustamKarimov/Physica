# Step 7 — Runtime Scheduler Implementation Specification

**Status:** Audited implementation specification  
**Phase:** Autonomous execution, first unfinished phase after Step 6  
**Owning frozen specifications:** `RUNTIME_SCHEDULER.md`, `RUNTIME_STATE.md`, `COMMANDS_AND_EVENTS.md`  
**Supporting frozen specifications:** `CLOCKS_AND_TIME.md`, `SYSTEM_MODEL.md`, `COMPONENT_MODEL.md`  
**Higher authorities:** `PROJECT_CONSTITUTION.md`, approved ADRs in `DECISIONS.md`

---

# 1. Purpose

Step 7 establishes one deterministic runtime coordinator for Physica. It turns the frozen 13-stage pipeline into an executable public contract, advances the verified named-clock runtime, builds deterministic system dependency order, stores transient physical state outside the project document, and orders runtime events independently of callback or worker completion timing.

This phase supplies orchestration foundations. It does not implement physics equations, numerical solvers, checkpoint/replay, rendering, data acquisition, storyboard behavior, audio output or editor UI.

---

# 2. Source-of-truth audit

The design preserves:

- ADR-004: persisted document definitions and transient runtime state remain separate;
- ADR-005: every mutable physical state channel has one authoritative writer;
- ADR-007: named clocks are resolved by one scheduler and display refresh is only an input interval;
- ADR-009: runtime event order has stable identity and never depends on asynchronous completion;
- ADR-016: later acquisition sampling has an explicit scheduler phase and clock interval;
- ADR-028: package dependencies remain acyclic and use public exports only;
- ADR-029: cyclic state dependencies are rejected and require an explicit coupled owner.

## 2.1 Package-ownership resolution

The frozen repository map contains `events` and `runtime-scheduler`, but no general `runtime-state` package. Therefore:

- `@physica/events` owns runtime-event identity, payload envelopes, sequence allocation and an insertion buffer;
- `@physica/runtime-scheduler` owns scheduler phases, the total event ordering key, the transient Runtime State Store, system scheduling and cycle execution;
- runtime-scheduler may depend on the lower-layer public APIs of core-model, clocks and events;
- events depends only on core-model, never on runtime-scheduler;
- scheduler phase data is attached by runtime-scheduler when events enter the schedule rather than imported into events.

This resolves the documentation-level mutual references without creating a package cycle or moving event ownership into the scheduler.

## 2.2 Pre-implementation audit conclusion

No root project-schema change, ADR reversal, dependency inversion, scientific-model choice or plugin-isolation change is required. Event definitions remain opaque future document configuration; Step 7 implements runtime event instances only. Checkpoint/replay remains owned by the later checkpoints phase.

No Architecture Blocker exists.

---

# 3. Exact scope

## 3.1 In scope

- the frozen 13 built-in scheduler phases and stable ordinal mapping;
- namespaced specialized phase registration anchored before or after one built-in phase;
- validation of phase/task/system definitions with typed teacher-facing errors;
- stable task order by phase ordinal, explicit priority, registration sequence and task ID;
- automatic clock advancement during the clock phase through `ClockRuntime.advance`;
- a deterministic cycle trace with phase/task/event/system records;
- runtime event envelopes, monotonic safe-integer sequence IDs and buffering;
- total event order by timestamp, phase, priority, sequence ID and stable textual tie-breakers;
- physical event draining at the frozen event stages without document mutation;
- transient per-scene Runtime State Store with initial-state reset and deterministic reconstruction;
- authoritative write claims and scoped atomic system writes;
- deterministic system dependency ordering inferred from declared state-channel inputs/outputs;
- rejection of duplicate writers, dangling clock bindings and dependency cycles;
- stable collection of asynchronous worker results by declared order rather than completion time;
- required examples `scheduler-order-trace`, `runtime-state-reset` and `runtime-event`;
- targeted unit, determinism, scientific-boundary, reset and serialization-separation tests.

## 3.2 Out of scope

- real physics system implementations or solver algorithms;
- checkpoint creation, checksum, replay or backward scrub behavior;
- renderer, animation, relationship, acquisition, storyboard or audio implementations;
- browser `requestAnimationFrame` ownership or an uncontrolled internal loop;
- Web Worker creation, pools, transport or cancellation;
- persisted frame/event logs or frame-by-frame document changes;
- document event-rule schema additions;
- commands/history changes;
- runtime entity creation/removal semantics;
- coupled multiphysics convergence algorithms;
- UI, timeline controls or application-shell redesign;
- installer or executable packaging.

---

# 4. Packages and files allowed to change

Primary:

- `packages/events`;
- `packages/runtime-scheduler`.

Integration-only:

- root scripts/test/workspace configuration;
- `examples/system/scheduler-order-trace`;
- `examples/system/runtime-state-reset`;
- `examples/system/runtime-event`;
- `examples/pending-artifacts.json`;
- `docs/CURRENT_STATE.md`;
- `Launch Physica.bat` only to preserve its development-launch behavior.

No new workspace package or third-party dependency is allowed.

---

# 5. Dependency direction

```text
@physica/core-model
       ↑          ↑
@physica/events   @physica/clocks
       ↑          ↑
       @physica/runtime-scheduler
```

Events imports only JSON-safe payload and branded ID types from core-model. Runtime-scheduler imports only public exports from core-model, events and clocks. None of these packages imports commands, solvers, renderers, physics-domain packages, React, Tauri or editor internals.

---

# 6. Scheduler phases

## 6.1 Built-in identifiers

`SchedulerPhaseId` is a namespaced branded string. The public constants are, in immutable order:

1. `physica:scheduler/document-control`
2. `physica:scheduler/clock-advancement`
3. `physica:scheduler/authoritative-physics`
4. `physica:scheduler/event-ordering`
5. `physica:scheduler/physical-event-processing`
6. `physica:scheduler/observables`
7. `physica:scheduler/relationships`
8. `physica:scheduler/acquisition`
9. `physica:scheduler/storyboard`
10. `physica:scheduler/presentation-animation`
11. `physica:scheduler/representation-layout`
12. `physica:scheduler/rendering`
13. `physica:scheduler/audio-output`

The built-in list is frozen and cannot be replaced, removed or reordered.

## 6.2 Specialized phases

A `SpecializedPhaseDefinition` contains a namespaced ID, a unique anchor built-in phase, placement `before | after`, and explicit integer priority. Registration returns a new immutable `SchedulerPlan` or typed duplicate/invalid-anchor error.

Specialized phases sort by anchor ordinal, placement, priority, registration sequence and ID. They cannot split clock advancement from its scheduler-owned operation, event ordering from event processing, or create an independent loop. A specialized phase is an extension point, not a persisted project root concept.

---

# 7. Runtime tasks

```ts
export interface RuntimeTask {
  readonly id: RuntimeTaskId;
  readonly phaseId: SchedulerPhaseId;
  readonly priority?: number;
  run(context: RuntimeTaskContext): void | SchedulerResult<void>;
}
```

Task IDs are namespaced and unique. Priority is a safe integer; smaller values run first. Registration sequence is assigned by the scheduler and is a stable safe integer. The scheduler never depends on JavaScript object-key iteration.

Task execution is synchronous in Step 7. Work computed asynchronously must enter through the worker-result collection contract in Section 15, then be committed by a deterministic task. This prevents Promise resolution order from becoming runtime semantics.

The scheduler rejects tasks for unknown phases, duplicate task IDs or invalid priorities before a cycle starts.

---

# 8. Runtime events

## 8.1 Event package envelope

```ts
export interface RuntimeEvent<TPayload extends JsonValue = JsonValue> {
  readonly timestampSeconds: number;
  readonly clockDomain: ClockId;
  readonly sourceId: string;
  readonly eventType: RegisteredTypeId;
  readonly sequenceId: number;
  readonly priority: number;
  readonly payload: TPayload;
}
```

All numbers are finite; sequence and priority are safe integers; sequence is non-negative. Source ID is non-empty. Payload is JSON-safe and immutable by contract. Invalid input returns `EventResult` rather than throwing.

`RuntimeEventSequence` starts at a caller-provided non-negative safe integer, allocates monotonically, exposes a snapshot value for later checkpoint integration, and returns a typed exhaustion error rather than wrapping.

`RuntimeEventBuffer` preserves accepted event instances and supports immutable snapshot, clear and drain operations. It does not determine scheduler phase order.

## 8.2 Scheduled event key

Runtime-scheduler wraps each event with the phase in which it was enqueued. The total ascending key is:

1. `timestampSeconds`;
2. resolved scheduler phase ordinal;
3. explicit event `priority`;
4. `sequenceId`;
5. `clockDomain` lexical value;
6. `sourceId` lexical value;
7. `eventType` lexical value.

Sequence IDs are expected to be unique within one runtime, but the final textual fields make the comparator total and deterministic for imported/test data. Sorting uses a copied array and never mutates caller data.

Events available before phase 4 are frozen into that cycle's ordered batch. Events emitted during phase 5 or later are deferred to the next cycle. Runtime events never mutate `ProjectDocument`; event handlers may request scoped runtime-state writes through the scheduler contract.

---

# 9. Runtime State Store

## 9.1 Ownership

The store is transient and lives in `@physica/runtime-scheduler` because no separate runtime package exists in the frozen map. It is constructed from one `SceneId`, validated authoritative claims and JSON-safe initial channel values.

```ts
export interface RuntimeStateEntry {
  readonly ref: StateChannelRef;
  readonly value: JsonValue;
  readonly revision: number;
}

export interface RuntimeStateSnapshot {
  readonly sceneId: SceneId;
  readonly entries: readonly RuntimeStateEntry[];
  readonly revision: number;
}
```

Channel keys are canonical strings derived from scope, stable owner ID and canonical channel ID. Snapshots sort by channel key, are immutable and contain no Map, function, class instance or non-finite number.

## 9.2 Reset and reconstruction

The store retains an immutable initial snapshot. `reset()` restores it exactly and advances the store revision once only if current state differs. `snapshot()` captures transient runtime state for diagnostics and later checkpoint integration but is not ProjectDocument serialization. `restore()` validates scene, claims, JSON values and revisions before atomic replacement.

Creating two stores from the same scene, claims and initial values produces equal canonical snapshots. No reset or runtime update creates a document command or history entry.

## 9.3 Scoped writes

Each scheduled system receives a writer restricted to that system's declared output channels. Writes are accumulated, validated and committed atomically after successful execution. A failed system or undeclared write commits nothing. Each changed channel and the store revision increment once per successful transaction; writing an equal JSON value is a no-op.

Representations and tasks outside the authoritative-physics or physical-event-processing contracts receive read-only state access.

---

# 10. State authority and system order

`ScheduledSystem` contains stable system ID, optional clock binding, declared input/output `StateChannelRef` arrays and a synchronous execute callback.

Validation:

- system IDs are unique;
- all referenced clocks exist in the current clock runtime;
- one output channel has exactly one scheduled authoritative writer;
- duplicate input/output refs within one system are rejected;
- a self-dependency is rejected;
- enabled document systems with no registered runtime implementation are reported by the future runtime builder, not silently invented here.

For every producer output consumed by another system input, add producer → consumer. Kahn topological sorting uses lexical system ID order for every ready set. A remaining cycle returns `coupled-system-required` with the sorted involved IDs. Callback order never breaks a cycle.

Systems bound to clocks that did not advance in the current cycle are skipped. An unbound system uses the simulation clock. A system receives the exact previous/new interval of its resolved clock; it does not read wall time.

---

# 11. Scheduler cycle

`RuntimeScheduler.runCycle(request)` is the only phase driver. A request contains a finite non-negative display interval, clock-link conditions and optional external control/document task inputs. The display interval is not authoritative time; it is passed to `ClockRuntime.advance`, whose named clock states determine all later intervals.

Cycle behavior:

1. validate the complete plan before execution;
2. start an immutable trace builder and retain events deferred from the previous cycle;
3. run phases in resolved order;
4. in clock advancement, invoke `ClockRuntime.advance(deltaSeconds, conditions)` exactly once;
5. in authoritative physics, run scheduled systems in validated dependency order for advanced clock intervals;
6. in event ordering, combine eligible buffered events and sort by Section 8.2;
7. in physical event processing, dispatch the frozen ordered batch to registered event handlers;
8. run remaining tasks in stable order;
9. return clock changes, runtime-state snapshot, processed/deferred events and frozen trace.

If validation, clock advancement, a task, system or event handler returns an error, the cycle stops and returns a typed error containing phase/task/system/event context. Step 7 guarantees atomic writes per system/event handler, not rollback of all already completed phases. The trace explicitly identifies completed work. Later checkpoint orchestration may provide wider rollback/replay.

The scheduler has no timer, animation-frame request or background loop.

---

# 12. Event handlers

Handlers register by namespaced event type with unique handler ID and stable priority. Matching handlers run by priority, registration sequence and ID for each already ordered event.

A handler may:

- read clock intervals and runtime state;
- enqueue a later event, which is deferred if event ordering has completed;
- request atomic writes only to explicitly declared authoritative channels.

A handler may not mutate the document. The initial implementation does not create/remove runtime entities.

---

# 13. Errors and validation

Public construction/execution operations use discriminated results. Required error kinds include:

- `invalid-phase-id`, `duplicate-phase`, `invalid-phase-anchor`;
- `invalid-task`, `duplicate-task`, `unknown-phase`;
- `invalid-event`, `event-sequence-exhausted`;
- `duplicate-system`, `duplicate-state-ref`, `state-writer-conflict`;
- `clock-not-found`, `system-dependency-cycle` / `coupled-system-required`;
- `unauthorized-state-write`, `runtime-state-mismatch`;
- `clock-advance-failed`, `task-failed`, `system-failed`, `event-handler-failed`;
- `invalid-worker-result-order`.

Errors include stable codes, teacher-readable messages and related IDs. Expected scientific/configuration failures are not normal exceptions. Programmer callback exceptions are caught at the scheduler boundary and converted to contextual failure results without leaking nondeterministic stack text into canonical outputs.

---

# 14. Serialization boundary

Step 7 adds no ProjectDocument field and no schema migration.

JSON-safe runtime snapshots and traces may be serialized for tests, diagnostics and later checkpoint integration. They are never inserted into normal project JSON and never affect dirty/save tokens. Runtime event logs are transient. Unknown event payload fields survive because payloads remain opaque JSON values.

Tests must prove an unchanged ProjectDocument remains canonically identical after cycles, events, runtime writes and reset.

---

# 15. Worker-result determinism

```ts
export interface OrderedWorkerRequest<TInput> {
  readonly order: number;
  readonly input: TInput;
}

export interface OrderedWorkerResult<TOutput> {
  readonly order: number;
  readonly output: TOutput;
}
```

`collectOrderedWorkerResults` accepts declared requests and a caller-supplied asynchronous worker function. It awaits completion, validates that each result retains its unique requested safe-integer order, and returns results sorted by order. Completion order is never exposed as semantic order. This helper starts no workers and has no environment dependency.

---

# 16. Trace and diagnostics

Every cycle returns JSON-safe trace records with a monotonically assigned trace index:

- cycle start/end;
- phase start/end;
- clock changes;
- system start/end/skip;
- task start/end;
- event order and handler dispatch;
- failure context.

Trace records contain canonical identifiers and finite numeric values, not wall-clock timestamps or elapsed performance measurements. Identical inputs and callbacks produce identical traces.

---

# 17. Example Gallery artifacts

## 17.1 `examples/system/scheduler-order-trace`

Runs representative tasks across all 13 phases, advances simulation/presentation clocks, includes two dependent mock systems and verifies the exact trace order. Required files: package manifest, metadata, README, executable run module, expected JSON output, accessible expected SVG preview and automated test.

## 17.2 `examples/system/runtime-state-reset`

Creates an initial position/velocity state, applies one authorized system transaction, snapshots, resets and proves exact reconstruction without ProjectDocument mutation. Same artifact requirements apply.

## 17.3 `examples/system/runtime-event`

Enqueues same-timestamp events with different phases/priorities/sequences, processes them deterministically and shows a deferred handler-emitted event in the next cycle. Same artifact requirements apply.

Until the gallery runtime/rendering owner can generate `.physica`, PNG and WebM artifacts honestly, those files remain listed in `examples/pending-artifacts.json`; expected SVG summaries are not mislabeled as runtime screenshots.

The existing `Launch Physica.bat` remains the user-facing live development launcher. Step 7 itself has no meaningful editor UI to add; the first later visible application phase must expose its work through that launcher.

---

# 18. Test matrix

Required targeted tests:

- exact 13-phase order and immutable constants;
- specialized phase stable ordering and invalid registration;
- task priority/registration/ID ordering and duplicate rejection;
- zero/one/many clock steps independent of render interval source;
- system producer-consumer topological order with lexical ready-set tie-breaking;
- writer conflict, duplicate refs, dangling clock and coupled-cycle rejection;
- scoped atomic state writes, no-op writes, unauthorized writes and callback failure rollback;
- runtime reset/reconstruction and snapshot mismatch;
- event validation, monotonic sequence snapshot and exhaustion;
- timestamp/phase/priority/sequence/textual event comparator;
- events emitted after ordering defer to the next cycle;
- handler stable order and contextual failure;
- asynchronous worker completions deliberately resolve out of order but return declared order;
- at least 10,000 seeded shuffled equivalent inputs produce the same schedule/event order;
- ProjectDocument canonical serialization and command history remain unchanged;
- all three examples match checked-in expected output.

Run targeted package/example tests first, then architecture lint, repository typecheck/test/build and full CI.

---

# 19. Implementation order

1. implement events value/result/sequence/buffer contracts and tests;
2. implement scheduler phase IDs, plans and task registry;
3. implement transient state store and authority validation;
4. implement system dependency graph;
5. implement scheduled event ordering and handlers;
6. implement cycle execution and deterministic trace;
7. implement ordered worker-result helper;
8. add the three example projects and pending-artifact records;
9. run scientific, architecture, teacher-UX and determinism self-review;
10. fix defects, run full CI and update `CURRENT_STATE.md`;
11. create and push the verified Step 7 checkpoint;
12. continue autonomously to the next unfinished phase.

---

# 20. Definition of Done

Step 7 is complete only when:

- the audited package boundary above is preserved without cycles;
- the 13-stage scheduler, clock integration, runtime state, system order, event order and worker-result contracts are public and documented;
- no render/wall clock or asynchronous completion controls physics semantics;
- writer conflicts and cyclic systems fail with typed results;
- runtime activity does not mutate or dirty ProjectDocument;
- required targeted/determinism/serialization tests pass;
- all three complete honest example artifact sets exist;
- the development launcher still resolves successfully;
- formatting, lint, architecture checks, typechecks, tests and builds pass;
- `CURRENT_STATE.md` records exact results and names the next phase;
- the verified checkpoint is committed and pushed to `origin/main`.

---

# 21. Explicit stop boundary

Do not implement during Step 7:

- Checkpoint/Replay;
- physics models or solvers;
- relationship/data/storyboard/render/audio phase behavior;
- worker infrastructure;
- event-definition project schema;
- editor UI or installer packaging;
- any next-phase capability.

Stop Step 7 when this Definition of Done is met, record/push the checkpoint, then continue under `docs/AUTONOMOUS_EXECUTION_PROTOCOL.md`.
