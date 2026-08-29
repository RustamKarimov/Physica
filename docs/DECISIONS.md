# Architecture Decision Records

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns approved architectural decisions.

## Scope

Step 1 ADRs plus later approved ADRs such as TextBlock clarification.

## Owned concepts

- ADR log

## Dependencies

- `PROJECT_CONSTITUTION.md`

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

## Invariants / required behavior

- record reason/consequences/alternatives
- never silently reverse ADR

## This subsystem MUST NOT

- use CURRENT_STATE as an ADR

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- ADR index consistency

## Example Gallery obligations

- No standalone user-visible example required unless this subsystem exposes a user-visible feature.

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Approved ADRs

## ADR-001 — Desktop-first authoring with shared web runtime
**Decision:** Tauri desktop editor; shared web-compatible core/viewer.  
**Reason:** Local files, offline use, compute/export plus portable web playback.  
**Consequence:** Core packages must remain browser-compatible where intended.  
**Rejected:** browser-only editor; Electron-only architecture.

## ADR-002 — `.physica` project file is the project source of truth
**Decision:** Local DB is index/preferences only.  
**Reason:** portability and recoverability.  
**Consequence:** project execution cannot depend on hidden DB rows.  
**Rejected:** database-backed document authority.

## ADR-003 — Component/system/registry document model
**Decision:** topic modules extend registered components/systems.  
**Reason:** physics-domain extensibility.  
**Consequence:** no topic-specific root fields.  
**Rejected:** monolithic scene classes.

## ADR-004 — Document state and runtime state are separate
**Decision:** persistent definitions/initial state versus transient Runtime State Store.  
**Reason:** undo/save/scrub correctness.  
**Consequence:** runtime simulation does not mutate project every frame.  
**Rejected:** persisted live entity state.

## ADR-005 — Single authoritative writer per physical state channel
**Decision:** state ownership is validated.  
**Reason:** avoid solver/model conflicts.  
**Consequence:** contributors feed an owning system instead of competing writers.  
**Rejected:** callback/last-writer semantics.

## ADR-006 — Scene-level SystemDefinition for multi-entity physics
**Decision:** networks, fields, collisions, ensembles and coupled interactions may be scene systems.  
**Reason:** not all physics is entity-local.  
**Consequence:** entity schema remains stable.  
**Rejected:** embedding all interactions in entity components.

## ADR-007 — Named clocks plus deterministic runtime scheduler
**Decision:** simulation/presentation/acquisition/audio clocks resolved by one scheduler.  
**Reason:** reproducibility and explanation control.  
**Consequence:** no package owns an uncontrolled frame loop.  
**Rejected:** requestAnimationFrame as physics clock.

## ADR-008 — Checkpoint/replay for non-analytical scrub
**Decision:** numerical/particle/rigid/stochastic models restore checkpoints then replay.  
**Reason:** correct time scrubbing.  
**Consequence:** solvers expose snapshot capability.  
**Rejected:** approximate reverse integration.

## ADR-009 — Deterministic event ordering
**Decision:** events have timestamps and stable tie-breaking identity.  
**Reason:** cross-machine/worker reproducibility.  
**Consequence:** asynchronous completion cannot determine physics.  
**Rejected:** callback completion order.

## ADR-010 — Right-handed 3D-capable physical coordinate system
**Decision:** canonical physical coordinates are right-handed; ordinary world +y upward.  
**Reason:** future 3D consistency.  
**Consequence:** renderer adapters perform screen conversion.  
**Rejected:** renderer-native coordinates as physical coordinates.

## ADR-011 — Hybrid renderer with shared Camera and Picking services
**Decision:** SVG/Pixi/Three are adapters to one editor identity/coordinate system.  
**Reason:** scientific vector quality plus high-volume/3D performance.  
**Consequence:** no renderer-specific project IDs.  
**Rejected:** one renderer for every workload.

## ADR-012 — Presentation transform stack is separate from physical transforms
**Decision:** presentation/layout transforms layer over physics.  
**Reason:** Manim-like explanation without physics corruption.  
**Consequence:** physical movement uses physics/control actions.  
**Rejected:** one mutable transform for everything.

## ADR-013 — Solver adapters + ComputeBackend
**Decision:** analytical, algebraic, ODE, rigid, particle, grid, ray, circuit, stochastic and reconstruction solvers use Physica contracts.  
**Reason:** heterogeneous physics and future compute backends.  
**Consequence:** models never import third-party engine internals.  
**Rejected:** universal game-physics engine.

## ADR-014 — Reactive relationships cannot replace simultaneous solvers
**Decision:** reactive dependency cycles are rejected; simultaneous constraints/networks use solvers.  
**Reason:** mathematical correctness.  
**Consequence:** relationship engine remains predictable.  
**Rejected:** iterative updater loops.

## ADR-015 — Equation semantics and transform validity are separate from glyphs
**Decision:** stable node IDs + equivalence status.  
**Reason:** correct matched animation and mathematical integrity.  
**Consequence:** rendering/canonicalization cannot erase identity.  
**Rejected:** TeX/glyph identity only.

## ADR-016 — Data acquisition uses explicit clock-based sampling
**Decision:** sample policies are independent of render FPS.  
**Reason:** reproducible graphs/detector data.  
**Consequence:** datasets retain provenance.  
**Rejected:** sample-on-render.

