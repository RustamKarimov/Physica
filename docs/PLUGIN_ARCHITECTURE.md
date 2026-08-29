# Plugin Architecture

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns safe extensibility, plugin identity/version locks and SDK boundaries.

## Scope

Declarative/content plugins and sandboxed Worker/WASM compute plugins for 1.0.

## Owned concepts

- PluginManifest
- PluginLock
- plugin SDK
- permissions

## Dependencies

- `REGISTRY_ARCHITECTURE.md`
- `SECURITY.md`
- `SERIALIZATION.md`

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

- namespace plugin IDs
- preserve unknown payloads
- pin project plugin dependencies

## This subsystem MUST NOT

- allow arbitrary React/editor/native injection in 1.0
- let plugins mutate project outside contracts

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- missing plugin preservation
- version lock
- sandbox permissions

## Example Gallery obligations

- `test-declarative-plugin`
- `test-worker-plugin`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §20 -->
# 20. PLUGIN AND REGISTRY ARCHITECTURE

Registries:

```text
PhysicalModelRegistry
LibraryRegistry
PrefabRegistry
MaterialPresetRegistry
InstrumentRegistry
SolverRegistry
RepresentationRegistry
RelationshipRegistry
AnimationRegistry
ControlRegistry
ObservableRegistry
ValidatorRegistry
CurriculumRegistry
AssetRegistry
ImporterRegistry
ExporterRegistry
ExampleRegistry
```

A plugin declares:

```text
id
version
compatibleCoreRange
models[]
representations[]
solvers[]
examples[]
curriculumTags[]
migrationHandlers[]
```

Unknown plugin component payloads are preserved losslessly when a project is opened without the plugin, but shown as unavailable.

The core must not rely on closed enums for physics model types.

## 20.1 Plugin execution and security model

Physica 1.0 supports:

1. **data/content plugins** — declarative models, Library items, assets, examples and curriculum metadata where no custom executable solver is required;
2. **sandboxed compute plugins** — JavaScript/TypeScript or WASM computation running in a dedicated Worker-like sandbox through the Plugin SDK message API.

Plugins do not inject arbitrary React components into the editor.

Editor UI for plugin models is generated from declarative schemas and metadata.

Plugin compute code receives no direct Tauri filesystem, shell, network, DOM or OS access.

Capabilities requiring files/network are mediated by explicit permission APIs.

Native unrestricted plugins are **not supported in 1.0**.

## 20.2 Namespacing and dependency locking

All plugin-owned IDs are namespaced.

Projects store an exact `pluginLock` containing required plugin IDs, compatible version information and component schema versions.

Missing plugins do not destroy project payloads.

Conflicting registry IDs are rejected.

Plugin migrations are deterministic and independently versioned.

---

<!-- Source: Master §20.1–20.2 -->
## 20.1 Plugin execution and security model

Physica 1.0 supports:

1. **data/content plugins** — declarative models, Library items, assets, examples and curriculum metadata where no custom executable solver is required;
2. **sandboxed compute plugins** — JavaScript/TypeScript or WASM computation running in a dedicated Worker-like sandbox through the Plugin SDK message API.

Plugins do not inject arbitrary React components into the editor.

Editor UI for plugin models is generated from declarative schemas and metadata.

Plugin compute code receives no direct Tauri filesystem, shell, network, DOM or OS access.

Capabilities requiring files/network are mediated by explicit permission APIs.

Native unrestricted plugins are **not supported in 1.0**.

## 20.2 Namespacing and dependency locking

All plugin-owned IDs are namespaced.

Projects store an exact `pluginLock` containing required plugin IDs, compatible version information and component schema versions.

Missing plugins do not destroy project payloads.

Conflicting registry IDs are rejected.

Plugin migrations are deterministic and independently versioned.

---

