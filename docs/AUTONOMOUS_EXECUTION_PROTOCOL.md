Enter Autonomous Project Execution Mode for the Physica project.

Step 5 has successfully completed and passed its architecture, TypeScript, CI,
serialization, command, ProjectStore, and future-proofing tests.

You are now authorized to progress Physica from the completed Step 5 foundation
to a complete Physica 1.0 RELEASE CANDIDATE.

This authority includes BOTH:

1. writing the detailed implementation specifications that were previously
   planned as ChatGPT specification steps;

2. implementing, testing, documenting, demonstrating and reviewing those
   specifications.

This does NOT give you authority to redesign the frozen Physica architecture.

======================================================================
SOURCE OF TRUTH
======================================================================

Before continuing, read:

1. AGENTS.md
2. docs/CURRENT_STATE.md
3. docs/PROJECT_CONSTITUTION.md
4. docs/DECISIONS.md
5. docs/ARCHITECTURE.md
6. docs/PACKAGE_DEPENDENCIES.md
7. docs/ROADMAP.md
8. docs/HANDOVER.md

Then inspect the relevant owning specifications under docs/.

The broader frozen architecture is available under reference/.

SOURCE-OF-TRUTH PRIORITY:

1. PROJECT_CONSTITUTION.md
2. approved ADRs in DECISIONS.md
3. owning subsystem specification
4. CURRENT_STATE.md for operational status
5. Architecture-Frozen Master Blueprint for broader product intent
6. implementation specifications created during autonomous execution

If these conflict, the higher authority wins.

Do not silently reinterpret a higher-authority document.

======================================================================
FIRST ACTION
======================================================================

Verify the completed Step 5 state from the repository itself.

Confirm:

- core-model implementation exists;
- serialization V1 exists;
- command system exists;
- ProjectStore exists;
- undo/redo exists;
- Step 5 tests pass;
- architecture tests pass;
- CURRENT_STATE.md correctly identifies the next unfinished phase.

Do not redo Step 5.

Begin from the first unfinished phase.

======================================================================
AUTONOMOUS PHASE PROTOCOL
======================================================================

For EVERY substantial remaining phase, follow this protocol.

----------------------------------------------------------------------
A. READ CURRENT STATE
----------------------------------------------------------------------

Read AGENTS.md and docs/CURRENT_STATE.md.

Inspect the actual implementation and tests.

Determine the first unfinished task.

Never redo completed work solely because it appears in the roadmap.

----------------------------------------------------------------------
B. READ RELEVANT SPECIFICATIONS
----------------------------------------------------------------------

Read only the owning architectural documents required for the current phase,
plus relevant ADRs and package-dependency rules.

Inspect existing public APIs that the new subsystem will depend on.

----------------------------------------------------------------------
C. WRITE AN IMPLEMENTATION SPECIFICATION
----------------------------------------------------------------------

Before implementing a substantial subsystem, create:

docs/implementation/STEP_XX_<DESCRIPTIVE_NAME>_SPEC.md

The specification must contain:

- purpose;
- exact scope;
- packages allowed to change;
- public interfaces/types;
- ownership;
- state model;
- document/runtime boundary;
- state-channel authority;
- clocks/time behavior;
- observables;
- events;
- algorithms or mathematical models;
- units/dimensions where relevant;
- validation;
- assumptions;
- serialization;
- error handling;
- extensibility/plugin behavior;
- performance considerations;
- accessibility considerations;
- test matrix;
- physics reference cases where relevant;
- Physics Library requirements;
- example-gallery requirements;
- Definition of Done;
- explicit things NOT to implement.

The implementation specification must make implementation mechanical enough that a
programmer working only on that subsystem would not need to invent architecture.

----------------------------------------------------------------------
D. AUDIT THE SPECIFICATION BEFORE CODING
----------------------------------------------------------------------

Compare the new specification against:

- PROJECT_CONSTITUTION.md
- DECISIONS.md
- PACKAGE_DEPENDENCIES.md
- the owning frozen subsystem specifications

Check specifically for:

