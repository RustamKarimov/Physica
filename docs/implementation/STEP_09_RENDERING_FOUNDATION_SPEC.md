# Step 9 — Rendering Foundation Implementation Specification

**Status:** Audited implementation specification  
**Phase:** Autonomous execution, first unfinished phase after Step 8  
**Owning frozen specifications:** `RENDERER_ARCHITECTURE.md`, `PICKING_AND_SELECTION.md`  
**Supporting frozen specifications:** `COORDINATES_AND_FRAMES.md`, `EXAMPLE_SYSTEM.md`, `PERFORMANCE.md`, `PACKAGE_DEPENDENCIES.md`  
**Higher authorities:** `PROJECT_CONSTITUTION.md`, approved ADRs in `DECISIONS.md`

---

# 1. Purpose

Step 9 establishes the first shared visible rendering path for Physica. It implements one deterministic camera, layer, render-frame and semantic-picking contract used by SVG, PixiJS and Three.js adapters. It also replaces the desktop bootstrap message with a live rendering-foundation showcase launched through `Launch Physica.bat`.

Rendering consumes already-resolved physical/runtime values. It never becomes an alternative physical state store and never infers physics from pixels.

---

# 2. Source-of-truth audit

The phase preserves:

- ADR-004: render frames and backend handles are transient and never become ProjectDocument authority;
- ADR-007 and ADR-016: rendering does not advance physics clocks or trigger acquisition sampling;
- ADR-010: canonical physical coordinates remain right-handed with ordinary `+y` upward; camera projection alone performs screen-y inversion;
- ADR-011: SVG, Pixi and Three are adapters to one camera, layer and semantic identity system;
- ADR-012: presentation/layout transforms are distinct from physical transforms;
- ADR-023: official text metrics remain gated on deterministic typography; this phase does not claim final typography;
- ADR-027: every visible renderer and picking capability ships with executable examples;
- ADR-028: renderer packages use public lower-tier APIs and never import physics domains or editor internals;
- ADR-032: the future TextBlock contract remains semantic; generic backend text is not introduced as a replacement.

## 2.1 Package ownership

- `@physica/renderer-core` owns camera definitions/state, viewport transforms, semantic layers, render primitives, render frames, deterministic ordering, culling bounds, adapter contracts and renderer-neutral pick regions.
- `@physica/renderer-svg` owns deterministic SVG serialization for vector/scientific primitives.
- `@physica/renderer-pixi` owns PixiJS render-plan translation and browser mounting for high-volume 2D particles.
- `@physica/renderer-three` owns Three.js render-plan translation and browser mounting for 3D vector scenes.
- `@physica/picking` owns cross-adapter hit testing, ordering and semantic `PickResult` aggregation.
- application packages compose those public packages but own no renderer contract.

`renderer-core` does not import picking, preventing the dependency cycle implied by their conceptual cooperation. It defines renderer-neutral pick-region data; picking consumes that data. Concrete adapters depend on renderer-core. Picking depends on renderer-core and core-model only.

## 2.2 Existing foundations reused

- `@physica/mathematics` already owns finite immutable `Vec2`, `Vec3`, coordinate-space tags, right-handed physical coordinates, 2D plane lifting/projection and explicit educational visual scaling.
- `@physica/core-model` already owns stable Entity and Representation IDs and extensible RepresentationDefinition payloads.
- renderer packages already exist in the frozen package map, so no package/root schema addition is required.

## 2.3 Dependency audit

The frozen technology stack requires PixiJS and Three.js for production adapters. The official npm registry reports:

- `pixi.js` 8.20.1 — MIT — `pixijs/pixijs`;
- `three` 0.185.1 — MIT — `mrdoob/three.js`;
- `@types/three` 0.185.4 — MIT — DefinitelyTyped.

They are exact-pinned in the workspace catalog, scoped only to their owning adapter packages, and compatible with Physica's free-redistribution policy. No solver, physics-domain or editor dependency is introduced.

## 2.4 Audit conclusion

No ADR change, ProjectDocument schema change, state-authority change, solver choice or dependency inversion is required. No Architecture Blocker exists.

---

# 3. Exact scope

## 3.1 In scope

