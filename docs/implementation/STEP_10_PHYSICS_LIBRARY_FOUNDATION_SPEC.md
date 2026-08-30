# Step 10 — Physics Library Foundation Implementation Specification

**Status:** Audited implementation specification  
**Phase:** Autonomous execution, first unfinished phase after Step 9  
**Owning frozen specification:** `PHYSICS_LIBRARY.md`  
**Supporting frozen specifications:** `REGISTRY_ARCHITECTURE.md`, `PLUGIN_ARCHITECTURE.md`, `PROJECT_MODEL.md`, `COMPONENT_MODEL.md`, `COMMANDS_AND_EVENTS.md`, `EXAMPLE_SYSTEM.md`, `PACKAGE_DEPENDENCIES.md`  
**Higher authorities:** `PROJECT_CONSTITUTION.md`, approved ADRs in `DECISIONS.md`

---

# 1. Purpose

Step 10 establishes the metadata-driven Physics Library foundation used to discover, search, drag, validate and instantiate built-in, declarative-plugin and teacher-owned content. It introduces the four frozen registries, immutable snapshot-based prefab instantiation, semantic anchors and ports, compatible-target evaluation, a canonical foundational object pack and a serializable My Library manifest.

A Library item is an authoring recipe and discovery record. It is never an alternative physical state store. Instantiation creates ordinary versioned ProjectDocument content through one document Command transaction and records source provenance without retaining a live mutable link to the registry definition.

# 2. Source-of-truth audit

The phase preserves:

- ADR-002: instantiated project content, not a hidden local database, remains project authority;
- ADR-003: Library content creates registered component/system/representation payloads without topic-specific root fields;
- ADR-004 and ADR-005: Library definitions contain document configuration/initial state only and do not own transient runtime state or bypass single-writer validation;
- ADR-017: prefab/library instantiation is snapshot-based and existing projects never change when a registry entry changes;
- ADR-018: plugin Library contributions are declarative metadata and snapshots; no arbitrary React, native or editor execution is accepted;
- ADR-019: required plugin locks and unknown registered payloads remain preserved in ProjectDocument;
- ADR-021: model provenance and versions remain explicit;
- ADR-022: canonical IDs remain separate from display/localized strings;
- ADR-024: item, asset and model licensing/provenance is explicit metadata;
- ADR-027: every public Library capability declares executable example coverage;
- ADR-028: packages depend only through public lower-tier APIs and no editor import enters library/plugin contracts.

No ProjectDocument schema version change is required. `ComponentInstance.sourceLibraryItem`, metadata bags, project assets/datasets and `pluginLock` already represent stable instantiated provenance and dependencies.

# 3. Package ownership

## 3.1 `@physica/plugin-sdk`

Owns portable declarative extension contracts:

- Library item, prefab, instrument and material definition types;
- semantic anchor, port, target and compatibility metadata;
- generic immutable registry behavior;
- `LibraryRegistry`, `PrefabRegistry`, `InstrumentRegistry` and `MaterialPresetRegistry`;
- atomic declarative-plugin contribution registration;
- validation errors used by plugins and host applications.

It depends only on `@physica/core-model` and exposes no DOM, React, Tauri, filesystem, network or executable plugin hook.

## 3.2 `@physica/assets`

Owns host-neutral Library composition and content:

- combined catalog/search/filter/drag-payload service;
- compatibility and connection preflight;
- snapshot instantiation planner;
- built-in foundational object/text-preset manifest;
- My Library in-memory store plus canonical manifest import/export;
- source/package/license/provenance application to instantiated snapshots.

It depends on public `core-model`, `commands`, `plugin-sdk` and `serialization` exports.

## 3.3 `@physica/commands`

Owns the document mutation boundary:

- `InstantiateLibraryItem` inserts one prepared immutable project/scene snapshot atomically;
- its inverse removes exactly the inserted identities and plugin locks/assets/datasets added by that invocation;
- undo/redo operates through ordinary ProjectStore history;
- command validation rejects collisions, missing scenes, dependency conflicts and dangling snapshot references before publication.

Commands never query registries or run plugin code. They receive a fully prepared snapshot.

## 3.4 Applications and examples

