# Curriculum Coverage

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns mapping from curricula to physics capabilities, library items, simulations, animations, representations, validators and examples.

## Scope

Cambridge 9702 all 25 topics, practical physics and extended physics modules.

## Owned concepts

- CurriculumProfile
- coverage status
- topic capability matrix

## Dependencies

- `PHYSICS_LIBRARY.md`
- `PHYSICS_RUNTIME.md`
- `EXAMPLE_SYSTEM.md`

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

## Cross-topic teaching-content capability

Every curriculum topic may use the canonical `TextBlock` representation for definitions, explanations, captions, callouts, quotations, bullet/numbered lists, examiner notes and warnings. These are presentation/content capabilities, so they are not redundantly listed as a separate physics model under every Part 29 topic. Topic Storyboards may animate them through the shared Animation Engine.

## Invariants / required behavior

- track all 25 topics individually
- keep physics engine curriculum-independent

## This subsystem MUST NOT

- claim full Cambridge support before every topic is VALIDATED

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- coverage completeness CI

## Example Gallery obligations

- `topic mandatory examples`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §21 -->
# 21. CURRICULUM PROFILE SYSTEM

A Curriculum Profile specifies:

- topic list;
- terminology;
- allowed/required models;
- constants/defaults;
- equations;
- expected practical skills;
- warnings;
- assessment conventions;
- example tags.

Initial mandatory profile:

**Cambridge International AS & A Level Physics 9702 — 25 topics plus practical skills.**

Future profiles:

- IB Physics;
- AP Physics;
- AQA;
- Edexcel;
- custom school profile.

The physics engine remains curriculum-independent where the underlying model is the same.

## 21.1 Constants registry

Physical constants use a versioned `ConstantsRegistry`.

A curriculum profile may choose display precision/default values without changing the underlying constant identity.

A saved project records the constants/profile version needed for reproducible calculation when the value affects results.

## 21.2 Internationalisation and locale

UI text, curriculum terminology and Library descriptions use message keys rather than hard-coded English strings.

Canonical project numbers use locale-independent storage.

Display formatting supports locale decimal/group separators without changing numeric values.

Right-to-left UI and bidirectional text are supported at the design-system level.

Equation semantics remain language-independent.

---

<!-- Source: Master §29 -->
# 29. COMPLETE CAMBRIDGE 9702 CAPABILITY CATALOG

The catalog below is intentionally wider than the minimum examination requirement. Its job is to make the architecture ready for likely teaching requests from the start.

## 29.1 Topic 1 — Physical quantities and units

### Physics/model capabilities

- SI quantity/dimension model
- scalar/vector quantities
- measurement and uncertainty model
- scientific notation and significant-figure formatter

### Animation requirements

- prefix-scale transitions
- scientific-notation digit shift
- scalar versus vector comparison
- vector component reveal
- uncertainty-interval reveal
- dimensional-symbol grouping
- unit cancellation/rearrangement
- orders-of-magnitude zoom

### Simulation / interactive requirements

- unit conversion explorer
- dimensional-analysis checker
- vector component manipulator
- repeat-measurement/uncertainty explorer
- significant-figures sandbox

### Required representations

- quantity card
- unit tree
- vector diagram
- uncertainty interval
- measurement table
- equation

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `PhysicalQuantity`
- `ScalarQuantity`
- `VectorQuantity`
- `Measurement`
- `UncertainQuantity`
- `RepeatedMeasurementSet`
- `CoordinateFrame`

#### Apparatus / System Prefabs

- SI Units Workbench
- Vector Components Workbench
- Repeated Measurement Table
- Uncertainty Comparison Scene

#### Visual Objects / Assets

- measurement marker
- coordinate axes
- scale/ruler graphic
- unit-prefix scale strip
- scientific-notation place-value strip

#### Instruments, Probes and Bound Representations

- metre rule
- vernier caliper
- micrometer screw gauge
- stopwatch
- digital timer
- balance
- protractor
- data table
- uncertainty interval tool

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- value
- dimension
- display unit
- uncertainty
- percentage uncertainty
- vector magnitude/components

### User controls

- unit picker
- prefix picker
- vector handles
- sample-count input
- measurement editor

### Scientific validation

- dimensional homogeneity
- unit compatibility
- illegal conversions
- rounding/display policy

### Mandatory example-gallery projects

- `units-prefixes`
- `dimensional-analysis`
- `vector-components`
- `uncertainty-repeated-measurements`

---

## 29.2 Topic 2 — Kinematics

### Physics/model capabilities

- 1D analytical kinematics
- 2D analytical kinematics
- piecewise motion
- numerically integrated motion extension

### Animation requirements

- position/displacement
- velocity follower
- acceleration follower
- trajectory/trail
- component decomposition
- freeze-and-explain
- graph cursor sync
- gradient/area reveal

### Simulation / interactive requirements

- constant velocity
- constant acceleration
- free fall
- projectile motion
- piecewise motion
- graph-to-motion
- motion-to-graph
- drag extension

### Required representations

- moving body
- number line
- trajectory
- vectors
- x–t graph
- v–t graph
- a–t graph

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `PointParticle`
- `TranslationalBody`
- `ConstantVelocityModel`
- `ConstantAccelerationModel`
- `FreeFallModel`
- `ProjectileModel`
- `PiecewiseMotionModel`
- `NumericalTrajectoryBody`

#### Apparatus / System Prefabs

- Straight Motion Track
- Free-Fall Tower
- Projectile Launcher Setup
- Ticker-Timer Motion Setup
- Motion-Sensor Setup
- Two-Body Motion Comparison

#### Visual Objects / Assets

- ball
- block
- trolley
- car
- cyclist
- person
- train
- lift/elevator
- projectile marker
- ground plane
- track
- launch platform

#### Instruments, Probes and Bound Representations

- motion sensor
- light gate
- ticker timer
- stopwatch
- position marker
- displacement vector
- velocity vector
- acceleration vector
- trajectory
- motion-graph panel

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- position
- displacement
- distance
- velocity
- speed
- acceleration
- time

### User controls

- initial position
- initial velocity
- acceleration
- launch angle
- gravity
- time scrubber

### Scientific validation

- analytical reference cases
- graph/state agreement
- units
- event timing

### Mandatory example-gallery projects

- `constant-velocity`
- `constant-acceleration`
- `free-fall`
- `projectile`
- `motion-graphs-linked`

---

## 29.3 Topic 3 — Dynamics

### Physics/model capabilities

- force registry
- Newtonian translational dynamics
- friction/contact
- impulse
- momentum
- collision/event models
- connected-body constraints

### Animation requirements

- force arrows
- resultant construction
- FBD extraction
- Newton-III pair emphasis
- impulse area
- momentum before/after
- collision event
- constraint tension

### Simulation / interactive requirements

- block under forces
- inclined plane
- static/kinetic friction
- pulley/Atwood
- elastic collision
- inelastic collision
- explosion/separation
- variable-force motion
- terminal-speed extension

### Required representations

- physical scene
- FBD
- momentum vectors
- force-time graph
- before/after panel

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `NewtonianBody`
- `Force`
- `GravityForce`
- `NormalContact`
- `FrictionForce`
- `TensionForce`
- `AppliedForce`
- `DragForce`
- `ImpulseModel`
- `MomentumBody`
- `CollisionModel`
- `StringConstraint`

