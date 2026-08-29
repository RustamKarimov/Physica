# Physica — Current State

**Architecture status:** FROZEN for initial implementation

**Execution mode:** AUTONOMOUS PROJECT EXECUTION ACTIVE

**Mandatory governance:** Every future session must read `docs/AUTONOMOUS_EXECUTION_PROTOCOL.md` before continuing project work.

**Current development phase:** Step 8 complete — deterministic Checkpoint/Replay verified

**Current task:** Step 9 — implement Rendering Foundation from `docs/implementation/STEP_09_RENDERING_FOUNDATION_SPEC.md`

**Next task:** Step 9 — verify, self-review, document, commit and push the rendering foundation

**Blockers:** None

## Autonomous execution status

Autonomous execution toward the Physica 1.0 Release Candidate is active under `docs/AUTONOMOUS_EXECUTION_PROTOCOL.md`. The protocol is a permanent project governance document and must be read together with `AGENTS.md` and this operational state at the start of every future work session. Ordinary verified phases continue without user confirmation; progression stops only under the protocol's Architecture Blocker conditions or at the Physica 1.0 Release Candidate boundary.

**User observation requirement:** Keep `Launch Physica.bat` working as the one-click Windows development launcher. As soon as a phase produces meaningful visible UI, expose it through this live Tauri development app so the user can observe progress. Do not add installer/executable packaging merely for progress observation.

## Step 8 result

Completed and audited `docs/implementation/STEP_08_CHECKPOINT_REPLAY_SPEC.md`, then implemented deterministic runtime checkpoint capture, atomic restoration and forward replay. The phase remains a runtime foundation: it adds no production physics solver, renderer, editor UI, persisted project format or installer packaging.

Implemented in `packages/checkpoints`:

- immutable schema-versioned checkpoint envelopes containing scene identity, selected primary clock, complete named-clock snapshot, authoritative Runtime State Store snapshot, solver/random/acquisition/runtime-continuation participant snapshots, global event-sequence position and deterministic sequence identity;
- canonical key-ordered serialization and a dependency-free UTF-8 CRC-32 integrity checksum, with corruption detected before runtime mutation;
- a namespaced participant registry with unique IDs, positive schema versions, lexical capture/restore order, exact participant-set validation and finite JSON-state enforcement;
- bounded in-memory checkpoint storage with validated cadence, per-scene capacity, deterministic eviction and nearest-checkpoint-at-or-before-target selection;
- capture and capture-if-due services with non-wrapping safe-integer checkpoint sequences;
- restore preflight followed by clocks, authoritative state, event sequence and participant restoration, with full rollback if any participant restore fails;
- numerical scrubbing by restoring the nearest checkpoint and replaying fixed maximum-size steps in selected-clock coordinates, including an exact partial final step and one derived-state regeneration;
- direct analytical scrubbing adapter support without fake reverse-time visual playback;
- stable typed callback failures without leaking host-specific exception text.

Runtime integration changes:

- `ClockRuntime.validateSnapshot` now performs exact clock-ID-set and finite-state preflight without mutation; restore delegates to it;
- `RuntimeStateStore.validateSnapshot` now performs pure scene/channel/revision/JSON validation before restore;
- `RuntimeEventSequence.validatePosition` and `restore` now expose the checkpoint-owned sequence-state contract;
- all dependencies remain one-way through public exports: checkpoints depends only on core-model, clocks, events and runtime-scheduler; no third-party dependency or ADR change was required.

Example Gallery artifacts:

- `examples/time/numerical-scrub` checkpoints a semi-implicit falling-body runtime at 2 s, advances to 4 s, scrubs backward to 3 s and forward to 4 s, and exactly matches uninterrupted position, velocity and event-sequence state;
- `examples/time/stochastic-scrub` checkpoints complete xorshift32 and event-sequence state and proves replay reproduces the exact stochastic tail that restoring the seed alone would not reproduce.

Each example includes metadata, README, executable run module, deterministic expected JSON, accessible expected SVG preview, automated test and an explicit pending-artifact manifest. Future `.physica`, PNG, WebM and gallery-browser artifacts remain registered in `examples/pending-artifacts.json` until their owning rendering/gallery infrastructure exists.

Scientific, architecture, teacher-UX and performance self-review resolved:

- checkpoint restore validates integrity and every runtime component before mutation, while participant failures preserve their typed cause after successful rollback;
- full PRNG state and event-sequence position are restored, not merely an initial seed;
- replay rejects non-finite targets, non-positive step bounds, floating-point non-progress and clock divergence;
- participant callbacks and replay adapters are isolated behind typed exception boundaries;
- deterministic nearest selection, forward/backward equivalence, analytical scrubbing, corruption rejection, rollback and 10,000 repeated selections are covered by tests;
- bounded per-scene storage keeps selection cost governed by the configured checkpoint capacity.

