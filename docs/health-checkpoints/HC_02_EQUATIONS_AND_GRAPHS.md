# HC-02 — Equations and Graphs Health Checkpoint

**Status:** PASSED AFTER CORRECTIONS

**Introduced after:** Phase 4 Step 4.4 — Graph analysis and overlays

**Audited implementation baseline:** `08a7ac7` (Implement graph analysis overlays)

**Scope:** all completed work through Step 18, with focused release-gate review of Steps 15–18 and regression review of the HC-00/HC-01 foundations

## 1. Outcome

Phase 4 forms one coherent equation-and-graph preview. Semantic equation identity remains independent of rendered glyphs; equation motion is derived from measured complete layouts; graph analysis is derived from immutable canonical data and remains independent of viewport resolution. No second clock, scheduler, solver, state store, rendering authority or document writer was introduced.

No completed step was reopened and no Architecture Blocker was found. HC-02 found four correctable issues: the commands concentration debt had reached its promised boundary, dataset creation and persistence had become concentrated, eight Phase 4 examples were absent from the root pending-artifact ledger, and maximum-marker colour could be overridden by a generic SVG stylesheet. All four were corrected and reverified before the checkpoint passed.

## 2. Completed-step evidence matrix

| Recorded step | Responsibility | Current evidence | HC-02 decision |
| --- | --- | --- | --- |
| Steps 1–14 | Frozen architecture, model/serialization/history, scientific primitives, clocks/scheduler/replay, rendering, Library and presentation animation | HC-00/HC-01 reports plus current architecture, serialization, command, scheduler, renderer, example, build and launcher gates | Verified; no regression or false completion found |
| Step 15 | Math editor and semantic equation tree | `@physica/equations` V1 model/parser/reconciliation/rendering contracts, MathLive desktop editor, `edit-and-render`, persistence and invalid-edit tests | Verified |
| Step 16 | Equation transform engine | Persisted semantic transforms, conservative symbolic verification, measured FLIP layouts, exact endpoint reconstruction, three executable examples and desktop smoke proof | Verified, including the previously corrected presentation acceptance failure |
| Step 17 | Graph engine | Immutable datasets/acquisition, persisted graph definitions, unit-aware axes, deterministic renderer-neutral plans, two examples and desktop graph workbench | Verified |
| Step 18 | Graph analysis and overlays | Tangent/gradient triangle, trapezoidal area, stable maximum, linear fit, error bars, histograms, one-sided amplitude spectra, three examples and launcher-visible analysis workbench | Verified |

## 3. Fixed findings

### HC02-F01 — Commands built-ins concentration debt reached its deadline

The original built-ins module was 1,079 lines and mixed contracts, helpers and every document command family. HC00-D01 required a split before another built-in family or no later than HC-02.

Correction:

- retained the exact command IDs, payload types, registration order, inverse commands and public barrel;
- extracted the public contract (150 lines), shared immutable helpers (95), Scene commands (221), Entity/Component commands (404) and Scene content/metadata commands (271);
- reduced the public registration module to 20 lines;
- all 20 commands/history tests and the complete serialization/undo-redo suite pass.

HC00-D01 is closed.

### HC02-F02 — Dataset creation and persistence became concentrated

Adding uncertainty fields pushed the dataset module to 528 lines and combined scientific validation/creation with generic document-envelope parsing and serialization.

Correction:

- retained dataset identity, series/provenance validation and immutable creation in `dataset.ts` (256 lines);
- extracted `DatasetDefinition` envelope parsing/serialization into `persistence.ts` (288 lines);
- preserved the package-level public API through `@physica/data`;
- targeted data, graph and example suites prove unchanged round trips and the new uncertainty fields.

### HC02-F03 — Phase 4 root artifact ledger drifted

All eight equation-transform and graph examples had complete local metadata, README, deterministic output, accessible SVG preview, automated test and local pending-artifact manifest, but the root pending-artifact ledger still stopped at the Step 15 example.

Correction:

- added the three Step 16, two Step 17 and three Step 18 examples to the root ledger;
- the audit now finds 37 example metadata records and exactly 37 root obligations, with no missing or orphan path.

### HC02-F04 — Maximum marker colour was not stylesheet-safe

The graph renderer expressed a maximum marker's configured colour as an SVG presentation attribute. The existing generic marker stylesheet could take precedence.

Correction:

- the maximum marker now uses an inline style value, preserving the configured semantic colour while keeping its text label and non-colour meaning;
- desktop typecheck, smoke tests, production build and launcher check pass.

## 4. Architecture and authority audit

- workspace graph: 97 nodes, zero dependency cycles;
- architecture boundary checker and architecture tests pass;
- the only Step 18 package-edge additions are `@physica/data` and `@physica/graphs` to the existing public `@physica/mathematics` Numerics Policy; both are workspace-only, acyclic and inside their documented ownership;
- no third-party dependency or new license obligation was added;
- no root `ProjectDocument` version, ADR, package-map or renderer authority changed;
- datasets remain immutable document resources; derived datasets record provenance and do not replace authoritative sampled inputs;
- graph configurations persist analysis intent, while pixel geometry and resolved analysis plans remain transient;
- graph analysis consumes explicit canonical samples and units and never writes physics state;
- equations remain semantic/document models, MathLive stays desktop-owned, and rendered fragments never own identity;
- physics/domain packages import no React, editor, Tauri, Pixi or Three internals;
- existing clock, Runtime Scheduler, single-writer, document/runtime and plugin-isolation invariants remain covered and passing.

## 5. Cross-step integration and scientific review