Applications compose public APIs. The desktop shows the first Library observation experience but owns no registry or snapshot contract. Examples use the same registry, planner, command and ProjectStore APIs as applications.

# 4. Exact scope

## 4.1 In scope

- six frozen Library item classes;
- built-in/plugin/My Library source identity;
- canonical namespaced IDs and schema/item versions;
- semantic tags, assumptions, variants, examples, core/plugin/asset dependencies and provenance;
- 2D/3D/BOTH dimensionality;
- semantic local anchors and typed ports;
- compatible target/port/observable/capability metadata;
- four deterministic registries with duplicate rejection and atomic batch registration;
- declarative plugin Library contribution registration and rollback on failure;
- deterministic catalog merge, full-text/tag search, source/class/tag filters and stable ordering;
- drag payload creation without editor-native data;
- compatibility and port-count preflight with compatible/incomplete/incompatible results;
- prefab snapshots containing project assets/datasets and Scene child collections;
- fresh identity generation and complete reference remapping at instantiation;
- external target-slot substitution for binding representations/instruments;
- stable source provenance on generated components and document-node metadata;
- exact required-plugin preflight and plugin-lock insertion;
- one atomic instantiate/remove command pair with undo/redo;
- built-in foundational object pack and TextBlock preset metadata;
- My Library save/remove/export/import with canonical JSON and missing dependency reporting;
- live desktop Library explorer and snapshot-instantiation proof;
- required executable examples and honest pending artifact records.

## 4.2 Out of scope

- arbitrary editor panels, final drag gestures, resize handles or inspector forms;
- physics models, solvers, live observables or measurement acquisition;
- relationship-engine execution, circuit solving or runtime instrument behavior;
- imported SVG sanitization/raster processing, content-addressed binary packaging or thumbnail rendering service;
- persistence of My Library to a particular operating-system directory;
- automatic prefab upgrades or live links;
- arbitrary executable plugin code, Worker/WASM compute or plugin permissions;
- plugin installation/discovery from disk or network;
- final localization/RTL UI, deterministic typography or TextBlock rendering/reveal animation;
- graph, equation, control, animation or Storyboard engine behavior;
- `.physica` ZIP packaging, WebM generation or installer packaging.

# 5. Packages and files allowed to change

Primary:

- `packages/plugin-sdk`;
- `packages/assets`;
- `packages/commands`.

Composition and proof:

- `apps/desktop`;
- `examples/library/*`;
- `examples/pending-artifacts.json`;
- root test configuration only where needed;
- `docs/CURRENT_STATE.md`.

No root ProjectDocument field or schema version changes. No physics-domain, renderer, runtime-scheduler, checkpoint, animation, equation, graph or control implementation changes.

# 6. Dependency direction

```text
core-model       serialization       commands
     ↑                 ↑                 ↑
     └──────── plugin-sdk              │
                    ↑                   │
                    └──────── assets ───┘
                                  ↑
                         applications/examples
```

`commands` does not depend on plugin-sdk/assets. `plugin-sdk` does not depend on assets/applications. No package cycle is permitted.

# 7. Result and error contract

Normal invalid input returns `LibraryResult<T>` with stable errors:

- invalid-definition;
- duplicate-registration;
- missing-registration;
- registry-reference-missing;
- plugin-namespace-mismatch;
- plugin-version-conflict;
- dependency-missing;
- incompatible-target;
- incomplete-target;
- invalid-prefab-snapshot;
- identity-collision;
- instantiation-failed;
- invalid-my-library-manifest;
- unsupported-manifest-version.

Errors contain a stable code, teacher-facing message, optional item/definition ID and path. Host exception text is not part of deterministic results.

# 8. Canonical public metadata

`LibraryItemDefinition` contains:

- `id: RegisteredTypeId`;
- positive `schemaVersion`;
- non-empty item `version`;
- `displayName`, `description`;
- `itemClass`: smart-model, prefab, visual-object, instrument, representation or material-preset;
- `source`: built-in, plugin or my-library plus source package/plugin ID;
- domain/curriculum/topic/search tags;
- thumbnail descriptor with semantic alt text;
- default parameters and editable-property descriptors;
- semantic anchors, ports and compatible-target descriptors;
- recommended representation/control IDs;
- assumptions and visual variants;
- dimensionality 2D/3D/BOTH;
- required example IDs;
- required core range, plugin locks and dependent asset IDs;
- SPDX-style license/provenance and optional scientific model provenance;
- one creation reference to prefab, instrument or material registry content.