- immutable finite viewport and camera contracts;
- orthographic and perspective world-to-screen projection;
- explicit screen-to-world conversion for the orthographic plane and screen-ray construction for perspective picking;
- right-handed camera basis validation and degenerate-camera typed errors;
- physical-world, presentation and screen/layout coordinate separation;
- renderer-neutral 2D/3D primitives and high-volume particle batches;
- semantic backend, layer, z-index, insertion-sequence and stable-ID ordering;
- immutable deterministic `RenderFrame` construction and validation;
- dirty-key frame comparison and viewport culling helpers;
- deterministic SVG markup serialization;
- PixiJS particle plan translation and browser canvas mounting;
- Three.js vector plan translation and browser canvas mounting;
- renderer-neutral pick regions and one semantic picking service;
- overlapping cross-renderer and projected-3D picking tests;
- live desktop rendering showcase using public renderer/picking packages;
- examples `line-and-arrow`, `particle-cloud`, `3d-vector-scene`, and `mixed-renderer-selection`;
- deterministic expected JSON/SVG and browser-captured PNG visual baselines where the implemented capture path supports them.

## 3.2 Out of scope

- physics models, solvers, relationships or observable calculation;
- renderer-owned animation/requestAnimationFrame physics loops;
- editor authoring tools, selection state UI, resize handles or property inspectors;
- final TextBlock, equation, graph, typography, RTL or accessibility-layout engines;
- asset loading, images, audio or video;
- persistence/export of render frames or backend handles;
- WebGPU production backend;
- advanced lighting, materials, post-processing, shadows or volumetrics;
- arbitrary 3D mesh import;
- production GPU benchmarking across hardware tiers;
- full Example Gallery application/runtime generation command;
- WebM preview/export pipeline;
- installer/executable packaging.

---

# 4. Packages and files allowed to change

Primary:

- `packages/renderer-core`;
- `packages/renderer-svg`;
- `packages/renderer-pixi`;
- `packages/renderer-three`;
- `packages/picking`.

Composition and proof:

- `apps/desktop`;
- `examples/rendering/line-and-arrow`;
- `examples/rendering/particle-cloud`;
- `examples/rendering/3d-vector-scene`;
- `examples/rendering/mixed-renderer-selection`;
- `examples/pending-artifacts.json`;
- root workspace catalog/test configuration;
- architecture tests only if a missing renderer dependency rule is exposed;
- `docs/CURRENT_STATE.md`;
- `Launch Physica.bat` only if required to preserve live development launch behavior.

No core-model document schema or existing physics/runtime behavior changes.

---

# 5. Dependency direction

```text
core-model      mathematics
      ↑          ↑
       renderer-core
       ↑    ↑    ↑   ↑
 renderer-svg  renderer-pixi  renderer-three  picking
       ↑             ↑             ↑             ↑
                 applications / examples
```

Concrete renderer adapters do not depend on each other. Picking does not import concrete adapters. Renderer packages do not import physics domains, React, Tauri or application internals.

---

# 6. Result and identifier contracts

Renderer validation uses `RenderResult<T> = Result<T, RenderError>` and stable typed errors including:

- invalid viewport/camera/basis/projection;
- non-finite transform or primitive;
- duplicate render item;
- invalid layer/backend combination;
- unsupported primitive;
- adapter initialization/render/disposal failure.

Normal invalid scientific/render configuration returns typed results. Browser/backend exceptions are caught at adapter boundaries without host-specific stack text.

Render item IDs use namespaced IDs. Semantic identity fields use canonical `RepresentationId` and optional `EntityId`; backend-native object references never leave adapters.

---

# 7. Coordinate and camera contract

The camera is a transient service configured by:

- viewport width/height in CSS pixels and device-pixel ratio;
- position, target and up vectors in right-handed physical-world coordinates;
- orthographic vertical span or perspective vertical field of view;
- finite positive near/far planes with `far > near`;
- optional presentation transform applied only after physical projection.

The camera derives a normalized right/up/forward basis. Position equals target, zero up, collinear up/forward, invalid FOV, invalid span or invalid clipping range are rejected.

World projection produces normalized device coordinates, depth and screen coordinates. Screen x grows right; screen y grows downward. Orthographic screen-to-world inversion requires an explicit camera-plane depth. Perspective inversion returns a world ray rather than pretending a unique physical point exists.

---

# 8. Physical, presentation and layout separation

Input world points remain immutable. Presentation transforms contain explicit screen/layout translation, rotation and scale and are applied to projected positions only. They never feed back into physical coordinates or authoritative runtime state.

