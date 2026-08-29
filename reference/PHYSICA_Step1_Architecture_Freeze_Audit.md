# PHYSICA — STEP 1 FINAL ARCHITECTURE FREEZE AUDIT

**Status:** COMPLETE  
**Audit target:** `PHYSICA_Greenfield_Master_Blueprint_with_Physics_Library.md`  
**Frozen result:** `PHYSICA_Architecture_Frozen_Master_Blueprint.md`

---

# A. ARCHITECTURE FREEZE RESULT

## PASS — after required corrections incorporated during this audit

The incoming Greenfield Master Blueprint was **not ready to freeze unchanged**.

It already had a strong physics-first structure, complete Cambridge/extended-topic planning, multi-solver intent, semantic equations, examples, Physics Library, plugins and future-proofing tests. However, the audit found several issues that could have forced expensive architectural changes after implementation began.

Those issues have now been resolved in the frozen master blueprint.

The corrected architecture is ready to move to **Step 2: convert the frozen master blueprint into permanent repository specifications**.

Application feature coding must still NOT begin before Step 2 is completed and the repository is bootstrapped from those specifications.

---

# B. MATERIAL FINDINGS AND RESOLUTIONS

## F-01 — Saved document state and runtime simulation state were insufficiently separated
**Severity:** CRITICAL

### Problem
The previous Entity shape contained `state{}` and `observables{}` directly. If implemented literally, a project could become polluted with per-frame solver state, cached derived values and stochastic runtime state.

### Resolution
The architecture now separates:

- Document State;
- Runtime State Store;
- Derived Observables;
- Cached Runtime Data.

`EntityDefinition` contains component definitions/configuration/initial state only.

Per-frame state lives in `RuntimeStateStore`.

### Consequence
Saving, undo/redo, simulation, export and plugin serialization now have clear ownership.

---

## F-02 — No explicit single-writer rule for physical state
**Severity:** CRITICAL

### Problem
A `ProjectileModel`, rigid-body solver and relationship could theoretically all attempt to write an entity's position/velocity.

### Resolution
Added **State Authority**.

Every mutable physical state channel has exactly one authoritative writer per clock domain.

Compatible contributor systems such as forces may aggregate through the owning dynamics system.

Ambiguous ownership is a validation error.

---

## F-03 — Scene-level multi-entity physics was underdefined
**Severity:** CRITICAL

### Problem
Some physics does not belong to one entity:

- circuit networks;
- collisions;
- N-body gravity;
- particle gases;
- wave grids;
- acquisition scanners.

`systems[]` existed but did not have a formal contract.

### Resolution
Added `SystemDefinition` with:

- registered system type;
- entity queries;
- declared state inputs/outputs;
- clock domain;
- solver binding;
- configuration.

This is the standard mechanism for multi-entity and multiphysics interactions.

---

## F-04 — Numerical/stochastic scrubbing architecture was missing
**Severity:** CRITICAL

### Problem
Analytical projectiles can evaluate `stateAt(t)`, but numerical ODEs, particle systems, rigid-body worlds, radioactive decay and Brownian motion cannot safely jump backward in time without a state-reconstruction policy.

### Resolution
Added **Checkpoint/Replay** architecture.

A checkpoint records:

- authoritative runtime state;
- solver snapshot;
- named clock times;
- PRNG state;
- event sequence state;
- checksum.

Scrubbing restores the nearest checkpoint and deterministically replays.

---

## F-05 — Physics could accidentally depend on display refresh rate
**Severity:** CRITICAL

### Problem
Without an explicit runtime scheduler, solver stepping could become coupled to `requestAnimationFrame`.

### Resolution
Added a deterministic runtime pipeline.

Rendering FPS is not physics time.

A display frame may contain zero, one or multiple solver updates.

---

## F-06 — Event ordering across workers was not specified
**Severity:** HIGH

### Problem
Two events at the same time could be processed differently depending on async/worker completion order.

### Resolution
Runtime events now carry stable timestamp, source, type and sequence identity.

Tie-breaking is deterministic.

Worker completion order cannot define physics.

---

## F-07 — Multi-scene presentation flow was missing
**Severity:** HIGH

### Problem
Projects had many scenes and each scene had a Storyboard, but the project did not define how scenes form one presentation.