All fields are JSON-safe and deeply immutable after registration. Display names are not identifiers.

# 9. Anchors, ports and compatibility

Anchors have local semantic IDs, namespaced anchor types, finite local 3D positions and optional compatible port types. Positions describe visual/local attachment only and never become physical state.

Ports have semantic IDs, namespaced port types, input/output/bidirectional direction and positive connection capacity.

Compatible targets may require:

- entity type;
- provided capability;
- anchor type;
- port type/count;
- observable kind;
- dataset;
- any explicit union of those requirements.

Compatibility returns:

- `compatible` when all unambiguous requirements are met;
- `incomplete` when editing may continue but required targets/connections are missing;
- `incompatible` when the supplied target is scientifically unambiguous and invalid.

This is authoring preflight only. Dynamic physics validity remains owned by the eventual model/relationship/solver validators.

# 10. Registry behavior

Each registry:

- validates entries before mutation;
- rejects duplicate canonical IDs;
- stores deep immutable copies;
- returns deterministic ID-sorted lists;
- supports atomic `registerMany`: any failure leaves the registry unchanged;
- supports explicit unregister for plugin unload/testing without mutating instantiated projects;
- never exposes a mutable backing map.

`LibraryRegistry` validates creation references structurally. `LibraryCatalog.create` performs cross-registry reference validation.

A declarative plugin contribution batch declares one plugin ID/version and Library/prefab/instrument/material arrays. Every plugin-owned ID and Library source plugin ID must use that plugin namespace. Registration across all four registries is atomic.

# 11. Prefab snapshot contract

A `PrefabDefinition` contains:

- canonical ID/version/schema version;
- required target slots;
- one immutable `LibraryProjectSnapshotTemplate`;
- required example IDs.

The template contains a valid placeholder scene ID plus bounded project assets/datasets and all Scene child collections that may be created:

- entities/components;
- systems;
- clocks/events/relationships;
- representations;
- controls;
- dataset references;
- equations/graphs.

It does not contain a Scene root, camera, audio, Storyboard or PresentationFlow mutation.

Every placeholder persisted identity is a valid UUID v4. Structured and opaque JSON references use those same placeholder strings. The planner:

1. preflights item/creation/plugin/target dependencies;
2. allocates fresh IDs through the supplied `IdFactory` for every inserted identity;
3. maps the placeholder scene ID to the destination Scene;
4. maps declared external target placeholders to supplied existing DocumentReferences;
5. recursively remaps matching identity strings in JSON-safe configuration;
6. explicitly remaps structured component bindings, system selectors/state-channel refs and representation source bindings;
7. applies immutable source provenance;
8. returns a fully prepared `InstantiateLibraryItemPayload`.

Input templates and existing documents remain unchanged.

# 12. Instrument and material definitions

An `InstrumentDefinition` references a prefab definition and declares required target/port roles, observable/data kinds and whether incomplete authoring is permitted. Step 10 plans document bindings only; it does not sample runtime data.

A `MaterialPresetDefinition` stores semantic property entries:

- semantic property ID such as `mechanical.density`;
- finite value;
- unit ID;
- optional uncertainty;
- optional JSON-safe validity context;
- source/reference and version.

Material properties remain namespaced and are applied only by future models that explicitly understand them. The registry does not infer missing properties or modify physics.

# 13. Command and transaction behavior

`InstantiateLibraryItemPayload` contains the destination Scene ID, item identity/version, prepared assets/datasets/plugin locks and prepared Scene child collections.

The command:

- validates the destination Scene;
- rejects duplicate IDs inside the payload and collisions anywhere in the ProjectDocument;
- rejects incompatible existing plugin locks;
- constructs the candidate document and runs base ProjectDocument validation;
- inserts collections in deterministic supplied order;
- adds only absent compatible plugin locks;
- returns one inverse `RemoveLibraryInstantiation` command holding exact inserted IDs and snapshot data.

Removal validates that the exact inserted identities still exist and relies on final document validation to prevent dangling references. Undo/redo therefore reproduces the exact same generated IDs and snapshot.

