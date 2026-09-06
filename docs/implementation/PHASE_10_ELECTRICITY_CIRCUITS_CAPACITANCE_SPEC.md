# Phase 10 — Electricity, D.C. Circuits and Capacitance Implementation Specification

**Status:** Audited for implementation  
**Roadmap scope:** Cambridge 9702 Topics 9, 10 and 19  
**Release gate:** Electricity/Circuits half of Electricity/Fields Alpha; HC-06 remains scheduled after Phase 11

## 1. Purpose

Deliver one deterministic electrical domain in which charge, current, potential difference, component behavior, network solutions, meter readings, power and capacitor transients remain different views of the same scientific state. A teacher must be able to construct and explore the required electricity, D.C. circuit and capacitance lessons without scripting.

## 2. Exact scope

Implement:

- immutable SI-canonical charge/current, potential, resistance, resistivity, electrical-power and component-characteristic calculations in `@physica/physics-electricity`;
- a namespaced component registry with typed electrical ports and constitutive-law metadata for sources, resistors, non-ohmic components, switches, ideal meters and capacitors;
- validated graph-topology compilation onto the existing `@physica/solver-circuits` modified-nodal solver, preserving its solver descriptor and adding typed domain diagnostics rather than a competing network solver;
- series/parallel and multi-loop D.C. networks, emf/internal resistance, potential dividers, sensor and variable-resistor extensions, meter observations, KCL/KVL residuals and short/open/singularity warnings;
- capacitance, stored energy, series/parallel combinations, parallel-plate/dielectric relations and exact analytical RC charging/discharging state;
- every Physics Library model, apparatus, visual, instrument and representation named for Topics 9, 10 and 19 in `docs/CURRICULUM_COVERAGE.md`, with canonical shared IDs deduplicated;
- the 13 mandatory Gallery projects, explicit curriculum evidence, a launcher-visible Electricity/Circuits Alpha and matching no-code Author templates;
- scientific, dimensional, invariant, topology, determinism, serialization, Library, curriculum, Gallery and UI smoke tests.

This phase does not implement electric-field spatial models, magnetism, alternating-current networks, final export/distribution or Phase 11 curriculum evidence.

## 3. Ownership and dependency direction

`@physica/physics-electricity` owns electrical component semantics, teaching-level constitutive laws, domain validation, observables, scenarios and Library contributions. `@physica/solver-circuits` remains the lower numerical authority for simultaneous network equations and may expose additional validated diagnostics without importing domain/UI packages. The electricity package may depend on core model, physics core, plugin SDK and circuit solver; it must not depend on React, editor, renderer, curriculum or another high-level physics domain.

`@physica/curriculum` maps public evidence only. The desktop consumes public domain APIs, renders transient view state and never becomes an electrical solver or state authority. Extended electronics must register through the same component/network contracts rather than create a parallel electronics core.

## 4. Public scientific contracts

All domain functions accept finite canonical SI values and return deeply immutable discriminated results with stable issue codes, paths and teacher-readable messages. Mathematically or physically invalid input is data, never an uncaught exception at the domain boundary.

### 4.1 Electricity and components

- Charge/current bookkeeping uses `Q = It` with signed transfer direction stated explicitly.
- Ohmic resistance uses `V = IR`; electrical power and energy expose the equivalent `VI`, `I²R` and `V²/R` forms only when their denominators and model assumptions are valid.
- Resistivity uses `R = rho L/A` with positive length, area and resistivity.
- Ohmic, filament-lamp, thermistor and LDR characteristics are separate registered constitutive laws. Non-ohmic curves state their teaching approximation and do not claim constant resistance.
- Component ports have stable semantic IDs, electrical direction, connection capacity and measurable node/branch meaning.

### 4.2 D.C. networks and meters

- Network topology compiles deterministically from stable node, branch and component IDs to one solver input.
- Simultaneous networks use `@physica/solver-circuits`; relationships or callback order must not solve KCL/KVL cycles.
- Ideal ammeters observe branch current with zero burden in the teaching model. Ideal voltmeters observe node-potential difference with infinite input resistance and do not add a conductive branch.
- A cell with internal resistance reports emf, current, terminal potential difference, lost volts, load power and internal power from one state.
- Potential-divider output is derived from the solved or analytically equivalent network and supports a bounded slider/contact ratio.
- Validation reports duplicate/missing nodes or components, invalid ports/values, disconnected/open paths, prohibited zero-resistance shorts, singular networks and KCL/KVL residual breaches.

### 4.3 Capacitors and transients

- Capacitor state exposes `Q = CV`, `U = 1/2 CV² = 1/2 QV = Q²/(2C)` and unit-consistent observables.
- Parallel-plate capacitance uses `C = epsilon_0 epsilon_r A/d`, with the ideal uniform-field/fringing omission declared.
- Equivalent capacitance follows exact series reciprocal and parallel sum rules.
- RC charging/discharging uses exact analytical exponential state at supplied named-clock time, including voltage, charge, current, energy and `tau = RC`; evaluation never advances a clock.
- Dielectric insertion changes the declared relative permittivity parameter and does not pretend to model molecular polarization.

## 5. Model, time and authority contracts

At minimum an ohmic D.C. network and RC transient expose `PhysicalModelContract` adapters with the existing circuit solver provenance. D.C. evaluation is a pure snapshot. RC time is supplied externally from a named clock; graphs, schematic charge markers, meters and numerical values sample the same parameter/state record. No animation frame, graph cache, component glyph or editor control is an authoritative writer.