### Resolution
Added `Project.presentationFlow`.

It supports linear scene sequencing and explicit conditional transitions without changing the Scene model later.

---

## F-08 — Physical components were too loosely typed
**Severity:** HIGH

### Problem
Generic `parameters{}` / `state{}` bags would allow package-specific conventions to drift.

### Resolution
Added formal `ComponentInstance` and component-type contracts containing:

- configuration schema;
- initial-state schema;
- runtime-state schema;
- observables;
- requirements/provides;
- exclusive state channels;
- compatible solvers;
- assumptions;
- validators;
- migrations.

---

## F-09 — Legitimate algebraic constraints could be confused with illegal relationship cycles
**Severity:** HIGH

### Problem
A blanket relationship-cycle rejection is appropriate for reactive followers but not for simultaneous equations, circuit networks or constraints.

### Resolution
Reactive relationship cycles remain invalid.

Simultaneous/cyclic physics belongs to constraint/network/algebraic/coupled solvers.

---

## F-10 — Missing general algebraic numerical service
**Severity:** MEDIUM-HIGH

### Problem
Not every solved physics problem is an ODE/PDE.

Many modules need:

- linear systems;
- root finding;
- interpolation;
- numerical integration;
- nonlinear solution.

### Resolution
Added a shared Algebraic/Numerical Mathematics service and `solver-algebraic` package.

---

## F-11 — Heavy-compute implementation could leak into model APIs
**Severity:** HIGH

### Problem
If models directly call Web Workers, WASM, Rapier, GPU or native APIs, future performance changes would force physics-package rewrites.

### Resolution
Added `ComputeBackend`.

Physics models use Physica solver interfaces.

Backend location/technology is replaceable.

---

## F-12 — Coupled multiphysics ordering was ambiguous
**Severity:** HIGH

### Problem
Future systems may depend on each other's state.

Implicit callback ordering would be scientifically unsafe.

### Resolution
Systems declare state-channel inputs/outputs.

The scheduler derives an acyclic execution order.

True cyclic multiphysics coupling requires an explicit coupled-system solver.

---

## F-13 — Multi-renderer editor selection was missing
**Severity:** HIGH

### Problem
SVG, Pixi and Three.js would otherwise each expose unrelated renderer object identities.

### Resolution
Added a shared `PickingService`.

```text
pick(screenPoint) -> PickResult[]
```

Pick results resolve to stable Physica representation/entity identities.

---

## F-14 — 2D/3D coordinate convention was not frozen
**Severity:** HIGH

### Problem
Different packages could choose inconsistent handedness or vertical directions.

### Resolution
Canonical physical 3D coordinates are right-handed.

World `+y` is upward for ordinary scenes.

Screen inversion is renderer-specific.

2D scenes live in the same coordinate framework.

Reference-frame transformations are registry-based.

---

## F-15 — Presentation transforms could conflict with physics transforms
**Severity:** CRITICAL

### Problem
A Manim-like "move object" action could accidentally be interpreted as changing physical position.

### Resolution
Added an explicit visible transform stack:

```text
physical/world
→ relationship-derived
→ representation/layout
→ presentation-animation
→ camera
```

Presentation animations normally alter only the presentation layer.

Physical state changes require physics/control/document actions.

---

## F-16 — Animation-channel conflict policy was undefined
**Severity:** MEDIUM-HIGH

### Problem
Two animations targeting the same property could produce callback-order-dependent results.

### Resolution
Animations use typed channels and explicit conflict policies:

- sequence;
- replace;
- additive;
- multiplicative;
- reject.

---

## F-17 — Equation animation could imply mathematical validity without verification
**Severity:** HIGH

### Problem
A visually smooth equation transformation is not evidence that two expressions are algebraically equivalent.

### Resolution
Equation transforms now store an `equivalenceStatus`.

Where safe, the symbolic engine verifies the transformation.

Otherwise it is clearly teacher-declared or unverified presentation.

Stable semantic IDs are separate from renderer/canonicalizer IDs.

---

## F-18 — Data sampling could have become frame-rate dependent
**Severity:** HIGH

### Problem
A graph or detector updated "once per render frame" would generate different datasets on different computers.

### Resolution
Datasets/acquisition declare their own clock domain and sampling policy.

Sampling is independent of rendering.

Data provenance is preserved.