#### Apparatus / System Prefabs

- Inclined Plane + Block
- Atwood Machine
- Two-Block Pulley System
- Collision Track
- Newton Third-Law Pair
- Impulse Cart Setup
- Explosion/Separation Setup
- Terminal-Speed Extension Setup

#### Visual Objects / Assets

- mass block
- trolley/cart
- rough surface
- smooth surface
- inclined plane
- pulley
- string
- hook
- spring balance
- rocket/expelling body
- collision bumper

#### Instruments, Probes and Bound Representations

- force sensor
- newton meter
- light gate
- momentum vector
- force vector
- resultant-force vector
- free-body diagram
- force-time graph
- impulse-area overlay

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- forces
- resultant force
- momentum
- impulse
- normal force
- friction
- tension

### User controls

- mass
- force magnitude/direction
- coefficient of friction
- restitution
- pulley masses

### Scientific validation

- Newton II
- momentum conservation when applicable
- energy for elastic collision
- constraint error

### Mandatory example-gallery projects

- `forces-fbd`
- `inclined-plane`
- `pulley-system`
- `elastic-collision`
- `inelastic-collision`
- `impulse`

---

## 29.4 Topic 4 — Forces, density and pressure

### Physics/model capabilities

- rigid-body statics
- moments
- centre of mass/gravity
- density
- scalar pressure field
- hydrostatic extension

### Animation requirements

- moment arm
- turning direction
- centre-of-mass marker
- stability/tipping
- pressure arrows
- pressure-depth gradient
- density-volume comparison

### Simulation / interactive requirements

- beam equilibrium
- multi-load moments
- movable pivot
- stability
- density/mass/volume
- pressure-depth
- manometer extension
- buoyancy extension

### Required representations

- beam/pivot
- COM marker
- pressure probe
- fluid container
- moment equation
- pressure graph

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `RigidBodyStatics`
- `CentreOfMassModel`
- `PivotConstraint`
- `MomentTorqueModel`
- `DensityBody`
- `PressureField`
- `HydrostaticPressureModel`

#### Apparatus / System Prefabs

- Moments Beam
- Multiple-Load Balance
- Centre-of-Gravity Plumb-Line Setup
- Stability/Tipping Setup
- Density Measurement Setup
- Pressure-Depth Vessel
- U-Tube Manometer Extension
- Hydraulic System Extension

#### Visual Objects / Assets

- beam
- pivot
- support
- hanging mass
- irregular lamina
- plumb line
- cube
- cylinder
- liquid container
- fluid column
- piston
- pressure surface

#### Instruments, Probes and Bound Representations

- balance
- measuring cylinder
- ruler
- pressure probe
- pressure gauge
- manometer
- centre-of-mass marker
- perpendicular-distance marker
- moment arrow

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- moment
- resultant moment
- centre of mass
- density
- pressure
- depth

### User controls

- pivot position
- load positions
- masses
- density
- fluid density
- depth

### Scientific validation

- force/moment equilibrium
- density relation
- hydrostatic relation in extension

### Mandatory example-gallery projects

- `moments-balance`
- `centre-of-mass-stability`
- `density`
- `pressure-depth`

---

## 29.5 Topic 5 — Work, energy and power

### Physics/model capabilities

- work-energy ledger
- kinetic/gravitational/elastic energy
- power
- efficiency
- variable-force work

### Animation requirements

- energy bars
- energy transfer flow
- force-displacement area
- KE↔PE exchange
- spring energy
- power-rate visualization
- efficiency flow

### Simulation / interactive requirements

- falling body energy
- spring energy
- variable-force work
- power in motion
- dissipative energy
- roller-coaster extension

### Required representations

- energy bars
- Sankey-like flow
- F–x graph
- power meter
- equations

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `EnergyLedger`
- `WorkProcess`
- `KineticEnergyModel`
- `GravitationalPotentialEnergyModel`
- `ElasticEnergyModel`
- `PowerModel`
- `EfficiencyModel`
- `DissipationModel`

#### Apparatus / System Prefabs

- Lifted Load
- Hoist/Motor Setup
- Spring Compression Setup
- Ramp Energy Setup
- Pendulum Energy Setup
- Variable-Force Work Setup
- Efficiency/Energy-Flow Setup

#### Visual Objects / Assets

- load/mass
- motor
- winch
- ramp
- spring
- height marker
- moving cart
- energy reservoir icon
- dissipation/heating symbol

#### Instruments, Probes and Bound Representations

- energy bars
- energy-flow diagram
- power meter
- work meter
- force-displacement graph
- area-under-graph tool
- height probe
- speed probe

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- work
- KE
- GPE
- EPE
- power
- efficiency
- dissipated energy

### User controls

- mass
- speed
- height
- spring constant
- extension
- force curve

### Scientific validation

- energy conservation when model states so
- work-energy theorem
- power consistency

### Mandatory example-gallery projects

- `energy-conservation`
- `spring-energy`
- `work-area`
- `power-efficiency`

---

## 29.6 Topic 6 — Deformation of solids

### Physics/model capabilities

- Hooke spring
- material specimen
- stress/strain
- elastic/plastic constitutive curve
- loading/unloading extension

### Animation requirements

- sample extension
- spring extension
- microscopic lattice schematic
- loading graph
- elastic limit
- plastic deformation
- stress/strain labels
- area shading

### Simulation / interactive requirements

- Hooke law
- wire extension
- Young modulus
- force-extension experiment
- stress-strain explorer
- hysteresis extension

### Required representations

- spring/specimen
- force-extension graph
- stress-strain graph
- measurement apparatus
- energy area

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `LinearSpring`
- `ElasticWire`
- `MaterialSpecimen`
- `StressStrainMaterial`
- `ElasticPlasticMaterial`
- `LoadingPathModel`

#### Apparatus / System Prefabs

- Hooke-Law Spring Rig
- Force-Extension Apparatus
- Young-Modulus Wire Apparatus
- Stress-Strain Demonstration
- Loading/Unloading Extension Setup

#### Visual Objects / Assets

- helical spring
- wire
- rod
- material strip
- clamp
- support stand
- mass hanger
- slotted masses
- reference marker
- extension pointer

#### Instruments, Probes and Bound Representations

- ruler
- micrometer
- vernier caliper
- force sensor
- extensometer
- force-extension graph
- stress-strain graph
- elastic-limit marker
- area-under-curve tool

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- force
- extension
- spring constant
- stress
- strain
- Young modulus
- stored energy

### User controls

- length
- area
- force
- spring constant
- material curve

### Scientific validation

- Hooke region
- dimension checks
- energy area
- Young modulus relation

### Mandatory example-gallery projects

- `hooke-law`
- `young-modulus`
- `stress-strain`
- `elastic-energy`

---

## 29.7 Topic 7 — Waves

### Physics/model capabilities

- analytical harmonic wave
- pulse model
- longitudinal medium model
- boundary model
- sampled/grid wave extension

### Animation requirements

- transverse wave propagation
- longitudinal compression/rarefaction
- medium particle motion
- phase markers
- wavefronts
- pulse reflection
- transmission
- energy-direction distinction

