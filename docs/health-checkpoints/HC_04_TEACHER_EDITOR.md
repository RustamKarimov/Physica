# HC-04 — Teacher Editor Health Checkpoint

**Status:** PASSED AFTER CORRECTIONS

**Introduced after:** Phase 7 Step 7.5 — PhysScript

**Audited implementation baseline:** `91f0c24` (Complete Phase 7 teacher editor and PhysScript)

**Scope:** all completed work through Phase 7, with focused review of real teacher authoring, command authority, layout/physics separation, multi-clock timeline semantics, PhysScript, examples, maintainability and the launcher-visible desktop

## 1. Outcome

Phase 7 turns the accumulated engineering proofs into the first coherent teacher-authoring workflow. A teacher can choose a template, create an authoritative project, search and instantiate Physics Library content, select meaningful stage objects, inspect five concern-specific views, distinguish layout from physical manipulation, scrub animation/clock/audio/acquisition tracks, validate and format PhysScript, undo/redo document changes and download a truthful JSON snapshot.

No completed roadmap step was reopened and no Architecture Blocker was found. HC-04 corrected four bounded findings: the inherited eager desktop bundle, concentrated new styling, one PhysScript lint defect and Gallery-ledger drift from the three new projects.

## 2. Phase 7 evidence matrix

| Step | Delivered contract | Evidence | Decision |
| --- | --- | --- | --- |
| 7.1 | Stable authoring shell, project home, metadata-driven templates and searchable Physics Library | desktop template/library workflow and `teacher-authoring-workflow` | Verified |
| 7.2 | Model, Visual, Relationships, Data and Validation inspector tabs | selection inspector in the desktop and valid-project diagnostics | Verified |
| 7.3 | Explicit presentation-layout versus component-initial-state manipulation | mode-labelled stage, one-command physical commit, undo/redo example | Verified |
| 7.4 | Immutable animation, named-clock, audio and acquisition tracks with deterministic compilation/evaluation | `@physica/storyboard` timeline tests and desktop scrubber | Verified |
| 7.5 | PhysScript V1 parser, recovery diagnostics, validator, canonical serializer and bidirectional data-only command intents | command tests plus projectile/equation examples | Verified |

## 3. Corrections and architecture review

- **HC04-F01:** the old renderer/solver observatory moved behind a dynamic `Foundation archive` route. The default authoring JavaScript is approximately 385.41 kB / 111.02 kB gzip; the 4.664 MB / 1.290 MB gzip archive is fetched only when requested.
- **HC04-F02:** the 1,566-line combined desktop stylesheet was separated by ownership into legacy global styles (616 lines), shell/home styles (311 lines) and workspace styles (638 lines).
- **HC04-F03:** unnecessary escaped quotes in the PhysScript set-statement grammar were removed after ESLint detected them.
- **HC04-F04:** the aggregate pending-artifact ledger now reconciles exactly with all 57 Gallery metadata entries.

PhysScript lives with commands rather than creating another document store. It has a closed grammar, permits namespaced IDs, serializes canonically and cannot execute callbacks, JavaScript, Python, shell commands or network work. Its command plan is JSON-safe and source ordered.

The advanced timeline names every clock explicitly and only evaluates at a supplied playhead. It neither advances clocks nor writes runtime state. Audio and acquisition remain owned by their respective future engines.

Template and Library creation use `DefaultProjectStore`, built-in commands and snapshot instantiation. Document-owned physical positions dispatch one initial-state command at drag completion; layout movement remains transient presentation state. No root schema version, ADR, third-party dependency, runtime writer, solver, clock or scheduler was added.

## 4. Product, examples and maintainability

The stage now uses semantic geometric glyphs for balls, vehicles, springs, axes/vectors, panels and generic apparatus rather than circles containing first letters. Mode labels and explanatory text state whether a drag changes presentation or physics.

Three complete Phase 7 Gallery projects ship metadata, README, deterministic executable output, exact expected JSON, accessible SVG preview, automated tests and truthful pending declarations:

- `examples/physcript/physcript-projectile`;
- `examples/physcript/physcript-equation-transform`;
- `examples/editor/teacher-authoring-workflow`.

The largest new behavior files are the 454-line teacher workspace, 368-line PhysScript implementation and 173-line timeline implementation. Their responsibilities remain cohesive and their types/panels are split into separate modules. No TODO/FIXME/HACK suppression or competing authority was found.

The old archive chunk still exceeds the generic Vite warning threshold, but it is no longer startup work. Further subdivision belongs to whichever archived feature is next modified; it does not block the authoring shell.

## 5. Verification evidence

Passed on Windows:

- frozen install across 117 workspace projects;
- repository Prettier check;
- ESLint with zero warnings and architecture boundaries;
- strict TypeScript across 116 scripted workspaces;
- unit/example/scientific suite: 94 files, 359 tests;
- architecture suite: 1 file, 2 tests;
- all three application production builds;
- focused Phase 7 suite: 5 files, 12 tests;
- `Launch Physica.bat --check` with Tauri CLI 2.11.4, Cargo 1.94.1 and the desktop production build;
- live launcher reached `target/debug/physica-desktop.exe`.

The Windows visual-inspection helper exited twice before returning a window state, so no automated live screenshot is claimed. Accessible checked-in previews, interaction-model tests, production builds and the launcher gate passed; the user can inspect the same authoring workflow through `Launch Physica.bat`.

## 6. Blockers and next task

Reopened work: none.

Architecture Blockers: none.

HC-04 passes the Teacher Editor boundary. Phase 7 is complete. The exact next phase-level assignment is Phase 8 — Mechanics curriculum package for Cambridge Topics 1–6 and 12 — ending with the Mechanics Alpha release gate and HC-05.
