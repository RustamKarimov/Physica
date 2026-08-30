# Step 12 — Draw, Write, Reveal and Highlight Implementation Specification

**Status:** IMPLEMENTATION-READY

**Owning roadmap item:** Phase 3, Step 3.2 — Draw/write/reveal/highlight

**Primary owners:** `@physica/storyboard`, `@physica/renderer-svg`, `@physica/typography`

## 1. Purpose and audit result

Step 12 adds deterministic presentation-clock effects for drawing scientific paths, revealing content through masks or opacity, writing labels without corrupting Unicode text, and emphasizing diagram elements. These effects explain existing physical or semantic content but never alter authoritative physics or document state.

The source audit found no Architecture Blocker, root ProjectDocument schema change, new package or third-party dependency requirement.

## 2. Ownership

- `@physica/storyboard` owns portable reveal definitions, serialization, deterministic scheduling/evaluation and transient reveal frames.
- `@physica/renderer-svg` owns SVG path metrics, progressive path geometry and mask-ready SVG plans.
- `@physica/typography` owns locale-aware text segmentation and prefix selection without React/editor dependencies.
- renderer-core remains renderer-neutral; the existing Runtime Scheduler and presentation clock remain the only orchestration/time authorities.

## 3. Scope

Step 12 implements V1 Storyboard reveal envelopes; stable scheduling with same-channel overlap rejection; path-draw, mask, opacity, label-write and emphasis operations; arbitrary-time evaluation with easing, reverse/scrub equality, zero duration and reduced motion; transient reveal state and Runtime Scheduler integration; line/polyline path length and prefix slicing; mask/stroke-dash SVG plans; grapheme-safe label prefixes; emphasis style resolution; three mandatory examples; and launcher-visible desktop proof.

It does not implement path normalization, morphs, matched transforms, camera animation, full TextBlock layout, semantic equations, handwriting synthesis, raster mask authoring, a timeline editor, video export or physical-state animation.

## 4. Reveal definition and persistence

A definition targets one Representation in one Scene and contains stable StoryboardStep identity, `clockKey: "presentation"`, finite non-negative timing, deterministic easing, priority, reversible/scrubbable flags, an operation and optional JSON-safe metadata.

Operations are closed data:

- `draw-path` — progress 0..1 and direction `forward` or `reverse`;
- `mask` — progress 0..1, axis `horizontal|vertical`, edge `start|end` and non-negative feather;
- `opacity` — authored start/end values in [0, 1];
- `write-label` — progress 0..1; text remains owned by target content;
- `emphasis` — mode `highlight|dim|isolate`, intensity 0..1 and optional valid RGBA accent.

Definitions use the existing generic Storyboard envelope with type ID `physica:storyboard/reveal-v1` and schema version 1. Compiled schedules and reveal frames are runtime-only. Canonical ProjectDocument round trips preserve unknown steps/extensions without a root schema bump.

## 5. Scheduling, evaluation and transient state

Compilation is deeply immutable and sorted by start time, priority and StoryboardStep ID. The conflict key is Scene + Representation + operation channel. Overlap on one key is rejected; different channels may run in parallel. `isolate` never implicitly mutates siblings—authors add explicit sibling dim effects.

Evaluation accepts one explicit finite presentation time and has no timer. Normalized progress is clamped, passed through existing deterministic easing and converted to immutable channel state. Definitions do not produce state before start. Zero-duration and reduced-motion evaluation resolve final state. Equal coordinates produce deep-equal frames in forward, reverse and repeated scrub order.

Target state is sorted by Scene/Representation and carries channel value plus source StoryboardStep ID. It never enters ProjectDocument, command history, physics Runtime State Store or Representation definitions.

The Runtime Scheduler adapter runs in the existing presentation-animation phase, reads the already-advanced presentation clock and writes one transient reveal frame using a scene-specific task ID distinct from Step 11.

## 6. SVG paths and masks

`@physica/renderer-svg` exposes dependency-free projected 2D path helpers that:

- require at least two finite points and non-zero total length;
- compute Euclidean segment and total length;
- slice at normalized progress with exact interpolated cut points;
- support forward/reverse without mutating input;
- return exact empty/full states at 0/1;
- build deterministic stroke-dash plans.

An arrow head is visible only at completed progress, never floating ahead of its shaft. No curve resampling or morph-compatible normalization is introduced.

Mask resolution derives a deterministic clipping rectangle from finite target bounds, progress, axis, edge and feather. Opacity remains a final presentation multiplier. Neither changes picking identity, persisted visibility or physics.

## 7. Unicode-safe label writing

`@physica/typography` provides typed locale-aware grapheme segmentation and written-prefix selection using `Intl.Segmenter`. It never slices UTF-16 code units, combining sequences, emoji ZWJ sequences or script grapheme clusters.

Invalid locales or unavailable segmentation return typed errors. Prefix count is `floor(progress * graphemeCount)`, except progress 1 returns the exact source string. Empty text is valid. Logical storage order is preserved for RTL scripts; visual bidi layout remains the later TextBlock system's responsibility. The full text remains available to accessibility APIs while only the visual prefix is clipped.

## 8. Emphasis

`highlight` resolves bounded accent intensity, `dim` resolves a bounded opacity multiplier, and `isolate` marks focus while sibling dimming stays explicit. Resolution never changes z-order, picking, physics or relationships. Essential meaning must also be conveyed textually rather than by color alone.

## 9. Validation, determinism and performance

Public authored-data operations return typed stable results for malformed envelopes/targets, non-finite timing/easing, duplicates/overlaps, out-of-range fields, invalid mask/emphasis options, invalid paths/locales and non-finite evaluation time.

Schedules/frames are frozen, shuffled input produces stable output, path slicing is linear in point count, and 10,000 arbitrary-time evaluations do not drift. No wall clock, renderer animation loop or callback-order authority is allowed.

## 10. Tests and examples

Tests cover envelope round trip and unknown preservation; malformed operations; conflicts/order; exact 0/0.5/1, reverse/scrub, zero duration and reduced motion; scheduler/state separation; 10,000 evaluations; 3-4-5 and multisegment/reverse paths; arrow-head completion; mask directions; opacity/emphasis bounds; combining marks, emoji ZWJ and RTL prefixes; and source immutability.

Required examples:

- `examples/animation/draw-vector`;
- `examples/animation/write-label`;
- `examples/animation/highlight-diagram`.

Each ships metadata, README, executable deterministic output, expected JSON, accessible expected SVG, automated test and truthful pending `.physica`/PNG/WebM/shared-runtime obligations.

The desktop advances to “12 / Draw · Write · Reveal”, shows all three effects on the shared presentation controls, preserves accessible full text and remains available through `Launch Physica.bat`.

## 11. Definition of Done

Step 12 is complete when public owning-package contracts, persistence, deterministic evaluation, Unicode safety, scheduler/document/physics separation, three examples and desktop proof all pass targeted tests, complete repository CI, app builds and launcher check; HC-00 completes under `docs/PROJECT_HEALTH_CHECKPOINTS.md`; CURRENT_STATE records results and identifies Step 13 next.

Completion is not a morph engine, matched-transform system, camera animator, full TextBlock engine, equation animator, timeline, raster-mask editor or export pipeline.