---

## F-19 — Probability/statistical data was implicit rather than first-class
**Severity:** MEDIUM

### Problem
Nuclear physics, counting statistics, uncertainty, molecular distributions and later quantum material need probability-aware data.

### Resolution
Added explicit `ProbabilityDistribution` / `RandomVariable` concepts.

---

## F-20 — Physics Library updates could silently alter old projects
**Severity:** HIGH

### Problem
If a project referenced a built-in prefab "live", updating Physica could change the physics of an old lesson.

### Resolution
Library/prefab drag instantiates stable project data.

Source Library version is kept for provenance.

Upgrades are explicit.

User-library prefabs declare dependencies.

---

## F-21 — Material presets needed semantic property namespaces
**Severity:** MEDIUM

### Problem
A flat bag containing `density`, `index`, `impedance`, etc. could create name/meaning collisions.

### Resolution
Material properties now use semantic namespaces and units, e.g.:

- `mechanical.density`;
- `optical.refractiveIndex`;
- `electrical.resistivity`;
- `acoustic.impedance`.

---

## F-22 — Plugin security model was too open
**Severity:** CRITICAL

### Problem
"Installed plugins" without a defined execution boundary could gain editor/DOM/OS access and undermine portability/security.

### Resolution
Physica 1.0 supports:

1. declarative content/data plugins;
2. sandboxed Worker/WASM compute plugins through the Plugin SDK.

Plugins cannot inject arbitrary React code into the editor.

No unrestricted native plugin model exists in 1.0.

UI is generated declaratively.

---

## F-23 — Plugin identity/version/dependency locking needed strengthening
**Severity:** HIGH

### Resolution
Added:

- namespaced IDs;
- project `pluginLock`;
- schema versions;
- deterministic plugin migrations;
- missing-plugin payload preservation;
- registry collision rejection.

---

## F-24 — Physical constants were not versioned centrally
**Severity:** MEDIUM-HIGH

### Problem
A future constants/default change could slightly alter old project outputs.

### Resolution
Added `ConstantsRegistry`.

Projects/profiles record the relevant constants version when it affects reproducibility.

---

## F-25 — Scientific model provenance/fidelity needed explicit metadata
**Severity:** HIGH

### Resolution
Each model declares:

- model ID/version;
- analytical/numerical/educational category;
- assumptions;
- validity;
- solver policy;
- reference/provenance notes;
- curriculum tags.

Visual schematics can separately declare themselves `SCHEMATIC`.

---

## F-26 — Localization/RTL could have become an editor-wide retrofit
**Severity:** MEDIUM-HIGH

### Resolution
Architecture now separates:

- canonical physics identifiers;
- localized UI strings;
- curriculum terminology;
- locale number formatting.

Project numeric storage is locale-independent.

RTL/bidirectional text is included at the design-system level.

---

## F-27 — Deterministic typography was missing
**Severity:** HIGH

### Problem
Equation/label positions and visual regressions can change between operating systems because of font substitution.

### Resolution
Physica uses approved bundled redistributable fonts/math fonts for deterministic core output.

User fonts/assets are packaged explicitly where supported.

---

## F-28 — Asset and dependency licensing was not a first-class constraint
**Severity:** MEDIUM-HIGH

### Resolution
Added machine-readable dependency/font/asset license metadata.

Core distribution only includes resources compatible with free redistribution.

This also protects the "free Physica" requirement.

---

## F-29 — Project package safety/recovery was incomplete
**Severity:** HIGH

### Resolution
The architecture now requires:

- atomic save;
- separate autosave/recovery;
- package validation;
- internal stable asset URIs;
- content hashes;
- plugin lock;
- zip traversal/bomb protection;
- no automatic modification on open.

---

## F-30 — PhysScript plugin extensibility could destabilize the grammar
**Severity:** HIGH

### Resolution
PhysScript uses one versioned core grammar/AST.

Plugins register IDs/schema/aliases, not arbitrary parser grammar.

Canonical statements remain parseable even when plugin shorthand changes.

---

## F-31 — Example coverage was policy but not machine-enforced
**Severity:** MEDIUM-HIGH

### Resolution
CI now builds a Feature → Example coverage graph.

Required examples missing from the Gallery fail CI.

The Gallery uses the same viewer runtime as real projects.

