# Step 18 — Graph Analysis and Overlays Implementation Specification

**Status:** IMPLEMENTATION-READY

**Owning roadmap item:** Phase 4, Step 4.4 — Graph analysis overlays

**Primary owners:** `@physica/data`, `@physica/graphs`

## 1. Purpose and source audit

Step 18 adds deterministic scientific analysis to the Cartesian data and graph foundation: tangent, gradient triangle, signed area, maximum, unweighted straight-line fit, uncertainty bars, histogram and one-sided amplitude spectrum. Analysis reads immutable canonical datasets and produces immutable derived data or renderer-neutral overlay geometry. It cannot become a physics writer, acquisition clock, simulation solver or presentation-time authority.

The design was audited against the Project Constitution, ADR-016 explicit-clock acquisition, Graph and Data Engine, Mathematics and Units, Coordinates and Frames, Renderer Architecture, package dependencies and the completed Step 17 graph contract. It requires no Architecture Blocker, ADR, root `ProjectDocument` schema change, new workspace package, third-party dependency, event, solver, scheduler task or editor/domain inversion.

## 2. Exact scope and allowed changes

Allowed implementation surfaces are:

- `@physica/data` for sample uncertainty and deterministic histogram/spectrum derivation;
- `@physica/graphs` for persisted overlay configuration, validation, analysis algorithms and renderer-neutral geometry;
- desktop-only fixtures/components/styles for launcher-visible evidence;
- `examples/graphs/graph-gradient`, `graph-area` and `histogram-live`;
- focused tests, package manifests/lockfile, Step 18 documentation and operational state.

Step 18 implements exactly the eight roadmap capabilities. It does not implement weighted/nonlinear/robust fitting, uncertainty propagation through arbitrary formulas, FFT acceleration, window functions, power spectral density, live scheduler acquisition, linearisation tools, normal overlays, intercept detection, minima, multiple linked graphs, CSV/SVG export commands, parametric graphs, heatmaps, contour/vector fields, high-density downsampling, editor variable binding or formula animation.

## 3. Dataset uncertainty extension

`CartesianSampleV1` gains optional non-negative finite `xUncertaintyCanonical` and `yUncertaintyCanonical` fields. They are canonical absolute standard uncertainties attached to the sample value, not display-unit quantities and not error-bar geometry. Missing uncertainty means unknown/not supplied, never zero.

This is a backward-compatible optional extension to `physica:data/cartesian-v1` schema version 1. Existing payloads remain valid and serialize identically. Dataset creation/parsing validates uncertainty and preserves it in canonical round trips. Error bars display supplied uncertainty but do not infer it or use it as statistical weight in this step.

## 4. Deterministic derived datasets

### 4.1 Histogram

`deriveHistogramDataset()` receives one validated source dataset/series, a caller-owned output `DatasetId` and name, a bounded integer bin count and an optional finite canonical y-value range. It bins the source series' canonical y values. Default bounds are the observed min/max; a degenerate range expands using the central magnitude-aware rule. Bins are left-closed/right-open except the final bin, which is closed at both ends. Values outside an explicit range are excluded and counted in returned derivation diagnostics.

The output is a normal immutable Cartesian dataset with one series. Its x coordinate is each bin centre with the source y-axis quantity/unit; its y coordinate is a dimensionless count with unit expression `""`. Series metadata records `renderHint: "histogram"`, canonical bin width and boundaries. Provenance is `derived`, names the source dataset/series and records histogram transformation parameters. Underlying observations are never deleted or mutated.

### 4.2 Spectrum

`deriveAmplitudeSpectrumDataset()` receives one validated source dataset/series, caller-owned output identity/name and optional `NumericsPolicy`. It requires at least two samples, strictly increasing and uniformly spaced canonical x values under `approximatelyEqual()`, and a time-dimensional x unit. It rejects duplicates, nonuniform sampling, invalid time units and more than 4096 samples for the initial deterministic direct transform.

The algorithm is the direct real DFT evaluated in stable index/frequency order. The output is the non-negative one-sided amplitude spectrum from DC through `floor(N/2)`. Amplitude is `|X[k]| / N`, doubled only for bins with a distinct negative-frequency partner; DC and the even-N Nyquist bin are not doubled. Frequency is `k / (N × Δt)` in Hz and amplitude retains the source y unit. This is an exact deterministic reference implementation, not an FFT and not a PSD.

The result is a normal immutable Cartesian dataset with derived provenance recording sample interval, count, algorithm/version and source identity. Render cadence and presentation time never enter either derivation.

## 5. Persisted graph analysis configuration

`CartesianGraphV1` gains optional `analysisOverlays`. The field is an ordered list of immutable V1 tagged definitions with stable local IDs and dataset/series references:

- `tangent`: canonical x location, deterministic stroke, optional positive canonical triangle run;
- `area`: inclusive canonical x bounds, finite canonical baseline, fill colour and bounded opacity;
- `maximum`: optional inclusive canonical x bounds and marker label/colour;
- `linear-fit`: optional inclusive canonical x bounds and deterministic stroke;
- `error-bars`: deterministic stroke, line width and bounded cap size in layout pixels.

The optional field is stored inside the existing `physica:graph/cartesian-v1` configuration with schema version 1. Omission remains canonical for graphs without analysis, so Step 17 envelopes round-trip unchanged. The parser accepts legacy omission, validates owned fields, rejects duplicate local IDs and preserves generic unknown graph envelopes through the root model. Overlay dataset/series existence is contextual and checked during resolution.

Histogram and spectrum are derived datasets rather than overlay definitions. A histogram curve uses the backward-compatible graph style `renderMode: "bars"` plus a positive canonical bar width; the default/omitted mode remains `"line"`. Bar geometry is resolved in graph layout and clipped to the plot rectangle.

## 6. Analysis algorithms

All algorithms operate on source-order, finite canonical samples. They return typed errors rather than misleading geometry.

### 6.1 Piecewise-linear evaluation and tangent

The owning curve model in Step 17 is straight interpolation between samples, so tangent analysis must describe that same piecewise-linear model. At a canonical x strictly inside a segment, slope is that segment's secant. At an exact interior sample with distinct neighbours, slope is the centred secant between nearest distinct-x neighbours. Endpoints use the nearest one-sided segment. Exact duplicate-x samples resolve to the last stable sample, while zero-width pairs are skipped for derivative selection. If no distinct x pair exists, analysis fails.

The tangent line is returned over the visible x domain and clipped by the renderer. Slope has canonical y-per-x units. The optional gradient triangle starts at the tangent point, uses the configured positive canonical run and rise `slope × run`, and must remain finite. Its accessible readout reports rise, run and gradient in selected display units.

### 6.2 Area

Area analysis clips the requested interval to the series range, inserts linearly interpolated boundary points, then applies the trapezoidal rule to the piecewise-linear curve relative to the configured baseline. For this model the result is exact. Signed contributions are retained; no absolute-area substitution occurs. The overlay returns a closed source polygon and layout polygon plus signed canonical/display area. Area dimension is x dimension multiplied by y dimension; the display value uses axis scale factors only, so affine offsets cannot corrupt an interval measure.

### 6.3 Maximum

For a piecewise-linear curve, a maximum occurs at an interval boundary or source sample. The resolver evaluates clipped interval boundaries and every contained sample, chooses the largest y and resolves ties to the earliest x then stable source order. It returns a graph-data point, layout marker and selected display-unit readout. It does not fabricate quadratic interpolation.

### 6.4 Straight-line fit

Linear fit uses ordinary unweighted least squares over samples in the optional inclusive interval. It requires at least two samples and nonzero x variance under the central `NumericsPolicy`. Stable ordered sums produce canonical slope, intercept and coefficient of determination `R²`; constant-y data yields `R² = 1` only for an exact fit. The rendered segment spans the selected sample x range. Supplied uncertainties are displayed separately and do not silently become fit weights.

### 6.5 Error bars

Each sample with supplied uncertainty resolves horizontal and/or vertical error segments and layout-pixel caps. Canonical low/high endpoints remain tagged graph-data; screen geometry is clipped to the plot rectangle. Missing uncertainty omits that dimension. A requested error-bar overlay with no supplied uncertainties returns an empty overlay plus an explicit accessible summary rather than inventing values.

## 7. Renderer-neutral outputs and authority

`resolveCartesianGraph()` continues to own graph-data to screen-layout conversion and gains an ordered deeply frozen `analyses` collection plus optional bar rectangles on curves. Every overlay contains both canonical scientific inputs/results and screen-layout geometry. Renderers draw only this plan and apply the existing plot-rectangle clip contract.

Analysis never modifies the graph, dataset, root document, Runtime State Store, clock, observable, solver or simulation. Re-resolving at another viewport changes only layout coordinates; scientific results remain byte-identical. Analysis configuration is document state; resolved results and layout are derived/transient.

## 8. Units, validation and errors

Axis compatibility remains owned by Step 17. Analysis display readouts convert canonical x/y/rise/run using the selected axis units. A canonical slope converts to display slope by `xScale / yScale`; canonical area converts to display area by division by `xScale × yScale`. Offsets cancel from differences. Histogram count is generic dimensionless. Spectrum requires time-dimensional x and emits Hz.

