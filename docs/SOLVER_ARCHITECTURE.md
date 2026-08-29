# Solver Architecture

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns common solver adapters and numerical method selection contracts.

## Scope

Analytical, algebraic/root/linear, ODE, rigid/constraints, particles, grid/PDE, rays, circuits, stochastic, reconstruction, FFT and coupled solves.

## Owned concepts

- SolverAdapter
- solver capability metadata
- precision/error policies

## Dependencies

- `MATHEMATICS_AND_UNITS.md`
- `COMPUTE_BACKEND.md`
- `CHECKPOINT_AND_REPLAY.md`

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

- prefer analytical solver when appropriate
- declare tolerance/error semantics
- support checkpointable state for non-analytical solvers

## This subsystem MUST NOT

- make a third-party engine the public Physica schema

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- reference cases/invariants per adapter

## Example Gallery obligations

- `constant-acceleration-analytical`
- `damped-oscillator-solver-comparison`
- `rigid-two-block-collision`
- `elastic-gas-1000`
- `wave-equation-string-grid`
- `ray-refraction-boundary`
- `dc-series-parallel`
- `random-decay-events`
- `tomography-two-object-concept`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §12 -->
# 12. SOLVER ARCHITECTURE

No single solver is used for all physics.

Every model declares a Solver Adapter.

## 12.0 Solver contract and compute backend

Every solver is accessed through a Physica-owned adapter.

The adapter declares:

```text
solverTypeId
supportedStateTypes
supportedDimensions
determinismPolicy
checkpointCapability
workerCapability
precisionPolicy
inputSchema
outputSchema
```

Heavy computation runs through a `ComputeBackend` abstraction.

Initial backends:

- main-thread TypeScript for light analytical work;
- Web Worker TypeScript/WASM for heavy browser/desktop computation;
- optional Rust/WASM/native service adapters behind the same contract.

A physics model cannot depend directly on worker APIs, GPU APIs, Rapier or a native shell.

Scene systems declare read/write state channels. The scheduler derives system order from those declarations. Cyclic dependencies require an explicit coupled-system solver rather than implicit callback iteration.

## 12.0.1 Algebraic / root / linear-system service

In addition to time-evolution solvers, Physica provides shared deterministic numerical mathematics for:

- linear systems;
- polynomial/root finding;
- one-dimensional bracketing/root search;
- nonlinear equation solving where a model explicitly requires it;
- interpolation;
- numerical differentiation/integration.

This service is used by models that need a solved state but do not naturally fit an ODE.

## 12.1 Analytical evaluator

For exact curriculum models.

## 12.2 ODE integrator

For drag, damping, arbitrary fields, coupled systems, thermal evolution.

Supported algorithms:

- semi-implicit Euler;
- velocity Verlet;
- RK4;
- adaptive RK45.

The model declares its recommended integrator and error tolerance.

## 12.3 Constraint and rigid-body solver

Rapier adapter for appropriate 2D/3D rigid/contact systems.

Physica owns the semantic model.

## 12.4 Many-body particle solver

Data-oriented particle arrays, spatial hashing/broad phase, boundary interactions, statistical observables.

## 12.5 Grid/PDE solver

Generic grid fields for:

- wave equations;
- heat diffusion;
- numerical potential fields;
- advanced diffraction;
- later simple fluid fields.

Supports boundary-condition registry.

## 12.6 Ray/path solver

For geometrical optics and any path-intersection model.

## 12.7 Circuit/network solver

Graph topology, component constitutive laws, DC/transient/AC adapters.

## 12.8 Statistical/Monte-Carlo solver

For radioactive decay, counting statistics, random walks, uncertainty simulations.

## 12.9 Reconstruction/inverse solver

For imaging/tomography and later inverse-data problems.

## 12.10 Spectral/FFT service

A shared numerical service for:

- Fourier synthesis;
- spectra;
- wave analysis;
- diffraction extensions;
- signal processing.

## 12.11 Solver independence and precision

- Solver stepping is independent of render FPS.
- Models specify supported precision and tolerances.
- Numerical models expose convergence/error diagnostics.
- Solver snapshots are compatible with the Checkpoint/Replay service.
- Third-party engines are pinned by exact dependency version and hidden behind adapters.
- Rapier is treated as an implementation detail because its public releases may introduce breaking changes before 1.0.

---

<!-- Source: Master §27A.12 -->
## 27A.12 Coupled-system policy

Systems declare state-channel inputs and outputs.

If one system consumes another system's outputs, the Runtime Scheduler builds a deterministic system dependency order.

A cyclic multiphysics dependency cannot be "fixed" by callback order.

It must be represented by a registered coupled solver/system that owns the coupled state and convergence policy.

This allows future electromechanical, thermo-mechanical or other coupled teaching models without ambiguous state writers.