- architecture contradiction;
- package dependency inversion;
- duplicate physics authority;
- document/runtime-state leakage;
- simulation/presentation confusion;
- serialization incompatibility;
- broken plugin isolation;
- loss of deterministic behavior;
- missing Physics Library support;
- missing example obligations.

If an issue can be resolved as an ordinary implementation detail within the
frozen architecture, resolve it and continue.

If resolution would require changing a frozen architectural rule, STOP that
phase and use the ARCHITECTURE BLOCKER protocol defined below.

----------------------------------------------------------------------
E. IMPLEMENT
----------------------------------------------------------------------

Implement the audited specification.

Do not refactor unrelated systems.

Do not install speculative dependencies.

Do not replace frozen contracts merely because another implementation would be
easier.

Preserve existing passing behavior.

----------------------------------------------------------------------
F. PHYSICS LIBRARY CONTRACT
----------------------------------------------------------------------

Once Physics Library infrastructure exists, every stage-visible physics feature
must register the appropriate library content.

As applicable this includes:

- Smart Physics Models
- Apparatus/System Prefabs
- Visual Objects
- Instruments/Sensors/Probes
- Representation Objects
- Material/Medium Presets

Do not hard-code curriculum-specific library cards into the editor.

Library items must use canonical IDs and metadata-driven registration.

----------------------------------------------------------------------
G. EXAMPLE CONTRACT
----------------------------------------------------------------------

Every user-visible capability is incomplete until it has a runnable example.

Where infrastructure permits, create:

examples/<category>/<example-id>/
    example.physica
    example.physcript       when applicable
    metadata.json
    README.md
    expected.png
    preview.webm
    example.spec.ts

Examples must run through the same Physica runtime used by real projects.

They are regression fixtures as well as documentation.

IMPORTANT:

Some early Step 5 example directories currently contain only foundational
README/fixture material because .physica rendering/gallery infrastructure did
not yet exist.

Do NOT treat that as a permanent exception.

When the required project/gallery/rendering infrastructure becomes available,
upgrade previously incomplete examples to the full example contract.

Maintain a machine-readable list of pending example artifacts if necessary.

CI must eventually enforce Feature -> Example coverage.

----------------------------------------------------------------------
H. TEST
----------------------------------------------------------------------

Run targeted tests first.

Then run all affected suites.

Depending on subsystem, this includes:

- unit tests;
- schema tests;
- reference physics tests;
- dimensional tests;
- invariant/conservation tests;
- stochastic determinism tests;
- serialization round-trip;
- migration tests;
- relationship tests;
- visual regression;
- E2E;
- architecture dependency checks;
- accessibility checks;
- performance benchmarks;
- export tests.

Never accept a physics feature merely because it visually appears correct.

----------------------------------------------------------------------
I. SELF-REVIEW
----------------------------------------------------------------------

Before declaring the phase complete, review it from four perspectives:

1. software architect;
2. physicist/scientific-computing reviewer;
3. physics teacher;
4. UX/accessibility reviewer.

Identify concrete defects.

Correct defects belonging to the current phase before proceeding.

Do not expand scope into optional enhancements merely because they are
interesting.

----------------------------------------------------------------------
J. RECORD AND CHECKPOINT
----------------------------------------------------------------------

Update docs/CURRENT_STATE.md after each substantial completed phase.

Record:

- phase/task completed;
- implementation packages/files;
- dependencies added;
- tests and exact results;
- examples added;
- unresolved limitations;
- blockers;
- exact next task.

Update DECISIONS.md only for genuinely necessary architecture-compatible ADRs.

Never silently alter an existing ADR.

Make a recoverable Git commit/checkpoint after a verified major phase where
appropriate.

Project-wide health checkpoints are governed by
`docs/PROJECT_HEALTH_CHECKPOINTS.md`. At each scheduled or early-trigger
boundary, pause roadmap progression, verify every completed step against its
promised evidence, audit integration and maintainability across the whole
repository, correct regressions and publish the required checkpoint report
before continuing.

----------------------------------------------------------------------
K. CONTINUE
----------------------------------------------------------------------

If there is no architecture blocker, proceed automatically to the next
unfinished phase.