### Simulation / interactive requirements

- traveling wave
- pulse
- string wave
- longitudinal sound
- boundary reflection
- refraction extension
- dispersion extension

### Required representations

- waveform
- wavefronts
- particle row
- displacement-time
- displacement-position
- phase diagram
- audio output extension

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `HarmonicWave`
- `WavePulse`
- `LongitudinalWaveMedium`
- `WaveSource`
- `WaveBoundary`
- `WavefrontSource`
- `SampledWaveField`

#### Apparatus / System Prefabs

- String/Rope Wave Setup
- Slinky Longitudinal Wave
- Ripple Tank
- Tuning-Fork Sound Setup
- Speaker–Microphone Setup
- Pulse Reflection Boundary
- Two-Medium Wave Boundary

#### Visual Objects / Assets

- rope/string
- slinky
- water surface
- wave paddle
- oscillator
- tuning fork
- loudspeaker
- microphone
- boundary line
- medium region
- wavefront lines

#### Instruments, Probes and Bound Representations

- displacement probe
- phase marker
- wavelength ruler
- frequency/period marker
- oscilloscope
- waveform graph
- wavefront display
- particle-motion arrows

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- amplitude
- frequency
- period
- wavelength
- speed
- phase
- displacement
- intensity

### User controls

- amplitude
- frequency
- wavelength
- phase
- speed
- boundary type

### Scientific validation

- v=fλ
- phase consistency
- medium versus pattern motion

### Mandatory example-gallery projects

- `progressive-wave`
- `longitudinal-wave`
- `pulse-reflection`
- `wave-parameters`

---

## 29.8 Topic 8 — Superposition

### Physics/model capabilities

- linear superposition
- coherent sources
- standing-wave model
- interference intensity
- diffraction analytical models
- complex amplitude extension

### Animation requirements

- wave addition
- constructive/destructive interference
- standing-wave buildup
- nodes/antinodes
- path difference
- phase difference
- Huygens wavelets
- fringe formation

### Simulation / interactive requirements

- two-wave superposition
- standing waves
- two-source interference
- single slit
- double slit
- grating extension
- beats
- air-column/string resonance extensions

### Required representations

- component waves
- resultant wave
- standing wave
- source geometry
- screen intensity
- heatmap
- phase/path diagram

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `SuperpositionSystem`
- `CoherentWaveSource`
- `StandingWaveModel`
- `InterferenceSourcePair`
- `SlitAperture`
- `DiffractionModel`
- `InterferenceScreen`

#### Apparatus / System Prefabs

- Two-Wave Superposition
- Standing-Wave String
- Two-Source Ripple Tank
- Two-Speaker Interference
- Single-Slit Setup
- Double-Slit Setup
- Diffraction-Grating Extension
- Air-Column Resonance Extension

#### Visual Objects / Assets

- fixed-end string
- wave source pair
- slit barrier
- single slit
- double slit
- multi-slit grating
- screen
- ripple sources
- speaker pair
- air column/tube

#### Instruments, Probes and Bound Representations

- path-difference ruler
- phase-difference indicator
- node/antinode markers
- screen-intensity strip
- intensity graph
- wavefront overlay
- resultant-wave graph
- fringe-spacing ruler

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- resultant displacement
- phase difference
- path difference
- intensity
- node positions
- fringe spacing

### User controls

- source separation
- wavelength
- phase
- slit width
- screen distance
- number of sources

### Scientific validation

- superposition identity
- node positions
- fringe relations
- approximation disclosure

### Mandatory example-gallery projects

- `superposition`
- `standing-wave`
- `two-source-interference`
- `single-slit`
- `double-slit`

---

## 29.9 Topic 9 — Electricity

### Physics/model capabilities

- charge/current bookkeeping
- potential difference
- resistor/component models
- resistivity
- electrical power

### Animation requirements

- charge-transfer concept
- current arrows
- potential-energy-per-charge explanation
- I–V trace
- resistance geometry
- power flow

### Simulation / interactive requirements

- Q–I–t
- ohmic resistor
- filament-lamp characteristic
- resistivity explorer
- electrical power
- thermistor/LDR extensions
- drift-speed conceptual extension

### Required representations

- component
- I–V graph
- charge counter
- potential marker
- power meter
- conductor geometry

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `ChargeReservoir`
- `CurrentModel`
- `Conductor`
- `OhmicResistor`
- `NonOhmicComponent`
- `ResistivityModel`
- `ElectricalPowerModel`
- `ChargeCarrierRepresentation`

#### Apparatus / System Prefabs

- Current–Charge–Time Setup
- Ohmic I–V Apparatus
- Filament-Lamp I–V Apparatus
- Resistivity-Wire Apparatus
- Electrical Power Setup
- Sensor-Component Extension

#### Visual Objects / Assets

- wire/conductor
- resistor
- filament lamp
- thermistor
- LDR
- cell
- battery
- electron/charge-carrier token
- metal lattice schematic

#### Instruments, Probes and Bound Representations

- ammeter
- voltmeter
- current probe
- potential probe
- power meter
- I–V graph
- resistance readout
- length/area geometry markers

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- charge
- current
- potential difference
- resistance
- resistivity
- power
- energy

### User controls

- voltage
- resistance
- length
- area
- temperature/component parameter

### Scientific validation

- V=IR where model applicable
- P=VI
- resistivity geometry
- units

### Mandatory example-gallery projects

- `charge-current`
- `ohmic-resistor`
- `iv-characteristics`
- `resistivity`
- `electrical-power`

---

## 29.10 Topic 10 — D.C. circuits

### Physics/model capabilities

- graph-topology circuit
- component ports
- DC network solver
- emf/internal resistance
- potential divider
- meter models

### Animation requirements

- schematic build
- switch state
- current-path highlight
- node potential coloring
- meter readings
- potential-divider marker
- internal loss

### Simulation / interactive requirements

- series/parallel networks
- Kirchhoff network
- emf/internal resistance
- potential divider
- sensor divider
- variable resistor
- bridge extension
- fault analysis extension

### Required representations

- circuit schematic
- node-voltage overlay
- current labels
- meters
- I–V/data graph

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `CircuitNode`
- `CircuitBranch`
- `IdealWire`
- `DCVoltageSource`
- `CellWithInternalResistance`
- `Resistor`
- `VariableResistor`
- `Switch`
- `PotentialDivider`
- `IdealAmmeter`
- `IdealVoltmeter`

#### Apparatus / System Prefabs

- Series Circuit
- Parallel Circuit
- Kirchhoff Multi-Loop Circuit
- Internal-Resistance Circuit
- Potential Divider
- Sensor Potential Divider
- Variable-Resistor Circuit
- Bridge Extension

#### Visual Objects / Assets

- cell
- battery
- switch
- resistor
- variable resistor
- potentiometer
- junction
- wire
- load/lamp
- meter body
- terminal

#### Instruments, Probes and Bound Representations

- ammeter
- voltmeter
- galvanometer extension
- current-path highlighter
- node-potential overlay
- circuit equation panel
- power-per-component overlay

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- branch currents
- node potentials
- terminal pd
- lost volts
- power per component

### User controls

