# Step 14 — Camera Animation Implementation Specification

**Status:** IMPLEMENTATION-READY

**Owning roadmap item:** Phase 3, Step 3.4 — Camera animation

**Primary owners:** `@physica/storyboard`, `@physica/renderer-core`

## 1. Purpose and source audit

Step 14 adds deterministic presentation-clock camera pan, zoom, fit-object, follow-target and powers-of-ten zoom. Camera choreography changes how resolved scene state is viewed; it never changes physical coordinates, Representation layout, simulation state or any authoritative observable.

The design was audited against the Project Constitution, approved ADRs, package dependencies, Animation Engine, Storyboard, Renderer Architecture, Clocks and Time, Runtime Scheduler, Steps 11–13 and the Example Gallery contract. It requires no Architecture Blocker, ADR, root `ProjectDocument` schema change, new workspace package, external dependency, clock or scheduler phase.

One internal package edge is required: `@physica/storyboard` depends on the public `@physica/renderer-core` camera-operation types. The edge is acyclic (`renderer-core` has no Storyboard dependency), remains inside the frozen presentation/rendering tier and prevents duplicate camera contracts.

## 2. Ownership and scope

`@physica/storyboard` owns V1 camera Storyboard envelopes, validation, stable scheduling/conflict rejection, presentation-time evaluation, transient camera frames and Runtime Scheduler integration.

`@physica/renderer-core` owns portable camera-operation data, target snapshots, finite interpolation, pan/zoom math, fit calculations, follow resolution, powers-of-ten scaling and final `CameraDefinition` validation shared by SVG, Pixi and Three renderers.

Step 14 includes:

- scene-targeted camera animation envelopes;
- pan, zoom, fit-object, follow-target and powers-of-ten operations;
- independent pose and projection channels with explicit overlap rejection;
- arbitrary-time forward/reverse/scrub/reduced-motion evaluation;
- deterministic resolution against a base Camera and immutable subject snapshots;
- Runtime Scheduler presentation-phase integration;
- the `examples/animation/camera-follow` gallery example;
- a launcher-visible shared-camera proof;
- scheduled HC-01 after Step 14 verification.

Step 14 does not implement physical tracking forces, automatic cinematography, collision avoidance, camera shake, keyframe/timeline editing, scene transitions, astronomical logarithmic coordinate transforms, checkpoint rewind, renderer-specific cameras, audio synchronization or export capture.

## 3. Portable camera operations

`@physica/renderer-core` exports the JSON-safe `CameraPresentationOperation` union:

- `pan` — finite `startOffset` and `endOffset` world-space Vec3 values applied equally to Camera position and target;
- `zoom` — finite positive `startZoom` and `endZoom` factors;
- `fit-object` — a Representation ID plus finite padding ratio in `[0, 10]`;
- `follow-target` — a Representation ID, finite `cameraOffset` and finite `lookAtOffset`;
- `powers-of-ten-zoom` — finite exponents in `[-12, 12]`, resolved as `10^exponent`.

Operations declare owned channels:

- pan/follow own `pose`;
- zoom/powers-of-ten own `projection`;
- fit-object owns both `pose` and `projection`.

`CameraSubjectSnapshot` contains a Representation ID, finite world position and optional finite axis-aligned world bounds. It is a read-only resolved snapshot, not a second state store. Follow consumes position; fit consumes bounds. Missing or malformed required subject data returns a typed result.

## 4. Persisted Storyboard definition

Camera transitions use the existing `StoryboardStepEnvelope` with type ID `physica:storyboard/camera-v1` and schema version 1.

`CameraAnimationDefinition` contains stable Storyboard step ID, non-empty name, Scene target, mandatory `clockKey: "presentation"`, finite non-negative start/duration, deterministic easing, safe-integer priority, reversible/scrubbable flags, one camera operation and optional JSON-safe metadata.

Public create, parse and validate operations canonicalize and deeply freeze definitions. Unknown Storyboard steps and extension data survive canonical ProjectDocument round trips. Schedules, target snapshots, resolved cameras and transient frames are never serialized. No migration or ProjectDocument schema bump is required.

## 5. Scheduling and evaluation

Compilation validates definitions, rejects duplicate IDs, sorts by start time/priority/Storyboard step ID and rejects temporal overlap when operations claim any common channel. Pose and projection operations may run in parallel; fit cannot overlap either. Zero-duration operations at the same coordinate conflict when they share a channel.

Evaluation is pure from an explicit finite presentation time. Every started operation remains in the frame in stable schedule order: completed earlier operations resolve at progress 1, allowing later operations to build on their final Camera rather than jumping back to the original base Camera. The current operation uses clamped deterministic easing. Definitions before their start are absent.

Reduced motion resolves every started operation immediately at progress 1. Equal-time forward, reverse and repeated scrub evaluations are deeply equal. The engine has no timer and never advances a clock.

## 6. Camera resolution mathematics

`resolveCameraPresentation(baseCamera, evaluatedOperations, subjectSnapshots)` applies evaluated operations in stable schedule order and validates the Camera after every step.

Pan linearly interpolates the authored offset and translates Camera position and target equally, preserving orientation and distance.