## ADR-017 — Library/prefab instantiation is snapshot-based
**Decision:** library version is source metadata; created project components are stable.  
**Reason:** old projects must not change after app updates.  
**Consequence:** prefab upgrades are explicit.  
**Rejected:** live mutable prefab references.

## ADR-018 — 1.0 plugins are declarative or sandboxed Worker/WASM compute
**Decision:** no arbitrary editor/native plugin execution.  
**Reason:** safety, portability and maintainability.  
**Consequence:** plugin UI is schema/metadata-driven.  
**Rejected:** arbitrary React/native plugin injection.

## ADR-019 — Project plugin lock and unknown-payload preservation
**Decision:** project records plugin requirements and preserves unknown payloads.  
**Reason:** safe open/save without all plugins installed.  
**Consequence:** missing features are unavailable but data is retained.  
**Rejected:** discard/flatten missing plugin data.

## ADR-020 — Atomic package save and recovery
**Decision:** temporary validated write + atomic replacement/recovery.  
**Reason:** protect teacher work.  
**Consequence:** opening/migration never silently destroys original.  
**Rejected:** in-place ZIP rewriting.

## ADR-021 — Versioned Constants and Scientific Model provenance
**Decision:** constants/models carry IDs/versions/provenance.  
**Reason:** reproducible educational results.  
**Consequence:** profile display preferences stay separate.  
**Rejected:** anonymous hard-coded constants.

## ADR-022 — Internationalisation from the design-system level
**Decision:** canonical identifiers separate from translated strings/locale formatting.  
**Reason:** avoid later UI/data retrofit.  
**Consequence:** RTL and locale display are supported structurally.  
**Rejected:** hard-coded English identifiers.

## ADR-023 — Deterministic redistributable typography
**Decision:** controlled licensed fonts for core rendering/export.  
**Reason:** cross-platform layout and regression stability.  
**Consequence:** arbitrary missing host fonts cannot define official output.  
**Rejected:** system-font-only determinism.

## ADR-024 — Dependency/font/asset licensing is release metadata
**Decision:** free-redistribution compatibility is checked.  
**Reason:** Physica is intended to remain free.  
**Consequence:** some optional codecs/plugins may remain separately installable.  
**Rejected:** untracked asset licensing.

## ADR-025 — Project-level PresentationFlow
**Decision:** project explicitly sequences/branches scenes.  
**Reason:** multi-scene teaching presentations.  
**Consequence:** scene Storyboards remain local.  
**Rejected:** array order as the only presentation structure.

## ADR-026 — PhysScript has a stable core grammar
**Decision:** plugins register IDs/aliases, not arbitrary grammar.  
**Reason:** parser/version stability.  
**Consequence:** canonical scripts remain portable.  
**Rejected:** plugin parser injection.

## ADR-027 — Example Gallery coverage enforced by CI
**Decision:** public capability metadata maps to mandatory example IDs.  
**Reason:** examples are executable documentation and regression proof.  
**Consequence:** missing examples block completion.  
**Rejected:** optional/manual examples.

## ADR-028 — Core package dependency direction is enforced
**Decision:** lower-level core → runtime → rendering/domain → apps; no editor imports in physics.  
**Reason:** modularity and plugin stability.  
**Consequence:** architecture linting/CI rejects cycles/internal imports.  
**Rejected:** convenience cross-imports.

## ADR-029 — Coupled systems require explicit coupling ownership
**Decision:** cyclic multiphysics state dependencies use a registered coupled solver/system.  
**Reason:** deterministic scientifically defined convergence.  
**Consequence:** callback cycles are prohibited.  
**Rejected:** implicit repeated callbacks.

## ADR-030 — Realtime collaboration is out of scope for 1.0
**Decision:** no CRDT/OT requirement in the 1.0 core.  
**Reason:** product focus and complexity containment.  
**Consequence:** later collaboration is a separate sync architecture.  
**Rejected:** speculative collaboration infrastructure now.

## ADR-031 — Local-first privacy
**Decision:** no required telemetry; diagnostic export local by default.  
**Reason:** offline/private teacher workflow.  
**Consequence:** future analytics must be opt-in.  
**Rejected:** mandatory usage telemetry.

---

## ADR-032 — Teaching text is a first-class semantic Representation

**Decision**

Definitions, explanatory paragraphs, captions, callouts, quotations and lists are represented by the canonical registry type `TextBlock` with semantic roles and structured spans. Text-specific animation operates on semantic/layout units, with locale-aware grapheme segmentation.

**Reason**

Physica is a presentation authoring tool, not only a simulator. Physics explanations frequently require ordinary text, and treating that content as unstructured labels would weaken layout, animation, accessibility, localisation and export.

**Consequences**

- no root schema change is needed because `Representation` is extensible;
- the renderer, animation engine, typography/i18n layer, accessibility layer and Physics Library implement the shared `TextBlock` contract;
- inline equations remain Equation Engine objects referenced from text;
- dynamic text may observe physical observables but never owns physical state.

**Alternatives rejected**

- generic SVG text nodes only;
- one representation type per text role;
- rasterized text;
- English-only character animation.

