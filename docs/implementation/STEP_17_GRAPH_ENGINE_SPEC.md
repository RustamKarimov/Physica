# Step 17 — Graph Engine Implementation Specification

**Status:** IMPLEMENTATION-READY

**Owning roadmap item:** Phase 4, Step 4.3 — Graph engine

**Primary owners:** `@physica/data`, `@physica/graphs`

## 1. Purpose and source audit

Step 17 implements deterministic, unit-aware Cartesian scientific graphs over first-class project datasets. It provides axes, linear and base-10 logarithmic scales, curves, cursor readout, point markers and text annotations without allowing a renderer or display refresh to become a data-acquisition authority.

The design was audited against the Project Constitution, approved ADRs, Graph and Data Engine, Mathematics and Units, Coordinates and Reference Frames, Clocks and Time, Runtime State, Renderer Architecture, the Step 16 equation-transform boundary and package dependencies. It requires no Architecture Blocker, ADR, root `ProjectDocument` schema change, workspace package, third-party dependency, solver, uncontrolled frame loop or physical-state writer.

## 2. Scope and ownership

`@physica/data` owns:

- one serializable V1 Cartesian dataset stored through the existing root `DatasetDefinition` resource;
- named numeric data series with canonical x/y values and explicit unit metadata;
- imported, simulated, measured and derived provenance records;
- a renderer-independent, explicit-clock fixed-interval acquisition contract;
- deterministic acquisition-window evaluation that receives an observable evaluator and never samples on render.

`@physica/graphs` owns:

- one serializable V1 Cartesian graph stored through the existing Scene `GraphDefinition` envelope;
- x/y axes, unit choices, linear/logarithmic scale definitions and auto/manual domains;
- dataset-series bindings and deterministic curve styles;
- renderer-neutral tick, polyline, cursor, point-marker and annotation layout plans;
- graph-data to screen-layout coordinate conversion with explicit coordinate-space tags;
- the `graph-basic` and `graph-live-cursor` examples and launcher-visible proof.

Step 17 does not implement variable/observable binding in the editor, formula-to-graph animation, tangent or normal overlays, gradient triangles, areas/integration, extrema/intercepts, fit lines, error bars, histograms, spectra, heatmaps, downsampling, CSV/SVG export commands or acquisition scheduler registration. Graph analysis is Step 4.4; relationship binding and formula animation are later roadmap work.

## 3. Persisted data contract

A Cartesian dataset uses the existing root `DatasetDefinition` with type ID `physica:data/cartesian-v1`, schema version 1 and `inline-json` storage. The envelope ID and name remain authoritative. The inline V1 payload contains:

- a non-empty list of stable, locally unique series keys and names;
- per-series x/y quantity labels, symbols and unit expressions;
- finite samples stored in SI-compatible canonical values;
- optional finite JSON metadata.

Each series is ordered by non-decreasing canonical x. Equal x values are permitted because event/count and repeated measurement data must remain representable; interpolation resolves an exact duplicate deterministically to the last sample at that x. Non-finite values, empty series, duplicate keys, invalid unit expressions and malformed payloads are typed errors.

Dataset provenance is stored in the existing envelope `provenance` object with a required source kind (`imported`, `simulated`, `measured` or `derived`), a non-empty source description, optional clock/observable IDs, sampling description, model ID/version and transformation history. Parsing validates the owned fields while preserving additional finite JSON provenance fields.

Runtime acquisition cursors, observable evaluators, compiled indexes and display-layout caches are never serialized.

## 4. Explicit-clock sampling

An acquisition binding names one source `ObservableId`, one `ClockId`, one target series key, a finite start time and a positive fixed sample interval. `sampleAcquisitionWindow()` accepts the binding, the previous sample index, an inclusive target clock time and a caller-supplied pure observable evaluator. It evaluates only exact schedule times `start + index × interval` in stable ascending index order.

The same target time produces the same samples whether the caller advances in one large window or many render-sized windows. A backward target is rejected; deterministic scrub/rebuild starts again from the persisted binding and index zero or from a future owning acquisition checkpoint. The evaluator receives explicit clock time and returns the canonical y value; it cannot read display refresh time through this contract.

This step provides the pure acquisition primitive and proves sampling-rate independence. Runtime Scheduler phase-8 registration is deferred until observable/relationship integration has an owning task; the desktop live cursor uses a deterministic built-in series rather than pretending to be a connected simulation.

## 5. Persisted graph contract

A Cartesian graph uses the existing Scene `GraphDefinition` envelope with type ID `physica:graph/cartesian-v1` and schema version 1. Its V1 configuration contains:

- a non-empty graph name;
- x and y axes with label, unit expression, scale and domain policy;
- one or more bindings from existing `DatasetId` plus series key to a curve style;
- optional explicit point markers and data-anchored text annotations;
- cursor configuration and optional finite JSON metadata.

Axis scales are exactly `linear` or `log10`. Domains are `auto` or finite manual min/max with min < max. Log domains and every plotted log-coordinate value must be strictly positive. Tick targets are bounded integers; curve colors are restricted deterministic hexadecimal values; line widths and marker radii are finite bounded presentation values.

The graph parser validates only its owned envelope/configuration structure. Dataset existence, series existence and unit compatibility are contextual and are validated when a graph is resolved against project datasets. Unknown graph type/schema versions return typed unsupported-envelope errors and remain preservable by the generic Project model.

## 6. Units and data compatibility