One dispatch produces one revision/publication/history entry. No simulation frame or runtime event is created.

# 14. Catalog, search and drag payloads

The catalog combines built-in, installed-plugin and My Library sources without duplicating IDs.

Search normalization is deterministic and locale-independent. Query tokens match display name, description, IDs, domains, topics, curriculum tags, search tags, physical quantities and example IDs.

Ranking is deterministic:

1. exact canonical ID;
2. display-name prefix;
3. display-name token;
4. tag/description token coverage;
5. canonical ID tie-break.

Filters include source, item class, dimensionality, domain, topic, curriculum and favorites. Recent/favorite state is explicit ephemeral user preference data and never enters ProjectDocument.

A drag payload contains only schema version, canonical item ID/version and source identity. It contains no executable callback, DOM object or backend handle.

# 15. Built-in foundational content

The canonical built-in pack registers:

- visual/common: ball, block, trolley, car, mass, string, spring, pulley, support, ground/surface;
- instruments: ruler, stopwatch;
- representations: vector arrow, coordinate axes, graph panel, equation panel;
- TextBlock presets: Text Block, Definition, Explanation, Caption, Callout, Quote, Bullet List, Examiner Note and Warning.

Definitions use stable `physica.library:...` IDs, semantic anchors/ports, coherent procedural visual metadata, canonical reuse tags, source/license metadata and example IDs.

Visual-only objects create no physical model. String/spring ports describe compatibility but do not implement constraints. Graph/equation/text entries create representation snapshots but no engine behavior.

# 16. My Library

`MyLibraryStore` saves immutable bundles containing one my-library item and any owned prefab/instrument/material definitions plus referenced asset/dataset definitions.

It:

- rejects executable values, invalid IDs and built-in/plugin source impersonation;
- requires unique canonical IDs;
- returns deterministic snapshots;
- exports schema-versioned canonical JSON;
- imports through runtime validation and atomic replacement/merge;
- reports required plugins/assets before instantiation;
- never mutates an item already instantiated in a ProjectDocument.

Filesystem location, atomic disk write and binary package copying remain later application/persistence work.

# 17. Document/runtime, authority, clocks, observables and events

Library registries, catalog state and My Library manifests are authoring data outside ProjectDocument. Instantiated component configuration/initial state and source metadata become document data.

No runtime state is instantiated. No state channel is written by the Library. Component/system definitions created from a prefab remain subject to the existing ProjectDocument single-authority validator.

The Library does not advance clocks, schedule events, evaluate observables or sample instruments. It may declare intended clock, observable and event configuration inside snapshots for their owning future runtimes.

# 18. Serialization and snapshot stability

Registry and My Library definitions are JSON-safe. Canonical My Library export uses the existing serialization normalizer.

Instantiation is a one-time copy:

- registry versions are traceability metadata only;
- future registry updates do not alter ProjectDocument content;
- explicit upgrade/reapply is not implemented in this phase;
- unknown registered component/system/representation payloads remain ordinary opaque ProjectDocument JSON and serialize through the existing V1 schema;
- no migration or ProjectDocument schema update is introduced.

Tests update a registry item after instantiation and prove the existing project remains byte-equivalent.

# 19. Plugin behavior and isolation

Step 10 accepts declarative contribution objects only. A plugin contribution cannot contain functions, class instances, DOM nodes, filesystem paths with host authority or executable modules.

Plugin-owned IDs use the plugin namespace. Missing required plugins prevent new instantiation with a typed dependency error but do not alter existing project payloads.

No Worker/WASM execution, plugin install, network discovery, arbitrary React/native injection or permissions API is implemented.

# 20. Validation and assumptions

Validation covers:

- namespaced IDs and plugin namespaces;
- positive schema/connection capacities and non-empty versions/names;
- unique item/template/anchor/port/property IDs;
- finite anchor positions, material values and uncertainties;
- source-kind/source-plugin consistency;
- required examples, license/provenance and creation references;
- valid placeholder UUID identity graph;
- exact target-slot supply and target-kind agreement;
- dependency presence/version conflicts;
- JSON-safe immutable definitions;
- complete project candidate validity after command insertion.

Built-in visual metadata is illustrative and not a physical model. Text/graph/equation/instrument snapshots are authoring foundations awaiting their owning engines.