Picking returns semantic identities plus screen/world hit information where defined. Converting a drag into a physical edit is a future editor/control action and is not performed by the renderer.

---

# 9. Render layers and deterministic ordering

Built-in semantic layers are ordered:

1. background;
2. world-3d;
3. world-raster;
4. world-vector;
5. annotation;
6. overlay.

Each item declares backend, layer, z-index, stable render ID and registration sequence. Frames sort by layer, z-index, stable render ID and registration sequence. A duplicate render ID is rejected. Renderer refresh/completion order never changes visible or picking order.

---

# 10. Renderer-neutral primitives

The bounded V1 primitive union contains:

- 2D line;
- 2D arrow with explicit head geometry;
- circle/point marker;
- polyline;
- particle cloud with immutable positions, radius, color and optional deterministic visual stride;
- 3D vector with origin, direction, shaft radius and head dimensions;
- optional rectangular background primitive for deterministic example composition.

All numeric values are finite. Sizes and widths are non-negative, colors use normalized renderer-neutral RGBA values, and a zero-length arrow/vector returns validation error instead of silently inventing orientation.

This union is rendering data only. It contains no mass, force law, solver state or physical authority.

---

# 11. Render frames, dirty state and culling

`RenderFrame` contains a schema version, scene ID, camera snapshot, deterministic item list and monotonic source revision supplied by the runtime/application. It is immutable and JSON-safe except for branded static types.

Frame comparison reports added, changed, unchanged and removed render IDs using canonical item content. This is a dirty-rendering input, not an automatic animation loop.

2D screen bounds and projected 3D bounds may be culled against the viewport. Visual stride/culling may reduce rendered particles but never mutates source particle state or recorded observables.

---

# 12. SVG adapter

The SVG adapter:

- accepts SVG-compatible world-vector/background/annotation items;
- projects through the shared camera;
- emits stable attribute/key ordering, fixed numeric normalization and escaped markup;
- represents arrows with deterministic explicit path geometry;
- returns SVG markup plus semantic pick regions;
- supports pure Node tests and browser display without DOM-global dependency in core planning.

Unsupported particle-cloud or 3D-vector items return typed errors rather than being silently approximated.

---

# 13. PixiJS adapter

The Pixi adapter:

- translates particle-cloud items through the shared camera into an immutable Pixi render plan;
- applies deterministic visual stride and viewport culling in input order;
- keeps source particle arrays unchanged;
- exposes semantic circular pick regions for displayed particles or the owning cloud representation;
- mounts/unmounts the plan in a supplied browser container through PixiJS 8;
- owns all Pixi Application/Container/Graphics handles internally and disposes them cleanly.

It does not create a scheduler or own requestAnimationFrame physics. Backend presentation rendering may use Pixi's renderer only to draw the current supplied plan.

---

# 14. Three.js adapter

The Three adapter:

- translates 3D-vector items into immutable Three render plans using the shared camera definition;
- represents the vector as shaft plus cone head with deterministic geometry/orientation;
- mounts/unmounts a WebGL renderer, scene and camera inside a supplied browser container;
- performs one explicit render per supplied plan/update;
- exposes projected semantic pick regions and may use internal raycasting, but never exposes Three Object3D references.

WebGL absence returns a typed adapter initialization failure. WebGPU is not required.

---

# 15. Common picking service

`PickingService.pick(screenPoint)` aggregates renderer-neutral pick regions from all adapters. Results contain:

- representation ID and optional entity ID;
- render ID/backend/layer;
- screen hit point;
- optional world point/depth;
- hit distance and deterministic ordering metadata.

Results sort topmost first by layer descending, z-index descending, hit distance ascending, stable render ID, then registration sequence. Overlapping SVG/Pixi/Three hits therefore resolve identically independent of adapter callback order.

Supported region shapes are circle, segment-with-tolerance and projected polygon/rectangle. All regions validate finite geometry.

---

# 16. Deterministic rendering and visual regression

- render planning uses no wall clock, locale-sensitive formatting or randomness;
- colors/numbers/ordering are canonical;
- device-pixel ratio is explicit input;
- official screenshots use fixed viewport, DPR, content and controlled app styles;
- visual tests compare checked-in deterministic artifacts generated from public renderer APIs;
- host GPU raster variation is not used as the only scientific assertion; semantic plans and projections are tested numerically.