- switch
- component values
- source emf
- internal resistance
- slider contact

### Scientific validation

- KCL/KVL
- network singularity
- short/open warnings
- meter idealization

### Mandatory example-gallery projects

- `series-parallel`
- `kirchhoff-network`
- `internal-resistance`
- `potential-divider`

---

## 29.11 Topic 11 — Particle physics

### Physics/model capabilities

- fundamental particle species registry
- quark composition
- discrete interaction/decay event graph
- conservation-rule engine

### Animation requirements

- particle family map
- quark composition build
- interaction/decay reveal
- conservation table
- track schematic
- exchange-particle schematic

### Simulation / interactive requirements

- particle-property explorer
- conservation checker
- decay/reaction builder
- quark builder
- simple scattering event extension
- detector-track extension

### Required representations

- particle cards
- interaction diagram
- quark composition
- conservation table
- track view

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `FundamentalParticle`
- `Quark`
- `Lepton`
- `Hadron`
- `Baryon`
- `Meson`
- `ParticleReaction`
- `DecayEvent`
- `ConservationRuleSet`

#### Apparatus / System Prefabs

- Particle Family Board
- Quark Composition Builder
- Reaction/Decay Builder
- Conservation-Law Workbench
- Detector-Track Extension Scene

#### Visual Objects / Assets

- proton
- neutron
- electron
- positron
- neutrino/antineutrino tokens
- quark tokens
- antiquark tokens
- interaction vertex
- particle track
- detector chamber schematic

#### Instruments, Probes and Bound Representations

- particle property card
- charge counter
- baryon-number counter
- lepton-number counter
- reaction balance table
- interaction/decay diagram

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- charge
- baryon/lepton numbers
- mass/energy labels
- particle species
- reaction balance

### User controls

- particle selection
- reaction participants
- energy/context parameters

### Scientific validation

- charge conservation
- baryon/lepton conservation as curriculum model requires
- valid compositions

### Mandatory example-gallery projects

- `particle-families`
- `quark-composition`
- `conservation-reaction`

---

## 29.12 Topic 12 — Motion in a circle

### Physics/model capabilities

- circular path constraint
- angular state
- centripetal acceleration/force
- rotating-frame representation

### Animation requirements

- velocity tangent
- radial acceleration
- inward force
- radius sweep
- angular arc
- rotating vector

### Simulation / interactive requirements

- uniform circular motion
- speed/radius explorer
- centripetal force
- conical pendulum extension
- vertical circle extension
- banked-track extension

### Required representations

- orbit circle
- vectors
- angular arc
- force diagram
- graphs

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `CircularPathConstraint`
- `CircularMotionBody`
- `AngularState`
- `CentripetalAccelerationModel`
- `CentripetalForceModel`
- `RotatingFrame`

#### Apparatus / System Prefabs

- Ball-on-String Circular Motion
- Car on Circular Track
- Rotating Table
- Conical-Pendulum Extension
- Vertical-Circle Extension
- Centripetal-Force Apparatus

#### Visual Objects / Assets

- ball
- string
- circular track
- car
- rotating platform
- centre marker
- radius line
- angular arc

#### Instruments, Probes and Bound Representations

- velocity vector
- centripetal-acceleration vector
- force vector
- angular-position marker
- radius ruler
- period timer
- circular-motion graph

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- angle
- angular speed
- linear speed
- radius
- centripetal acceleration
- centripetal force

### User controls

- radius
- speed
- mass
- angular speed

### Scientific validation

- a=v²/r
- v=ωr where used
- direction constraints

### Mandatory example-gallery projects

- `uniform-circular-motion`
- `centripetal-force`
- `velocity-acceleration-followers`

---

## 29.13 Topic 13 — Gravitational fields

### Physics/model capabilities

- Newtonian point-mass gravity
- scalar gravitational potential
- field superposition
- orbital integrator
- circular orbit analytical model

### Animation requirements

- field arrows
- field lines
- equipotential reveal
- moving probe
- potential curve
- superposition
- orbit
- energy in orbit
- escape extension

### Simulation / interactive requirements

- single-mass field
- two-mass field
- zero-field point
- potential
- circular orbit
- satellite altitude
- escape speed extension
- multi-body orbit extension

### Required representations

- vector field
- field lines
- equipotentials
- potential graph
- orbit
- energy bars

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `PointMassGravitySource`
- `SphericalGravitySource`
- `GravitationalField`
- `GravitationalPotential`
- `OrbitalBody`
- `CircularOrbitModel`
- `NumericalOrbitModel`

#### Apparatus / System Prefabs

- Earth–Satellite System
- Earth–Moon System
- Two-Mass Field Setup
- Multi-Source Field Scene
- Circular Orbit Setup
- Escape-Trajectory Extension

#### Visual Objects / Assets

- Earth
- Moon
- planet
- star
- satellite
- spacecraft
- point mass
- orbit path
- planet surface

#### Instruments, Probes and Bound Representations

- gravitational-field probe
- potential probe
- field-vector grid
- field lines
- equipotential curves
- potential graph
- orbital velocity vector
- energy panel

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- g
- potential
- potential energy
- orbital speed
- period
- energy

### User controls

- source masses
- positions
- test point
- orbital radius
- initial velocity

### Scientific validation

- inverse square
- potential gradient consistency
- circular-orbit relations
- energy invariants

### Mandatory example-gallery projects

- `gravity-field`
- `two-mass-zero-point`
- `gravitational-potential`
- `circular-orbit`

---

## 29.14 Topic 14 — Temperature

### Physics/model capabilities

- macroscopic thermal state
- temperature scale
- thermometric property
- thermal equilibrium

### Animation requirements

- thermometer calibration
- Celsius↔Kelvin
- thermal contact
- equilibrium approach
- particle distribution schematic

### Simulation / interactive requirements

- temperature-scale converter
- calibration curve
- thermal equilibration
- thermometric property explorer

### Required representations

- thermometer
- calibration graph
- thermal bodies
- temperature readout

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `ThermalBody`
- `TemperatureState`
- `ThermometricProperty`
- `LiquidThermometerModel`
- `ResistanceThermometerModel`
- `ThermocoupleModel`
- `ThermalEquilibriumModel`

#### Apparatus / System Prefabs

- Thermometer Calibration Setup
- Ice/Steam Fixed-Point Setup
- Two-Body Thermal Contact
- Water-Bath Temperature Setup
- Thermometric-Property Explorer

#### Visual Objects / Assets

- liquid-in-glass thermometer
- digital thermometer
- resistance thermometer
- thermocouple
- thermal block
- beaker
- water bath
- ice point
- steam point

#### Instruments, Probes and Bound Representations

- temperature probe
- calibration graph
- Celsius scale
- Kelvin scale
- thermal-equilibrium readout

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- temperature
- thermometric property
- equilibrium difference

### User controls

- initial temperatures
- calibration points
- property selection

### Scientific validation

- absolute scale conversions
- equilibrium convergence

### Mandatory example-gallery projects

- `temperature-scales`
- `thermometer-calibration`
- `thermal-equilibrium`

---

## 29.15 Topic 15 — Ideal gases

### Physics/model capabilities

- ideal-gas macroscopic state
- kinetic-model observables
- 2D hard-disk teaching gas
- statistical distribution extension