# 21. Performance

- registry lookup is O(1);
- registry lists and catalog results use stable precomputed/searchable text where practical;
- search is O(n) over the bounded installed catalog and avoids quadratic token comparison;
- catalog registration and My Library import are atomic;
- prefab remapping is O(number of nodes + JSON values);
- 10,000-item registry search and 1,000 repeated prefab instantiations have bounded deterministic tests;
- no render loop, worker or polling service is introduced.

# 22. Accessibility and teacher UX

- thumbnails require non-empty alt text;
- item class/source and compatibility status are available as text, not color alone;
- search is keyboard/input driven;
- incomplete versus incompatible results include actionable messages;
- assumptions, provenance and required plugins are inspectable;
- drag has an equivalent explicit “Add to scene” action;
- canonical IDs are not presented as translated display labels;
- final localization, focus management and full WCAG audit remain application completion work.

# 23. Example Gallery requirements

Step 10 provides executable deterministic examples:

- `examples/library/drag-smart-model`;
- `examples/library/drag-prefab`;
- `examples/library/bind-instrument`;
- `examples/library/save-to-my-library`;
- `examples/library/foundation-object-pack`;
- `examples/library/registry-discovery`.

Each includes metadata, README, run module, expected JSON, accessible expected SVG preview and automated test.

`text-definition-reveal` receives Library preset/instantiation coverage now, but its actual presentation reveal remains explicitly pending until the Presentation Animation and TextBlock phases. `.physica`, PNG, WebM and shared gallery-runtime artifacts remain machine-registered until their owning package/export infrastructure exists.

# 24. Test matrix

Plugin SDK/registries:

- valid registration/get/list/unregister;
- duplicate and invalid definition rejection;
- deterministic list independent of registration order;
- atomic batch rollback;
- plugin namespace/source validation;
- plugin Smart Model + Prefab + Instrument discovery without app changes.

Assets/catalog:

- all six classes;
- deterministic search/ranking/filtering at 10,000 items;
- anchors/ports and compatibility/incomplete/incompatible results;
- drag payload JSON safety;
- cross-registry missing-reference rejection;
- built-in canonical IDs, required tags, anchor/port completeness and example coverage.

Instantiation/commands:

- fresh IDs on repeated instantiation;
- complete structured and opaque JSON reference remapping;
- external target-slot mapping;
- plugin dependency preflight and plugin-lock insertion;
- project candidate validation and identity collision rejection;
- atomic one-publication insertion;
- exact undo/redo;
- registry update after instantiation does not change project;
- missing plugin blocks new instantiation but not serialization of existing payload.

My Library:

- save/remove/list;
- canonical export repeatability;
- import round trip and atomic failure;
- no functions/non-finite values/source impersonation;
- missing asset/plugin dependency report.

Application/examples:

- six executable expected-output tests;
- desktop strict typecheck/build;
- keyboard-searchable Library explorer;
- explicit Add-to-scene path;
- launcher `--check`;
- architecture and full CI gates.

# 25. Definition of Done

Step 10 is complete only when:

- all four registries exist and use canonical metadata;
- built-in, plugin and My Library entries compose without editor hard-coding;
- plugin batch registration is declarative, namespaced and atomic;
- snapshots instantiate through one Command/ProjectStore transaction;
- generated identities/references/provenance/plugin locks are correct;
- existing projects remain unchanged after registry updates;
- anchors, ports, search and compatibility are deterministic and tested;
- foundational objects and TextBlock presets are registered honestly without invented physics;
- My Library canonical manifests round-trip;
- required executable examples and honest pending artifacts exist;
- the desktop launcher exposes the meaningful Library foundation;
- formatting, lint, architecture, typecheck, unit/example and application build gates pass;
- `CURRENT_STATE.md` records exact verification and the next unfinished phase.

# 26. Explicit non-implementation boundary

Completion of Step 10 must not be described as a complete editor, physics model catalog, runtime instrument/acquisition system, material-property engine, imported-asset pipeline, plugin execution sandbox, final TextBlock system, animation engine, equation/graph engine, final Example Gallery or packaged application. It is the deterministic metadata, registry, snapshot, command and visible discovery foundation on which those systems build.

