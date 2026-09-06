# Phase 11 - Fields, Gravitation, Magnetism and Alternating Currents

**Status:** Audited implementation specification

## Purpose

Complete Cambridge 9702 Topics 13, 18, 20 and 21 with deterministic, curriculum-independent field and periodic-electromagnetism models. Preserve the authority chain physics -> mathematics -> visualization -> presentation and expose usable teacher workflows through the development launcher.

## Exact scope

- Newtonian gravitational fields, potential, superposition, circular-orbit relations and bounded numerical orbit stepping.
- Electrostatic point-charge and uniform fields, potential, superposition and charged-particle motion.
- Magnetic force on charges and currents, uniform-B circular motion, long-solenoid approximation, magnetic flux and Faraday-Lenz induction.
- Sinusoidal voltage/current, RMS, ideal transformers and ideal power-transmission comparison.
- Renderer-neutral 3D vector/scalar samples, deterministic 2D field-line and equipotential projections, trajectories and graph samples.
- Topic 13, 18, 20 and 21 Physics Library catalogs, mandatory Gallery projects, no-code desktop workflows and explicit curriculum evidence.

## Packages allowed to change

- `@physica/physics-fields` owns all new scientific behavior and Library registrations.
- `@physica/curriculum` owns explicit Cambridge coverage evidence.
- `@physica/desktop` owns teacher-facing workflow composition and representations.
- `examples`, root test orchestration and focused tests own release-gate evidence.
- Governance documentation records the verified result and HC-06.

No physics package may import React, editor or renderer internals. No root project schema or frozen ADR changes are permitted.

## Public interfaces and ownership

`Vec3`, scalar/vector field sources, sampled field points, line/equipotential plans, trajectory states, validation issues and scenario results are immutable public values. Physics functions own SI-canonical calculations. Representations receive derived samples and never calculate alternate physics.

The package exports:

- gravitational field/potential/superposition and orbit functions;
- electric field/potential/superposition, uniform plate fields and particle trajectories;
- Lorentz/current force, magnetic motion, solenoid, flux and induction functions;
- sinusoidal/RMS, transformer and transmission functions;
- analytical and ODE-backed `PhysicalModelContract` implementations;
- exact scenarios and metadata-driven Library registration.

## State model and authority

Persisted project definitions contain only model parameters, initial conditions, bindings and representation configuration. Orbit and charged-particle position/velocity are transient Runtime State Store channels with one authoritative model writer. Field samples, lines, equipotentials, forces, energies, waveforms and meter values are derived observables. No frame state is written into the document.

## Time and clocks

Analytical AC values evaluate from a supplied named simulation time. Numerical trajectories step only through `@physica/solver-ode` and the existing Runtime Scheduler contract. Presentation reveal and graph highlighting remain on presentation time and cannot advance physics.

## Observables and events

Observables include vector field, scalar potential, force, potential energy, orbital speed/period/energy, trajectory state, magnetic radius, flux, flux linkage, emf, instantaneous voltage/current, peak, RMS, frequency, turns ratio and ideal power. This phase emits no new persisted events; runtime threshold/collision events may be added later through the existing event contract.

## Algorithms and mathematical models

- `g = -GM r/r^3`, `phi = -GM/r`, linear superposition, `v=sqrt(GM/r)`, `T=2pi sqrt(r^3/GM)`, `v_escape=sqrt(2GM/r)`.
- `E = kQ r/r^3`, `V=kQ/r`, linear superposition, `F=qE`; uniform plates use `E=V/d`.
- Orbit and field-particle state use deterministic RK4/velocity-Verlet-compatible derivatives with explicit bounded time steps and diagnostics.
- `F=q(v x B)`, `F=BIL sin(theta)`, `r=mv/(|q|B)`, `B=mu0 NI/L`, `Phi=BA cos(theta)`, `emf=-N dPhi/dt`.
- `x(t)=X_peak sin(2pi f t + phase)`, `X_rms=X_peak/sqrt(2)`; ideal transformer `Vs/Vp=Ns/Np`, reciprocal current ratio and equal ideal input/output power.
- Field-line integration uses normalized vectors only for geometry; arrow magnitude/color and probes retain physical magnitude. Singular source points are excluded with typed diagnostics. Equipotential plans are derived from scalar potential.

