# Compute Backend

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns where heavy solver computation runs without leaking platform details into physics model APIs.

## Scope

Main thread, Web Worker, WASM and native/desktop compute adapters plus deterministic result handoff.

## Owned concepts

- ComputeBackend
- job/result protocol

## Dependencies

- `RUNTIME_SCHEDULER.md`
- `SECURITY.md`

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

- preserve deterministic semantic ordering
- keep platform execution details behind adapter

## This subsystem MUST NOT

- let worker completion order determine event order

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- same job across backends
- cancellation/error propagation

## Example Gallery obligations

- `compute-backend-demo`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §12.0 -->
## 12.0 Solver contract and compute backend

Every solver is accessed through a Physica-owned adapter.

The adapter declares:

```text
solverTypeId
supportedStateTypes
supportedDimensions
determinismPolicy
checkpointCapability
workerCapability
precisionPolicy
inputSchema
outputSchema
```

Heavy computation runs through a `ComputeBackend` abstraction.

Initial backends:

- main-thread TypeScript for light analytical work;
- Web Worker TypeScript/WASM for heavy browser/desktop computation;
- optional Rust/WASM/native service adapters behind the same contract.

A physics model cannot depend directly on worker APIs, GPU APIs, Rapier or a native shell.

Scene systems declare read/write state channels. The scheduler derives system order from those declarations. Cyclic dependencies require an explicit coupled-system solver rather than implicit callback iteration.