Canonical sample values are never rewritten when a teacher changes an axis display unit. Dataset and graph unit expressions are parsed through the existing default Unit Registry. A bound series is accepted only when its x/y dimensions and semantic dimensionless kinds match the graph axes. Affine unit conversion is permitted for display labels because mapping remains in canonical values.

Tick values and cursor readouts are converted from canonical values to the selected display unit. Labels include the explicit unit symbol when non-empty. No graph renderer duplicates conversion tables or domain equations.

## 7. Renderer-neutral graph resolution

`resolveCartesianGraph()` accepts a validated graph, referenced datasets, a finite positive screen-layout viewport and optional canonical cursor x value. It returns a deeply frozen immutable plan in two explicit spaces:

- source points and anchors are tagged `graph-data` and retain canonical scientific values;
- axes, ticks, curve vertices, cursor geometry, point markers and annotation anchors are tagged `screen-layout`.

The graph owns the data-to-layout scale. It does not use the Scene Camera because a graph panel is a layout representation, not a physical world viewport. Moving or resizing the graph changes only screen-layout coordinates and never canonical dataset values or physics state.

Auto domains are derived from all bound finite samples and explicit markers/annotations, with deterministic bounded padding. Degenerate one-value domains expand by a stable magnitude-aware amount. Manual domains preserve complete ordered source/vertex arrays and expose the plot rectangle as the mandatory renderer clip contract, so no source sample is deleted. Linear scales are affine; log scales use base-10 transformed canonical values. Screen y is inverted explicitly so larger graph-data y appears higher.

Ticks use a deterministic nice-step algorithm for linear axes and integer powers of ten for log axes. Curves preserve source order, use straight sample-to-sample interpolation and are clipped by renderers to the resolved `plotRect`; the desktop SVG proof applies an explicit clip path. Cursor mode is either nearest sample or linear interpolation. It returns a vertical guide, one stable readout per visible bound series and formatted axis-unit values. Duplicate exact x samples resolve to the last stable source occurrence.

Point markers reference an existing bound dataset/series sample index. Annotations contain author text and a canonical graph-data anchor; they are not formulas and do not evaluate code or write data.

## 8. Validation, determinism, accessibility and security

Public author-data operations return `DataResult<T>` or `GraphResult<T>` with stable typed errors and teacher-facing paths/messages. Throws are limited to application setup after validated built-in constants. Inputs are never mutated; successful datasets, graphs, acquisition outputs and layout plans are deeply frozen.

Dataset/graph parsing accepts JSON data only. It performs no dynamic evaluation, trusted HTML, network access, filesystem access or domain-physics calculation. Observable evaluators are caller-owned runtime functions and never persisted.

The desktop proof renders resolved plans as SVG because axes, labels, annotations and scientific curves require print-quality vectors. It supplies an accessible graph name and textual series/domain/cursor summary, visible focus for controls, keyboard-operable scrub, non-color series identification and reduced-motion readable state. The cursor is driven by explicit progress in the proof and does not claim live simulation binding.

## 9. Test matrix

Targeted tests cover:

- V1 dataset creation, validation, canonical round trip and malformed/unsupported envelopes;
- finite samples, stable duplicate x, ordering, unit metadata and provenance;
- fixed-interval acquisition exact times, large-window versus many-window equality, invalid clocks/intervals and no render-time dependency;
- V1 graph creation, validation, canonical round trip and malformed/unsupported envelopes;
- missing dataset/series, incompatible units/semantic kinds and canonical-value preservation across display-unit changes;
- linear and logarithmic auto/manual domains, degenerate ranges, nice ticks and invalid non-positive log data;
- graph-data to screen-layout mapping, y inversion, viewport resize without data mutation and deterministic repeated resolution;
- curve order and plot-rectangle clipping contract, nearest/interpolated cursor, duplicate x handling, markers and annotations;
- input immutability, deep freezing and no document/runtime/physics-state mutation.

## 10. Example Gallery and release gate

The required examples are:

- `examples/graphs/graph-basic` — a unit-aware displacement–time dataset with axes, deterministic ticks, two visually distinguishable curves, point markers and an annotation;
- `examples/graphs/graph-live-cursor` — a velocity–time series generated from the explicit-clock acquisition primitive, with scrubbed cursor interpolation and proof that coarse/fine caller windows yield identical samples.

Each ships metadata, README, executable deterministic output, expected JSON, accessible expected SVG preview, automated example test and truthful pending `.physica`/PNG/WebM/shared-runtime obligations.

The desktop advances to “17 / Graph Engine”. It presents both examples as real resolved SVG plans, includes unit-aware axes, scale/domain diagnostics and a scrubbed cursor readout, and retains the corrected Step 16 equation-transform proof plus all earlier proofs below it. `Launch Physica.bat` remains the one-click development launcher; no installer/executable packaging is added.

## 11. Definition of Done and non-claims

Step 17 is complete when the public data, acquisition, graph, persistence and resolution contracts are exported; targeted tests cover the matrix above; both gallery examples have every currently achievable artifact; the desktop proof is launcher-visible; targeted suites, architecture checks, complete repository verification, all app builds, frozen install and launcher check pass; and `docs/CURRENT_STATE.md` records Step 4.3 complete with Step 4.4 graph-analysis overlays next.

Completion is not a general plotting library, live editor variable binding, a fit/uncertainty/statistics engine, formula animation, analysis overlays, high-density raster rendering, runtime acquisition scheduling, SVG/CSV export commands or a physics model. HC-02 remains scheduled after Step 4.4 and must re-audit the equation/graph release gate plus the Step 16 presentation correction.
