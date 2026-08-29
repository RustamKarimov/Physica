# Physica — Current State

**Architecture status:** FROZEN for initial implementation

**Execution mode:** AUTONOMOUS PROJECT EXECUTION ACTIVE

**Mandatory governance:** Every future session must read `docs/AUTONOMOUS_EXECUTION_PROTOCOL.md` before continuing project work.

**Current development phase:** Step 6 complete — mathematics, units, coordinates/reference frames and clocks verified

**Current task:** Step 7 — Runtime Scheduler implementation specification

**Next task:** Step 7 — implement and verify the Runtime Scheduler boundary from its audited implementation specification

**Blockers:** None

## Autonomous execution status

Autonomous execution toward the Physica 1.0 Release Candidate is active under `docs/AUTONOMOUS_EXECUTION_PROTOCOL.md`. The protocol is a permanent project governance document and must be read together with `AGENTS.md` and this operational state at the start of every future work session. Ordinary verified phases continue without user confirmation; progression stops only under the protocol's Architecture Blocker conditions or at the Physica 1.0 Release Candidate boundary.

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

## Step 7 read first

- `AGENTS.md`
- `docs/AUTONOMOUS_EXECUTION_PROTOCOL.md`
- `docs/PROJECT_CONSTITUTION.md`
- `docs/RUNTIME_SCHEDULER.md`
- `docs/RUNTIME_STATE.md`
- `docs/CLOCKS_AND_TIME.md`
- `docs/COMMANDS_AND_EVENTS.md`
- `docs/PACKAGE_DEPENDENCIES.md`
- approved ADRs in `docs/DECISIONS.md`

Stop only if Step 7 reaches an Architecture Blocker condition defined by `docs/AUTONOMOUS_EXECUTION_PROTOCOL.md`.
