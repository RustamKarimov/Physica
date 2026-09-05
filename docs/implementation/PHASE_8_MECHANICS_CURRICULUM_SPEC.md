# Phase 8 — Mechanics Curriculum Package Implementation Specification

**Status:** Audited for implementation  
**Roadmap scope:** Phase 8, Cambridge 9702 Topics 1–6 and 12  
**Release gate:** Mechanics Alpha and HC-05

## 1. Purpose

Deliver Physica's first complete curriculum-wide vertical slice. A teacher must be able to create and explore measurements, kinematics, dynamics, statics, energy, deformation and circular-motion explanations without scripting. Physics remains curriculum-independent; Cambridge coverage is evidence metadata over public capabilities.

## 2. Exact scope

Implement:

- deterministic SI mechanics calculations and model contracts;
- teacher-readable scientific validation and explicit assumptions;
- Cambridge topic evidence for Topics 1–6 and 12;
- metadata-driven Physics Library models, apparatus, visuals, instruments and representations required by those topics;
- all 30 mandatory Gallery projects in `docs/CURRICULUM_COVERAGE.md`;
- a launcher-visible Mechanics Alpha workbench containing the seven roadmap workflows;
- focused scientific, dimensional, invariant, serialization, coverage, Library and accessibility tests;
- the scheduled HC-05 audit after all phase gates pass.

The phase does not change the root project schema, create a second clock or scheduler, introduce arbitrary code, or specialize the physics API for Cambridge terminology.

## 3. Packages and files allowed to change

- `packages/physics-mechanics`: scientific models, scenario catalog and domain-owned Library contributions;
- `packages/curriculum`: curriculum profile/evidence records and coverage validation;
- `packages/assets`: composition hook and tests only when needed to combine built-in registries;
- `packages/example-runtime`: shared deterministic mechanics-example execution contract if needed;
- `apps/desktop`: no-code Mechanics Alpha UI and teacher-template integration;
- `examples/mechanics/*`: mandatory executable Gallery evidence;
- root test/script configuration, Gallery pending-artifact ledger and phase documentation.

No renderer, core-model, command, clock, scheduler or solver contract may be redesigned.

## 4. Ownership and dependency direction

`@physica/physics-mechanics` owns physical equations, assumptions, model provenance, domain validation and mechanics Library contributions. It may depend on lower-level mathematics, units, physics-core, solver adapters, core-model and the cross-cutting plugin SDK. It must not import React, editor code or renderer internals.

`@physica/curriculum` owns profile terminology and evidence mapping only. Coverage records reference public capability, Library and example IDs; they do not calculate physics.

The desktop consumes public domain APIs. React state may hold view controls, but physical results are recomputed from immutable parameter records and are never treated as authoritative project state.

## 5. Public scientific contracts

### 5.1 Shared results

All public calculations accept finite canonical SI numbers and return immutable typed results:

```ts
type MechanicsResult<T> =
  | { ok: true; value: Readonly<T> }
  | { ok: false; issues: readonly MechanicsIssue[] };

interface MechanicsIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  path?: string;
}
```

Invalid teacher configuration is data, not an exception. Exact low-level utilities may throw only when their already-frozen dependency contract requires it; domain-facing adapters convert those failures to issues.

### 5.2 Measurements and quantities

- repeated-measurement mean, half-range absolute uncertainty and percentage uncertainty;
- significant-figure/scientific-notation formatting;
- scalar/vector decomposition and magnitude;
- dimensional-equation checks delegated to the central unit/dimension model.

### 5.3 Kinematics

- 1D constant velocity/acceleration and free fall;
- 2D projectile state from initial position, speed, launch angle and gravitational acceleration;
- piecewise analytical motion segments with deterministic boundary ownership;
- linked position, velocity and acceleration samples from the same evaluated state.

### 5.4 Dynamics

- vector force registry and resultant;
- Newton-II acceleration;
- inclined-plane normal, downslope weight, friction and resultant;
- two-mass ideal Atwood/pulley solution;
- impulse from constant or tabulated force;
- one-dimensional elastic/inelastic collisions with momentum and kinetic-energy diagnostics.

### 5.5 Statics, density and pressure

- signed moments about a pivot and equilibrium residuals;
- centre of mass for finite point masses;
- density and hydrostatic pressure;
- stability/tipping criterion with explicit geometric assumptions.

### 5.6 Work, energy and power

- work from constant force or deterministic trapezoidal force–displacement data;
- kinetic, gravitational and elastic potential energy;
- power and efficiency;
- immutable energy ledgers reporting input, useful, stored, dissipated and conservation residual.