Zoom linearly interpolates a positive scale. Orthographic zoom divides `verticalSpan` by the scale. Perspective zoom uses `2 atan(tan(fov/2) / scale)`, preserving a valid optical field of view. Powers-of-ten zoom uses the same resolver with `scale = 10^(interpolated exponent)`.

Fit-object validates the target AABB, computes its eight corners, projects half extents onto the current Camera right/up/forward basis and preserves view orientation. Orthographic fit centers the target and selects the smallest padded vertical span that fits both horizontal and vertical extents. Perspective fit centers the target and chooses a view-axis distance sufficient for horizontal, vertical and depth extents under the existing field of view. Degenerate planar bounds, invalid clipping or non-finite results are rejected.

Follow-target computes a desired Camera from the current target snapshot plus authored Camera/look-at offsets and interpolates from the incoming Camera by operation progress. At progress 1, later target snapshots move the Camera deterministically. No DOM bounds, renderer handles, wall-clock samples or inferred velocity are used.

All operations preserve projection kind, viewport, clipping planes, device pixel ratio, up vector and optional presentation transform unless the operation explicitly changes pose/projection. Resolution returns a new deeply immutable Camera and never mutates its inputs.

## 7. Runtime authority and renderer integration

The Storyboard adapter runs in the existing Runtime Scheduler `presentationAnimation` phase, reads the already-advanced presentation clock and publishes one scene-specific transient `CameraAnimationStateStore` snapshot. Its task ID is distinct from transform, reveal and morph tasks.

The transient frame contains evaluated operations and diagnostics, not renderer handles. Representation resolution supplies subject snapshots later; all SVG/Pixi/Three adapters receive the same final shared Camera through ordinary `RenderFrame` construction. Camera animation performs no ProjectDocument command, Runtime State Store write, physics mutation, relationship write or clock advance.

## 8. Validation, errors and extensibility

Storyboard operations return `CameraAnimationResult<T>` with stable kinds for invalid definition, target, operation, timing/easing, duplicate transition, channel conflict, clock missing/mismatch and schedule evaluation failure.

Renderer operations return `RenderResult<T>` using existing camera/viewport/transform errors plus typed invalid camera-animation, missing camera subject and invalid fit-bounds errors.

Plugins may author declarative namespaced targets and ordinary camera envelopes but cannot execute camera callbacks or introduce renderer-owned state. Future operation kinds require versioned registry/contracts; unknown envelopes remain preserved.

## 9. Performance and accessibility

Schedule evaluation is linear in started operations. Resolution is linear in evaluated operations plus target lookup; fit uses exactly eight AABB corners. No worker is required. At least 10,000 arbitrary evaluations must remain drift-free and immutable.

Reduced-motion mode resolves to the final readable view. The desktop proof exposes play/pause, reverse, reset, scrub and reduced-motion controls; reports Camera target/zoom/follow state textually; and conveys no essential meaning only through motion.

## 10. Test matrix

Tests cover:

- envelope validation, JSON safety and canonical persistence;
- all operation kinds and malformed fields;
- duplicate IDs, channel conflicts, parallel pose/projection and shuffled ordering;
- exact start/middle/end, zero-duration, reduced motion, reverse and repeated scrub;
- sequential accumulation and 10,000 deterministic evaluations;
- Runtime Scheduler phase placement and physics/document separation;
- pan orientation/distance preservation;
- exact orthographic zoom and reference perspective zoom;
- powers-of-ten zoom at known exponents;
- orthographic and perspective fit with aspect/padding;
- follow-target at multiple deterministic subject snapshots;
- missing subjects, invalid/degenerate bounds and source immutability;
- one Camera applied identically through SVG/Pixi/Three planning where applicable.

No physical reference model is required because Camera animation is presentation-only. Tests explicitly prove physical world points and Runtime State Store snapshots remain unchanged.

## 11. Example and desktop proof

`examples/animation/camera-follow` contains metadata, README, executable deterministic samples, expected JSON, accessible SVG preview, automated test and truthful pending `.physica`, PNG, WebM and shared-runtime obligations.

The example follows one moving Representation at known presentation times, verifies equal-time determinism, demonstrates orthographic zoom and records the unchanged world trajectory.

The desktop advances to “14 / Camera Animation”. It renders a small scene through a dynamically resolved shared orthographic Camera, visibly combines pan/zoom/follow, exposes Camera diagnostics and states that Camera motion changes only the view. `Launch Physica.bat` remains the one-click development launcher; no installer/executable packaging is added.

## 12. Definition of Done and HC-01 boundary

Step 14 is complete when public Storyboard and renderer-core contracts pass validation, persistence, scheduling, camera-math, runtime-separation and shared-renderer tests; the camera-follow example has all currently achievable artifacts; the desktop proof builds and launches; targeted suites, architecture lint, complete CI, frozen install and launcher check pass; and `CURRENT_STATE` records the result.

Immediately after Step 14, run scheduled HC-01 under `docs/PROJECT_HEALTH_CHECKPOINTS.md`. Publish `docs/health-checkpoints/HC_01_ANIMATION_PREVIEW.md`, correct in-scope regressions/debt, update `CURRENT_STATE`, commit/push the verified checkpoint and identify Phase 4 Step 4.1 next. Do not enter Phase 4 in this task.

Completion is not a cinematic editor, scene-transition system, equation/graph engine, text engine, physical tracking controller, logarithmic-world implementation or export pipeline.
