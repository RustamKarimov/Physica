# Physica — Current State

**Architecture status:** FROZEN for initial implementation

**Execution mode:** AUTONOMOUS PROJECT EXECUTION ACTIVE

**Mandatory governance:** Every future session must read `docs/AUTONOMOUS_EXECUTION_PROTOCOL.md` before continuing project work.

**Current development phase:** Phase 4 active — Step 4.3 complete

**Current task:** Specify Phase 4 Step 4.4 Graph analysis and overlays

**Next task:** Implement Phase 4 Step 4.4 Graph analysis and overlays after specification review, then execute scheduled HC-02 before entering Phase 5

**Blockers:** None

## Autonomous execution status

Autonomous execution toward the Physica 1.0 Release Candidate is active under `docs/AUTONOMOUS_EXECUTION_PROTOCOL.md`. The protocol is a permanent project governance document and must be read together with `AGENTS.md` and this operational state at the start of every future work session. Ordinary verified phases continue without user confirmation; progression stops only under the protocol's Architecture Blocker conditions or at the Physica 1.0 Release Candidate boundary.

**User observation requirement:** Keep `Launch Physica.bat` working as the one-click Windows development launcher. As soon as a phase produces meaningful visible UI, expose it through this live Tauri development app so the user can observe progress. Do not add installer/executable packaging merely for progress observation.

**Project health governance:** docs/PROJECT_HEALTH_CHECKPOINTS.md is active. HC-00 and HC-01 passed after repairs and are recorded under docs/health-checkpoints/. HC-02 is scheduled after Phase 4 Step 4.4, with early-trigger conditions remaining active.

## Step 17 result

Completed and audited `docs/implementation/STEP_17_GRAPH_ENGINE_SPEC.md`, then implemented the Phase 4 Step 4.3 graph release gate without an ADR, root `ProjectDocument` schema change, new workspace package, third-party dependency, solver, uncontrolled frame loop or authoritative physics writer.

Implemented in `@physica/data`:

- immutable V1 Cartesian datasets stored through the existing generic `DatasetDefinition` resource as `physica:data/cartesian-v1`, with named series, ordered finite canonical samples, explicit x/y units, locally stable keys, metadata and imported/simulated/measured/derived provenance;
- typed validation and parsing for IDs, unit expressions, duplicate keys, non-finite/unordered samples, provenance and unsupported/malformed envelopes, with canonical JSON round trips and deeply frozen success values;
- a pure fixed-interval acquisition primitive bound to an explicit `ClockId`, `ObservableId`, target series, start time and interval. It samples exact schedule times independent of caller/render window size, rejects backward/non-finite/over-limit windows and never samples on display refresh.

Implemented in `@physica/graphs`:

- immutable V1 Cartesian graph configurations stored through the existing Scene `GraphDefinition` envelope as `physica:graph/cartesian-v1`;
- linear and base-10 logarithmic axes, auto/manual domains, deterministic nice ticks, unit/dimension compatibility, non-colour curve styling, markers, data-anchored text annotations and nearest/interpolated cursors;
- renderer-neutral resolution with explicit `graph-data` source coordinates, `screen-layout` vertices/anchors, y inversion, a mandatory plot-rectangle clip contract, canonical-to-display unit conversion, accessibility summaries and complete dataset preservation across viewport changes;
- typed contextual errors for missing datasets/series, incompatible units, invalid log domains and invalid markers. Successful graphs and plans remain deeply frozen.

User-visible completion:

- `examples/graphs/graph-basic` and `examples/graphs/graph-live-cursor` each contain metadata, README, executable deterministic output, exact expected JSON, accessible expected SVG preview, automated tests and truthful pending `.physica`/PNG/WebM/shared-runtime obligations;
- `graph-basic` proves two unit-compatible measured/model curves with solid/dashed coding, deterministic axes/ticks, an observation marker, annotation and dataset/graph persistence;
- `graph-live-cursor` proves coarse/fine acquisition-window equality over 11 fixed-clock samples and presentation-only interpolation at arbitrary cursor times without resampling or mutating data;
- the launcher-visible desktop now opens at “17 / Graph Engine” with real resolved SVG axes, curves, legend, markers, annotations, an explicit plot clip, live cursor slider/play control and readouts. The corrected Step 16 equation transform, Step 15 equation editor and all earlier Camera/Library proofs remain below it.

Verification:

- focused data/graph/example/desktop gate — 5 files and 17 tests passed, with affected-package TypeScript checks passing;
- complete repository CI — formatting, ESLint, architecture boundaries, strict TypeScript across 93 of 94 workspace projects, 64 unit/example files with 267 tests, 1 architecture file with 2 tests and all three application builds passed;
- frozen offline install passed across all 94 workspace projects;
- `Launch Physica.bat --check` passed with Tauri CLI 2.11.4, Cargo 1.94.1 and the desktop production build;
- checked-in accessible SVG previews, desktop fixture smoke tests and the production/launcher gates passed. Automated live Windows capture is not counted because the previously recorded local sandbox refresh-helper limitation remains; the one-click launcher remains available for user observation;
- the non-failing desktop bundle warning is approximately 4.920 MB / 1.366 MB gzip. Existing desktop code-splitting debt remains owned by the desktop app, is mandatory review scope at HC-02 and must be resolved with the stable shell no later than HC-04;
- Step 17's largest behavior-bearing files are 439 lines for dataset validation/persistence, 369 lines for the graph workbench and 327 lines for graph resolution. The 503-line workbench stylesheet is declarative/responsive styling; HC-02 must recheck whether Step 4.4 integration causes any of these files to cross the concentrated-file early-trigger threshold.

Self-review found no Architecture Blocker or new Project Health early trigger. The scheduled HC-02 boundary remains immediately after Step 4.4 and before Phase 5; it will re-audit every Phase 4 release gate, including the corrected equation-transition evidence, graph contracts, integration regressions, accumulated files and desktop bundle ownership. Phase 4 Step 4.4 Graph analysis and overlays is next; do not implement variable binding, formula animation, data export or later graph types early.

## Step 16 result

Completed and audited `docs/implementation/STEP_16_EQUATION_TRANSFORM_ENGINE_SPEC.md`, then implemented the Phase 4 Step 4.2 release gate without an ADR, root `ProjectDocument` schema change, new third-party dependency, clock, solver, scheduler task or authoritative runtime writer.

Implemented in `@physica/equations`:

- immutable V1 equation transforms stored through the existing extensible `EquationDefinition` list as `physica:equation/transform-v1`, with complete source/target semantic snapshots, correspondence, frozen validity status, verification method/explanation and JSON-safe metadata;
- deterministic semantic matching in the frozen priority order: persistent ID, symbolic atom, structural role, canonical-expression fingerprint, optional glyph fallback and explicit enter/exit, with every endpoint consumed at most once;
- validated teacher overrides that take presentation precedence but cannot alter mathematical validity;
- conservative Compute Engine verification for simplified expression equality, equation residual equality and explicit symbol substitution, assigning only the four frozen statuses and leaving every unestablished case visibly `UNVERIFIED_PRESENTATION`;
- parse-time recomputation of symbolic verification, so a forged or stale persisted verification status/method is rejected;
- renderer-neutral FLIP plans over validated semantic fragment layout boxes, with deterministic smoothstep scrubbing, matched inverse translation/scale, explicit exit/entry opacity, exact endpoints and reduced-motion final-state resolution;
- typed errors for malformed transforms, correspondence, verification/substitution, persisted envelopes, fragment layouts and progress; successful inputs, transforms, plans and frames remain immutable.