---

# 17. Desktop observation experience

The desktop application replaces the bootstrap-only card with a polished “Rendering Foundation” stage showing:

- shared-camera SVG line/arrow output;
- Pixi particle cloud;
- Three 3D vector;
- layer legend and selected semantic identity;
- pointer picking across the composed visible stage;
- concise status explaining that the view is a rendering foundation, not a physics simulation.

The app uses public package exports and starts through `Launch Physica.bat`. It does not become an editor or add packaging.

---

# 18. Example Gallery artifacts

## 18.1 `line-and-arrow`

Shared orthographic camera, right-handed world-to-screen y inversion, deterministic SVG line and arrow, expected plan/markup, README, metadata, SVG preview, PNG baseline and automated test.

## 18.2 `particle-cloud`

Deterministically generated input positions, explicit visual stride/culling, Pixi plan, source-state immutability proof, README, metadata, preview/baseline and automated test.

## 18.3 `3d-vector-scene`

Perspective camera and 3D vector plan with known projected endpoints, README, metadata, preview/baseline and automated numerical projection test.

## 18.4 `mixed-renderer-selection`

Overlapping SVG, Pixi and Three semantic pick regions supplied in shuffled adapter order, stable topmost result ordering, README, metadata, preview/baseline and automated test.

Artifacts not yet owned by implemented infrastructure, especially `.physica`, `preview.webm` and shared gallery-runtime specs, remain explicitly registered rather than fabricated.

---

# 19. Test matrix

Renderer core:

- camera validation and immutability;
- orthographic and perspective known-point projections;
- screen-y inversion;
- orthographic round trip and perspective ray direction;
- presentation transform does not mutate world input;
- layer ordering, duplicate rejection and frame determinism;
- dirty-frame diff and culling;
- 10,000-particle plan selection within the bounded test budget.

SVG:

- canonical markup and escaping;
- line/arrow projected geometry;
- unsupported primitive typed error;
- deterministic repeat output.

Pixi:

- particle plan order, stride and culling;
- source array immutability;
- semantic pick regions;
- browser mount lifecycle smoke test when WebGL/Canvas is available.

Three:

- vector plan orientation/length/head geometry;
- projected endpoint agreement with renderer-core;
- semantic projected region;
- browser mount lifecycle smoke test when WebGL2 is available.

Picking:

- overlapping cross-renderer topmost ordering;
- segment/circle/polygon hit boundaries;
- 3D projected pick;
- stable IDs only, no backend object leakage;
- shuffled provider order determinism.

Application/examples:

- desktop strict typecheck/build;
- launcher `--check`;
- four executable expected-output tests;
- fixed visual baselines/preview validation;
- repository architecture and full CI gates.

---

# 20. Implementation order

1. Add exact audited catalog dependencies and package dependency edges.
2. Implement renderer-core results, camera, layers, primitives, frame validation/diff and pick-region data.
3. Implement common picking service.
4. Implement deterministic SVG planning/serialization.
5. Implement Pixi plan and browser lifecycle adapter.
6. Implement Three plan and browser lifecycle adapter.
7. Add targeted numerical, ordering, determinism and lifecycle tests.
8. Add the four executable examples and visual artifacts.
9. Replace the desktop bootstrap card with the public-package rendering showcase.
10. Verify the live launcher end to end.
11. Perform scientific, architecture, teacher-UX and performance self-review.
12. Run full CI, update `CURRENT_STATE.md`, commit and push.

---

# 21. Definition of Done

Step 9 is complete only when:

- all three renderers consume one camera/layer/identity contract;
- physical and presentation transforms remain explicitly separate;
- no renderer calculates or stores domain physics;
- common picking returns stable semantic IDs in deterministic topmost order;
- Pixi and Three backend handles remain adapter-internal;
- camera/projection/picking and deterministic output tests pass;
- all four required examples and honest artifacts are present and tested;
- the desktop launcher exposes the meaningful visible foundation;
- formatting, lint, architecture, typecheck, unit/example, visual and application build gates pass;
- `docs/CURRENT_STATE.md` records exact verification and the next unfinished phase.

---

# 22. Explicit non-implementation boundary

Completion of this phase must not be described as a physics simulation, editor, final renderer, graph/equation/text engine, animation system, export pipeline or complete gallery. It is the shared rendering/camera/picking foundation and its visible proof only.
