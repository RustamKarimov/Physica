# Step 13 — Morph and Matched Transform Implementation Specification

**Status:** IMPLEMENTATION-READY

**Owning roadmap item:** Phase 3, Step 3.3 — Morph and matched transform

**Primary owners:** `@physica/storyboard`, `@physica/renderer-svg`

## 1. Purpose and source audit

Step 13 adds deterministic presentation-clock shape morphs and stable-ID matched transforms. Compatible SVG paths are converted to canonical, equal-cardinality samples and interpolated. Objects that cannot be morphed truthfully use an explicit semantic replacement/cross-fade rather than fabricated geometry.

The design was audited against the Project Constitution, approved ADRs, package dependencies, Animation Engine, Storyboard, Renderer Architecture, Steps 11–12 and the Example Gallery contract. It requires no Architecture Blocker, ADR, root `ProjectDocument` schema change, workspace package, third-party dependency or physical-state channel.

## 2. Scope and ownership

`@physica/storyboard` owns portable morph definitions, V1 Storyboard envelopes, definition validation, deterministic scheduling/evaluation, stable semantic-ID correspondence planning, transient frames and Runtime Scheduler integration.

`@physica/renderer-svg` owns finite path validation, arc-length resampling, closed-path winding/start alignment, point interpolation and explicit morph-versus-replacement SVG plans.

Step 13 includes:

- one serializable source-to-destination transition contract;
- `shape-morph` and `matched-transform` operations;
- ID-based matching for semantic element sets;
- immutable schedules and arbitrary-time evaluation;
- same-target conflict rejection;
- reduced-motion final resolution;
- canonical SVG path normalization and interpolation;
- explicit replacement plans for incompatible path kinds;
- scheduler/document/physics separation;
- the `examples/animation/circle-to-ellipse` example;
- a launcher-visible Step 13 proof.

Step 13 does not implement camera animation, equation-tree equivalence, glyph matching, TextBlock matched replacement, arbitrary Bézier command parsing, topology-changing mesh morphs, raster morphs, automatic object recognition, physics transitions, a timeline editor or export capture.

## 3. Persisted definition

Morph transitions use the existing `StoryboardStepEnvelope` with type ID `physica:storyboard/morph-v1` and schema version 1.

`MorphDefinition` contains:

- stable Storyboard step `id` and non-empty `name`;
- `source` and `destination` Representation references in the same Scene;
- mandatory `clockKey: "presentation"`;
- finite non-negative start/duration, deterministic easing, safe-integer priority, reversible/scrubbable flags;
- an operation;
- optional JSON-safe metadata.

Operations are closed JSON data:

- `shape-morph` — declares whether paths are `open` or `closed` and a finite integer `sampleCount` in `[2, 4096]` for open paths or `[3, 4096]` for closed paths;
- `matched-transform` — carries a non-empty stable `semanticId`, declarative source/destination compatibility keys and an explicit `strategy` of `morph` or `replace`.

A compatibility key is metadata such as a registered representation/path class. It is not executable plugin code. A matched pair may use `morph` only when its source and destination compatibility keys are equal; otherwise its strategy is `replace`.

Definitions use public create, parse and validate operations. Unknown Storyboard steps and extension data remain preserved by canonical ProjectDocument serialization. Compiled schedules, match plans, normalized points and evaluated frames are runtime-only.

## 4. Semantic matched-transform planning

`createMatchedTransformPlan(sourceElements, destinationElements)` accepts immutable element descriptors containing:

- a non-empty `semanticId` used as the sole correspondence identity;
- a Representation target;
- a non-empty `compatibilityKey`.

Duplicate semantic IDs on either side are rejected because correspondence would be ambiguous. Inputs are never paired by array position, label text, geometry proximity or renderer handle.

The plan is sorted lexically by semantic ID and partitions elements into:

- matched pairs, with strategy `morph` when compatibility keys are equal and `replace` otherwise;
- source-only exits;
- destination-only entries.

Source-only and destination-only items are explicit replacement/fade participants. The planner does not mutate documents, infer physics meaning or claim equation equivalence. Later equation transforms will supply semantic equation-node IDs under ADR-015.

## 5. Scheduling, evaluation and transient authority

Compilation validates every definition, rejects duplicate transition IDs, sorts by start time, priority and Storyboard step ID, and rejects temporal overlap when any source or destination Representation participates in both transitions. This prevents two transitions from claiming one visible presentation channel.

Evaluation is a pure function of an explicit finite presentation time. Normalized progress is clamped, passed through the existing deterministic easing implementation and returned with:

- source/destination identities;
- operation kind and semantic diagnostics;
- progress in `[0, 1]`;
- `sourceOpacity = 1 - progress` and `destinationOpacity = progress` for replacement;
- a geometry-morph progress for compatible morph operations.

Definitions are absent before their start. Zero-duration and reduced-motion evaluation resolve immediately to the readable destination state. Forward, reverse and repeated scrubbing at equal coordinates produce deep-equal semantic frames. Schedules and frames are deeply frozen.

The Runtime Scheduler adapter runs in the existing `presentationAnimation` phase, reads the already-advanced presentation clock and publishes one scene-specific transient `MorphStateStore` snapshot. It has a stable task ID distinct from the Step 11 animation and Step 12 reveal tasks. It emits no command, changes no `ProjectDocument`, writes no physical Runtime State Store channel and never advances a clock.