Release-gate correction:

- the initial cancellation fixture used `(2x+2x)/2`, but the pinned canonicalizer correctly collapsed it to `2x` before motion planning, leaving no honest fragment to exit;
- the completed `cancel-and-simplify` example therefore uses `x+(y-y) → x`, whose canonical source retains the cancelling pair and whose simplified target is safely verified; no decorative or glyph-only cancellation was fabricated.
- subsequent user visual review correctly identified that the launcher proof still rendered selected semantic atoms as uniform cards at index-derived placeholder coordinates. That was a presentation acceptance failure: the engine contract was sound, but its desktop release-gate evidence was not presentation-grade. Step 4.2 was reopened and corrected before graphing began;
- the corrected proof renders explicit KaTeX term partitions, groups compound substitution where atom-by-atom motion would imply a false derivation, measures each displayed fragment with `getBoundingClientRect()` in the actual stage, and feeds only those measured boxes to the renderer-neutral motion engine. Progress 0 reconstructs the complete source and progress 1 the complete target;
- a new smoke test executes all three desktop demo definitions, validates semantic endpoints and correspondence invariants, and proves the visual fragments reconstruct the exact source/target LaTeX without missing or duplicate nodes. The Step 16 specification now explicitly rejects fabricated/index-derived geometry and incomplete endpoint partitions;
- the former 538-line workbench was split into a 424-line measured presentation component and a 310-line deterministic demo-definition module. This resolves the immediate concentrated-file review signal without changing package ownership or public contracts.

User-visible completion:

- `examples/equations/v-u-at-rearrangement`, `examples/equations/substitution` and `examples/equations/cancel-and-simplify` each contain metadata, README, executable deterministic output, expected JSON, accessible presentation-grade SVG preview, automated tests and truthful pending `.physica`/PNG/WebM/shared-runtime obligations;
- the launcher-visible desktop now opens at “16 / Equation Transform” with selectable rearrange/substitute/cancel proofs, verified status, semantic correspondence provenance, measured KaTeX term motion, explicit enter/exit frames, replay/play/scrub/reduced-motion controls and a visible teacher-override case;
- the live Step 15 MathLive/semantic-tree/KaTeX editor and all earlier Camera/Library proofs remain directly below it.

Verification:

- focused equation engine plus three gallery examples — 5 files and 21 tests passed;
- post-correction complete checks — formatting/diff hygiene, ESLint, architecture boundaries, strict TypeScript across 91 of 92 workspace projects, 59 unit/example files with 250 tests, 1 architecture file with 2 tests and all three application builds passed;
- frozen offline install passed across all 92 workspace projects;
- `Launch Physica.bat --check` passed with Tauri CLI 2.11.4, Cargo 1.94.1 and the desktop production build;
- the real Tauri development app starts and `Launch Physica.bat --check` passes, but both in-app browser and Windows screenshot automation exit at the local Windows sandbox refresh helper before capture. This is not counted as an automated live visual pass. The executed fragment reconstruction gate, production build, launcher check and all three checked-in accessible SVG previews/tests passed; user observation through the launcher remains available;
- the non-failing desktop bundle warning is approximately 4.881 MB / 1.355 MB gzip. The existing desktop lazy-loading debt remains owned by the desktop app, is re-evaluated at HC-02 and must be resolved with the stable shell no later than HC-04;
- the split measured-motion component remains 424 lines and is reviewable; HC-02 should still inspect whether later formula-animation integration warrants extracting the measurement/render hook.

User feedback activated the Project Health release-gate early trigger and reopened Step 4.2. The finding is now fixed and reverified with no Architecture Blocker, package-boundary change, scientific-authority change or remaining regression. HC-02 remains at the already-governed Phase 4 Step 4.4 boundary, before the next phase, where this repair will be re-audited with equation/graph integration. Phase 4 Step 4.3 Graph engine is next; do not implement variable binding or formula animation early.

## Step 15 result

Completed and audited `docs/implementation/STEP_15_MATH_EDITOR_SEMANTIC_EQUATION_TREE_SPEC.md`, then implemented editable semantic equations without an ADR, root `ProjectDocument` schema change, new workspace package, clock, solver, scheduler task or authoritative runtime writer.

Implemented in `@physica/equations`:

- immutable V1 equation models with exact LaTeX source, pinned canonicalizer stamp, canonical MathJSON, diagnostics, metadata and UUID-v4 semantic node identities;
- editor-independent Compute Engine parsing and canonicalization, with invalid edits returning typed errors and leaving the prior model untouched;
- JSON-safe atom/list/record identity trees that mirror canonical MathJSON exactly;
- structural reconciliation that retains each unchanged semantic subtree identity once across whitespace changes, ancestor edits and subtree movement while assigning new IDs to new semantics;
- runtime validation for owning equation IDs, semantic IDs, duplicate IDs, fingerprints, record ordering, tree/canonical mismatch, diagnostics, metadata and unsupported envelope versions;
- conversion through the existing generic `physica:equation/model-v1` `EquationDefinition` envelope, including exact canonical ProjectDocument serialization round trips;
- deterministic KaTeX HTML plus MathML output with trust disabled, strict errors and bounded expansion/size.

Dependency and security decisions:

- pinned `@cortex-js/compute-engine` 0.120.0 (MIT) for canonical MathJSON;
- pinned `mathlive` 0.110.0 (MIT) for desktop input; versions through 0.109.2 are forbidden because CVE-2026-54705 is fixed in 0.110.0;
- pinned `katex` 0.18.4 (MIT) for final rendering;
- MathLive and all DOM/React behavior remain desktop-owned; `@physica/equations` has no editor dependency and rendered glyphs never own identity.

User-visible completion:

- `examples/equations/edit-and-render` contains metadata, README, executable deterministic edit/persistence/render output, expected JSON, accessible SVG preview, automated tests and truthful pending `.physica`/PNG/WebM/shared-runtime obligations;
- the launcher-visible desktop now opens with a real MathLive equation workbench, last-valid-model protection, canonical MathJSON, semantic ID/retention diagnostics and KaTeX final rendering;
- the completed Camera animation and object Library showcase remains available directly below the new workbench, preventing a Step 14 regression.

Verification:

- focused equations plus gallery run — 2 files and 10 tests passed;
- complete repository CI — formatting, ESLint, architecture boundaries, strict TypeScript across 88 of 89 workspace projects, 54 unit/example files with 235 tests, 1 architecture file with 2 tests and all three application builds passed;
- frozen offline install passed across all 89 workspace projects;
- `Launch Physica.bat --check` passed with Tauri CLI 2.11.4, Cargo 1.94.1 and the desktop production build;
- in-app browser visual automation could not start because the local Windows sandbox refresh helper exited before browser discovery; targeted desktop typecheck, production build, launcher check and the checked-in accessible SVG preview all passed;
- the non-failing desktop bundle warning is now approximately 4.858 MB / 1.349 MB gzip because the real MathLive/Compute Engine/KaTeX stack is combined with the previously eager Pixi/Three proof. The desktop app owns this bounded debt; re-evaluate at HC-02 and resolve with the stable-shell lazy-loading work no later than HC-04.

Self-review found no Architecture Blocker or Project Health early trigger. Phase 4 Step 4.2 Equation transform engine is next; do not implement graphing early.