### 5.7 Deformation

- Hooke-law force/extension and stored energy;
- stress, strain and Young modulus;
- educational piecewise elastic/plastic constitutive curve with explicit elastic-limit assumptions;
- loading/unloading path metadata without inventing microscopic literalism.

### 5.8 Circular motion

- angle and angular speed;
- `v = omega r`, `a = v^2/r = omega^2 r` and `F = ma`;
- canonical tangent-velocity and inward radial-acceleration vectors;
- uniform circular position from a right-handed +y-up frame.

## 6. Model contracts, authority and runtime boundary

At minimum, projectile and circular-motion analytical models implement the public `PhysicalModelContract` with namespaced IDs, provenance, state channels, observables, solver policy, validation and deterministic evaluation. Multi-body pulley/collision definitions are system-level configurations conceptually and never let two entity components write the same motion channel.

Persistent data contains only parameters, initial conditions, system definitions, representation definitions and bindings. Evaluated state, graph samples, validation summaries and UI control state are derived/transient. Analytical models use `physica:solver/analytical-v1`; simultaneous algebraic systems use the algebraic adapter policy. No model owns a clock or advances itself from render refresh.

## 7. Time, observables and events

Time inputs are seconds on an externally owned named simulation clock. Every evaluation is a pure function of parameters and requested time. Linked views read one returned state.

Observables use stable namespaced IDs and include all quantities listed by Topics 1–6 and 12. Deterministic events are limited to meaningful boundaries such as projectile ground contact, segment changes, collisions and elastic-limit crossing; ordering follows the existing runtime event contract.

## 8. Units, dimensions and coordinates

Public domain calculations use canonical SI units documented on fields. Display conversion uses `@physica/units`; calculations never infer units from labels. Canonical 2D coordinates are right-handed with +y upward. Angle inputs are radians internally. Mass, time, length, area, density, pressure, energy, power, force, momentum, stress and modulus dimensions are tested.

## 9. Validation and assumptions

Validation rejects non-finite inputs; non-positive mass, radius, length, area, duration, density and spring constant where physically required; coefficient of restitution outside `[0,1]`; invalid friction coefficients; unordered samples; impossible uncertainty/precision settings; and conflicting state authority.

Warnings distinguish idealized assumptions: uniform gravitational field, negligible air resistance, massless inextensible string, frictionless pulley, point particle, rigid body, incompressible static fluid, linear elastic region and uniform circular motion. Invalid physics blocks export; schematic/not-to-scale presentation is a warning.

Reference/invariant checks include analytical kinematics, projectile symmetry, Newton II, momentum conservation, elastic collision energy, moments equilibrium, dimensional identities, energy conservation, Hooke/Young relations and radial-vector direction.

## 10. Serialization and extensibility

Mechanics definitions are JSON-safe immutable V1 records with namespaced type/model IDs. Round-trip tests use the existing project/Library snapshot path. Unknown plugin payload policy is unchanged. Plugins may register additional mechanics models and Library contributions through existing registries but cannot inject grammar, React or native code.

## 11. Physics Library contract

Register every canonical item named for Topics 1–6 and 12. Shared objects such as Ball, Ruler, Stopwatch and Velocity Vector retain one canonical ID and gain topic metadata rather than duplicates. All items declare source/version/license, curriculum/topic/search tags, editable properties, assumptions, thumbnails, example IDs and compatible targets where meaningful.

The seven Mechanics Alpha workflows are real apparatus/system prefabs:

1. Projectile Launcher Setup;
2. Inclined Plane + Block;
3. Atwood Machine / Two-Block Pulley System;
4. Collision Track;
5. Efficiency/Energy-Flow Setup;
6. Stress-Strain Demonstration;
7. Ball-on-String Circular Motion.

Their snapshot definitions contain meaningful named entities/configuration rather than a picture-only card. Instantiation remains one snapshot command and never follows later Library changes.

## 12. Curriculum coverage contract

Each topic record contains:

- stable profile/topic ID and title;
- status `UNIMPLEMENTED | IMPLEMENTED | VALIDATED`;
- required and demonstrated capability IDs;
- required and present canonical Library IDs;
- required and present mandatory example IDs;
- scientific test evidence IDs and release-gate evidence;
- computed gaps.

`VALIDATED` is only returned when every required evidence set is present. Phase 8 marks exactly Topics 1–6 and 12 validated; the other 18 topics remain explicitly unimplemented or implemented according to later evidence. Package names alone never count as coverage.