## Units and dimensions

Public numeric inputs and outputs are SI: kg, m, s, C, N/kg, J/kg, N/C, V, T, Wb and V. Angles are radians. Functions reject non-finite values, non-positive masses/distances/turns/frequencies where physically required and singular probes at source positions.

## Validation and errors

Scientific APIs return typed teacher-readable issues rather than using exceptions for expected invalid authoring. Errors cover non-finite inputs, singularities, invalid geometry, zero charge/B where a radius is undefined, invalid transformer turns and excessive numerical steps. Educational assumptions and model limits are explicit in scenarios and provenance.

## Serialization and migration

This phase adds no root schema field and requires no migration. Library instantiation uses versioned project snapshots and canonical registered IDs. Runtime samples and caches are excluded from serialization.

## Extensibility and plugin behavior

Library/model IDs are namespaced. The field primitives are 3D even when a built-in workflow projects them to 2D. Advanced electromagnetism and numerical field maps extend these APIs without replacing them. No arbitrary code or AI execution is introduced.

## Performance

Teacher previews use bounded deterministic sample counts. Field-line and trajectory generation require explicit maximum steps and terminate on domain bounds/singularities. No unbounded per-frame allocation or hidden adaptive work is allowed.

## Accessibility

Desktop and SVG previews require text alternatives, keyboard-operable native controls, visible focus, reduced-motion handling, non-color direction/polarity markers, readable equations and live textual values/diagnostics.

## Test matrix and reference cases

- inverse-square gravitational/electric ratios, superposition and potential-gradient consistency;
- Earth circular-orbit speed/period, bounded orbit energy drift and escape relation;
- uniform plate trajectory reference case;
- Lorentz right-hand direction, `qvB` radius, `BIL`, solenoid, flux and Faraday-Lenz signs;
- sinusoidal RMS, transformer voltage/current/power ratios and transmission loss comparison;
- model lifecycle, determinism, reset, validation and finite outputs;
- exact scenario outputs, Gallery ledger, Library registration, curriculum coverage and desktop shared-state behavior;
- formatting, lint, dependency architecture, strict TypeScript, full tests, builds, offline install and launcher check.

## Physics Library requirements

Register every Smart Model, Apparatus/System Prefab, Visual Object and Instrument/Bound Representation listed for Topics 13, 18, 20 and 21 in `docs/CURRICULUM_COVERAGE.md`. Shared field lines, potential probes, coils and charge/particle objects use one canonical ID with multiple topic tags rather than duplicate implementations.

## Example Gallery requirements

Ship all 15 mandatory projects:

- gravity: `gravity-field`, `two-mass-zero-point`, `gravitational-potential`, `circular-orbit`;
- electric fields: `point-charge-field`, `two-charge-field`, `electric-potential`, `charged-particle-plates`;
- magnetic fields: `force-on-current`, `charged-particle-b`, `solenoid-field`, `electromagnetic-induction`;
- alternating currents: `ac-waveform-rms`, `transformer`, `power-transmission`.

Each has executable exact output, metadata, README, accessible deterministic SVG, automated aggregate coverage and truthful pending Phase 20 artifact declarations.

## Definition of Done

The phase is complete only when Topics 13, 18, 20 and 21 are explicitly `VALIDATED`; all 15 examples and required Library entries reconcile; the launcher exposes meaningful no-code workflows; scientific/shared-state tests pass; the complete repository gate and launcher check pass; CURRENT_STATE is updated; and scheduled HC-06 audits the Waves/Optics plus Electricity/Fields cluster.

## Explicit exclusions

- General relativity, relativistic charged-particle dynamics, radiation reaction and full Maxwell/PDE solvers.
- Non-ideal transformer losses beyond an explicit transmission comparison.
- RLC/phasor, rectification and mass-spectrometer extensions beyond Library-ready metadata.
- Installer/export artifact completion before Phase 20.
- Any curriculum-specific root schema, alternate scheduler/clock or representation-owned physics.