## HC-01 result

Scheduled HC-01 passed after four in-scope corrections. See docs/health-checkpoints/HC_01_ANIMATION_PREVIEW.md for the completed-step evidence matrix, exact findings, architecture/scientific/teacher/accessibility review and bounded debt.

Corrections made:

- rejected negative Camera-animation start times with a typed timing error and regression assertion;
- added a cross-renderer integration test proving one resolved animated Camera projects the same world point through SVG, Pixi and Three while physical coordinates remain unchanged;
- split the new 544-line Camera renderer module into a 383-line resolver and 190-line contract/validation module without changing public exports;
- added reliable image semantics to the labeled desktop Camera preview.

Audit results:

- all 28 examples satisfy the currently achievable gallery contract and have matching root pending entries;
- 59 workspace application/package nodes have zero dependency cycles;
- 38 empty package shells remain intentional future nodes from the frozen package map;
- no stale desktop showcase reference, manifest mismatch, new third-party dependency, debt marker, reopened step or Architecture Blocker was found;
- frozen offline install, formatting, ESLint, architecture boundaries, strict TypeScript across 87 of 88 workspace projects, 52 unit/example files with 225 tests, 1 architecture file with 2 tests, all three app builds and launcher check passed.

Phase 3 is complete. The exact next task is Phase 4 Step 4.1 Math editor and semantic equation tree.

## Step 14 result

Completed and audited docs/implementation/STEP_14_CAMERA_ANIMATION_SPEC.md, then implemented deterministic presentation-clock Camera pan, zoom, fit-object, follow-target and powers-of-ten zoom without an ADR, root ProjectDocument schema change, new package or third-party dependency.

Implemented:

- @physica/renderer-core: portable immutable Camera operations and subject snapshots; pose/projection channel declarations; finite validation; exact orthographic and perspective zoom optics; eight-corner AABB fit; deterministic follow resolution; typed missing-subject and invalid-bounds errors; and per-operation Camera revalidation;
- @physica/storyboard: immutable V1 physica:storyboard/camera-v1 envelopes; Scene targeting; stable scheduling; pose/projection overlap rejection with legal parallel pan-or-follow plus zoom; arbitrary-time/reverse/scrub/reduced-motion evaluation; sequential accumulation of completed operations; transient CameraAnimationStateStore; and collision-free Runtime Scheduler presentation-phase integration;
- package boundary: one architecture-audited internal dependency from Storyboard to renderer-core's public Camera-operation contracts, with no cycle or editor/domain inversion;
- persistence and authority: Camera schedules, subject snapshots, evaluated operations and resolved Cameras remain transient; canonical ProjectDocument round trips preserve Camera and unknown Storyboard envelopes; Camera tasks write no physics Runtime State Store channel and advance no clock.

User-visible completion:

- examples/animation/camera-follow contains metadata, README, executable deterministic output, expected JSON, accessible SVG preview, automated test and truthful pending .physica/PNG/WebM/shared-runtime obligations;
- the live desktop workbench now shows “14 / Camera Animation” and renders a projectile through a dynamically resolved shared orthographic Camera with pan, zoom, follow, textual diagnostics and shared play/reverse/scrub/reduced-motion controls;
- the superseded, unreferenced Step 13 desktop-only morph showcase files were removed; Step 13 public APIs, package tests and gallery example remain intact.

Verification:

- focused renderer-core suite — 2 files and 14 tests passed;
- focused Storyboard suite — 4 files and 44 tests passed;
- Camera-follow gallery example — 1 file and 1 test passed;
- complete repository CI — formatting, ESLint, architecture boundaries, strict TypeScript across 87 of 88 workspace projects, 52 unit/example files with 224 tests, 1 architecture file with 2 tests and all three application builds passed;
- clean frozen-lockfile install passed across all 88 workspace projects;
- Launch Physica.bat --check passed with Tauri CLI 2.11.4, Cargo 1.94.1 and the desktop production build;
- the inherited non-failing combined Pixi/Three desktop chunk warning remains approximately 1.095 MB / 300 KB gzip and remains bounded to HC-04.

Self-review found no Architecture Blocker. Step 14 proceeded to the scheduled HC-01 audit, which passed above.

## Step 13 result

Completed and audited `docs/implementation/STEP_13_MORPH_MATCHED_TRANSFORM_SPEC.md`, then implemented deterministic presentation-clock morphing and stable-ID matched transforms without an ADR, root ProjectDocument schema change, new package or third-party dependency.

Implemented:

- `@physica/storyboard`: immutable V1 morph envelopes; same-Scene Representation endpoints; shape-morph and matched-transform operations; stable schedule ordering; shared-target overlap rejection; arbitrary-time/reverse/scrub/reduced-motion evaluation; transient `MorphStateStore`; collision-free Runtime Scheduler integration; and a semantic-ID match planner that classifies compatible matches, replacements, entries and exits without position/text/renderer inference;
- `@physica/renderer-svg`: finite open/closed path validation; repeated closing-point normalization; equal arc-length resampling; matching-winding and least-distance cyclic alignment for closed paths; exact endpoint/component interpolation; and a typed cross-fade replacement plan for structurally valid but topology-incompatible paths;
- persistence, runtime and scientific-authority boundaries: compiled schedules, normalized points and evaluated frames remain transient; canonical ProjectDocument round trips preserve V1 and unknown Storyboard envelopes; the presentation task writes no physics Runtime State Store channel and advances no clock.

User-visible completion:

- `examples/animation/circle-to-ellipse` contains metadata, README, executable deterministic output, expected JSON, accessible SVG preview, automated test and truthful pending `.physica`/PNG/WebM/shared-runtime obligations;
- the live desktop workbench now shows “13 / Morph · Match”, a 64-sample circle-to-ellipse transition, semantic morph/replacement diagnostics and shared play/reverse/scrub/reduced-motion controls;
- the superseded, unreferenced Step 12 desktop-only showcase files were removed; Step 12 public APIs, package tests and all three gallery examples remain intact.

Verification:

- focused Step 13 run — 3 files and 16 tests passed, including 10,000 arbitrary-time evaluations, envelope/persistence/runtime separation, stable matching, winding/start alignment, exact interpolation and topology fallback;
- complete repository CI — formatting, ESLint, architecture boundaries, strict TypeScript across 86 of 87 workspace projects, 49 unit/example files with 205 tests, 1 architecture file with 2 tests and all three application builds passed;
- clean frozen-lockfile install passed across 87 workspace projects;
- `Launch Physica.bat --check` passed with Tauri CLI 2.11.4, Cargo 1.94.1 and the desktop production build;
- the inherited non-failing combined Pixi/Three desktop chunk warning remains approximately 1.094 MB / 300 KB gzip and is still governed by HC-04 debt;
- attempted in-app browser visual inspection could not start because the browser-control runtime exited before page discovery; the local Vite server, strict desktop typecheck, production build and launcher check passed, and the checked-in accessible SVG preview remains the deterministic visual fixture.

Self-review found no Architecture Blocker or Project Health early trigger. At the Step 13 boundary, HC-01 remained scheduled; it passed after Step 14 as recorded above.

## Step 12 result

Completed and audited `docs/implementation/STEP_12_DRAW_WRITE_REVEAL_HIGHLIGHT_SPEC.md`, then implemented deterministic presentation-clock drawing, writing, reveal and emphasis without an ADR, root ProjectDocument schema change, new package or third-party dependency.