### Animation requirements

- molecular collisions
- wall impulses
- piston compression
- speed histogram
- pressure indicator
- temperature/speed ensemble relation
- mixing

### Simulation / interactive requirements

- pV=nRT explorer
- fixed volume heating
- fixed pressure
- isothermal change
- 2D elastic gas
- distribution extension
- diffusion
- Brownian tracer

### Required representations

- container/piston
- particle ensemble
- P–V graph
- histogram
- pressure gauge
- temperature readout

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `IdealGasState`
- `GasContainer`
- `MovablePiston`
- `GasParticle`
- `HardDiskGas`
- `BrownianTracer`
- `StatisticalGasObservable`

#### Apparatus / System Prefabs

- Fixed-Volume Gas Container
- Weighted-Piston Gas
- Isothermal Gas Setup
- 2D Molecular Gas Box
- Brownian Motion Cell
- Gas Mixing/Diffusion Extension

#### Visual Objects / Assets

- gas container
- piston
- weights
- molecule/particle
- large Brownian particle
- heater
- cooling bath
- container wall

#### Instruments, Probes and Bound Representations

- pressure gauge
- thermometer
- volume scale
- piston-position ruler
- speed histogram
- pressure-vs-time graph
- P–V graph
- particle velocity vectors

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- P
- V
- T
- n
- mean KE
- speed distribution
- wall impulse rate

### User controls

- particle count
- volume
- temperature
- piston position
- seed

### Scientific validation

- ideal gas equation for analytical model
- energy/momentum in elastic gas
- model disclosure

### Mandatory example-gallery projects

- `ideal-gas-law`
- `gas-particles`
- `gas-compression`
- `speed-distribution`
- `brownian-tracer`

---

## 29.16 Topic 16 — Thermodynamics

### Physics/model capabilities

- thermodynamic state/process path
- internal-energy ledger
- heat/work transfers
- P–V process

### Animation requirements

- system boundary
- heat arrows
- work by/on gas
- P–V path
- area shading
- energy ledger
- process comparison

### Simulation / interactive requirements

- first-law explorer
- constant pressure
- constant volume
- isothermal
- cycle extension
- adiabatic extension
- heat-engine extension

### Required representations

- P–V graph
- energy-flow diagram
- system boundary
- state table
- equation

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `ThermodynamicSystem`
- `ThermodynamicState`
- `ProcessPath`
- `HeatTransfer`
- `WorkTransfer`
- `InternalEnergyLedger`
- `ThermalReservoir`

#### Apparatus / System Prefabs

- Constant-Volume Process
- Constant-Pressure Piston
- Isothermal Process
- P–V Process Explorer
- Thermodynamic Cycle Extension
- Heat-Engine Extension

#### Visual Objects / Assets

- gas cylinder
- piston
- heater
- hot reservoir
- cold reservoir
- system boundary
- work weight
- thermal arrow

#### Instruments, Probes and Bound Representations

- P–V graph
- area/work shader
- temperature probe
- pressure probe
- volume probe
- energy ledger
- heat/work transfer arrows

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- Q
- W
- ΔU
- P
- V
- T
- path work

### User controls

- initial state
- process type
- final parameter

### Scientific validation

- first law under chosen sign convention
- process equations
- area/work consistency

### Mandatory example-gallery projects

- `first-law`
- `pv-process`
- `isothermal-process`
- `thermodynamic-cycle-extension`

---

## 29.17 Topic 17 — Oscillations

### Physics/model capabilities

- analytical SHM
- pendulum small-angle
- damped oscillator ODE
- driven oscillator
- coupled extension

### Animation requirements

- oscillator motion
- equilibrium/extremes
- x/v/a followers
- linked graphs
- phase
- energy exchange
- damping envelope
- resonance buildup
- driving phase

### Simulation / interactive requirements

- mass-spring SHM
- pendulum
- SHM energy
- damping
- driven oscillation
- resonance
- coupled oscillator extension
- nonlinear pendulum extension

### Required representations

- oscillator
- x/v/a vectors
- time graphs
- energy graphs
- phase-space extension
- resonance graph

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `SHMOscillator`
- `MassSpringOscillator`
- `SmallAnglePendulum`
- `DampedOscillator`
- `DrivenOscillator`
- `ResonanceModel`
- `CoupledOscillatorExtension`

#### Apparatus / System Prefabs

- Horizontal Mass–Spring
- Vertical Mass–Spring
- Simple Pendulum
- Damped Oscillator
- Driven Spring Oscillator
- Resonance Demonstration
- Coupled-Oscillator Extension

#### Visual Objects / Assets

- mass
- spring
- pendulum bob
- string
- support
- damper
- driver/motor
- oscillating platform
- equilibrium marker

#### Instruments, Probes and Bound Representations

- displacement vector
- velocity vector
- acceleration vector
- force vector
- x–t graph
- v–t graph
- a–t graph
- energy graph
- resonance curve
- phase indicator

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- x
- v
- a
- ω
- T
- energy
- driving amplitude
- phase difference

### User controls

- amplitude
- frequency
- damping
- driving frequency
- spring constant
- mass

### Scientific validation

- a=-ω²x in SHM
- phase relations
- energy conservation/dissipation
- numerical tolerance

### Mandatory example-gallery projects

- `shm-linked-views`
- `pendulum-shm`
- `damped-oscillator`
- `resonance`

---

## 29.18 Topic 18 — Electric fields

### Physics/model capabilities

- point-charge field
- uniform field
- potential
- multi-charge superposition
- charged-particle dynamics
- numerical potential extension

### Animation requirements

- field arrows
- field lines
- equipotentials
- moving probe
- test charge
- potential graph
- plate field
- charged-particle trajectory

### Simulation / interactive requirements

- single charge
- multiple charges
- zero-field point
- electric potential
- uniform field plates
- charged particle between plates
- electron deflection
- numerical field-map extension

### Required representations

- vector field
- field lines
- equipotentials
- potential graph
- charge sprites
- trajectory

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `PointCharge`
- `ChargedSphereSource`
- `UniformElectricField`
- `ElectricPotential`
- `MultiChargeField`
- `ChargedParticle`
- `ElectricForceModel`

#### Apparatus / System Prefabs

- Single Point Charge
- Two-Charge Field
- Multi-Charge Field
- Parallel-Plate Field
- Charged Particle Between Plates
- Electron-Beam Deflection Setup
- Zero-Field Point Setup

#### Visual Objects / Assets

- positive charge
- negative charge
- charged sphere
- parallel plates
- electron
- proton/test charge
- electron gun
- screen
- field region

#### Instruments, Probes and Bound Representations

- electric-field probe
- potential probe
- vector-field grid
- field lines
- equipotential curves
- potential graph
- force vector
- particle trajectory

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- E
- V
- force
- potential energy
- particle state

### User controls

- charges
- source positions
- test point
- plate voltage/separation
- particle velocity

### Scientific validation

- Coulomb law
- superposition
- E=-grad V consistency where calculated
- trajectory reference cases

### Mandatory example-gallery projects

- `point-charge-field`
- `two-charge-field`
- `electric-potential`
- `charged-particle-plates`

---

