# HC-05 — Mechanics Alpha Health Checkpoint

**Status:** PASSED AFTER CORRECTIONS

**Introduced after:** Phase 8 — Mechanics curriculum package

**Audited implementation baseline:** `a05d52d` (Complete Phase 8 mechanics curriculum)

**Scope:** all completed work through Phase 8, with focused review of curriculum evidence, mechanics models, units and invariants, Physics Library composition, Gallery reconciliation, teacher workflows, maintainability and the launcher-visible desktop

## 1. Outcome

Phase 8 delivers Physica's first curriculum-wide vertical slice. Cambridge 9702 Topics 1–6 and 12 are explicitly `VALIDATED` from public capability, Library, example, scientific-test and release-gate evidence. The other 18 topics remain explicitly unimplemented rather than being inferred from package names.

The launcher now opens a usable Mechanics Alpha containing seven no-code workflows: projectile motion, inclined-plane free-body diagrams, an Atwood pulley, one-dimensional collisions, energy accounting, stress–strain and uniform circular motion. Each workflow derives its diagram, equation, values, assumptions and diagnostic from one deterministic physical result. No completed roadmap step was reopened and no Architecture Blocker was found.

## 2. Phase 8 evidence matrix

| Curriculum area | Delivered contract | Evidence | Decision |
| --- | --- | --- | --- |
| Topic 1 | repeated-measurement uncertainty, significant figures, vectors and central dimensional checks | mechanics scientific tests plus 4 Gallery projects | Validated |
| Topic 2 | constant-motion, free-fall, piecewise motion, projectile model/events and linked graphs | analytical/runtime tests plus 5 Gallery projects | Validated |
| Topic 3 | resultant force, Newton II, incline, pulley, impulse and collision invariants | force/momentum/energy tests plus 6 Gallery projects | Validated |
| Topic 4 | moments, centre of mass, stability, density and hydrostatic pressure | statics reference tests plus 4 Gallery projects | Validated |
| Topic 5 | work, power, efficiency, potential energy and conservation ledgers | exact ledger tests plus 4 Gallery projects | Validated |
| Topic 6 | Hooke law, elastic energy, stress, strain, Young modulus and bounded elastic/plastic model | material relation tests plus 4 Gallery projects | Validated |
| Topic 12 | uniform circular state with tangent velocity and inward acceleration/force | vector invariant tests plus 3 Gallery projects | Validated |

## 3. Corrections and architecture review

- **HC05-F01:** projectile evaluation and display now stop at the deterministic ground-contact event instead of extending the trajectory below ground.
- **HC05-F02:** the inclined-plane drawing now follows the actual teacher-selected angle; the friction vector is correctly parallel and upslope.
- **HC05-F03:** projectile, incline and circular diagrams scale valid extreme settings into the viewport, while vector directions and relative geometry remain physical.
- **HC05-F04:** the initial 890-line workbench and concentrated mechanics modules were split by responsibility into workflow metadata, pure analysis, diagrams, shell, model families, scenario catalog/evaluation and Library descriptors/registration. The largest remaining new behavior module is 491 lines.
- **HC05-F05:** workflow and application navigation now expose active state to assistive technology, and the authoring link was renamed to describe its actual destination.
- **HC05-F06:** Gallery verification now rejects duplicate IDs, duplicate paths, missing declarations and orphan metadata across the complete repository.

The mechanics package remains curriculum-independent and has no React, renderer or editor dependency. It returns immutable typed validation results, uses canonical SI fields, delegates dimension algebra to `@physica/units`, and implements projectile/circular analytical models through the existing physics-core lifecycle. It does not own a clock, scheduler, runtime store or persistent document writer.

The curriculum package contains evidence mapping only. Library contributions use the public registries and immutable JSON-safe snapshots. Multi-body pulley and collision behavior returns one system result, so no competing physical-state authority was introduced. No root schema version, ADR, third-party dependency or solver contract changed.

## 4. Product, examples and maintainability

All 30 mandatory Mechanics Gallery projects ship metadata, README, deterministic executable input/output, exact expected JSON, accessible SVG preview, automated coverage and truthful Phase 20 pending declarations. The aggregate ledger reconciles exactly with all 87 Gallery projects.

Mechanics Alpha is lazy-loaded from the stable shell. Its dedicated chunk is approximately 17.07 kB / 5.77 kB gzip; the stable startup chunk is approximately 419.06 kB / 120.01 kB gzip. The inherited Foundation archive remains approximately 4.654 MB / 1.288 MB gzip but is fetched only when requested. That known archive concentration does not affect Mechanics startup and remains owned by the next phase that changes archived proof surfaces or by Phase 20 optimization.

Controls are native labelled range inputs and buttons, diagrams have text alternatives, selected views expose semantic state, focus is visible, colour is supplemented by labels, and reduced-motion CSS removes non-essential interpolation. The preview is an honest scientific alpha, not final lesson artwork.

No TODO/FIXME/HACK suppression, dead generator, duplicate mechanics authority or malformed generated text remains. Final `.physica`, PNG and WebM artifacts remain scheduled for the shared Phase 20 packaging/capture pipeline and are declared rather than falsely claimed.

## 5. Verification evidence

Passed on Windows:

- frozen offline install across 147 workspace projects;
- repository Prettier check;
- ESLint with zero warnings and architecture boundaries;
- strict TypeScript across 146 scripted workspaces;
- unit/example/scientific suite: 98 files, 407 tests;
- architecture suite: 1 file, 2 tests;
- focused Phase 8 suite: 4 files, 48 tests;
- all three application production builds;
- final corrected desktop typecheck and production build;
- `Launch Physica.bat --check` with Tauri CLI 2.11.4, Cargo 1.94.1 and the desktop production build;
- Git whitespace/integrity checks.

No automated live-window screenshot is claimed. The same Mechanics Alpha is the default view when the user opens `Launch Physica.bat`.

## 6. Blockers and next task

Reopened work: none.

Architecture Blockers: none.

HC-05 passes the Mechanics Alpha boundary. Phase 8 is complete. The exact next phase-level assignment is Phase 9 — Waves and Optics — followed by Phases 10 and 11 before scheduled HC-06.