Implemented:

- `@physica/storyboard`: immutable V1 reveal envelopes, operation validation, stable scheduling/conflict rejection, arbitrary-time evaluation, reduced motion, transient reveal state and collision-free Runtime Scheduler integration;
- `@physica/renderer-svg`: finite path metrics, exact prefix slicing, forward/reverse stroke-dash plans, completion-only arrow heads, directional mask plans and bounded emphasis styles;
- `@physica/typography`: typed `Intl.Segmenter` grapheme segmentation and prefix writing that preserves combining sequences, emoji ZWJ sequences and RTL logical order;
- canonical persistence and runtime-separation tests, exact 3-4-5 path tests, all reveal operation families, reverse/scrub/zero-duration/reduced-motion coverage and 10,000 deterministic evaluations.

User-visible completion:

- `examples/animation/draw-vector`;
- `examples/animation/write-label`;
- `examples/animation/highlight-diagram`;
- the launcher-visible desktop workbench now shows “12 / Draw · Write · Reveal” and animates all three effects from the shared play/reverse/scrub/reduced-motion controls.

Focused verification passed: 6 files and 17 tests, strict typechecks for all owning packages/examples, architecture lint, desktop build and launcher check. Complete repository results are recorded with HC-00 below.

## HC-00 result

The first whole-project health checkpoint passed after repairs. See `docs/health-checkpoints/HC_00_RETROSPECTIVE_BASELINE.md` for the completed-step evidence matrix, exact findings and bounded debt.

Corrections made:

- standardized older executable examples from `example.json` to `metadata.json` and supplied all missing local pending-artifact manifests;
- upgraded the original Roadmap `hello-stage` placeholder into a real shared-renderer example with deterministic output and automated test;
- split the Step 12 desktop growth into typed Library, adapter, reveal and presentation-control components plus component-owned styles, reducing `App.tsx` from 616 to 453 lines and base `styles.css` from 934 to 616 lines.

Audit results:

- 26 of 26 examples satisfy the currently possible gallery artifact contract and have matching root pending entries;
- 59 workspace package/application nodes have zero dependency cycles;
- all future empty package shells match the frozen package map rather than abandoned partial code;
- formatting, ESLint, architecture boundaries, strict TypeScript across 85 of 86 workspace projects, 46 unit/example files with 189 tests, 1 architecture file with 2 tests, all three app builds, frozen install and launcher check passed;
- no completed step was reopened and no Architecture Blocker was found;
- large stable modules and the inherited combined Pixi/Three desktop chunk are recorded with owners and latest safe resolution boundaries.

## Step 11 result

Completed and audited `docs/implementation/STEP_11_ANIMATION_SCHEDULER_SPEC.md`, then implemented deterministic presentation animation in the existing presentation-tier `@physica/storyboard` package. The phase required no Architecture Blocker escalation, ADR, ProjectDocument schema-version change, new package or third-party dependency.

Implemented:

- canonical, deeply immutable V1 Storyboard animation envelopes with public create, parse and validate operations and typed malformed-input errors;
- translation, rotation, scale and opacity presentation channels with scalar/Vec3 interpolation, per-channel source diagnostics and final-stage opacity normalization;
- deterministic named and fixed-iteration cubic Bézier easing, including overshoot-safe final composition;
- Sequence, Parallel, Stagger and Wait compilation plus sequence, replace, additive, multiplicative and reject conflict policies with stable start/priority/StoryboardStep ordering;
- pure arbitrary-time forward, reverse, repeated scrub and zero-duration evaluation with deep-frozen schedules and frames;
- reduced-motion final-state resolution and a transient Presentation State Store that remains outside ProjectDocument, command history and authoritative Runtime State Store channels;
- scene-safe, collision-free Runtime Scheduler task adapters in the frozen presentation-animation phase, driven only by the already-advanced presentation clock.

The final audit added exhaustive additive translation/rotation, multiplicative scale/opacity, mixed/invalid-policy and replacement-order coverage; cubic interior reference values; malformed definition/easing paths; scene mismatch rejection; a complete 13-phase Runtime Scheduler cycle; canonical ProjectDocument round trip; unknown Storyboard step and extension preservation; and proof that runtime presentation fields are never serialized.

User-visible completion:

- `examples/animation/move-scale-rotate` contains metadata, README, executable deterministic samples, expected JSON, accessible SVG preview, automated test and explicit pending shared-runtime capture obligations;
- the launcher-visible desktop workbench remains at “11 / Animation Scheduler” with deterministic move/scale/rotate playback, play/pause, reverse/forward, reset, scrub, reduced-motion and textual transform diagnostics;
- presentation transforms remain transient and never mutate physics.

Final verification:

- focused Storyboard and animation example run — 2 files, 19 tests passed;
- complete repository CI — 41 files and 174 tests passed, plus 2 architecture tests, strict TypeScript across 81 of 82 workspace projects with scripts and all three app builds;
- `Launch Physica.bat --check` — passed through Tauri CLI 2.11.4, Cargo 1.94.1 and the desktop production build;
- architecture boundaries and lockfile supply-chain policies passed;
- the inherited Vite advisory for the Pixi/Three desktop showcase chunk remains non-failing and does not affect correctness.

## Step 10 result

Completed and audited `docs/implementation/STEP_10_PHYSICS_LIBRARY_FOUNDATION_SPEC.md`, then implemented the frozen metadata-driven Physics Library foundation without an ADR, ProjectDocument schema-version change or third-party dependency. Library definitions remain declarative data; instantiated content is copied into ordinary document nodes with provenance and never remains live-linked to a registry entry.

Implemented in `packages/plugin-sdk`:

- portable JSON-safe contracts for Smart Models, Prefabs, Visual Objects, Instruments, Representations and Material Presets;
- canonical metadata for Built-in, plugin and My Library sources, tags, thumbnails, editable properties, assumptions, variants, semantic anchors, typed ports, compatible targets, requirements, license and model provenance;
- deterministic `LibraryRegistry`, `PrefabRegistry`, `InstrumentRegistry` and `MaterialPresetRegistry` implementations with validation, deep-frozen entries, lexical listing, duplicate rejection and atomic batches;
- declarative plugin contribution registration with plugin namespace/source enforcement and rollback-safe all-or-nothing publication.

Implemented in `packages/assets`:

- deterministic full-text/tag/class/source/dimensionality search, source-neutral drag payloads and compatible-target evaluation;
- registry cross-reference auditing between Library items, Prefabs, Instruments and Material Presets;
- preflighted prefab/instrument snapshot planning with fresh persisted UUIDs, recursive reference remapping, target-slot binding, exact plugin-version requirements and component-level source provenance;
- the first-party foundational pack: ball, block, trolley, car, mass, string, spring, pulley, support, ground/surface, ruler, stopwatch, vector arrow, coordinate axes, graph panel, equation panel and a reusable pulley/mass prefab;
- all six item classes and nine frozen TextBlock preset metadata entries: Text Block, Definition, Explanation, Caption, Callout, Quote, Bullet List, Examiner Note and Warning;
- a presentation-only neutral material preset that deliberately claims no unsourced physical constants;
- canonical schema-versioned My Library import/export and in-memory storage with declarative validation.

Implemented in `packages/commands`:

- one atomic instantiate-Library-item command that publishes assets, datasets, entities, components, systems, clocks, events, relationships, representations, controls, equations, graphs and plugin locks as one history entry;
- exact undo/redo with prepared identities preserved, plugin-lock conflict rejection, duplicate identity rejection and final ProjectDocument validation before publication.

Desktop observation experience:

- advanced the live workbench from Step 9 to “10 / Physics Library” while retaining the shared SVG/Pixi/Three demonstration stage;
- added a metadata-driven Library browser with search, all six class filters, item counts, source-neutral cards, accessible add buttons and native drag payloads;
- items can be dragged or added onto the stage, inspected for immutable source/version provenance and displayed as visible stage instances;
- material presets are clearly treated as property presets instead of fake scene objects;
- `Launch Physica.bat --check` passed Tauri CLI 2.11.4, Cargo 1.94.1 and the production desktop build, preserving the one-click live-development launcher;
- automated browser-control visual inspection could not run because the required Windows browser-control runtime failed to start; this did not affect the production build, package interaction tests or checked-in SVG gallery previews.

Example Gallery artifacts:

- `examples/library/drag-smart-model`;
- `examples/library/drag-prefab`;
- `examples/library/bind-instrument`;
- `examples/library/save-to-my-library`, including a real canonical export/import round trip;
- `examples/library/foundation-object-pack`;
- `examples/library/registry-discovery`.

Each example contains metadata, README, an executable deterministic run module, expected JSON, accessible expected SVG preview, automated test and explicit pending `.physica`/PNG/WebM/shared-runtime obligations in `examples/pending-artifacts.json`.

Scientific, architecture, teacher-UX and performance self-review resolved:

- physics/domain packages remain independent of React and editor internals;
- the commands package does not depend on registry/UI packages, and the assets package prepares snapshots through public contracts only;
- anchor/port meaning is semantic rather than positional UI convention;
- unknown plugin content retains exact version requirements and no plugin code executes in the renderer or editor;
- no physical material constant was introduced without a reference;
- search and registry ordering are deterministic and catalog work is bounded by registered item count;
- plugin acceptance proves a Smart Model, Prefab and Instrument become discoverable without an editor code change.

Commands and verification:

- focused Step 10 package/example acceptance run — 8 files, 14 tests passed after the final plugin acceptance and My Library example changes;
- earlier combined command/Library/example run — 9 files, 33 tests passed;
- strict typechecks for `plugin-sdk`, `assets`, `commands`, the desktop app and all six examples — passed;
- architecture boundary lint — passed;
- desktop production build — passed;
- `Launch Physica.bat --check` — passed;
- clean frozen-lockfile workspace installation — passed across 81 workspace projects;
- complete repository CI — passed after one unused example fixture was removed: formatting, ESLint, architecture boundaries, strict TypeScript across 80 of 81 workspace projects with scripts, 39 unit/example files with 155 tests, 2 architecture tests and all three application builds.

## Step 9 result

Completed and audited `docs/implementation/STEP_09_RENDERING_FOUNDATION_SPEC.md`, then implemented one shared deterministic camera, render-frame, layer and semantic-picking foundation across SVG, PixiJS and Three.js. Rendering remains transient and consumes already-resolved world state; it does not store or advance physics, mutate `ProjectDocument`, or introduce an editor-owned authority path.

Implemented in `packages/renderer-core`:

- immutable orthographic and perspective camera definitions with finite viewport/clipping validation, right-handed camera-basis construction, world projection, screen-y inversion, orthographic unprojection and perspective screen rays;
- explicit post-projection presentation transforms kept separate from physical world coordinates;
- renderer-neutral background, line, arrow, circle, polyline, particle-cloud and 3D-vector primitives;
- semantic layer/backend compatibility, stable namespaced render IDs, deterministic item ordering, duplicate rejection and immutable render frames;
- canonical dirty-frame comparison, viewport culling helpers, renderer-neutral pick regions and typed render/adapter errors.

Implemented concrete adapters and picking:

- `packages/renderer-svg` produces deterministic normalized SVG markup, explicit arrow-head geometry and semantic pick regions from the shared camera;
- `packages/renderer-pixi` produces immutable stride/culling particle plans, semantic particle regions and an internally owned/disposed PixiJS 8 WebGL mount;
- `packages/renderer-three` produces exact shaft/cone vector plans, projected semantic regions and an internally owned/disposed Three.js WebGL mount, including the shared post-projection presentation transform;
- `packages/picking` validates circle, segment, rectangle and polygon regions and returns deterministic topmost semantic results by layer, z-index, hit distance, stable render ID and registration sequence, without exposing backend object handles.

Desktop observation experience:

- replaced the bootstrap-only card with a polished live “Rendering Foundation” workbench using only public renderer/picking exports;
- the fixed shared-camera frame visibly composes an SVG line/annotation, a 220-particle Pixi cloud and a Three 3D vector in one stage;
- the inspector reports adapter readiness, deterministic frame metadata and pointer-driven semantic picks while clearly stating that renderers never advance physics;
- a fixed 1280 × 900 browser visual inspection confirmed aligned layers and readable layout;
- live Chromium verification reported all three adapters `ready`, zero page/console errors and the expected `physica.svg:force · SVG · annotation` semantic hit;
- `Launch Physica.bat --check` passed through Tauri CLI 2.11.4, Cargo 1.94.1 and the production desktop build, preserving the one-click live-development launcher.

Example Gallery artifacts:

- `examples/rendering/line-and-arrow` checks the exact deterministic SVG plan/markup and right-handed world-to-screen projection;
- `examples/rendering/particle-cloud` checks deterministic stride/culling, projected centers, semantic region count and source-state immutability;
- `examples/rendering/3d-vector-scene` checks exact 3D vector geometry and known perspective-projected endpoints;
- `examples/rendering/mixed-renderer-selection` supplies shuffled overlapping SVG/Pixi/Three regions and checks stable semantic topmost ordering.

Each example includes metadata, README, executable run module, deterministic expected JSON, accessible expected SVG preview, automated test and an explicit pending-artifact manifest. Future `.physica`, PNG, WebM and shared gallery-runtime artifacts remain registered in `examples/pending-artifacts.json` rather than being fabricated.

Dependencies added after license and ownership audit:

- `pixi.js` 8.20.1 (MIT), scoped to `renderer-pixi`;
- `three` 0.185.1 (MIT) and `@types/three` 0.185.4 (MIT), scoped to `renderer-three`.

Scientific, architecture, teacher-UX and performance self-review resolved:

- all adapters consume the same camera snapshot, semantic identity and layer system while backend handles remain private;
- physical coordinates stay immutable and presentation transforms never feed back into world state;
- particle stride/culling changes only visual plans, not source arrays or observables;
- deterministic numerical/semantic plans remain the scientific baseline instead of hardware-dependent GPU pixels alone;
- the Three browser mount was corrected during review to apply the same optional post-projection presentation transform already used by planning and picking;
- the desktop production bundle emits Vite's non-failing large-chunk advisory because Pixi and Three are both present in this foundation showcase; code splitting remains future application optimization, not a correctness or architecture blocker.

Commands and verification:

- focused renderer run — 5 files, 10 tests passed;
- four Step 9 gallery examples — 4 files, 4 tests passed with strict example typechecks;
- desktop strict typecheck and production build — passed;
- live Chromium adapter/picking/error smoke verification — passed;
- `Launch Physica.bat --check` — passed;
- clean frozen-lockfile workspace installation — passed across 75 workspace projects;
- `pnpm run ci` — passed: formatting, ESLint, architecture boundaries, strict TypeScript across 74 workspace projects with scripts, 31 unit/example files with 141 tests, 2 architecture tests and all three application builds.

