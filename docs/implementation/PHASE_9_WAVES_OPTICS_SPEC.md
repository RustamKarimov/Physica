# Phase 9 — Waves, Superposition and Optics Implementation Specification

**Status:** Audited for implementation  
**Roadmap scope:** Cambridge 9702 Topics 7–8 plus approved Geometrical and Physical Optics extensions  
**Release gate:** Wave/Optics Alpha; HC-06 remains scheduled after Phase 11

## 1. Purpose

Deliver a topic-neutral deterministic wave and optics layer whose diagrams, graphs and measurements all derive from the same physical state. A teacher must be able to explore progressive and longitudinal waves, reflection, superposition, standing waves, diffraction/interference, ray optics, lenses and polarization without scripting.

## 2. Exact scope

Implement:

- analytical harmonic, pulse, longitudinal, boundary, superposition, standing-wave and beat calculations in `@physica/physics-waves`;
- single-slit, double-slit, grating, two-source, Snell/TIR, mirror, thin-lens and Malus-law calculations in `@physica/physics-optics`;
- immutable model contracts, stable observables, explicit approximations and teacher-readable validation;
- Physics Library models, apparatus, visuals, probes and representations required by Topics 7–8 and the two optics extensions;
- nine mandatory Topic 7–8 Gallery projects plus `geometrical-optics-overview` and `physical-optics-overview`;
- explicit curriculum evidence marking exactly Topics 7 and 8 newly `VALIDATED`;
- a launcher-visible Wave/Optics Alpha with progressive-wave, standing-wave, double-slit, ray/lens and polarization workflows;
- scientific, dimensional, invariant, determinism, serialization, Library, curriculum, Gallery and UI smoke tests.

This phase does not implement electricity, field, thermal, modern-physics or practical curricula and does not change a root schema, clock, scheduler, renderer or solver contract.

## 3. Ownership and dependency direction

`@physica/physics-waves` owns scalar wave state, medium displacement, phase, superposition and boundary behavior. `@physica/physics-optics` owns geometric rays, apertures, optical intensity and polarization. They are sibling domain packages and remain independent; shared low-level mathematics comes from existing lower packages rather than cross-importing domain state.

`@physica/curriculum` maps public evidence only. The desktop consumes public APIs and stores controls as transient view state. Physics packages must not import React, editor, renderer or curriculum internals.

## 4. Public scientific contracts

Domain-facing functions accept finite canonical SI values and return immutable discriminated results with stable issue codes. Invalid wavelength, frequency, speed, amplitude, distance, aperture, refractive index, focal length configuration or polarization angle is data rather than an uncaught exception.

### 4.1 Waves

- Harmonic state uses `y(x,t) = A sin(kx - omega t + phi)` with `k = 2pi/lambda`, `omega = 2pi f` and `v = f lambda`.
- Particle transverse velocity is the time derivative of displacement; pattern speed is reported separately from medium-particle motion.
- Gaussian pulse state exposes incident/reflected/transmitted parts and signed amplitude coefficients.
- Longitudinal state exposes equilibrium position, particle displacement and compression proxy without implying bulk transport at wave speed.
- Superposition sums component displacements from one requested coordinate/time.
- Standing waves expose nodes, antinodes and `2 A sin(kx) cos(omega t + phi)` under stated equal-frequency/equal-amplitude assumptions.
- Beat envelope and phase/path differences use one sign convention documented in returned metadata.

### 4.2 Optics

- Single-slit intensity uses normalized `sinc²(beta)` with its removable zero handled exactly.
- Double-slit intensity uses one physical state for interference fringes and optional finite-slit diffraction envelope; exact path difference is available and the small-angle screen mapping is explicitly disclosed.
- Grating intensity uses the finite-source array factor with its removable singularities handled exactly.
- Snell refraction reports reflected/refracted angles and total internal reflection where applicable.
- Thin-lens state uses a declared Cartesian sign convention and reports virtual/real image status and magnification.
- Malus law returns `I = I0 cos²(theta)` and never treats the polarization schematic as a literal electromagnetic-field solver.

## 5. Model, time and authority contracts