## 6. Canonical SVG path normalization

An SVG morph geometry is `{ points, closed }`, where points are projected finite `Vec2` values. A valid open path has at least two distinct points and non-zero arc length. A valid closed path has at least three non-collinear points and non-zero perimeter. A repeated closing endpoint is normalized away.

Compatible geometries must have the same open/closed topology. Path normalization:

1. validates both geometries and the requested sample count;
2. computes cumulative Euclidean arc length;
3. samples both paths at identical normalized arc-length coordinates;
4. preserves source-to-destination endpoint direction for open paths;
5. normalizes closed-path winding to match the source;
6. chooses the closed destination cyclic offset with the least total squared point distance, breaking exact ties by the lowest offset;
7. returns immutable, equal-cardinality samples.

Closed sampling uses `i / sampleCount` for `i = 0..sampleCount-1`. Open sampling includes both endpoints using `i / (sampleCount-1)`. Interpolation is component-wise linear and exact at progress 0 and 1.

Open-to-closed or closed-to-open inputs are structurally valid but morph-incompatible. `createSvgMorphPlan` returns `kind: "replace"` with deterministic source/destination opacities instead of an error. Invalid/degenerate/non-finite geometry remains a typed error. This distinction prevents malformed content from being presented as a legitimate semantic replacement.

Path normalization is renderer presentation work only. It neither changes renderer/picking identity nor writes points back to Representation or physics state.

## 7. Validation and errors

Public Storyboard operations return `MorphResult<T>` with stable error kinds for invalid definition, target, operation, time, easing, duplicate transition, target conflict, duplicate semantic ID, presentation-clock missing/mismatch and schedule evaluation failure.

Public SVG operations return `SvgMorphResult<T>` with stable error kinds for invalid geometry, invalid sample count and invalid progress. Morph incompatibility is a successful replacement plan, not an exception.

Teacher-authored invalid data follows typed result paths. Throws are limited to built-in setup boundaries after validated constants.

## 8. Determinism, performance, accessibility and plugins

No timer, wall clock, browser animation callback, random source or third-party geometry library is used. Schedule evaluation is linear in scheduled transitions. Semantic matching is deterministic after lexical sorting. Arc-length resampling is linear in source points plus sample count; closed-path alignment is quadratic in sample count and therefore capped at 4096. The foundation example and desktop use 64 samples.

Reduced-motion mode shows the final destination immediately. Source and destination names plus progress/strategy are available as text, so meaning is not conveyed only by motion or color. Controls remain keyboard accessible with visible focus behavior.

Future plugins may supply namespaced semantic IDs and compatibility keys as data. They cannot supply executable morph callbacks or renderer handles. Unknown persisted envelopes remain preserved.

## 9. Test matrix

Targeted tests cover:

- V1 envelope creation, parsing, JSON safety and canonical persistence;
- malformed targets, timing, operations, easing and metadata;
- duplicate IDs, overlapping source/destination claims and stable shuffled ordering;
- exact progress at start/middle/end, zero duration, reduced motion, reverse and repeated scrub;
- 10,000 deterministic evaluations and deep immutability;
- Runtime Scheduler phase placement and physics/document separation;
- matched, incompatible, entering and exiting semantic IDs;
- duplicate semantic-ID rejection and input-order independence;
- exact line resampling, repeated closing-point removal and source immutability;
- circle-to-ellipse normalization at 64 points;
- opposite winding and cyclic start alignment;
- exact endpoint interpolation;
- open/closed replacement fallback;
- degenerate/non-finite geometry and invalid sample/progress errors.

No scientific solver/reference case is required because the feature changes only presentation geometry. Tests explicitly prove that physical state remains unchanged.

## 10. Example Gallery and desktop proof

`examples/animation/circle-to-ellipse` contains metadata, README, executable deterministic samples, expected JSON, accessible SVG preview, automated test and truthful pending `example.physica`, PNG, WebM and shared-runtime capture obligations.

The example morphs a closed 64-sample circle into an ellipse, samples known presentation times, verifies equal-time determinism and demonstrates semantic replacement for an incompatible open path.

The desktop advances to “13 / Morph · Match”. It visibly shows circle-to-ellipse interpolation and a matched/incompatible replacement diagnostic using the existing play, reverse, scrub and reduced-motion controls. The stage states explicitly that morphing changes presentation geometry only. `Launch Physica.bat` remains the one-click development launcher; no installer or executable packaging is added.

## 11. Definition of Done and non-claims

Step 13 is complete when the public contracts are exported from the owning packages; serialization, matching, scheduling, normalization and runtime separation tests pass; the circle-to-ellipse example has all currently achievable artifacts; the desktop proof is visible; targeted suites, architecture lint, complete CI, app builds and launcher check pass; and `docs/CURRENT_STATE.md` records Step 13 complete with Step 14 camera animation next.

Completion is not a general vector graphics editor, equation morph engine, text replacement engine, 3D mesh morph system, camera animator, physical-state transition, Storyboard authoring UI or export pipeline. HC-01 remains scheduled after Step 14 rather than this step.