New typed failures include invalid analysis configuration, missing/insufficient series data, no distinct x values, singular fit, invalid analysis interval, nonuniform spectrum sampling, unsupported spectrum x dimension and derivation sample limit. Every colour, width, opacity, range, uncertainty, bin count and output identity is validated. No analysis evaluates code, HTML, network input or plugin-native behavior.

## 9. Extensibility, performance and security

The V1 overlay union is closed for deterministic core parsing. Later plugin analyses require namespaced registered envelopes rather than injecting functions into this list. Unknown root graph types remain preserved by the generic project model.

Tangent, area, maximum, fit, error bars and histogram are O(N). The direct DFT is O(N²) and deliberately capped at 4096 samples; a future FFT adapter may replace its implementation only with deterministic/reference equivalence tests and an approved dependency audit. Successful outputs are deeply frozen, JSON-safe where persisted and contain no executable payload.

## 10. Accessibility and teacher-facing behavior

Overlays never rely on colour alone: tangent/fit use distinct dash patterns and labels, area has a boundary plus fill, maximum has a labelled marker, error bars have caps, bars have explicit rectangular form, and spectrum is labelled as amplitude rather than power. Resolved plans provide textual scientific summaries and exact readouts. Desktop controls are keyboard-operable, visibly focused and do not auto-animate when reduced motion is preferred.

The launcher proof must use actual engine outputs. It may animate only a presentation cursor or selection; it must not imply that a tangent, fit, area or spectrum recomputes from display frames.

## 11. Test matrix and scientific references

Targeted tests cover:

- uncertainty validation, omission semantics and canonical persistence;
- histogram boundaries, final-bin inclusion, explicit-range exclusions, provenance and input immutability;
- direct DFT reference signals: DC, one-bin sine amplitude/frequency, uniform-spacing tolerance, nonuniform/time-unit/size rejection;
- legacy graph envelope round trip without analyses and V1 analysis configuration round trip;
- tangent slopes at segment/interior sample/endpoint/duplicate-x cases and exact gradient triangle rise/run;
- exact trapezoidal area for linear data, signed baseline crossing, interpolated bounds and unit display scaling;
- stable maximum/tie selection and interval boundaries;
- exact linear fit slope/intercept/R², singular input and unchanged uncertainty semantics;
- x/y uncertainty bars, caps, plot clipping, no-data summary and no invented uncertainty;
- histogram bar geometry, viewport invariance of canonical results, deep freezing and deterministic repeated resolution;
- no document/runtime/clock/physics-state mutation.

Reference cases include `y = x²` sampled at integer x for the explicitly piecewise-linear tangent definition, `v = 1 + 2t` whose area from 0 to 4 is exactly 20 m, a projectile-like concave polyline with a stable maximum, exact straight-line measurements for `R² = 1`, and a 1 Hz sine sampled at 8 Hz whose one-sided amplitude peak is 1.

## 12. Example Gallery and Physics Library

Required examples are:

- `examples/graphs/graph-gradient` — piecewise-linear tangent, gradient triangle and maximum with explicit readouts;
- `examples/graphs/graph-area` — signed trapezoidal area, ordinary fit line and measured uncertainty bars;
- `examples/graphs/histogram-live` — deterministic histogram plus amplitude spectrum derived from immutable sampled data.

Each ships metadata, README, executable deterministic output, exact expected JSON, accessible expected SVG preview, automated test and truthful pending `.physica`/PNG/WebM/shared-runtime obligations.

These are graph/data representations, not new stage-visible physics objects or instruments, so no new Physics Library item is required. Future instrument acquisition will register through the Library and Runtime owners rather than being fabricated here.

The desktop advances to “18 / Graph Analysis”, exposes all three examples through real resolved geometry and keeps the Step 17 Graph Workbench and all earlier release-gate proofs below it. `Launch Physica.bat` remains the observation path; no installer packaging is added.

## 13. Definition of Done and HC-02 gate

Step 18 is complete when all eight roadmap capabilities are exported and tested, persisted optional fields round-trip, all three examples meet the currently achievable gallery contract, launcher-visible analysis is real and accessible, targeted/full repository gates plus frozen install and launcher check pass, and `CURRENT_STATE.md` records exact evidence.

Immediately after Step 18, scheduled HC-02 must run before Phase 5. It revalidates every Phase 4 promise, the corrected Step 16 equation-transition evidence, graph/data scientific results, cross-step integration, package graph, large/concentrated files, accumulated dead code and desktop bundle ownership. Any in-scope defects are repaired and reverified; a report is published under `docs/health-checkpoints/`. Phase 5 cannot begin until HC-02 passes.

Completion does not claim statistical inference, continuous calculus beyond the declared piecewise-linear model, uncertainty-weighted fits, optimized spectral processing, runtime acquisition integration, export or later graph types.