---

## F-32 — Package dependency direction was not frozen
**Severity:** HIGH

### Resolution
Defined dependency direction and CI architecture rules.

Physics packages cannot depend on editor/React internals.

Renderers do not calculate domain physics.

Plugins use the SDK.

Package dependency cycles fail architecture linting.

---

## F-33 — Real-time collaboration could become an accidental requirement
**Severity:** MEDIUM

### Resolution
Realtime collaborative editing is explicitly outside Physica 1.0.

No 1.0 subsystem depends on CRDT/OT.

The command/document model does not intentionally prevent a later sync layer.

---

## F-34 — Privacy/telemetry policy was not stated
**Severity:** MEDIUM

### Resolution
Physica remains local-first.

Telemetry is not required.

Future analytics must be opt-in and separate from project execution.

---

# C. TECHNOLOGY AUDIT

The chosen foundation remains reasonable.

## Tauri 2 + Vite
PASS.

Tauri officially supports frontend-agnostic SPA applications and recommends Vite for SPA frameworks.

Architectural action: keep Tauri behind desktop-service adapters; physics packages never import Tauri APIs.

## PixiJS
PASS with existing policy.

Current PixiJS guidance recommends WebGL/WebGL2 for production while WebGPU remains less predictable across browsers.

Architectural action: WebGL remains the production GPU baseline and WebGPU remains an optional renderer capability.

## Rapier
PASS only behind an adapter.

Rapier provides separate 2D/3D JavaScript/WASM packages.

Its own documentation warns that pre-1.0 releases may introduce breaking changes.

Architectural action: exact version pin + Physica adapter + no Rapier types in public project schemas.

## MathLive / MathJSON
PASS.

MathJSON is appropriate as an interchange/semantic expression structure, but Physica still requires its own persistent semantic token IDs for animation identity.

## Version policy
The blueprint may name major technologies, but repository bootstrap will pin exact tested package versions.

No saved `.physica` project will depend directly on a third-party library's serialized object format.

---

# D. FINAL ARCHITECTURE INVARIANTS

The architecture is now frozen around the following invariants.

1. Physics state is authoritative.
2. Document state and runtime state are separate.
3. Derived observables are not duplicated authoritative state.
4. Every mutable physical state channel has one authoritative writer.
5. Multi-entity physics is represented by registered systems.
6. Simulation time is independent of rendering time.
7. Numerical/stochastic scrub uses deterministic checkpoint/replay.
8. Worker completion order cannot alter physics.
9. Presentation animation cannot silently alter physical state.
10. Relationships are reactive/derived; simultaneous physics belongs to solvers.
11. All solver implementations sit behind Physica adapters.
12. Solver backend location is abstracted by `ComputeBackend`.
13. 2D and 3D share one right-handed physical coordinate architecture.
14. SVG/Pixi/Three share cameras and stable picking identities.
15. Equation identity is semantic and persistent.
16. Equation visual transformation does not imply unverified equivalence.
17. Data/detector sampling is clock-based, not frame-based.
18. Data retains units, uncertainty and provenance.
19. Library items instantiate stable versioned project content.
20. Plugins are namespaced, versioned and sandboxed/declarative in 1.0.
21. Missing plugins never destroy unknown project payloads.
22. Project save is atomic/recoverable.
23. Project assets are internally addressed and content checked.
24. Physical constants and scientific models are versioned/provenanced.
25. Locale and UI language do not alter canonical physics data.
26. Typography needed for deterministic output is controlled.
27. Free-distribution licensing is tracked.
28. Every public capability has a Gallery example and regression test.
29. The Gallery uses the production viewer runtime.
30. Physics/domain packages do not import editor internals.
31. Realtime collaboration is outside 1.0.
32. No AI dependency is required anywhere in the physics authoring/runtime path.

---

# E. ARCHITECTURE DECISION RECORDS TO ADD

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

# F. FINAL FREEZE CHECKLIST

All items below are now answered **YES at architecture level**.

## Core data
- [x] One root schema can represent all planned physics topics.
- [x] Persistent document state is distinct from runtime state.
- [x] Component types are versioned and schema-defined.
- [x] Scene-level systems support multi-entity physics.
- [x] One authoritative writer owns each mutable physical state channel.
- [x] Datasets/images/reconstruction outputs fit the data architecture.
- [x] Unknown plugin payloads can survive save/reopen.

