# Step 11 — Animation Scheduler Implementation Specification

**Status:** IMPLEMENTATION-READY

**Owning roadmap item:** Phase 3, Step 3.1 — Animation scheduler

**Primary owner:** `@physica/storyboard`

## 1. Purpose

Step 11 establishes deterministic, serializable presentation animation that is independent of authoritative physics evolution. It provides typed presentation channels, easing, composition, explicit overlap policies, arbitrary-time evaluation, reverse playback and scrubbing. The first visible proof is move/scale/rotate animation driven by the mandatory presentation clock.

This phase is an animation-scheduler foundation. Later Phase 3 steps own drawing/reveal, morphing, matched transforms, camera choreography and full semantic text animation.

## 2. Source-of-truth audit

The implementation follows, in priority order:

1. `docs/PROJECT_CONSTITUTION.md`;
2. approved ADRs in `docs/DECISIONS.md`, including ADR-032 for future semantic text animation;
3. `docs/ANIMATION_ENGINE.md`;
4. `docs/CLOCKS_AND_TIME.md`;
5. `docs/RUNTIME_SCHEDULER.md`;
6. `docs/STORYBOARD.md`;
7. `docs/PROJECT_MODEL.md`;
8. `docs/EXAMPLE_SYSTEM.md`;
9. `docs/PACKAGE_DEPENDENCIES.md`.

The audit found no Architecture Blocker.

## 3. Package ownership decision

The frozen package map does not define a standalone animation package. It does define `@physica/storyboard` in the presentation tier, and `docs/STORYBOARD.md` explicitly depends on `docs/ANIMATION_ENGINE.md`. Therefore Step 11 implements a separately exported animation module within `@physica/storyboard`.

This is not a package-boundary change:

- no new workspace package is added;
- animation code does not depend on React, editor code or renderer internals;
- `@physica/storyboard` may depend downward on `core-model`, `mathematics`, `clocks` and `runtime-scheduler`;
- `runtime-scheduler` remains unaware of storyboard implementations and exposes only its public task/phase contract;
- renderers continue to consume resolved presentation state and never become clock or animation authorities.

## 4. Scope

Step 11 implements:

- a JSON-safe V1 animation definition stored in generic Storyboard step envelopes;
- representation presentation channels for translation, rotation, scale and opacity;
- scalar and three-component value interpolation;
- named deterministic easing plus cubic Bézier easing;
- Sequence, Parallel, Stagger and Wait composition;
- explicit sequence, replace, additive, multiplicative and reject conflict policies;
- pure evaluation at any presentation time;
- forward, reverse and scrub equivalence;
- reduced-motion final-state resolution;
- presentation-state snapshots separated from ProjectDocument and physics state;
- an adapter for the frozen Runtime Scheduler presentation-animation phase;
- deterministic validation and teacher-facing typed errors;
- the mandatory `examples/animation/move-scale-rotate` gallery project;
- an observable desktop animation workbench reachable through `Launch Physica.bat`.

## 5. Explicit non-scope

Step 11 does not implement:

- path drawing, write/erase, masks, highlights or semantic reveals;
- morphing, path normalization or matched transforms;
- camera pan/zoom/follow;
- TextBlock layout, grapheme/word/line segmentation or RTL reveal;
- equation, graph, field, detector or acquisition-specific animation;
- Storyboard conditions, branching, interaction pauses or narration;
- an advanced keyframe editor or full timeline UI;
- animation-triggered physical state changes;
- physics rewind or checkpoint replacement;
- audio synchronization or fixed-frame video export;
- a renderer-owned `requestAnimationFrame` loop.

Those capabilities remain assigned to their later roadmap steps.

## 6. Persisted representation

Animations use the existing `StoryboardStepEnvelope`:

```text
StoryboardStepEnvelope
├─ id: StoryboardStepId
├─ typeId: physica:storyboard/animation-v1
├─ schemaVersion: 1
├─ configuration: AnimationDefinitionV1
└─ enabled
```

The envelope ID is the stable animation instance identity. No new root field, persisted UUID brand or ProjectDocument schema version is required.

`AnimationDefinitionV1` contains:

- `name`;
- `target` as a structured `DocumentReference`;
- `clockKey`, which must resolve to the mandatory presentation clock in Step 11;
- `channel`;
- `startTimeSeconds`;
- `durationSeconds`;
- `easing`;
- `startValue`;
- `endValue`;
- `conflictPolicy`;
- `priority`;
- `reversible`;
- `scrubbable`;
- optional JSON-safe metadata.

All numbers must be finite. Duration is non-negative. Zero duration is a deterministic step at the start time.

## 7. Typed channels and values

Foundation channels:

- `presentation.translation` — Vec3;
- `presentation.rotation` — scalar radians;
- `presentation.scale` — Vec3;
- `presentation.opacity` — scalar constrained to [0, 1].