Progress observation launcher repairs:

- `Launch Physica.bat` now finds standalone pnpm or standard Node.js Corepack, prepends standard Node and Rust toolchain locations, installs missing workspace dependencies and validates Tauri, Cargo and the frontend build in `--check` mode;
- Tauri's nested frontend lifecycle uses `npm run dev`/`npm run build`, so it does not require a second shell to resolve pnpm;
- Vite is explicitly pinned to Tauri's expected port 1420;
- a port preflight gives a concise existing-instance explanation instead of a Vite stack trace on accidental double launch;
- an end-to-end launch with a deliberately minimal PATH started Vite on port 1420, completed the native Rust build and ran `target/debug/physica-desktop.exe` successfully;
- the launcher remains live-development only and performs no executable/installer packaging.

Commands and verification:

- focused Checkpoint/Replay and gallery run — 3 files, 12 tests passed;
- targeted runtime-integration run — 4 files, 41 tests passed before the final callback-boundary addition;
- strict typechecks for checkpoints and both new examples — passed;
- `pnpm run ci` — passed: repository formatting, ESLint, architecture boundaries, strict TypeScript across 70 of 71 workspace projects with scripts, 22 unit/example files with 127 tests, 2 architecture tests and all three application builds.

## Step 7 result

Completed and audited `docs/implementation/STEP_07_RUNTIME_SCHEDULER_SPEC.md`, then implemented the frozen deterministic runtime boundary. The phase is limited to runtime orchestration foundations; it adds no physics model, solver, renderer, checkpoint service, editor feature or installer packaging.

Implemented in `packages/events`:

- immutable JSON-safe RuntimeEvent envelopes with finite timestamps, named clock domains, namespaced event types, explicit priorities and safe-integer sequence IDs;
- typed event validation and typed event-sequence construction/exhaustion;
- monotonic sequence snapshot position for later Checkpoint/Replay integration;
- insertion-preserving runtime event buffer with snapshot, drain and clear behavior.

Implemented in `packages/runtime-scheduler`:

- the exact immutable 13-stage frozen phase order plus namespaced specialized phases anchored before/after built-in phases;
- deterministic task registration/order and a timer-free synchronous cycle driver;
- one automatic `ClockRuntime.advance` invocation in the clock phase, with system intervals derived only from named clock changes;
- transient per-scene Runtime State Store with JSON-safe snapshots, exact initial-state reset/restore, revisions and no ProjectDocument/history mutation;
- single-writer claims, declared-output enforcement and atomic per-system runtime writes;
- producer-consumer system dependency graphs with lexical ready-set order and typed coupled-cycle rejection;
- scheduled event order by timestamp, phase, priority, unique sequence and stable textual keys, plus next-cycle deferral for handler-emitted events;
- deterministic event-handler order and scoped runtime-state writes;
- JSON-safe deterministic cycle traces, including inspectable partial traces after failure;
- ordered asynchronous worker-result collection independent of completion timing.

Package-boundary decisions:

- `@physica/events` owns event identity/data and depends only on core-model;
- `@physica/runtime-scheduler` owns phase/event ordering and the Runtime State Store because the frozen map has no separate runtime-state package;
- runtime-scheduler depends only on public core-model, clocks and events exports;
- no package cycle, new workspace package, third-party dependency or ADR change was required.

Example Gallery artifacts:

- `examples/system/scheduler-order-trace`;
- `examples/system/runtime-state-reset`;
- `examples/system/runtime-event`.

Each example includes metadata, README, executable run module, deterministic expected JSON, accessible expected SVG preview and an automated test. Future `.physica`, PNG, WebM and gallery-browser artifacts remain truthfully registered in `examples/pending-artifacts.json` until their owning infrastructure exists.

Progress observation:

- added root `Launch Physica.bat`, which starts the live Tauri development application through the existing workspace toolchain;
- after an ordinary Windows terminal could not see Codex's private pnpm path, the launcher was repaired to discover pnpm or fall back to standard Node.js Corepack, prepend the Node installation path for child scripts, install missing workspace dependencies and expose a non-launching `--check` mode;
- the launcher performs no executable/installer packaging and remains the required observation entry point for the first meaningful visible UI phase;
- a clean-PATH `Launch Physica.bat --check` resolved successfully to Tauri CLI 2.11.4.

Scientific, architecture, teacher-UX and performance self-review resolved:

- invalid sequence construction now returns typed results rather than throwing;
- duplicate sequence IDs are rejected instead of falling back to insertion order;
- system writes are restricted to each system's declared outputs and remain atomic on failure;
- failed cycles expose deterministic completed trace records without nondeterministic exception text;
- last-trace recording no longer performs quadratic array copying;
- the 10,000-run determinism test retains all runs while avoiding heavyweight assertion overhead;
- the Windows batch launcher is explicitly excluded from Prettier because Prettier has no batch parser.

Commands and verification:

- focused Step 7 run — 5 files, 26 tests passed;
- targeted strict typechecks for events, runtime-scheduler and all three examples — passed;
- `pnpm typecheck` — passed across 68 of 69 workspace projects with scripts;
- `pnpm lint` — ESLint and architecture boundaries passed;
- `pnpm test` — unit/example suite: 19 files, 115 tests passed; architecture suite: 1 file, 2 tests passed;
- `pnpm run ci` — passed: repository formatting, ESLint, architecture boundaries, strict TypeScript across 68 workspace projects, 115 unit/example tests, 2 architecture tests and all three application builds.

## Step 6 result

Completed and audited `docs/implementation/STEP_06_MATHEMATICS_UNITS_COORDINATES_CLOCKS_SPEC.md`, then implemented its bounded mathematics, units, coordinate/reference-frame and clock foundations. No renderer, solver, scheduler, editor UI or later subsystem was implemented.

Implemented in `packages/mathematics`:

- typed mathematical results and errors plus finite-input validation;
- immutable 2D/3D vectors, complex numbers, dynamic matrices, quaternions, intervals, sampled series and a numerical policy contract;
- tagged coordinate positions/directions, 2D planes, branded reference-frame identifiers, Galilean transforms, provider registration and deterministic frame-graph path transforms with explicit time;
- explicit educational display scaling that does not mutate physical state.

Implemented in `packages/units`:

- exact seven-base SI dimension vectors and dimension algebra, including semantic dimensionless kinds;
- unit definitions, registry and parser with SI prefixes from quecto through quetta, SI base/derived units and selected teaching units;
- canonical-SI quantities with preserved display units, deterministic display precision, uncertainty propagation, affine-unit safeguards and generated coherent compound units.

Implemented in `packages/clocks`:

- persisted `physica:clock/domain-v1` configuration parsing and validation;
- mandatory simulation and presentation clocks, unique keys, valid links and cycle rejection;
- immutable transient clock runtime supporting run/pause/rate/scrub, linked and conditional clocks, deterministic topological advancement and snapshots;
- strict runtime/document separation: clock state is not persisted in `ProjectDocument` and clock operations do not enter document undo history.

Package-boundary decisions:

- coordinate/reference-frame primitives are owned by `@physica/mathematics`, because the frozen package map defines no separate coordinates package;
- `@physica/units` depends only on `@physica/mathematics`;
- `@physica/clocks` depends only on `@physica/core-model`; an initially considered units dependency was removed as unnecessary;
- no new third-party dependency or ADR was required.

Example Gallery artifacts:

- `examples/math/units-and-dimensions`;
- `examples/math/vector-operations`;
- `examples/rendering/coordinate-spaces`;
- `examples/time/two-clocks`.

Each example includes metadata, README, deterministic expected output, an accessible expected SVG preview and an automated example test. Runtime-dependent `.physica`, PNG and WebM deliverables remain truthfully registered in `examples/pending-artifacts.json` and local example manifests until their owning runtime/rendering capabilities exist; no placeholder output was presented as complete.

Scientific and architecture self-review resolved:

- dimensionless cancellation now preserves valid semantic kinds;
- generated unit identifiers are Unicode-safe;
- prefixed and compound display-unit expressions remain round-trippable;
- non-finite quantity and frame-transform inputs return typed errors;
- linked clocks begin at revision zero and no-op advances neither allocate state nor emit false changes;
- deterministic quantity display formatting honors stored precision;
- the unused clock-to-units dependency was removed.

Commands and verification:

- focused Step 6 run — 8 files, 57 tests passed;
- targeted strict typechecks for all changed packages and examples — passed;
- `pnpm typecheck` — passed across 65 of 66 workspace projects with scripts;
- `pnpm lint` — ESLint and architecture boundaries passed;
- `pnpm test` — unit/example suite: 14 files, 89 tests passed; architecture suite: 1 file, 2 tests passed;
- `pnpm run ci` — passed: repository formatting, ESLint, architecture boundaries, strict TypeScript across 65 workspace projects, 89 unit/example tests, 2 architecture tests and all three application builds.