## Time/runtime
- [x] Presentation and simulation clocks are separate.
- [x] Acquisition/audio/experiment clocks can be added.
- [x] Physics stepping is independent of display refresh.
- [x] Numerical/stochastic scrubbing has deterministic checkpoint/replay.
- [x] Runtime event ordering is deterministic.
- [x] Worker completion timing cannot define scientific state.

## Mathematics/solvers
- [x] real, complex, vector, matrix, quaternion, uncertainty and distributions fit.
- [x] analytical solvers fit.
- [x] algebraic/root solving fits.
- [x] ODE solvers fit.
- [x] rigid/constraint solvers fit.
- [x] many-body particles fit.
- [x] grid/PDE fields fit.
- [x] ray tracing fits.
- [x] circuit/network solving fits.
- [x] stochastic/Monte-Carlo fits.
- [x] inverse/reconstruction models fit.
- [x] future coupled systems have an explicit ownership path.

## Rendering/presentation
- [x] 2D and 3D share one physical coordinate model.
- [x] SVG, Pixi and Three can coexist.
- [x] common picking/selection identity exists.
- [x] physics/layout/presentation transforms are separate.
- [x] animation channel conflicts have explicit policy.
- [x] semantic equation transforms preserve identity.
- [x] equation transform validity is not implied by appearance.
- [x] deterministic typography can be achieved.

## Data/interaction
- [x] graphs can subscribe to any observable.
- [x] sampling does not depend on FPS.
- [x] measurements retain units/uncertainty/provenance.
- [x] controls distinguish document, initial-state, runtime and layout targets.
- [x] multi-scene presentation flow exists.

## Library/plugins
- [x] every stage-visible object can be registry-created.
- [x] prefabs do not silently mutate after app update.
- [x] My Library dependencies can be declared.
- [x] plugins can add models/items without editor hard-coding.
- [x] 1.0 plugin execution has a defined sandbox boundary.
- [x] missing plugins preserve data.
- [x] plugin IDs and versions are locked/namespaced.

## Save/export/security
- [x] `.physica` remains source of truth.
- [x] save can be atomic/recoverable.
- [x] project-internal assets do not become arbitrary filesystem paths.
- [x] ZIP/path abuse is anticipated.
- [x] deterministic offline rendering is structurally possible.
- [x] free-distribution licensing is trackable.

## Curriculum/product
- [x] all 25 Cambridge topics map to the architecture.
- [x] practical physics maps to the architecture.
- [x] extended optics maps to the architecture.
- [x] rotational/fluid/electronics/communications/acoustics/relativity extensions map.
- [x] Medical Physics acquisition/reconstruction does not need a new root concept.
- [x] Nuclear stochastic events do not need a new timeline architecture.
- [x] Astronomy scales/log axes do not need special project fields.
- [x] 3D future features do not require a new project schema.
- [x] no AI dependency is required.
- [x] examples are part of the feature completion contract.

---

# G. RESIDUAL RISKS

These are implementation risks, not unresolved architecture decisions.

## R-01 — Equation correspondence quality
Automatic semantic matching will sometimes require teacher override.

Architecture already supports override.

## R-02 — Very large PDE/particle scenes
Performance depends on device and implementation.

ComputeBackend, worker execution, adaptive visual detail and benchmark tiers already provide the architectural path.

## R-03 — Plugin sandbox limitations
Some future advanced plugins may desire capabilities deliberately excluded from 1.0.

They must request new mediated permissions or a later plugin-runtime revision; they do not receive unrestricted access by default.

## R-04 — Cross-platform media encoding
Codec availability/licensing varies.

Export uses an encoder adapter and guarantees only approved formats for the target release.

## R-05 — Third-party dependency churn
Rapier and other packages may change.

All are hidden behind Physica adapters and exact versions will be pinned during repository bootstrap.

---

# H. EXACT NEXT STEP

## STEP 2 — CHATGPT

**Platform:** Normal ChatGPT, not Codex.

**Purpose:** Convert the frozen master blueprint and this architecture audit into the permanent programmer-facing documentation set that will live inside the repository.

Do not start application implementation yet.

Use the exact prompt supplied by ChatGPT after this audit.