## 29.19 Topic 19 — Capacitance

### Physics/model capabilities

- capacitor component
- Q–V relation
- energy
- parallel plate
- RC transient
- dielectric extension

### Animation requirements

- charge accumulation
- field between plates
- plate separation change
- energy storage
- charging/discharging curve
- circuit transient
- dielectric insertion extension

### Simulation / interactive requirements

- Q=CV
- capacitor energy
- series/parallel
- parallel plate
- RC charge/discharge
- dielectric extension

### Required representations

- capacitor plates
- charge symbols
- field
- circuit
- Q–V graph
- V–t/I–t graphs
- energy

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `Capacitor`
- `ParallelPlateCapacitor`
- `CapacitorNetwork`
- `RCTransientModel`
- `DielectricMaterial`
- `StoredElectricalEnergyModel`

#### Apparatus / System Prefabs

- Adjustable Parallel-Plate Capacitor
- Capacitors in Series
- Capacitors in Parallel
- RC Charging Circuit
- RC Discharging Circuit
- Dielectric-Insertion Extension

#### Visual Objects / Assets

- capacitor symbol
- parallel plates
- charge symbols
- dielectric slab
- resistor
- switch
- cell/source
- connecting wire

#### Instruments, Probes and Bound Representations

- voltmeter
- ammeter
- charge readout
- electric-field display
- Q–V graph
- V–t graph
- I–t graph
- energy display
- time-constant marker

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- Q
- C
- V
- energy
- current
- time constant

### User controls

- capacitance
- voltage
- resistance
- plate geometry
- dielectric parameter

### Scientific validation

- Q=CV
- energy formulas
- RC analytical reference
- network rules

### Mandatory example-gallery projects

- `capacitance-qv`
- `capacitor-energy`
- `capacitors-combinations`
- `rc-charging`

---

## 29.20 Topic 20 — Magnetic fields

### Physics/model capabilities

- magnetic vector field
- Lorentz force
- force on current
- charged-particle motion
- flux/induction submodule
- solenoid approximation

### Animation requirements

- field lines/arrows
- force direction
- wire force
- particle curvature
- solenoid field
- flux change
- induced emf direction
- motional emf

### Simulation / interactive requirements

- force on wire
- charged particle in B
- velocity selector extension
- mass spectrometer extension
- solenoid
- induction coil
- motional emf

### Required representations

- B field
- vectors
- wire/current
- particle path
- flux surface
- coil
- emf graph

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `UniformMagneticField`
- `MagneticDipole`
- `CurrentCarryingWire`
- `CurrentLoop`
- `Solenoid`
- `MovingChargeInMagneticField`
- `MagneticForceModel`
- `FluxSurface`
- `InductionModel`

#### Apparatus / System Prefabs

- Force on Current-Carrying Wire
- Charged Particle in Uniform B
- Velocity-Selector Extension
- Mass-Spectrometer Extension
- Solenoid Field
- Induction Coil Pair
- Motional-EMF Extension

#### Visual Objects / Assets

- bar magnet
- horseshoe magnet
- compass
- straight wire
- wire loop
- solenoid
- coil
- iron core
- electron/proton
- magnetic pole markers

#### Instruments, Probes and Bound Representations

- Hall/magnetic-field probe
- compass needle
- B-field vector grid
- field lines
- force vector
- velocity vector
- flux surface
- flux/emf graph

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- B
- force
- radius
- flux
- flux linkage
- emf

### User controls

- B
- charge
- velocity
- current
- wire length
- coil turns
- geometry

### Scientific validation

- Lorentz force
- qvB circular radius
- F=BIL cases
- Faraday/Lenz relations

### Mandatory example-gallery projects

- `force-on-current`
- `charged-particle-b`
- `solenoid-field`
- `electromagnetic-induction`

---

## 29.21 Topic 21 — Alternating currents

### Physics/model capabilities

- sinusoidal source
- rms
- transformer
- periodic circuit source
- phasor/frequency extension

### Animation requirements

- AC waveform
- direction reversal
- RMS construction
- transformer flux
- input/output waveforms
- phasor extension
- rectification extension

### Simulation / interactive requirements

- AC source
- rms explorer
- transformer ratio
- power transmission
- rectification extension
- RLC extension

### Required representations

- waveform
- transformer
- phasor extension
- circuit
- power flow

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `SinusoidalVoltageSource`
- `SinusoidalCurrentSource`
- `ACLoad`
- `RMSModel`
- `IdealTransformer`
- `PeriodicSignal`
- `RectifierExtension`

#### Apparatus / System Prefabs

- AC Source + Oscilloscope
- RMS Explorer
- Step-Up Transformer
- Step-Down Transformer
- Power Transmission Setup
- Rectifier/Smoothing Extension
- RLC Extension

#### Visual Objects / Assets

- AC generator/source
- coil
- transformer core
- primary coil
- secondary coil
- load
- transmission line
- diode extension
- capacitor extension

#### Instruments, Probes and Bound Representations

- oscilloscope
- AC voltmeter
- AC ammeter
- waveform graph
- RMS marker
- turns counter
- flux display
- power-flow panel
- phasor extension

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- instantaneous V/I
- peak
- rms
- frequency
- turns ratio
- power

### User controls

- amplitude
- frequency
- turns
- load

### Scientific validation

- rms sinusoid
- transformer ratios under ideal model
- power relations

### Mandatory example-gallery projects

- `ac-waveform-rms`
- `transformer`
- `power-transmission`

---

## 29.22 Topic 22 — Quantum physics

### Physics/model capabilities

- photon energy
- photoelectric event model
- energy levels
- spectral transitions
- de Broglie relation
- discrete quantum-state extension

### Animation requirements

- photon symbol
- photoelectron emission
- threshold frequency
- stopping potential
- energy-level transition
- spectral-line formation
- matter-wave schematic

### Simulation / interactive requirements

- photoelectric explorer
- photon energy
- stopping-potential graph
- energy-level builder
- spectrum generator
- de Broglie explorer
- probability extension

### Required representations

- apparatus
- energy levels
- spectrum
- photon/event symbols
- graphs

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `Photon`
- `Photoelectron`
- `PhotoelectricSurface`
- `PhotonSource`
- `QuantumState`
- `EnergyLevelSystem`
- `TransitionEvent`
- `SpectrumEmitter`
- `deBroglieParticle`

#### Apparatus / System Prefabs

- Photoelectric-Effect Apparatus
- Stopping-Potential Setup
- Energy-Level Transition Board
- Emission Spectrum Setup
- Absorption Spectrum Setup
- de Broglie Explorer

#### Visual Objects / Assets

- photon symbol
- electron
- metal surface
- light source
- photocell
- collector/anode
- atom schematic
- energy-level ladder
- spectral line

#### Instruments, Probes and Bound Representations

- variable potential supply
- ammeter/current detector
- frequency/wavelength control
- stopping-potential meter
- spectrum display
- energy-level diagram
- photon-energy readout

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- photon energy
- max KE
- stopping potential
- transition energy
- wavelength

### User controls

- frequency
- work function
- potential
- level energies
- particle momentum

### Scientific validation

- Einstein photoelectric relation
- transition-energy/wavelength
- de Broglie relation
- schematic warnings