Switch and slider changes are routed as initial/live inputs through existing control contracts. Document/runtime separation and the single-authoritative-writer rule remain unchanged. A future electromechanical or AC coupling must use the registered coupled-system policy, not hidden callbacks.

## 6. Units, sign conventions and approximations

Calculations use coulombs, amperes, volts, ohms, ohm metres, watts, joules, farads, metres and seconds. Conventional current is positive from higher to lower potential through passive components; voltage-source polarity is explicit. Solver branch-current signs are reported with named from/to nodes rather than silently made positive.

Declared idealizations include lumped D.C. components, ideal wires, ideal meters, steady temperature unless a component characteristic says otherwise, negligible fringing, linear dielectric and exact first-order RC behavior. Parameter validation blocks invalid mathematical domains and keeps meter/component idealizations visible to teachers.

## 7. Physics Library and component registry

Register every item named under Topics 9, 10 and 19. Shared objects such as resistor, wire, cell/source, switch, ammeter and voltmeter retain one canonical Library ID while accumulating all relevant topic tags and examples. Every item declares source/version/license, tags, assumptions, compatible electrical ports or observable bindings, example IDs and a JSON-safe immutable prefab snapshot.

The component registry must include at least ideal wire, D.C. voltage source, cell with internal resistance, resistor, variable resistor, switch, filament lamp, thermistor, LDR, ideal ammeter, ideal voltmeter and capacitor. It validates unique namespaced type IDs and creates no React/editor dependency.

## 8. Required Gallery projects

Create the exact projects:

- Topic 9: `charge-current`, `ohmic-resistor`, `iv-characteristics`, `resistivity`, `electrical-power`;
- Topic 10: `series-parallel`, `kirchhoff-network`, `internal-resistance`, `potential-divider`;
- Topic 19: `capacitance-qv`, `capacitor-energy`, `capacitors-combinations`, `rc-charging`.

Each project contains metadata, README, deterministic executable result, exact expected JSON, accessible SVG preview, automated central example coverage and truthful Phase 20 pending declarations. The root ledger remains exact, duplicate-free and reconciled.

## 9. Curriculum and desktop release gate

Curriculum evidence marks Topics 9, 10 and 19 `VALIDATED` only when every declared capability, Library ID, example, scientific test and release gate is present. The total after Phase 10 is exactly 12/25 validated.

The launcher defaults to a discoverable Electricity/Circuits Alpha route while retaining Waves/Optics, Mechanics and Author routes. It provides at least charge/current, I–V, resistivity/power, D.C. network, internal-resistance/potential-divider and RC-transient workflows. Circuit symbols, node-potential overlay, branch-current arrows, meters, graphs and values derive from the same solved state. Native labelled controls, semantic selected/switch state, diagram text alternatives, visible focus, non-colour encodings and reduced-motion behavior are required.

The Author route contains matching no-code templates and the combined Physics Library. Connect mode may expose compatible electrical ports, but arbitrary circuit-canvas authoring is not allowed to bypass command transactions or claim completion without validated topology.

## 10. Verification and performance

Reference/invariant tests cover `Q=It`, `V=IR`, power identities, `R=rho L/A`, non-ohmic monotonic/reference points, series/parallel equivalence, multi-loop KCL/KVL, terminal p.d./lost volts, divider limits, ideal-meter behavior, `Q=CV`, capacitor energy identities, combination rules, parallel-plate scaling and RC values at 0, one time constant and long time. Invalid, singular, open and short circuits produce stable diagnostics.

Repeated evaluations and serialized scenarios are exact and finite. Network assembly is deterministic; solve complexity remains owned and documented by the existing dense linear adapter. UI graph/schematic sampling is explicitly bounded O(n). The new route is lazy-loaded; no third-party dependency is permitted.

Phase completion requires focused tests, formatting/lint/architecture/type/test/build CI, frozen offline install, launcher check, four-perspective review corrections, updated state, commit and push. HC-06 is not run until Phase 11 unless an early-trigger condition fires.

## 11. Explicit exclusions

- spatial electric-field lines, equipotentials and charged-particle trajectories (Phase 11);
- AC waveform/network solving, induction, transformers and magnetism (Phase 11);
- semiconductor device physics, production SPICE behavior, electromagnetic transmission lines and thermal filament dynamics;
- final `.physica` ZIPs, PNG/WebM capture, installers, update channels and production Gallery application (Phase 20);
- root schema, clock, scheduler, renderer or relationship-engine redesign;
- arbitrary code execution, AI interpretation, curriculum-specific domain fields or a competing circuit solver.

## 12. Pre-implementation architecture audit

- **Constitution/ADR compatibility:** pass; simultaneous network equations remain with the circuit solver and physics stays authoritative.
- **Dependency direction:** pass; the electricity domain consumes lower public contracts and remains independent of React/editor internals.
- **Writer/clock ownership:** pass; D.C. and RC evaluations are pure at supplied inputs/time.
- **Serialization/plugin isolation:** pass in specification; components, scenarios and Library definitions are namespaced JSON-safe V1 records.
- **Curriculum truthfulness:** pass in specification; only complete evidence may add Topics 9, 10 and 19.
- **Architecture blocker:** none.