- canonical dataset and graph definitions round-trip while legacy graphs omit absent analysis fields exactly;
- viewport changes preserve canonical slope, area, fit, extrema and uncertainty results while changing only renderer-neutral screen geometry;
- piecewise-linear tangents use an exact-segment slope or a centered secant at exact interior samples; gradient triangles use the same resolved slope;
- trapezoidal area integrates clipped piecewise-linear data exactly for the represented curve;
- maximum selection is deterministic and stable for equal values;
- unweighted ordinary least squares uses a stable centered formulation and reports slope, intercept and R²; degenerate inputs return typed errors;
- error bars preserve canonical non-negative uncertainty and resolve both axes with visible caps;
- histogram bins use an explicit interval policy with the final bin right-closed and record excluded samples;
- the amplitude spectrum requires a time-compatible, uniformly sampled series, is bounded to 4,096 samples and produces a deterministic one-sided real DFT with correct DC/Nyquist scaling;
- the exact reference cases pass: `v=1+2t` gives slope 2, intercept 1, R² 1 and area 20 over 0–4; a 2 Hz unit-amplitude sine sampled at 16 Hz resolves a 2 Hz peak of amplitude 1;
- equation-transform endpoint reconstruction, symbolic verification, units/dimensions, canonical serialization, undo/redo, acquisition scheduling, replay and renderer tests pass in the same full suite.

## 6. Gallery, teacher workflow and accessibility

- all 37 examples have an executable entry, deterministic expected JSON, README, accessible expected SVG, local pending-artifact declaration and one root pending obligation;
- Phase 4 is represented by four equation examples and five graph examples;
- the desktop exposes real tangent/gradient, area/fit/uncertainty, histogram and spectrum views above the earlier graph and equation workbenches;
- graph analyses include textual values and labels, and curves/bars use non-colour encodings as well as colour;
- equation transformations retain play, reverse, scrub, reset and reduced-motion behavior with exact source/target reconstruction;
- `Launch Physica.bat` remains the supported one-click development launcher;
- automated live Windows capture is not counted because the recorded local sandbox refresh-helper limitation remains. Checked-in previews, executed smoke tests, production build and launcher checks are the automated visual evidence; the user can inspect the live Tauri app through the launcher.

## 7. Maintainability, performance and supply chain

- TODO/FIXME/HACK/XXX scan: none;
- workspace dependency-cycle audit: zero cycles;
- Step 18's largest new behavior module is graph analysis at 489 lines. It is cohesive but must trigger review before material growth;
- the 503-line graph workbench stylesheet is declarative and responsive, component-owned, and unchanged by Step 18; splitting it now would not reduce behavioral coupling;
- the command and dataset concentration findings were split at tested semantic seams;
- direct DFT work is explicitly bounded to 4,096 samples and histogram allocation is bounded by validated bin count;
- Step 18 adds only internal workspace dependencies and no supply-chain/license change.

The desktop remains eagerly bundled at approximately 4.945 MB minified / 1.372 MB gzip. This is a non-failing development-load warning, not a correctness or launcher failure. It remains owned by the desktop app and must be resolved through stable-shell feature/backend lazy loading no later than HC-04.

## 8. Bounded debt register

| ID | Finding | Risk and decision | Owner | Latest safe boundary |
| --- | --- | --- | --- | --- |
| HC00-D02 | Units registry (708), coordinate frames (614) and quantity operations (520) remain large cohesive scientific modules | Preserve tested scientific behavior; split at semantic seams before solver work materially expands them | `@physica/units`, `@physica/mathematics` | Before material expansion, no later than HC-03 |
| HC00-D04 | Desktop eagerly bundles MathLive/Compute Engine/KaTeX, Pixi and Three | Introduce feature/backend lazy loading around the stable shell; current warning is bounded and non-failing | desktop app | HC-04 |
| HC00-D05 | Runtime Scheduler (541) and core validation (531) remain just above the review threshold | Authority-critical modules remain cohesive and fully tested; reassess on material growth | owning packages | Early trigger on growth or HC-03 |
| HC02-D01 | Graph analysis is 489 lines | Current algorithms share one immutable resolution contract; split calculus/statistics/uncertainty families before adding another analysis family | `@physica/graphs` | Before material expansion, no later than HC-03 |

HC00-D01 is closed by HC02-F01. The former dataset concentration is closed by HC02-F02.

## 9. Verification evidence

Passed on Windows:

- frozen offline install across all 97 workspace projects;
- Prettier repository check;
- ESLint with zero warnings;
- architecture boundary checker;
- strict TypeScript across 96 of 97 workspace projects with scripts;
- unit/example suite: 68 files, 282 tests;
- architecture suite: 1 file, 2 tests;
- production builds for desktop, gallery and web viewer;
- `Launch Physica.bat --check` through Tauri CLI 2.11.4, Cargo 1.94.1 and the desktop production build;
- targeted post-refactor suite: 7 files, 46 tests;
- gallery audit: 37 examples, 37 matching root obligations, zero missing/orphan paths;
- workspace dependency-cycle audit: 97 nodes, zero cycles.

## 10. Reopened work, blockers and next task

Reopened completed steps: none.

Architecture Blockers: none.

HC-02 passes the Equations and Graphs preview boundary. Phase 4 is complete.

The exact next task is Phase 5 Step 5.1: write and audit the Dependency Relationship Engine implementation specification, then implement only attach, follow, bind, offset, tangent, normal and derived-property relationships with the required `examples/relationships/tangent-follower` release-gate artifacts. Do not implement physics-aware vectors, interactive controls or Storyboard early.