### Mandatory example-gallery projects

- `photoelectric-effect`
- `energy-levels-spectrum`
- `de-broglie`

---

## 29.23 Topic 23 — Nuclear physics

### Physics/model capabilities

- nuclear species
- mass defect/binding energy
- analytical decay
- seeded stochastic decay events
- activity
- reaction/Q-value
- decay chains extension

### Animation requirements

- nucleus composition
- binding-energy curve
- random decay
- ensemble decay
- activity counter
- half-life construction
- reaction/fission/fusion schematic

### Simulation / interactive requirements

- exponential decay
- individual seeded nuclei
- detector counting
- half-life explorer
- binding energy
- reaction energy
- decay-chain extension
- attenuation extension

### Required representations

- nucleus
- decay event
- N–t/A–t graphs
- binding-energy graph
- reaction equation
- detector count

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `Nucleus`
- `Isotope`
- `RadioactiveSample`
- `DecayEvent`
- `DecayChain`
- `ActivityModel`
- `NuclearReaction`
- `BindingEnergyModel`
- `RadiationParticle`
- `CountingDetector`

#### Apparatus / System Prefabs

- Radioactive Sample + Counter
- Half-Life Demonstration
- Seeded Nucleus Ensemble
- Absorption/Attenuation Setup
- Binding-Energy Explorer
- Fission/Fusion Reaction Setup
- Decay-Chain Extension

#### Visual Objects / Assets

- nucleus
- proton/neutron cluster
- alpha particle
- beta particle/electron
- gamma photon symbol
- radioactive source
- absorber sheet
- shielding block
- fission fragments

#### Instruments, Probes and Bound Representations

- Geiger–Müller tube
- counter/ratemeter
- activity readout
- N–t graph
- A–t graph
- binding-energy graph
- reaction energy/Q-value panel
- event timeline

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- N
- activity
- decay constant
- half-life
- binding energy
- Q value
- event times

### User controls

- initial nuclei
- half-life/λ
- seed
- isotope parameters
- reaction participants

### Scientific validation

- exponential law
- Poisson/statistical expectations
- mass-energy bookkeeping
- reaction conservation

### Mandatory example-gallery projects

- `radioactive-decay-analytical`
- `radioactive-decay-stochastic`
- `half-life`
- `binding-energy`
- `nuclear-reaction`

---

## 29.24 Topic 24 — Medical physics

### Physics/model capabilities

- layered acoustic propagation
- acoustic impedance/reflection
- attenuation
- pulse/echo detector
- X-ray attenuation
- source-detector acquisition
- tomography forward/reconstruction conceptual model
- tracer counting extension

### Animation requirements

- ultrasound pulse
- boundary reflection/transmission
- echo return
- time-of-flight depth
- A-scan
- attenuation
- scan sweep
- X-ray path attenuation
- source-detector rotation
- projection acquisition
- reconstruction buildup

### Simulation / interactive requirements

- acoustic impedance reflection
- multi-layer ultrasound
- time-of-flight
- attenuation
- A-scan generation
- X-ray exponential attenuation
- contrast explorer
- simple tomography projections
- back-projection conceptual reconstruction
- tracer counts

### Required representations

- transducer/tissue layers
- pulse
- detector trace
- A-scan
- ray path
- attenuation graph
- image plane
- sinogram extension
- reconstruction heatmap

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `AcousticMedium`
- `TissueLayer`
- `UltrasoundPulseSource`
- `AcousticBoundary`
- `AttenuatingMedium`
- `EchoDetector`
- `XraySource`
- `XrayAttenuationMedium`
- `RadiationDetector`
- `ProjectionScanner`
- `ReconstructionModel`
- `TracerSourceExtension`

#### Apparatus / System Prefabs

- Ultrasound Single-Interface Setup
- Layered-Tissue Ultrasound
- A-Scan Apparatus
- X-Ray Attenuation Setup
- Source–Detector Imaging Geometry
- CT/Tomography Concept Scanner
- Radioactive-Tracer Extension

#### Visual Objects / Assets

- ultrasound transducer
- tissue layer
- skin/fat/muscle generic layer presets
- organ/body cross-section schematic
- X-ray tube
- collimator
- detector panel
- CT gantry/ring
- patient table
- tracer marker

#### Instruments, Probes and Bound Representations

- oscilloscope/A-scan display
- echo-time cursor
- depth ruler
- signal-amplitude meter
- attenuation graph
- detector array
- projection plot
- image plane
- sinogram extension
- reconstruction heatmap

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- echo times
- echo amplitudes
- reflection coefficient
- attenuation
- transmitted intensity
- detector counts
- projection data

### User controls

- frequency
- layer thickness
- sound speed
- impedance
- attenuation coefficient
- source/detector geometry

### Scientific validation

- time-of-flight geometry
- reflection coefficient model
- exponential attenuation
- clinical-disclaimer metadata

### Mandatory example-gallery projects

- `ultrasound-time-of-flight`
- `ultrasound-layered-echo`
- `xray-attenuation`
- `tomography-concept`

---

## 29.25 Topic 25 — Astronomy and cosmology

### Physics/model capabilities

- inverse-square flux
- stellar luminosity/radius/temperature relations
- blackbody/spectrum extension
- redshift
- Hubble relation
- expanding-coordinate model
- parallax/orbit extensions
- astronomical scale model

### Animation requirements

- flux spreading
- star scale/temperature
- spectrum peak shift
- spectral redshift
- line matching
- galaxy recession vectors
- Hubble plot population
- expanding-grid analogy
- powers-of-ten zoom
- telescope collection geometry

### Simulation / interactive requirements

- luminosity-flux-distance
- stellar temperature/spectrum
- Wien/Stefan relations as profile requires
- redshift calculator
- Hubble dataset
- Hubble constant/age approximation
- expansion coordinate model
- parallax extension
- HR diagram extension

### Required representations

- star/galaxy
- spectrum
- spectral lines
- Hubble graph
- log-scale axis
- expansion grid
- telescope/detector

### Physics Library — predefined drag-and-drop items

#### Smart Physics Models

- `LuminousSource`
- `StarModel`
- `BlackbodySpectrumModel`
- `FluxDetector`
- `GalaxyModel`
- `SpectrumSource`
- `SpectralLineSet`
- `RedshiftModel`
- `HubbleRelationModel`
- `CosmologicalScaleModel`
- `ExpansionCoordinateModel`

#### Apparatus / System Prefabs

- Star–Observer Flux Setup
- Stellar Spectrum Explorer
- Redshift Spectroscopy Setup
- Hubble Dataset Scene
- Expanding-Grid Cosmology Scene
- Telescope Light-Collection Setup
- Parallax Extension

#### Visual Objects / Assets

- star
- Sun
- Earth
- planet
- galaxy types
- galaxy cluster
- telescope
- detector
- spectroscope
- spectral line strip
- distance scale
- expanding coordinate grid

#### Instruments, Probes and Bound Representations

- flux meter
- spectrum display
- spectral-line cursor
- redshift ruler
- Hubble graph
- logarithmic axis
- scientific-notation distance readout
- temperature/spectrum graph
- multi-scale camera marker

Library note: these entries are searchable under this topic, but shared objects use canonical Library IDs rather than duplicated implementations.

