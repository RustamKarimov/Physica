# Phase 13 — Oscillations and advanced periodic systems

Status: implementation specification

## Scope

Phase 13 validates Cambridge 9702 Topic 17 and supplies curriculum-independent
periodic-system extensions for damping, driving, resonance, coupled normal modes
and nonlinear pendulum stepping.

The release gate is one scrub-safe simple-harmonic-motion scene in which mass
position, velocity, acceleration, restoring force, kinetic energy, potential
energy, total energy and all graph followers are evaluated from the same named
time. A visually plausible but independently animated diagram does not pass.

## Ownership and authority

- @physica/physics-mechanics owns oscillation parameters, states, observables,
  equations, validation, scenarios and Topic 17 Library metadata.
- Analytical SHM, small-angle pendulum, steady driven response and identical
  two-oscillator normal modes use closed-form evaluation.
- @physica/solver-ode remains numerical authority for damped/driven transient
  and nonlinear-pendulum steps.
- Runtime time is supplied explicitly. The domain package does not own a clock,
  scheduler, presentation timeline or animation loop.
- The desktop and renderers consume immutable scientific results and never
  independently integrate or phase-shift the apparatus.
- SI values are authoritative. Degrees, centimetres and display scales are
  interface conversions only.

## Scientific contracts

### Simple harmonic motion

- x = A cos(omega t + phi).
- v, a and force are analytical derivatives of the same phase.
- a = -omega squared x and F = ma = -kx with k = m omega squared.
- Period is 2 pi / omega.
- Kinetic and elastic potential energy exchange while their sum remains
  one-half k A squared.
- Scrubbing is direct evaluation at absolute named time, so evaluation order,
  prior playback and frame rate cannot change the result.

### Pendulum

- The small-angle model uses omega = sqrt(g/L), angular amplitude and arc
  displacement L theta.
- The approximation is disclosed and validated against a configurable
  educational small-angle limit.
- The nonlinear extension integrates theta double-dot =
  -(g/L) sin(theta) through the existing ODE adapter.

### Damping, driving and resonance

- Numerical transient state is [displacement, velocity] with acceleration
  (F0 cos(omega_d t) - c v - k x) / m.
- Parameters require positive mass and stiffness, non-negative damping and
  finite drive values.
- Steady-state driven amplitude and phase use the standard linear response.
- Resonance curves are sampled from that same response function; damping and
  frequency labels are never inferred from drawing geometry.
- Energy dissipation is derived from c v squared and total mechanical energy
  from the shared state.

### Coupled extension

- Two identical masses with identical grounding springs and one coupling spring
  expose symmetric and antisymmetric normal-mode frequencies.
- Both mass positions are analytical combinations of the same two normal-mode
  phases.
- This is a registered coupled model owning both positions; it does not create
  competing per-mass writers.

## Public surface

The mechanics package exposes:

- analytical SHM and linked samples;
- small-angle and nonlinear pendulum evaluation;
- damped/driven ODE stepping;
- steady driven response and resonance-curve sampling;
- coupled identical-oscillator normal modes;
- analytical SHM and numerical driven PhysicalModelContract adapters;
- four immutable mandatory scenarios;
- a dedicated Topic 17 Physics Library registrar and requirement ledger.

All invalid public inputs return teacher-readable MechanicsResult issues.
Model provenance states assumptions, validity, approximation, determinism and
solver policy.

## Mandatory Gallery projects

- shm-linked-views
- pendulum-shm
- damped-oscillator
- resonance

Every project contains executable public-API input, exact expected JSON,
metadata, README, accessible SVG preview, pending production-export declaration
and automated reconciliation.

## Desktop release gate

The Oscillations Alpha becomes the launcher default and retains all earlier
routes. It provides no-code SHM, pendulum, damping, resonance and coupled-system
workflows.

For SHM, one labelled scrub control supplies the authoritative time. The mass,
equilibrium/extreme markers, x/v/a/F vectors, phase, energy bars, x–t, v–t,
a–t and energy graph followers all use the same evaluated frame. Tests verify
the analytical identities and that the current graph samples equal the
apparatus/readout frame.

Native controls, keyboard focus, text/shape alternatives to color and
reduced-motion behavior are mandatory. Matching Author templates and the full
Topic 17 Library must instantiate without scripting.

## Verification

- SHM derivative, restoring relation, phase and energy invariants;
- absolute-time deterministic replay and scrub-order independence;
- pendulum period and small-angle validation;
- numerical damped-energy decay and convergence against analytical limiting
  cases;
- driven amplitude, phase and resonance behavior;
- coupled normal-mode frequency and symmetry checks;
- invalid input and model-contract tests;
- complete Library registration;
- exact Gallery reconciliation;
- synchronized desktop release-gate smoke tests;
- formatting, architecture boundaries, strict TypeScript, full tests, all
  application builds and launcher preflight;
- scheduled HC-07 after the phase passes, including integration, maintainability,
  scientific, Gallery and performance audits.

Topic 17 becomes VALIDATED only after every capability, Library, Gallery,
scientific-test and desktop release-gate evidence item exists.