Do NOT require user confirmation between ordinary phases.

======================================================================
EXPECTED REMAINING IMPLEMENTATION ORDER
======================================================================

The roadmap and subsystem specifications remain authoritative, but the expected
high-level order after Step 5 is:

1. Mathematics, quantities, dimensions and units

2. Coordinates and reference frames

3. Clock architecture
   - simulation time
   - presentation time
   - named additional clocks

4. Runtime scheduler

5. Checkpoint/replay infrastructure

6. Rendering foundation
   - renderer-core
   - SVG
   - Pixi/WebGL
   - Three.js
   - camera service
   - shared transforms
   - picking/selection

7. Physics Component / Model / Asset / Prefab Library
   - LibraryRegistry
   - PrefabRegistry
   - InstrumentRegistry
   - MaterialPresetRegistry
   - built-in foundational objects
   - plugin library
   - My Library

8. Presentation Animation Engine

9. TextBlock and explanatory-text system
   - definitions
   - explanations
   - headings
   - paragraphs
   - captions
   - bullet lists
   - callouts
   - quotations
   - semantic text spans
   - observable-bound dynamic values
   - word/line/span/grapheme animation
   - RTL-safe text behavior

10. Equation Engine
    - semantic mathematics
    - equation rendering
    - symbol identity
    - matched equation transforms
    - substitutions
    - derivations

11. Graph/Data/Measurement Engine

12. Dynamic Relationship Engine

13. Interactive Controls

14. Storyboard and presentation sequencing

15. Audio Engine

16. Universal Physics Runtime

17. Solver infrastructure
    - analytical
    - algebraic/root/linear systems
    - ODE
    - rigid-body/constraints
    - many-body particles
    - grid/PDE
    - ray/path
    - circuit/network
    - stochastic/Monte-Carlo
    - reconstruction/inverse
    - spectral/FFT
    - coupled multiphysics

18. Teacher Editor completion

19. PhysScript

20. Cambridge Topic 1:
    Physical quantities and units

21. Topic 2:
    Kinematics

22. Topic 3:
    Dynamics

23. Topic 4:
    Forces, density and pressure

24. Topic 5:
    Work, energy and power

25. Topic 6:
    Deformation of solids

26. Topic 12:
    Motion in a circle

27. Topics 7-8:
    Waves and Superposition

28. Extended Geometrical and Physical Optics

29. Topics 9-10:
    Electricity and D.C. circuits

30. Topic 19:
    Capacitance

31. Topic 13:
    Gravitational fields

32. Topic 18:
    Electric fields

33. Topic 20:
    Magnetic fields

34. Topic 21:
    Alternating currents

35. Topic 14:
    Temperature

36. Topic 15:
    Ideal gases

37. Topic 16:
    Thermodynamics

38. Topic 17:
    Oscillations

39. Topic 11:
    Particle physics

40. Topic 22:
    Quantum physics

41. Topic 23:
    Nuclear physics

42. Topic 24:
    Medical physics

43. Topic 25:
    Astronomy and cosmology

44. Practical Physics toolkit

45. Extended Physics modules:
    - rotational dynamics
    - fluid mechanics
    - acoustics and Doppler
    - electronics/semiconductors
    - communications
    - relativity
    - advanced electromagnetism
    - advanced mechanics
    - extended atomic/modern physics

46. Interactive web playback/export

47. SVG/PNG/data export

48. Deterministic video/audio export

49. Example Gallery finalization

50. Persistence/package robustness and migrations

51. Performance optimization

52. Accessibility

53. Security/plugin sandbox validation

54. Complete Cambridge 9702 coverage validation

55. Release Candidate preparation

You may split these into smaller implementation specifications where that makes
the work safer and clearer.

Do not combine unrelated large systems simply to reduce the number of steps.

======================================================================
SCIENTIFIC PRINCIPLES
======================================================================

Always preserve:

PHYSICS
determines what actually happens.

MATHEMATICS
represents it quantitatively.

VISUALISATION
shows the state.

PRESENTATION
controls how the teacher explains it over time.

Never reverse this relationship.

Examples:

- a velocity arrow reads physical velocity;
- an acceleration arrow reads acceleration;
- field lines derive from the field;
- a gas pressure display derives from the selected gas model;
- an interference pattern derives from wave/slit physics;
- an ultrasound detector trace derives from propagation/acquisition;
- a redshift display derives from the selected spectral/redshift model;
- equations preserve semantic mathematical identity during transforms.

Visual convenience may never silently change physics.

======================================================================
CURRICULUM REQUIREMENT
======================================================================

Physica 1.0 must support and validate all 25 Cambridge International AS & A
Level Physics 9702 topics specified in docs/CURRICULUM_COVERAGE.md.

Do not infer coverage merely from broad package names.

Each topic must eventually include, as applicable:

- physics models;
- Physics Library items;
- apparatus prefabs;
- animations;
- simulations;
- representations;
- graphs;
- equations;
- controls;
- observables;
- scientific validation;
- example projects.

Also implement the planned Practical Physics toolkit.

Extended Physics modules must follow the approved roadmap.

======================================================================
NO AI DEPENDENCY
======================================================================

Do not introduce an AI dependency into:

- authoring;
- physics;
- validation;
- rendering;
- PhysScript;
- project interpretation.

PhysScript remains deterministic.

======================================================================
DEPENDENCY RULE
======================================================================

Do not add libraries simply because they are named in broad product planning.

Add a dependency only when the current implementation phase actually requires it
and it complies with licensing/security specifications.

Document every new dependency.

======================================================================
ARCHITECTURE BLOCKER PROTOCOL
======================================================================

Continue autonomously through ordinary engineering problems.

STOP only if:

1. a required feature fundamentally cannot be represented by the frozen
   architecture;

2. two higher-authority specifications genuinely contradict and source priority
   cannot resolve them;

3. implementation requires reversing or materially changing a frozen ADR;

4. an unresolved scientific ambiguity would alter the intended physical meaning;

5. safe persistence/migration cannot be implemented without potential data loss;

6. a required dependency creates an unresolved licensing/security problem.

If this occurs, write in docs/CURRENT_STATE.md:

ARCHITECTURE BLOCKER

Problem:
...

Requirement affected:
...

Why existing specifications cannot resolve it:
...

Affected packages/documents:
...

Possible options:
1. ...
2. ...

Recommended resolution:
...

Then STOP autonomous progression.

Do not redesign the project silently.

======================================================================
DO NOT STOP FOR ORDINARY ENGINEERING
======================================================================

Do NOT stop merely because:

- implementation is difficult;
- a helper API was not explicitly specified;
- tests initially fail;
- internal refactoring inside package ownership is needed;
- an example needs additional internal support;
- an implementation algorithm requires engineering judgment.

Resolve those matters while respecting the frozen contracts.

======================================================================
CONTEXT / SESSION CONTINUITY
======================================================================

The repository is the source of truth, not this Codex conversation.

Do not depend on conversational memory for project continuity.

Before a work session becomes too large:

1. finish the current bounded unit where possible;
2. run relevant tests;
3. commit/checkpoint verified work;
4. update CURRENT_STATE.md;
5. record the exact next unfinished task.

A fresh Codex session must be able to continue by reading:

AGENTS.md
docs/CURRENT_STATE.md
the relevant owning specifications

If context or usage limits interrupt work, preserve that resumable state before
ending whenever possible.

======================================================================
FINAL AUTONOMOUS BOUNDARY
======================================================================

Your autonomous authority ends at:

PHYSICA 1.0 RELEASE CANDIDATE

Do NOT declare final stable 1.0 yourself.

At Release Candidate stage:

1. run the complete test suite;
2. run architecture checks;
3. run all physics reference/validation suites;
4. run all visual/E2E suites;
5. build all required application targets;
6. generate all available example-gallery artifacts;
7. generate the complete 25-topic Cambridge coverage report;
8. generate benchmark/performance results;
9. list every remaining limitation;
10. update CURRENT_STATE.md to:

   "Physica 1.0 Release Candidate complete.
    Awaiting external final acceptance audit."

Then STOP.

Begin now from the first unfinished task after Step 5.