## 13. Gallery contract

Create all mandatory example directories:

- Topic 1: `units-prefixes`, `dimensional-analysis`, `vector-components`, `uncertainty-repeated-measurements`;
- Topic 2: `constant-velocity`, `constant-acceleration`, `free-fall`, `projectile`, `motion-graphs-linked`;
- Topic 3: `forces-fbd`, `inclined-plane`, `pulley-system`, `elastic-collision`, `inelastic-collision`, `impulse`;
- Topic 4: `moments-balance`, `centre-of-mass-stability`, `density`, `pressure-depth`;
- Topic 5: `energy-conservation`, `spring-energy`, `work-area`, `power-efficiency`;
- Topic 6: `hooke-law`, `young-modulus`, `stress-strain`, `elastic-energy`;
- Topic 12: `uniform-circular-motion`, `centripetal-force`, `velocity-acceleration-followers`.

Each includes metadata, README, deterministic executable input/output, an accessible SVG preview, an automated example test and a truthful pending-artifact declaration for `.physica`, PNG and WebM until Phase 20's shared packaging/capture pipeline exists. Root coverage/ledger tests require exact reconciliation.

## 14. Desktop Mechanics Alpha

The launcher exposes a Mechanics route and project templates. The workbench presents the physical question, editable controls with units, assumptions, equations, values and meaningful diagrams for all seven release-gate workflows. Visual transitions derive from evaluated physical state; controls are keyboard accessible; diagrams have text alternatives; colour is not the sole information carrier; reduced-motion settings disable non-essential interpolation.

The authoring shell remains available, uses the combined metadata-driven Library and labels Phase 8 truthfully. This workbench is a usable scientific alpha, not claimed final lesson artwork.

## 15. Performance

Calculations are O(1), except O(n) sample/ledger operations. Scenario previews use bounded sample counts and memoized pure evaluation. Mechanics UI is lazy-loaded from the stable shell. No large physics engine or new dependency is added.

## 16. Test matrix

- unit: each public calculation, boundary and typed error;
- scientific reference: published textbook-scale cases and invariant residuals;
- dimensional: central units/dimensions for every mechanics equation family;
- model lifecycle: initialize/evaluate/reset/event behavior;
- determinism: repeated scenario evaluation and canonical JSON equality;
- serialization: Library snapshot and scenario configuration round trips;
- Library: registration completeness, exact IDs, references, search and seven prefab instantiations;
- curriculum: exact mandatory lists, gaps and validated-status proof;
- examples: 30 exact outputs, accessible previews and ledger reconciliation;
- UI: keyboard controls, workflow switching, assumptions/diagnostics and reduced motion;
- integration: formatting, lint/architecture, strict TypeScript, complete tests, all app builds and launcher checks.

## 17. Definition of Done

Phase 8 is complete only when all 30 mandatory examples exist and execute; Topics 1–6 and 12 resolve to `VALIDATED` from explicit evidence; all named Library categories are registered; the seven no-code Mechanics Alpha workflows are usable through `Launch Physica.bat`; scientific/invariant/dimensional and full CI gates pass; self-review defects are corrected; `docs/CURRENT_STATE.md` is updated; and HC-05 is recorded and passes.

## 18. Explicit exclusions

- Waves, electricity, fields, thermal, modern, practical-toolkit and extended-module implementations;
- rigid-body engine replacement, drag-force terminal-speed production model, hydrostatic buoyancy production solver, vertical-circle/conical-pendulum/banked-track production systems and full hysteresis material fitting beyond the curriculum-listed extensions;
- final `.physica` ZIP packaging, raster/video capture, installers and production Gallery application (Phase 20);
- AI-assisted authoring, arbitrary code, telemetry or curriculum-specific root fields;
- final stable 1.0 declaration.

## 19. Pre-implementation architecture audit

- **Constitution/ADR compatibility:** pass; models are physics-authoritative, deterministic, namespaced and separate from presentation.
- **Dependency direction:** pass; domain package imports only lower/cross-cutting public APIs and never editor internals.
- **Writer/clock ownership:** pass; analytical evaluations do not own time or mutate project/runtime stores; multi-body calculations return one system result.
- **Serialization:** pass; no root field or schema-version change; Library instantiation uses existing V1 snapshots.
- **Plugin isolation:** pass; contributions use public registries and JSON-safe definitions.
- **Library/examples:** pass in specification; exhaustive lists and executable evidence are mandatory gates.
- **Architecture blocker:** none.