At minimum the harmonic-wave and double-slit models implement `PhysicalModelContract` using existing analytical solver provenance. Time is an externally supplied named-clock value; evaluations are pure and do not advance clocks or write runtime/document stores. Screen strips, graphs, waveforms, particles and vectors read the same returned state or bounded samples from the same parameter record.

Boundary arrival, node/antinode positions, critical-angle transition and fringe maxima/minima are deterministic derived events or diagnostics. No animation frame becomes a second physical authority.

## 6. Units, coordinates and approximations

Calculations use metres, seconds, hertz, radians, watts per square metre and dimensionless refractive ratios. The canonical 2D frame is right-handed with +y upward. Wave speed, phase, inverse-square/intensity and aperture relations receive central-dimension tests where applicable.

Every approximation is explicit: scalar paraxial diffraction, Fraunhofer far field, thin lens, ideal coherent monochromatic sources, linear medium, ideal polarizers and schematic ray bundles. Parameter validation blocks configurations outside the owning formula's mathematical domain; it does not silently switch models.

## 7. Physics Library and examples

Register every item named under Topics 7–8 in `docs/CURRICULUM_COVERAGE.md`, preserving canonical shared IDs such as Oscilloscope. Add extension items for ray boundaries, mirrors, lenses, prisms, polarizers and optical screens. Each definition declares source/version/license, tags, assumptions, example IDs and a JSON-safe immutable prefab snapshot.

Create the exact projects:

- Topic 7: `progressive-wave`, `longitudinal-wave`, `pulse-reflection`, `wave-parameters`;
- Topic 8: `superposition`, `standing-wave`, `two-source-interference`, `single-slit`, `double-slit`;
- extensions: `geometrical-optics-overview`, `physical-optics-overview`.

Each project contains metadata, README, deterministic executable result, exact expected JSON, accessible SVG preview, automated central example coverage and truthful Phase 20 pending declarations. The root ledger remains exact and duplicate-free.

## 8. Curriculum and desktop release gate

Curriculum evidence must mark Topics 7 and 8 `VALIDATED` only when all declared capabilities, Library IDs, examples, scientific tests and the Wave/Optics release gate exist. The total after Phase 9 is 9/25 validated.

The launcher defaults to a discoverable Wave/Optics Alpha route while retaining Mechanics and Author routes. The double-slit workflow is the release gate: its screen intensity strip and graph are generated from the same wavelength, slit-separation, slit-width and screen-distance record. Native labelled controls, semantic selected state, diagram text alternatives, visible focus, non-colour labels and reduced-motion behavior are required.

## 9. Verification and performance

Reference and invariant tests cover `v=f lambda`, harmonic phase, wave-equation derivatives, boundary coefficients, superposition identity, standing-wave nodes, fringe spacing, slit minima, grating maxima, Snell law, TIR, lens equation and Malus law. Repeated evaluations and serialized scenarios must be exact and finite, including analytic singularity limits.

All calculations are O(1) except explicitly bounded O(n) sample generation. The Wave/Optics route is lazy-loaded; no new third-party dependency is permitted. Phase completion requires focused tests, full formatting/lint/architecture/type/test/build CI, frozen install, launcher check, review corrections, updated state, commit and push.

## 10. Explicit exclusions

- full electromagnetic field solvers, Fresnel/Fourier grids, thin-film production models and literal molecular audio propagation;
- final audio synthesis, `.physica` ZIPs, PNG/WebM capture, installers and production Gallery application (Phase 20);
- curriculum-specific fields in domain models, arbitrary code, AI interpretation or a competing runtime authority;
- Phase 10 electricity work or an early HC-06.

## 11. Pre-implementation architecture audit

- **Constitution/ADR compatibility:** pass; physics remains authoritative, deterministic and separate from presentation.
- **Dependency direction:** pass; both domain packages use lower public contracts and remain independent of React/editor internals.
- **Writer/clock ownership:** pass; all evaluations are pure at supplied coordinates/time.
- **Serialization/plugin isolation:** pass; models and Library definitions are namespaced JSON-safe V1 records.
- **Curriculum truthfulness:** pass in specification; only explicit evidence may add Topics 7–8.
- **Architecture blocker:** none.
