# Security and Sandboxing

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns untrusted project/import/plugin execution boundaries.

## Scope

PhysScript sandbox, SVG sanitization, ZIP safety, plugin permissions, network/file restrictions and local-first privacy.

## Owned concepts

- security policy
- sandbox permissions

## Dependencies

- `PLUGIN_ARCHITECTURE.md`
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

- treat projects as data not JS
- sanitize imported SVG
- deny arbitrary filesystem/network by default

## This subsystem MUST NOT

- eval project code
- load hidden remote dependencies by default

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- malicious SVG
- zip slip
- script sandbox
- plugin permission denial

## Example Gallery obligations

- No standalone user-visible example required unless this subsystem exposes a user-visible feature.

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §26 -->
# 26. SECURITY AND SANDBOXING

Physica projects are data, not executable JavaScript.

PhysScript cannot access:

- filesystem directly;
- network;
- OS commands;
- arbitrary JS eval.

Plugins are separately installed packages with manifest permissions.

Imported SVG is sanitized.

Web exports contain no hidden remote dependency by default.

Project ZIP import defends against:

- path traversal;
- zip bombs/excessive expansion;
- duplicate/ambiguous paths;
- invalid content hashes;
- unsupported executable payloads.

A strict content-security policy is used by the desktop/web viewer.

PhysScript is parsed into a defined AST; it is never passed to `eval`, `Function` or an operating-system shell.

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

<!-- Source: Master §27A.13 -->
## 27A.13 Privacy and diagnostics

Physica is local-first and does not require telemetry.

Crash/diagnostic export is local by default.

Any future telemetry or update analytics must be explicit opt-in and independent of project execution.

---