Checkpoint note: Step 6 is an isolated, buildable snapshot on top of the verified Step 5 foundation and is recorded as the project-publication checkpoint.

## Step 5 result

Implemented the Step 5 boundary from Sections 34–36 of `docs/implementation/STEP_04_CORE_PROJECT_MODEL_SPEC.md`. The implementation is limited to document modeling, serialization, document commands/history and the two required non-visual system examples. No runtime engine, physics algorithm, renderer, mathematics/units implementation, editor UI or plugin execution was added.

Implemented in `packages/core-model`:

- JSON-safe value/result types and strict runtime JSON-value recognition;
- branded UUID-v4 persisted IDs, registered/plugin/state-channel identifier parsing, `CryptoIdFactory` and injectable `DeterministicIdFactory`;
- ProjectDocument schema version 1, PresentationFlow, Scene, Entity, Component, System, Representation, Asset, Dataset, reference, metadata and state-channel envelopes;
- pure global identity, structural/reference and single-authoritative-writer validation;
- explicit document/runtime separation with no runtime frames in the persisted model.

Implemented in `packages/serialization`:

- strict Zod V1 schemas for the complete Step 5 document envelope;
- deterministic canonical JSON normalization/stringification and parsing, including non-finite/unsupported-value rejection;
- typed invalid-JSON, invalid-structure, future-version and migration-failure results;
- sequential `n → n+1` migration-registry foundation with no fictitious production migrations;
- opaque unknown-plugin configuration, initial-state, metadata and extension preservation.

Implemented in `packages/commands`:

- command/handler registry, immutable command application and atomic transactions;
- all 14 specified built-in commands: Scene add/remove/reorder; Entity add/remove; Component add/remove/configuration/initial-state; System add/remove; Representation add/remove; Project metadata replacement;
- prepared inverse-command sequences, transaction-level undo/redo and redo-branch clearing;
- framework-independent ProjectStore with one publication per committed transaction, monotonically increasing revision, stable save/history tokens, dirty tracking, subscription and replace-document behavior.

Example Gallery artifacts:

- `examples/system/schema-roundtrip`: executable two-Scene document fixture containing Entity, unknown-plugin Component, System, TextBlock Representation and Asset-backed Dataset, with metadata, README, expected JSON output, expected SVG preview and automated example test;
- `examples/system/undo-redo`: executable ProjectStore transaction/undo/redo fixture with stable identity checks, metadata, README, expected JSON output, expected SVG preview and automated example test.

Tests added:

- UUID generation/parsing, deterministic IDs and global duplicate detection;
- valid/invalid V1 structures, strict root fields, timestamps and typed future-version rejection;
- PresentationFlow and dangling Entity/System/Representation/Dataset/Asset references;
- Component/System authority acceptance and conflict cases;
- canonical JSON determinism, array order, undefined behavior and NaN/Infinity rejection;
- unknown-plugin semantic preservation after unrelated editing and serialization;
- all built-in command inverse paths, including multi-transition Scene restoration;
- atomic rollback/publication, grouped undo/redo, branch clearing, listeners, dirty/save markers and document replacement;
- runtime/document separation and deterministic 100-command apply → undo-all → redo-all equality;
- all 12 Section 30 future-proof schema fixtures, each parsed and reference-validated;
- both required executable examples and their checked-in expected outputs.

Dependency added:

- `zod` 4.4.3 (MIT), scoped only to `packages/serialization`; no other Step 5 dependency was added.

Commands and verification:

- `pnpm install --frozen-lockfile=false` — passed; workspace links and lockfile updated with no additional package downloads required;
- targeted `@physica/core-model`, `@physica/serialization` and `@physica/commands` strict typechecks — passed;
- targeted Step 5 Vitest run — 5 files, 52 tests passed;
- `pnpm typecheck` — passed across 61 of 62 workspace projects with scripts;
- `pnpm lint` — ESLint passed and architecture boundaries passed;
- `pnpm test` — unit/example suite: 7 files, 54 tests passed; architecture suite: 1 file, 2 tests passed;
- `pnpm run ci` — passed: repository formatting, ESLint, architecture boundaries, strict TypeScript, 54 unit/example tests, 2 architecture tests and all three application builds.

Deviations and blockers:

- none. `packages/events` required no change. No Step 6 or later subsystem was implemented.

## Step 3 result

The existing Git repository and commit history were preserved. The repository began Step 3 with the Step 2 specification set, frozen reference documents, placeholder-only root `src/`, `public/`, `tests/`, `examples/` and `benchmarks/`, and no package manager, application, TypeScript, test, lint, format or CI configuration.