### Key observables

- luminosity
- flux
- distance
- temperature
- peak wavelength
- redshift
- recession speed
- Hubble parameter

### User controls

- distance
- luminosity
- temperature
- redshift
- Hubble parameter
- dataset selection

### Scientific validation

- inverse square
- spectral-shift relation
- Hubble relation under model
- analogy limitation warning

### Mandatory example-gallery projects

- `inverse-square-flux`
- `stellar-spectrum`
- `redshift`
- `hubble-law`
- `cosmic-expansion-analogy`

---

<!-- Source: Master §30 -->
# 30. EXTENDED PHYSICS CAPABILITY CATALOG

These modules are planned into the architecture even when they are not part of the active Cambridge 9702 profile.

## 30.1 Geometrical optics

### Model scope

- reflection/refraction/TIR
- plane and curved mirrors
- thin lenses
- multiple lenses
- prisms
- ray bundles
- optical instruments

### Animation families

- ray propagation
- normal construction
- critical-angle transition
- principal rays
- image formation
- focus tracking

### Simulations/interactives

- mirror explorer
- Snell-law boundary
- thin lens
- two-lens system
- prism
- microscope/telescope conceptual

### Example-gallery seed project

- `geometrical-optics-overview`

---

## 30.2 Physical optics

### Model scope

- single/multiple slit
- double slit
- diffraction grating
- polarization
- thin films
- Fresnel extension
- Fourier-optics extension

### Animation families

- Huygens wavelets
- phase-front evolution
- fringes
- diffraction envelope
- polarizer/analyzer vectors
- thin-film path difference

### Simulations/interactives

- single slit
- double slit
- grating
- Malus law
- thin-film interference
- Fresnel grid simulation extension

### Example-gallery seed project

- `physical-optics-overview`

---

## 30.3 Rotational dynamics

### Model scope

- angular kinematics
- torque
- moment of inertia
- rotational energy
- angular momentum
- rolling
- precession extension

### Animation families

- angular displacement
- torque vector
- rotation
- rolling translation+rotation
- angular-momentum vector

### Simulations/interactives

- constant angular acceleration
- torque/inertia
- rolling
- flywheel
- angular momentum
- gyroscope extension

### Example-gallery seed project

- `rotational-dynamics-overview`

---

## 30.4 Fluid mechanics

### Model scope

- fluid statics
- buoyancy
- continuity
- Bernoulli
- efflux
- viscosity/drag
- simple laminar profiles

### Animation families

- pressure field
- streamlines
- velocity field
- narrowing flow
- buoyant force
- terminal speed

### Simulations/interactives

- hydrostatic pressure
- buoyancy
- Venturi
- Bernoulli
- efflux
- terminal speed
- simple laminar flow

### Example-gallery seed project

- `fluid-mechanics-overview`

---

## 30.5 Electronics and semiconductors

### Model scope

- diodes
- rectification
- smoothing
- transistors
- logic gates
- op-amps
- sensor circuits
- band model extension

### Animation families

- signal paths
- diode state
- rectified waveform
- capacitor smoothing
- transistor switching
- logic propagation

### Simulations/interactives

- diode I–V
- rectifier
- smoothing
- transistor switch
- logic gates
- ideal op-amp

### Example-gallery seed project

- `electronics-and-semiconductors-overview`

---

## 30.6 Communications physics

### Model scope

- carriers
- AM/FM concepts
- sampling
- digital pulses
- bandwidth
- noise
- filters

### Animation families

- modulation
- sampling markers
- aliasing
- pulse encoding
- spectrum/bandwidth
- noise overlay

### Simulations/interactives

- AM/FM conceptual
- sampling/aliasing
- digital pulse channel
- SNR
- filter extension

### Example-gallery seed project

- `communications-physics-overview`

---

## 30.7 Acoustics and Doppler

### Model scope

- sound waves
- beats
- Doppler
- air columns
- harmonics
- Fourier synthesis
- intensity

### Animation families

- moving wavefronts
- source/observer motion
- beats
- mode shapes
- harmonic build

### Simulations/interactives

- Doppler
- beats
- air-column resonance
- harmonics
- Fourier synthesis

### Example-gallery seed project

- `acoustics-and-doppler-overview`

---

## 30.8 Relativity

### Model scope

- Lorentz factor
- time dilation
- length contraction
- simultaneity
- spacetime diagrams
- relativistic energy/momentum

### Animation families

- light clock
- moving frames
- worldlines
- simultaneity slices
- coordinate transform

### Simulations/interactives

- Lorentz-factor explorer
- time dilation
- length contraction
- spacetime-event transform

### Example-gallery seed project

- `relativity-overview`

---

## 30.9 Advanced electromagnetism

### Model scope

- Lorentz dynamics
- flux
- induction
- RL/RLC
- EM-wave relationships
- advanced field maps

### Animation families

- changing fields
- flux surfaces
- induction direction
- phasors
- EM vector relationships

### Simulations/interactives

- Lorentz trajectory
- induction
- RL/RLC
- field superposition
- EM-wave extension

### Example-gallery seed project

- `advanced-electromagnetism-overview`

---

## 30.10 Advanced mechanics

### Model scope

- drag
- coupled oscillators
- non-inertial frames
- chaos
- multi-body gravitation
- rigid-body 3D

### Animation families

- phase portraits
- coupled mode shapes
- rotating frames
- chaotic divergence
- 3D orientation

### Simulations/interactives

- quadratic drag
- coupled oscillators
- double pendulum
- N-body orbit
- rigid-body 3D

### Example-gallery seed project

- `advanced-mechanics-overview`

---

## 30.11 Extended atomic/modern physics

### Model scope

- Bohr-style models
- X-ray spectra
- potential wells
- tunnelling
- semiconductor bands
- matter waves

### Animation families

- energy-level transitions
- spectra
- probability-density schematic
- tunnelling visualization
- band diagrams

### Simulations/interactives

- spectra
- simple well
- tunnelling conceptual/numerical
- band diagrams

### Example-gallery seed project

- `extended-atomic-modern-physics-overview`

---

## 30.12 Practical and experimental physics

### Model scope

- measurement
- uncertainty
- graphing
- linearisation
- sensor/data acquisition
- experiment design

### Animation families

- instrument readings
- data accumulation
- best-fit reveal
- error bars
- gradient/intercept
- apparatus sequence

### Simulations/interactives

- measurement tools
- uncertainty calculator
- graph fit
- linearisation
- investigation planner

### Example-gallery seed project

- `practical-and-experimental-physics-overview`

---

<!-- Source: Master §35 -->
# 35. DEFINITION OF DONE — PHYSICS TOPIC

A curriculum topic is `SUPPORTED` only when:

- all required models are implemented;
- all mandatory animations in the approved minimum set are available;
- all mandatory simulations are available;
- required representations are available;
- examples exist;
- curriculum terminology is mapped;
- scientific validators pass;
- teacher usability scenario passes.

Coverage states:

```text
NOT_STARTED
FOUNDATION_ONLY
PARTIAL
SUPPORTED
VALIDATED
```

A release may claim full Cambridge 9702 support only when all 25 topics are `VALIDATED`.

---