## Step 8 result

Completed and audited `docs/implementation/STEP_08_CHECKPOINT_REPLAY_SPEC.md`, then implemented deterministic runtime checkpoint capture, atomic restoration and forward replay. The phase remains a runtime foundation: it adds no production physics solver, renderer, editor UI, persisted project format or installer packaging.

Implemented in `packages/checkpoints`:

- immutable schema-versioned checkpoint envelopes containing scene identity, selected primary clock, complete named-clock snapshot, authoritative Runtime State Store snapshot, solver/random/acquisition/runtime-continuation participant snapshots, global event-sequence position and deterministic sequence identity;
- canonical key-ordered serialization and a dependency-free UTF-8 CRC-32 integrity checksum, with corruption detected before runtime mutation;
- a namespaced participant registry with unique IDs, positive schema versions, lexical capture/restore order, exact participant-set validation and finite JSON-state enforcement;
- bounded in-memory checkpoint storage with validated cadence, per-scene capacity, deterministic eviction and nearest-checkpoint-at-or-before-target selection;
- capture and capture-if-due services with non-wrapping safe-integer checkpoint sequences;
- restore preflight followed by clocks, authoritative state, event sequence and participant restoration, with full rollback if any participant restore fails;
- numerical scrubbing by restoring the nearest checkpoint and replaying fixed maximum-size steps in selected-clock coordinates, including an exact partial final step and one derived-state regeneration;
- direct analytical scrubbing adapter support without fake reverse-time visual playback;
- stable typed callback failures without leaking host-specific exception text.

Runtime integration changes:

- `ClockRuntime.validateSnapshot` now performs exact clock-ID-set and finite-state preflight without mutation; restore delegates to it;
- `RuntimeStateStore.validateSnapshot` now performs pure scene/channel/revision/JSON validation before restore;
- `RuntimeEventSequence.validatePosition` and `restore` now expose the checkpoint-owned sequence-state contract;
- all dependencies remain one-way through public exports: checkpoints depends only on core-model, clocks, events and runtime-scheduler; no third-party dependency or ADR change was required.

Example Gallery artifacts:

- `examples/time/numerical-scrub` checkpoints a semi-implicit falling-body runtime at 2 s, advances to 4 s, scrubs backward to 3 s and forward to 4 s, and exactly matches uninterrupted position, velocity and event-sequence state;
- `examples/time/stochastic-scrub` checkpoints complete xorshift32 and event-sequence state and proves replay reproduces the exact stochastic tail that restoring the seed alone would not reproduce.

Each example includes metadata, README, executable run module, deterministic expected JSON, accessible expected SVG preview, automated test and an explicit pending-artifact manifest. Future `.physica`, PNG, WebM and gallery-browser artifacts remain registered in `examples/pending-artifacts.json` until their owning rendering/gallery infrastructure exists.

Scientific, architecture, teacher-UX and performance self-review resolved:

- checkpoint restore validates integrity and every runtime component before mutation, while participant failures preserve their typed cause after successful rollback;
- full PRNG state and event-sequence position are restored, not merely an initial seed;
- replay rejects non-finite targets, non-positive step bounds, floating-point non-progress and clock divergence;
- participant callbacks and replay adapters are isolated behind typed exception boundaries;
- deterministic nearest selection, forward/backward equivalence, analytical scrubbing, corruption rejection, rollback and 10,000 repeated selections are covered by tests;
- bounded per-scene storage keeps selection cost governed by the configured checkpoint capacity.

Progress observation launcher repairs:

- `Launch Physica.bat` now finds standalone pnpm or standard Node.js Corepack, prepends standard Node and Rust toolchain locations, installs missing workspace dependencies and validates Tauri, Cargo and the frontend build in `--check` mode;
- Tauri's nested frontend lifecycle uses `npm run dev`/`npm run build`, so it does not require a second shell to resolve pnpm;
- Vite is explicitly pinned to Tauri's expected port 1420;
- a port preflight gives a concise existing-instance explanation instead of a Vite stack trace on accidental double launch;
- an end-to-end launch with a deliberately minimal PATH started Vite on port 1420, completed the native Rust build and ran `target/debug/physica-desktop.exe` successfully;
- the launcher remains live-development only and performs no executable/installer packaging.

Commands and verification:

- focused Checkpoint/Replay and gallery run — 3 files, 12 tests passed;
- targeted runtime-integration run — 4 files, 41 tests passed before the final callback-boundary addition;
- strict typechecks for checkpoints and both new examples — passed;
- `pnpm run ci` — passed: repository formatting, ESLint, architecture boundaries, strict TypeScript across 70 of 71 workspace projects with scripts, 22 unit/example files with 127 tests, 2 architecture tests and all three application builds.

## Step 7 result

Completed and audited `docs/implementation/STEP_07_RUNTIME_SCHEDULER_SPEC.md`, then implemented the frozen deterministic runtime boundary. The phase is limited to runtime orchestration foundations; it adds no physics model, solver, renderer, checkpoint service, editor feature or installer packaging.

Implemented in `packages/events`:

- immutable JSON-safe RuntimeEvent envelopes with finite timestamps, named clock domains, namespaced event types, explicit priorities and safe-integer sequence IDs;
- typed event validation and typed event-sequence construction/exhaustion;
- monotonic sequence snapshot position for later Checkpoint/Replay integration;
- insertion-preserving runtime event buffer with snapshot, drain and clear behavior.

Implemented in `packages/runtime-scheduler`:

- the exact immutable 13-stage frozen phase order plus namespaced specialized phases anchored before/after built-in phases;
- deterministic task registration/order and a timer-free synchronous cycle driver;
- one automatic `ClockRuntime.advance` invocation in the clock phase, with system intervals derived only from named clock changes;
- transient per-scene Runtime State Store with JSON-safe snapshots, exact initial-state reset/restore, revisions and no ProjectDocument/history mutation;
- single-writer claims, declared-output enforcement and atomic per-system runtime writes;
- producer-consumer system dependency graphs with lexical ready-set order and typed coupled-cycle rejection;
- scheduled event order by timestamp, phase, priority, unique sequence and stable textual keys, plus next-cycle deferral for handler-emitted events;
- deterministic event-handler order and scoped runtime-state writes;
- JSON-safe deterministic cycle traces, including inspectable partial traces after failure;
- ordered asynchronous worker-result collection independent of completion timing.

Package-boundary decisions:

- `@physica/events` owns event identity/data and depends only on core-model;
- `@physica/runtime-scheduler` owns phase/event ordering and the Runtime State Store because the frozen map has no separate runtime-state package;
- runtime-scheduler depends only on public core-model, clocks and events exports;
- no package cycle, new workspace package, third-party dependency or ADR change was required.

Example Gallery artifacts:

- `examples/system/scheduler-order-trace`;
- `examples/system/runtime-state-reset`;
- `examples/system/runtime-event`.

Each example includes metadata, README, executable run module, deterministic expected JSON, accessible expected SVG preview and an automated test. Future `.physica`, PNG, WebM and gallery-browser artifacts remain truthfully registered in `examples/pending-artifacts.json` until their owning infrastructure exists.

Progress observation:

- added root `Launch Physica.bat`, which starts the live Tauri development application through the existing workspace toolchain;
- after an ordinary Windows terminal could not see Codex's private pnpm path, the launcher was repaired to discover pnpm or fall back to standard Node.js Corepack, prepend the Node installation path for child scripts, install missing workspace dependencies and expose a non-launching `--check` mode;
- the launcher performs no executable/installer packaging and remains the required observation entry point for the first meaningful visible UI phase;
- a clean-PATH `Launch Physica.bat --check` resolved successfully to Tauri CLI 2.11.4.

Scientific, architecture, teacher-UX and performance self-review resolved:

- invalid sequence construction now returns typed results rather than throwing;
- duplicate sequence IDs are rejected instead of falling back to insertion order;
- system writes are restricted to each system's declared outputs and remain atomic on failure;
- failed cycles expose deterministic completed trace records without nondeterministic exception text;
- last-trace recording no longer performs quadratic array copying;
- the 10,000-run determinism test retains all runs while avoiding heavyweight assertion overhead;
- the Windows batch launcher is explicitly excluded from Prettier because Prettier has no batch parser.

Commands and verification:

- focused Step 7 run — 5 files, 26 tests passed;
- targeted strict typechecks for events, runtime-scheduler and all three examples — passed;
- `pnpm typecheck` — passed across 68 of 69 workspace projects with scripts;
- `pnpm lint` — ESLint and architecture boundaries passed;
- `pnpm test` — unit/example suite: 19 files, 115 tests passed; architecture suite: 1 file, 2 tests passed;
- `pnpm run ci` — passed: repository formatting, ESLint, architecture boundaries, strict TypeScript across 68 workspace projects, 115 unit/example tests, 2 architecture tests and all three application builds.

## Step 6 result

Completed and audited `docs/implementation/STEP_06_MATHEMATICS_UNITS_COORDINATES_CLOCKS_SPEC.md`, then implemented its bounded mathematics, units, coordinate/reference-frame and clock foundations. No renderer, solver, scheduler, editor UI or later subsystem was implemented.

Implemented in `packages/mathematics`:

- typed mathematical results and errors plus finite-input validation;
- immutable 2D/3D vectors, complex numbers, dynamic matrices, quaternions, intervals, sampled series and a numerical policy contract;
- tagged coordinate positions/directions, 2D planes, branded reference-frame identifiers, Galilean transforms, provider registration and deterministic frame-graph path transforms with explicit time;
- explicit educational display scaling that does not mutate physical state.

Implemented in `packages/units`:

- exact seven-base SI dimension vectors and dimension algebra, including semantic dimensionless kinds;
- unit definitions, registry and parser with SI prefixes from quecto through quetta, SI base/derived units and selected teaching units;
- canonical-SI quantities with preserved display units, deterministic display precision, uncertainty propagation, affine-unit safeguards and generated coherent compound units.

Implemented in `packages/clocks`:

- persisted `physica:clock/domain-v1` configuration parsing and validation;
- mandatory simulation and presentation clocks, unique keys, valid links and cycle rejection;
- immutable transient clock runtime supporting run/pause/rate/scrub, linked and conditional clocks, deterministic topological advancement and snapshots;
- strict runtime/document separation: clock state is not persisted in `ProjectDocument` and clock operations do not enter document undo history.

Package-boundary decisions:

- coordinate/reference-frame primitives are owned by `@physica/mathematics`, because the frozen package map defines no separate coordinates package;
- `@physica/units` depends only on `@physica/mathematics`;
- `@physica/clocks` depends only on `@physica/core-model`; an initially considered units dependency was removed as unnecessary;
- no new third-party dependency or ADR was required.

Example Gallery artifacts:

- `examples/math/units-and-dimensions`;
- `examples/math/vector-operations`;
- `examples/rendering/coordinate-spaces`;
- `examples/time/two-clocks`.

Each example includes metadata, README, deterministic expected output, an accessible expected SVG preview and an automated example test. Runtime-dependent `.physica`, PNG and WebM deliverables remain truthfully registered in `examples/pending-artifacts.json` and local example manifests until their owning runtime/rendering capabilities exist; no placeholder output was presented as complete.

Scientific and architecture self-review resolved:

- dimensionless cancellation now preserves valid semantic kinds;
- generated unit identifiers are Unicode-safe;
- prefixed and compound display-unit expressions remain round-trippable;
- non-finite quantity and frame-transform inputs return typed errors;
- linked clocks begin at revision zero and no-op advances neither allocate state nor emit false changes;
- deterministic quantity display formatting honors stored precision;
- the unused clock-to-units dependency was removed.

Commands and verification:

- focused Step 6 run — 8 files, 57 tests passed;
- targeted strict typechecks for all changed packages and examples — passed;
- `pnpm typecheck` — passed across 65 of 66 workspace projects with scripts;
- `pnpm lint` — ESLint and architecture boundaries passed;
- `pnpm test` — unit/example suite: 14 files, 89 tests passed; architecture suite: 1 file, 2 tests passed;
- `pnpm run ci` — passed: repository formatting, ESLint, architecture boundaries, strict TypeScript across 65 workspace projects, 89 unit/example tests, 2 architecture tests and all three application builds.

Checkpoint note: Step 6 is an isolated, buildable snapshot on top of the verified Step 5 foundation and is recorded as the project-publication checkpoint.

## Step 5 result

Implemented the Step 5 boundary from Sections 34–36 of `docs/implementation/STEP_04_CORE_PROJECT_MODEL_SPEC.md`. The implementation is limited to document modeling, serialization, document commands/history and the two required non-visual system examples. No runtime engine, physics algorithm, renderer, mathematics/units implementation, editor UI or plugin execution was added.

Implemented in `packages/core-model`:

- JSON-safe value/result types and strict runtime JSON-value recognition;
- branded UUID-v4 persisted IDs, registered/plugin/state-channel identifier parsing, `CryptoIdFactory` and injectable `DeterministicIdFactory`;
- ProjectDocument schema version 1, PresentationFlow, Scene, Entity, Component, System, Representation, Asset, Dataset, reference, metadata and state-channel envelopes;
- pure global identity, structural/reference and single-authoritative-writer validation;
- explicit document/runtime separation with no runtime frames in the persisted model.

Implemented in `packages/serialization`:

- strict Zod V1 schemas for the complete Step 5 document envelope;
- deterministic canonical JSON normalization/stringification and parsing, including non-finite/unsupported-value rejection;
- typed invalid-JSON, invalid-structure, future-version and migration-failure results;
- sequential `n → n+1` migration-registry foundation with no fictitious production migrations;
- opaque unknown-plugin configuration, initial-state, metadata and extension preservation.

Implemented in `packages/commands`:

- command/handler registry, immutable command application and atomic transactions;
- all 14 specified built-in commands: Scene add/remove/reorder; Entity add/remove; Component add/remove/configuration/initial-state; System add/remove; Representation add/remove; Project metadata replacement;
- prepared inverse-command sequences, transaction-level undo/redo and redo-branch clearing;
- framework-independent ProjectStore with one publication per committed transaction, monotonically increasing revision, stable save/history tokens, dirty tracking, subscription and replace-document behavior.

Example Gallery artifacts:

- `examples/system/schema-roundtrip`: executable two-Scene document fixture containing Entity, unknown-plugin Component, System, TextBlock Representation and Asset-backed Dataset, with metadata, README, expected JSON output, expected SVG preview and automated example test;
- `examples/system/undo-redo`: executable ProjectStore transaction/undo/redo fixture with stable identity checks, metadata, README, expected JSON output, expected SVG preview and automated example test.

Tests added:

- UUID generation/parsing, deterministic IDs and global duplicate detection;
- valid/invalid V1 structures, strict root fields, timestamps and typed future-version rejection;
- PresentationFlow and dangling Entity/System/Representation/Dataset/Asset references;
- Component/System authority acceptance and conflict cases;
- canonical JSON determinism, array order, undefined behavior and NaN/Infinity rejection;
- unknown-plugin semantic preservation after unrelated editing and serialization;
- all built-in command inverse paths, including multi-transition Scene restoration;
- atomic rollback/publication, grouped undo/redo, branch clearing, listeners, dirty/save markers and document replacement;
- runtime/document separation and deterministic 100-command apply → undo-all → redo-all equality;
- all 12 Section 30 future-proof schema fixtures, each parsed and reference-validated;
- both required executable examples and their checked-in expected outputs.

Dependency added:

- `zod` 4.4.3 (MIT), scoped only to `packages/serialization`; no other Step 5 dependency was added.

Commands and verification:

- `pnpm install --frozen-lockfile=false` — passed; workspace links and lockfile updated with no additional package downloads required;
- targeted `@physica/core-model`, `@physica/serialization` and `@physica/commands` strict typechecks — passed;
- targeted Step 5 Vitest run — 5 files, 52 tests passed;
- `pnpm typecheck` — passed across 61 of 62 workspace projects with scripts;
- `pnpm lint` — ESLint passed and architecture boundaries passed;
- `pnpm test` — unit/example suite: 7 files, 54 tests passed; architecture suite: 1 file, 2 tests passed;
- `pnpm run ci` — passed: repository formatting, ESLint, architecture boundaries, strict TypeScript, 54 unit/example tests, 2 architecture tests and all three application builds.

Deviations and blockers:

- none. `packages/events` required no change. No Step 6 or later subsystem was implemented.

## Step 3 result

The existing Git repository and commit history were preserved. The repository began Step 3 with the Step 2 specification set, frozen reference documents, placeholder-only root `src/`, `public/`, `tests/`, `examples/` and `benchmarks/`, and no package manager, application, TypeScript, test, lint, format or CI configuration.

Created:

- pnpm workspace and lockfile with centralized dependency versions;
- strict shared TypeScript configuration;
- minimal React/Vite shells in `apps/desktop`, `apps/web-viewer` and `apps/gallery`;
- Tauri 2 desktop shell, configuration, permissions, Cargo lockfile and generated platform icons;
- 56 minimal package shells from the frozen architecture package map;
- Vitest smoke/example tests and Playwright web-viewer smoke test;
- architecture boundary checker, approved fixture and deliberately forbidden physics-to-React fixture;
- bootstrap-only `examples/system/hello-stage` metadata, README and expected SVG preview;
- ESLint, Prettier, shared scripts and three-platform CI skeleton.

Removed:

- obsolete placeholder-only root `src/` and `public/` directories;
- superseded `tests/.gitkeep` and `examples/.gitkeep` markers.

No earlier application code existed to migrate or preserve. `benchmarks/.gitkeep`, all Step 2 specifications and all frozen reference files were preserved. No Physica feature implementation was started.

## Exact direct toolchain and dependency versions

Runtime and compiler:

- Node.js 24.14.1
- pnpm 11.24.0
- TypeScript 6.0.3
- Rust 1.94.1
- Cargo 1.94.1

Application shell:

- React 19.2.8
- React DOM 19.2.8
- Vite 8.2.2
- `@vitejs/plugin-react` 6.1.1
- `@tauri-apps/api` 2.11.1
- `@tauri-apps/cli` 2.11.4
- Rust `tauri` crate 2.11.5
- Rust `tauri-build` crate 2.6.3

Equation authoring:

- MathLive 0.110.0
- `@cortex-js/compute-engine` 0.120.0
- KaTeX 0.18.4

Quality tooling:

- Vitest 4.1.11
- Playwright 1.62.1 with Chromium 151.0.7922.34
- ESLint 10.9.1
- `@eslint/js` 10.0.1
- `typescript-eslint` 8.68.0
- `eslint-plugin-react-hooks` 7.1.1
- `eslint-plugin-react-refresh` 0.5.5
- Prettier 3.9.6
- `@types/node` 26.4.0
- `@types/react` 19.2.18
- `@types/react-dom` 19.2.5

TypeScript 7.0.2 was available but was not selected because `typescript-eslint` 8.68.0 supports TypeScript below 6.1.0. TypeScript 6.0.3 is the newest mutually compatible stable release in that range. Direct JavaScript dependencies are exact-pinned in the workspace catalog/manifests; the full transitive graphs are frozen in `pnpm-lock.yaml` and `apps/desktop/src-tauri/Cargo.lock`.

## Commands and verification

Passed:

- `pnpm install`
- `pnpm install --frozen-lockfile` across all 60 workspace projects
- `pnpm run ci` — formatting, ESLint, architecture lint, strict TypeScript, Vitest and all three app builds
- `pnpm test:architecture` — approved dependency passes and forbidden physics-to-React fixture is rejected
- `pnpm test:unit` — workspace and bootstrap example smoke tests pass
- `pnpm test:e2e` — Playwright launches Chromium and verifies the web-viewer shell
- `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml`

Resolved during bootstrap:

- the first forbidden-fixture test exposed missing support for side-effect imports; the boundary parser was corrected and the test now passes;
- the first Cargo check reported the required Windows icon was absent; the standard Tauri icon set was generated from the bootstrap SVG and Cargo now passes;
- the first aggregate check saw generated Tauri ACL schemas; generated schemas are now excluded from source formatting and Git tracking;
- `pnpm ci` invokes pnpm's clean-install command, so CI explicitly uses `pnpm run ci` for the workspace verification script.

## Frozen reminders

- physics state is authoritative;
- document state and runtime simulation state are separate;
- one authoritative writer exists per physical state channel;
- clocks, deterministic scheduling, solvers and events use their owning contracts;
- physics/domain packages do not import React or editor internals;
- every future user-visible feature requires its complete Example Gallery artifact set.

## Phase 4 Step 4.4 read first

- AGENTS.md
- docs/AUTONOMOUS_EXECUTION_PROTOCOL.md
- docs/PROJECT_HEALTH_CHECKPOINTS.md
- docs/PROJECT_CONSTITUTION.md
- docs/ROADMAP.md
- docs/GRAPH_AND_DATA_ENGINE.md
- docs/MATHEMATICS_AND_UNITS.md
- docs/COORDINATES_AND_FRAMES.md
- docs/RENDERER_ARCHITECTURE.md
- docs/implementation/STEP_17_GRAPH_ENGINE_SPEC.md
- docs/PACKAGE_DEPENDENCIES.md
- approved ADRs in docs/DECISIONS.md

Begin with a Step 4.4 implementation specification. Preserve canonical dataset authority, explicit graph-data/screen-layout spaces, unit compatibility and the graph renderer clip contract. Implement only the analysis overlays named by the roadmap/specification. Stop only if graph analysis reaches an Architecture Blocker; do not implement variable binding, formula animation, data export or later graph types early. After Step 4.4 verification, execute scheduled HC-02 before Phase 5.
