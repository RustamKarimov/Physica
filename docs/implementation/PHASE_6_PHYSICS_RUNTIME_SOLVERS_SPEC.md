# Phase 6 — Physics Runtime and Solver Adapters Implementation Specification

**Status:** IMPLEMENTATION-READY

**Owning roadmap items:** Phase 6, Steps 6.1–6.10

**Primary owners:** `@physica/physics-core`, solver packages, `@physica/compute-backend`

## 1. Purpose and source audit

Phase 6 supplies deterministic, renderer-independent physics execution primitives. This specification was audited against the Constitution, Physics Runtime, Solver Architecture, Runtime State, Runtime Scheduler, Checkpoint/Replay, Mathematics and Units, package boundaries, and approved ADRs.

The packages expose semantic Physica contracts. They do not import React, editor code, browser animation loops, or renderer state. Numerical stepping is driven by caller-provided physics time. Runtime caches and solver snapshots remain transient and never become ordinary project edits.

## 2. Step 6.1 — universal model lifecycle

`@physica/physics-core` owns a typed `PhysicalModelContract` and `PhysicalModelRuntime`. A contract declares provenance, category, determinism, assumptions, validity conditions, approximation level, curriculum tags, state channels, observables, and solver policy. Lifecycle order is initialize, parameter validation, initial-state creation, analytical evaluation or numerical step, event emission, observable computation, state validation, and reset.

Invalid parameters/state produce typed issues suitable for teacher-facing messages. The runtime refuses advancement before successful initialization, never mutates document parameters, orders emitted events deterministically, and resets by reconstructing initial runtime state. Models must choose analytical evaluation or numerical stepping rather than silently letting render timing choose semantics.

## 3. Steps 6.2–6.3 — mathematical services and compute boundary

The analytical adapter evaluates exact time functions with finite-time checks. The algebraic service provides deterministic bracketed roots, quadratic real roots, pivoted linear solves, interpolation, differentiation, and integration with explicit convergence diagnostics.

`ComputeBackend` is an injectable request/result boundary. The main-thread backend is the reference implementation; worker-like transports are adapted without exposing Worker APIs to physics packages. Ordered dispatch publishes results by submission sequence, never completion timing.

The ODE package implements semi-implicit Euler, velocity Verlet, RK4, and adaptive Dormand–Prince RK45. Inputs and outputs are immutable numeric vectors. Invalid dimensions/non-finite values are rejected, tolerance and step limits are explicit, and results report accepted/rejected steps and error estimates.

## 4. Steps 6.4–6.10 — specialized adapters

- Rigid: a Physica-owned semantic body/contact schema maps through a Rapier bridge contract. Adapter snapshots contain only semantic body state; engine handles are excluded. A deterministic one-dimensional impulse bridge is included as a scientific reference and test backend.
- Particles: data-oriented hard-disc state, deterministic spatial hashing, pair impulses, reflecting boundaries, and energy/statistical observables.
- Grid/PDE: finite scalar and complex grids, registered fixed/reflecting/periodic boundaries, stable explicit 1D wave stepping, and diagnostics.
- Rays: normalized 2D rays, analytic surface intersection, reflection, Snell refraction, total internal reflection, and ordered path segments.
- Circuits: graph validation, modified nodal DC solve for resistors/current sources/ground-referenced ideal voltage sources, plus an RC transient adapter.
- Stochastic: checkpointable seeded pseudo-random state, deterministic exponential event schedules, and Monte Carlo summaries that distinguish statistical checks from individual outcomes.
- Reconstruction: deterministic parallel-beam forward projection and unfiltered back-projection over finite 2D scalar images, with geometry and normalization diagnostics.

Specialized solvers expose snapshots where state evolves. Third-party implementation details are not public schema. Reference implementations establish contract correctness and curriculum-scale behavior; optimized/WASM/native backends may later implement the same interfaces.

## 5. Scientific validation and examples

Tests cover lifecycle/reset, exact reference cases, invalid configuration, determinism, checkpoint round trips, conservation or convergence diagnostics where applicable, and immutability. The required Gallery folders are:

- `physics/custom-model-contract`
- `physics/constant-acceleration-analytical`
- `physics/algebraic-root-service`
- `physics/damped-oscillator-solver-comparison`
- `physics/rigid-two-block-collision`
- `physics/elastic-gas-1000`
- `physics/wave-equation-string-grid`
- `physics/ray-refraction-boundary`
- `physics/dc-series-parallel`
- `physics/random-decay-events`
- `physics/tomography-two-object-concept`

Every example ships executable output, expected JSON, metadata, a README, an accessible SVG preview, an automated test, and truthful pending native/media artifacts. These are scientific contract demonstrations, not final lesson design.

## 6. Hardening Checkpoint HC03

After Step 6.10, HC03 audits all Phase 6 package boundaries, public API size, repeated utilities, numerical error behavior, deterministic replay/snapshots, example truthfulness, and integration with prior phases. Targeted scientific tests run first, followed by architecture lint, full typecheck/test/build, frozen install, launcher validation, and a documented state update.

## 7. Definition of Done

Phase 6 is complete when all ten roadmap steps, eleven examples, desktop observability, and HC03 gates pass. It does not implement the completed teacher editor, domain curriculum models, production GPU/WASM acceleration, polished lesson artwork, or distribution packaging.
