# Graph and Data Engine

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns datasets, observables-to-data sampling and scientific graphs.

## Scope

Time series, Cartesian/parametric graphs, histogram, spectrum, heatmap, error bars, fit/analysis tools.

## Owned concepts

- Dataset
- DataSeries
- GraphModel
- sampling policy

## Dependencies

- `MATHEMATICS_AND_UNITS.md`
- `CLOCKS_AND_TIME.md`
- `RUNTIME_STATE.md`

## Global dependency direction

```text
mathematics / units / schemas
        ↓
core-model / commands / clocks / events / data
        ↓
runtime / solver interfaces / relationships
        ↓
renderers / equations / graphs / controls / storyboard
        ↓
physics domain packages
        ↓
editor / viewer / gallery
```

Cross-cutting registries and SDK packages expose interfaces without importing editor internals. Package cycles are forbidden.

## Invariants / required behavior

- sample from explicit clocks
- record provenance
- support units

## This subsystem MUST NOT

- sample physics once per render frame by default
- duplicate domain equations inside graph renderer

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- sampling-rate independence
- unit axes
- fit/analysis

## Example Gallery obligations

- `graph-basic`
- `graph-live-cursor`
- `graph-gradient`
- `histogram-live`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §16 -->
# 16. GRAPH, DATA AND MEASUREMENT ENGINE

Graph types:

- Cartesian x–y;
- time series;
- parametric;
- histogram;
- spectrum;
- heatmap;
- contour;
- vector field;
- error-bar plot;
- event/count plot;
- image/intensity profile.

Capabilities:

- physical units on axes;
- live cursor;
- synchronized simulation time;
- tangent;
- normal;
- gradient triangle;
- area shading/integration;
- maxima/minima;
- intercepts;
- best-fit line;
- uncertainty bars;
- linearisation;
- multiple linked graphs;
- point selection;
- export as SVG/CSV.

Datasets are first-class project resources, not only graph internals.

## 16.1 Sampling is independent of render frames

A dataset/acquisition binding declares:

```text
sourceObservable
clockDomain
samplingPolicy
sampleInterval / eventTrigger
unitMetadata
uncertaintyMetadata
provenance
```

A live graph does not sample merely because the screen rendered a frame.

## 16.2 Data provenance

Imported, simulated and measured datasets preserve:

- source;
- units;
- uncertainty;
- sampling method;
- transformation history;
- model/version when simulated.

## 16.3 Large-data policy

Long traces, spectra, image data and particle-derived statistics may use typed/binary storage and viewport downsampling.

Downsampling changes only display resolution, never the underlying authoritative dataset.

Logarithmic axes are first-class for astronomical and exponential data.

---

<!-- Source: Master §17 -->
# 17. PARTICLE, FIELD, IMAGE AND DETECTOR DATA

To prevent later schema redesign, the core explicitly supports:

## ParticleBuffer

Packed typed arrays for high-volume ensembles.

## ScalarField / VectorField / ComplexField

Continuous function, sampled grid or hybrid representation.

## ImagePlane

2D numeric/image data with physical calibration.

## Detector

Maps physical events/fields/rays to sampled output.

## AcquisitionSeries

Time-ordered samples/projections.

## ReconstructionResult

Image/field reconstructed from acquisitions.

These are needed from the architecture stage even if many are implemented later.

## ProbabilityDistribution / RandomVariable

The mathematics/data layer supports explicit discrete or continuous distributions for:

- counting statistics;
- molecular speeds;
- uncertainty models;
- stochastic decay;
- later quantum/statistical representations.

## AudioSignal

Audio-capable physics may expose a sampled or functional signal with sample-rate/time metadata.

It can feed both waveform representations and offline/live audio rendering.

---