Created:

- pnpm workspace and lockfile with centralized dependency versions;
- strict shared TypeScript configuration;
- minimal React/Vite shells in `apps/desktop`, `apps/web-viewer` and `apps/gallery`;
- Tauri 2 desktop shell, configuration, permissions, Cargo lockfile and generated platform icons;
- 56 minimal package shells from the frozen architecture package map;
- Vitest smoke/example tests and Playwright web-viewer smoke test;
- architecture boundary checker, approved fixture and deliberately forbidden physics-to-React fixture;
- bootstrap-only `examples/system/hello-stage` metadata, README and expected SVG preview;
- ESLint, Prettier, shared scripts and three-platform CI skeleton.

Removed:

- obsolete placeholder-only root `src/` and `public/` directories;
- superseded `tests/.gitkeep` and `examples/.gitkeep` markers.

No earlier application code existed to migrate or preserve. `benchmarks/.gitkeep`, all Step 2 specifications and all frozen reference files were preserved. No Physica feature implementation was started.

## Exact direct toolchain and dependency versions

Runtime and compiler:

- Node.js 24.14.1
- pnpm 11.24.0
- TypeScript 6.0.3
- Rust 1.94.1
- Cargo 1.94.1

Application shell:

- React 19.2.8
- React DOM 19.2.8
- Vite 8.2.2
- `@vitejs/plugin-react` 6.1.1
- `@tauri-apps/api` 2.11.1
- `@tauri-apps/cli` 2.11.4
- Rust `tauri` crate 2.11.5
- Rust `tauri-build` crate 2.6.3

Quality tooling:

- Vitest 4.1.11
- Playwright 1.62.1 with Chromium 151.0.7922.34
- ESLint 10.9.1
- `@eslint/js` 10.0.1
- `typescript-eslint` 8.68.0
- `eslint-plugin-react-hooks` 7.1.1
- `eslint-plugin-react-refresh` 0.5.5
- Prettier 3.9.6
- `@types/node` 26.4.0
- `@types/react` 19.2.18
- `@types/react-dom` 19.2.5

TypeScript 7.0.2 was available but was not selected because `typescript-eslint` 8.68.0 supports TypeScript below 6.1.0. TypeScript 6.0.3 is the newest mutually compatible stable release in that range. Direct JavaScript dependencies are exact-pinned in the workspace catalog/manifests; the full transitive graphs are frozen in `pnpm-lock.yaml` and `apps/desktop/src-tauri/Cargo.lock`.

## Commands and verification

Passed:

- `pnpm install`
- `pnpm install --frozen-lockfile` across all 60 workspace projects
- `pnpm run ci` — formatting, ESLint, architecture lint, strict TypeScript, Vitest and all three app builds
- `pnpm test:architecture` — approved dependency passes and forbidden physics-to-React fixture is rejected
- `pnpm test:unit` — workspace and bootstrap example smoke tests pass
- `pnpm test:e2e` — Playwright launches Chromium and verifies the web-viewer shell
- `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml`

Resolved during bootstrap:

- the first forbidden-fixture test exposed missing support for side-effect imports; the boundary parser was corrected and the test now passes;
- the first Cargo check reported the required Windows icon was absent; the standard Tauri icon set was generated from the bootstrap SVG and Cargo now passes;
- the first aggregate check saw generated Tauri ACL schemas; generated schemas are now excluded from source formatting and Git tracking;
- `pnpm ci` invokes pnpm's clean-install command, so CI explicitly uses `pnpm run ci` for the workspace verification script.

## Frozen reminders

- physics state is authoritative;
- document state and runtime simulation state are separate;
- one authoritative writer exists per physical state channel;
- clocks, deterministic scheduling, solvers and events use their owning contracts;
- physics/domain packages do not import React or editor internals;
- every future user-visible feature requires its complete Example Gallery artifact set.

## Step 9 read first

- `AGENTS.md`
- `docs/AUTONOMOUS_EXECUTION_PROTOCOL.md`
- `docs/PROJECT_CONSTITUTION.md`
- `docs/RENDERER_ARCHITECTURE.md`
- `docs/COORDINATES_AND_FRAMES.md`
- `docs/PICKING_AND_SELECTION.md`
- `docs/EXAMPLE_SYSTEM.md`
- `docs/PERFORMANCE.md`
- `docs/PACKAGE_DEPENDENCIES.md`
- approved ADRs in `docs/DECISIONS.md`

Stop only if Step 9 reaches an Architecture Blocker condition defined by `docs/AUTONOMOUS_EXECUTION_PROTOCOL.md`.