The target for these channels is a Representation reference. Scene references are reserved for later camera animation. Entity physics channels are deliberately not accepted.

`AnimationValue` is a discriminated JSON-safe union:

- `{ kind: "scalar", value }`;
- `{ kind: "vec3", x, y, z }`.

Channel definitions own:

- accepted value kind;
- identity value;
- validation;
- interpolation;
- additive composition where meaningful;
- multiplicative composition where meaningful;
- final value normalization.

Rotation uses radians. Scale components must be finite and non-negative. Opacity clamps only at final composition after validation; invalid authored endpoints are rejected rather than silently repaired.

## 8. Easing

Built-in easing IDs:

- `linear`;
- `ease-in`;
- `ease-out`;
- `ease-in-out`.

Cubic Bézier easing stores four finite control values. The x controls must lie in [0, 1] so progress remains single-valued. Evaluation uses a fixed-iteration deterministic inversion algorithm and exact endpoint handling. It must not depend on browser CSS easing or timing APIs.

Easing receives normalized progress in [0, 1] and returns finite eased progress. Animation values outside the active interval use exact start or end states.

## 9. Composition

Author-friendly composition definitions are compiled into immutable scheduled clips.

Supported nodes:

- `AnimationClip` — one animation definition;
- `Sequence` — children begin after the previous child span;
- `Parallel` — children share the parent origin;
- `Stagger` — child origins are offset by a finite non-negative interval;
- `Wait` — contributes duration without a target channel.

Composition node kinds are closed discriminants used only as authoring-time compiler input. Clips retain stable StoryboardStep identities. Compilation is deterministic and preserves author order only where semantically declared; evaluation order otherwise uses explicit keys.

`Until` and `RepeatPresentation` remain schema-reserved but are not executed until Storyboard conditions and repeat policy are implemented. Physics loops must never be represented as presentation repeats.

## 10. Time and playback

The animation engine has no timer.

It evaluates from an explicit finite presentation time:

```text
evaluate(schedule, presentationTimeSeconds, options)
  -> PresentationAnimationFrame
```

The caller obtains presentation time from the existing Clock Runtime. Forward playback, reverse playback and scrub all call the same pure evaluator at different time coordinates.

Reverse playback is not a separate mutation log. Evaluating at t₂, t₁ and t₂ must reproduce equal frames at each equal coordinate.

Animation never advances a clock and never reads wall-clock or display-refresh time.

## 11. Runtime Scheduler integration

`@physica/storyboard` exposes a task adapter for `RUNTIME_PHASES.presentationAnimation`. The adapter:

1. reads the already-advanced mandatory presentation-clock state;
2. evaluates the immutable animation schedule;
3. writes one transient Presentation State Store frame;
4. emits no ProjectDocument command;
5. performs no physics-state write;
6. leaves representation/layout resolution to phase 11.

The task has a stable namespaced task ID and participates in normal Runtime Scheduler deterministic ordering. It does not add a new scheduler phase.

## 12. Presentation State Store

Step 11 adds a transient store owned by the animation module.

Each frame contains:

- scene ID;
- presentation clock ID and time;
- monotonically increasing store revision;
- sorted target states;
- source animation IDs;
- resolved channel values.

Target state contains:

- translation Vec3;
- rotation radians;
- scale Vec3;
- opacity;
- per-channel source IDs for diagnostics.

The store is runtime-only. It is not embedded in ProjectDocument, history or serialization. Re-evaluating an equal schedule at equal time yields deep-equal semantic content irrespective of store revision.

## 13. Transform-stack boundary

Resolved visible state follows the frozen order:

```text
physical/world
→ relationship-derived
→ representation/layout
→ presentation-animation
→ camera
```

Step 11 outputs only the presentation-animation layer. It does not mutate `RepresentationDefinition.layout`, `visual`, component initial state or Runtime State Store channels.

Renderer integration consumes the resolved presentation transform after this phase; renderer adapters do not import animation implementation internals.

## 14. Conflict resolution

Animations conflict when they target the same document reference, typed channel and overlapping time interval.

Policies:

- `reject` — validation returns a stable conflict error;
- `sequence` — compiler delays the later clip until the earlier conflicting clip ends;
- `replace` — the highest ordered active clip supplies the channel value;
- `additive` — values combine from the channel identity;
- `multiplicative` — values combine from the channel identity.

Ordering key:

1. start time;
2. explicit priority;
3. StoryboardStep ID.

There is no callback-order or object-iteration fallback. A conflict group that mixes incompatible policies is rejected.

Translation and rotation permit additive composition. Scale permits multiplicative composition. Opacity permits multiplicative composition. Unsupported policy/channel pairs are validation errors.

## 15. Validation and errors

Public operations return `AnimationResult<T>`.

Stable error kinds include:

- invalid-definition;
- invalid-target;
- invalid-channel;
- invalid-value;
- invalid-time;
- invalid-easing;
- invalid-composition;
- duplicate-animation;
- channel-conflict;
- unsupported-conflict-policy;
- presentation-clock-missing;
- presentation-clock-mismatch;
- schedule-evaluation-failed.

Errors contain stable codes, messages, optional paths and related IDs. Invalid teacher-authored content does not throw as the normal path. Internal invariant violations may throw only at construction boundaries that consume already-validated built-ins.

## 16. Serialization

Animation envelopes are ordinary JSON-safe Storyboard step data.

Step 11 supplies:

- `createAnimationEnvelope`;
- `parseAnimationEnvelope`;
- `validateAnimationEnvelope`;
- canonical configuration normalization.

Serialization tests prove:

- canonical project JSON round trip;
- unknown non-animation Storyboard steps remain untouched;
- optional extension fields remain preserved by the root model;
- runtime schedules and Presentation State Store frames are not serialized.

No migration or schema-version change is needed.

## 17. Reduced motion and accessibility

Reduced-motion evaluation resolves enabled clips directly to their final readable state at and after their start. It does not remove content, change physics or alter persisted definitions.

The desktop proof provides:

- play/pause;
- reverse;
- scrub slider;
- reduced-motion toggle;
- textual transform readout;
- no essential result conveyed only by motion.

Keyboard controls and visible focus states are required.

## 18. Determinism and performance

Schedules are immutable and sorted once during compilation. Evaluation is linear in active clips plus deterministic conflict-group composition.

The implementation must:

- avoid timers and browser animation APIs;
- avoid mutation of input definitions;
- avoid dependence on Map insertion from unvalidated external input;
- use finite arithmetic only;
- use fixed-iteration cubic Bézier inversion;
- remain stable over at least 10,000 arbitrary-time evaluations;
- return deep-frozen public frames and schedules.

No worker is required for the foundation transform workload.

## 19. Plugin and registry behavior

Step 11 defines the portable animation data contract in the presentation package but does not yet expose arbitrary executable plugin easing or channel callbacks.

Future plugins may contribute declarative animation definitions through a registry contract. Plugin code never executes inside renderer callbacks. Unknown registered Storyboard step envelopes remain preserved by ProjectDocument serialization.

## 20. Tests

Targeted tests must cover:

- definition/envelope validation and JSON safety;
- scalar and Vec3 interpolation;
- exact easing endpoints and reference interior values;
- cubic Bézier determinism;
- Sequence/Parallel/Stagger/Wait compilation;
- every conflict policy and invalid policy/channel pair;
- stable ordering under shuffled input;
- forward/reverse/scrub equality;
- zero-duration steps;
- presentation-clock selection and mismatch rejection;
- Presentation State Store document/history separation;
- Runtime Scheduler phase integration;
- reduced-motion final-state behavior;
- 10,000 deterministic evaluations;
- canonical project serialization round trip.

## 21. Example Gallery

Step 11 requires `examples/animation/move-scale-rotate`.

The example must:

- create one representation target;
- animate translation, rotation and scale on the presentation clock;
- sample deterministic frames at known coordinates;
- scrub backward and forward;
- prove equal-time equality;
- include metadata, README, executable run module, expected JSON, accessible SVG preview and automated test;
- record pending `example.physica`, PNG, WebM and shared gallery-runtime artifacts until those systems exist.

Draw/write/reveal, morph, matched transform, camera and text examples remain later-phase obligations.

## 22. Desktop observation

The live desktop workbench advances to “11 / Animation Scheduler”.

It visibly demonstrates:

- an object moving, rotating and scaling on a deterministic stage;
- presentation-clock time;
- play/pause, reverse, restart and scrub;
- easing and active-channel diagnostics;
- reduced-motion resolution;
- the statement that presentation transforms never mutate physics.

The existing Library remains accessible as supporting context, but Step 11 must not become a full editor/timeline redesign.

`Launch Physica.bat` remains the one-click development launcher. No executable or installer packaging is added.

## 23. Definition of Done

Step 11 is complete when:

- the animation contracts and implementation are public from `@physica/storyboard`;
- persistence uses existing Storyboard envelopes without a root schema change;
- animation evaluates only from the presentation-clock coordinate;
- easing, composition, conflicts, reverse and scrub are deterministic;
- authoritative physics/document state remains unchanged during playback;
- the Runtime Scheduler presentation-animation phase adapter is tested;
- reduced-motion behavior is accessible and deterministic;
- `move-scale-rotate` has all currently possible gallery artifacts;
- the desktop launcher exposes the visible proof;
- targeted and complete repository checks pass;
- `docs/CURRENT_STATE.md` records the result and next unfinished phase.

## 24. Non-claims

Completion of Step 11 must not be described as a full Storyboard, advanced timeline, text animation system, morph engine, camera animation system, physics rewind facility, equation/graph animator, audio engine, export pipeline or complete teacher editor.
