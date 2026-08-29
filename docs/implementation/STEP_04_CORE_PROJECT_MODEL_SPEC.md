# Physica Step 4 — Core Project Model Implementation Specification

**Status:** APPROVED FOR STEP 5 IMPLEMENTATION  
**Platform that produced this specification:** ChatGPT  
**Implementation platform for next step:** Codex  
**Scope:** project document model, identities, component/system envelopes, representation envelopes, structural/reference validation, serialization foundation, migration foundation, commands, transactions, Project Store and undo/redo.  
**Out of scope:** renderer, Physics Library behavior, unit engine, clock runtime, solver algorithms, animation, equations, graphs, UI, PhysScript and curriculum physics.

---

## 1. Authority and source-of-truth

This specification is subordinate to, and must be read consistently with:

1. `docs/PROJECT_CONSTITUTION.md`
2. approved ADRs in `docs/DECISIONS.md`
3. owning subsystem specifications
4. this Step 4 implementation specification
5. `docs/CURRENT_STATE.md` for operational status only

The following frozen decisions are especially binding:

- ADR-003 — component/system/registry document model
- ADR-004 — document state and runtime state are separate
- ADR-005 — one authoritative writer per mutable physical state channel
- ADR-006 — scene-level systems for multi-entity physics
- ADR-017 — Library/prefab instantiation is snapshot-based
- ADR-019 — project plugin lock and unknown-payload preservation
- ADR-025 — project-level PresentationFlow
- ADR-028 — package dependency direction is enforced
- ADR-032 — teaching text is a first-class `TextBlock` Representation

### 1.1 Implementation principle

The persisted project is a **definition of a lesson/simulation**, not a recording of its current runtime frame.

```text
ProjectDocument
      ↓ constructs
RuntimeStateStore
      ↓ produces
Derived Observables
      ↓ observed by
Representations / Graphs / Equations / Text / Instruments
```

A simulation step must never mutate `ProjectDocument` merely because time advanced.

---

# 2. Final decisions made in Step 4

The following implementation-level decisions are now final for Step 5.

## D4-01 — IDs use branded UUID v4 strings

All persisted object identities use UUID v4 strings wrapped in TypeScript branded types.

Reason:

- browser and modern Node runtimes provide `crypto.randomUUID()`;
- no extra ID dependency is needed;
- IDs remain stable across save/reopen;
- ordering must be explicit in arrays/flow definitions rather than accidentally encoded into IDs;
- tests can inject a deterministic `IdFactory`.

Array indices are never references.

## D4-02 — Registered type IDs are namespaced canonical strings

Runtime/plugin type identifiers use a different type from object instance IDs.

Canonical form:

```text
physica:component/translational-body
physica:system/circuit-network
physica:representation/text-block
org.example.plugin:component/custom-sensor
```

Regex target:

```text
^[a-z0-9][a-z0-9.-]*:[a-z0-9][a-z0-9._/-]*$
```

These IDs are stable API identifiers and are not localized.

## D4-03 — Root schema version starts at integer `1`

`CURRENT_PROJECT_SCHEMA_VERSION = 1`.

No fake migrations are created for versions that never existed.

## D4-04 — Root envelopes are strict; plugin/config payloads are opaque JSON

Core structural envelopes reject unknown root fields except through explicit `extensions` maps.

Registered component/system/representation configuration and initial-state payloads are stored as JSON values and are **not stripped** when the owning plugin/type is unavailable.

## D4-05 — Undo/redo uses inverse commands, grouped atomically into transactions

Step 5 does not use full-document snapshots for editor undo.

Every successful command returns an inverse command sufficient to restore the previous document state.

Transactions collect inverse commands and undo them in reverse order.

Runtime simulation checkpoints are a separate later subsystem.

## D4-06 — Project document updates are immutable with structural sharing

Commands never mutate the current document object in place.

They return a new `ProjectDocument`, reusing untouched branches.

No Immer dependency is required in Step 5; plain TypeScript copy-on-write helpers are sufficient.

## D4-07 — `ProjectStore` is the sole authoritative document store

React state, Zustand, renderer state and physics runtime state are not authoritative project stores.

The editor will later subscribe to `ProjectStore`.

## D4-08 — Canonical JSON is deterministic for test/export purposes

Object keys are serialized in deterministic lexical order; array order is preserved.

Optional `undefined` values are omitted. Non-finite numbers are rejected.

This deterministic serializer is for project JSON/tests; it is not a substitute for semantic comparison of floating-point physics.

---

# 3. Core JSON and utility types

Step 5 must define a JSON-safe type layer in `packages/core-model`.

```ts
export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonObject
  | JsonValue[];

export type JsonObject = {
  readonly [key: string]: JsonValue;
};
```

The following are forbidden inside ordinary project JSON values:

- `undefined`
- `NaN`
- `Infinity`
- `-Infinity`
- `bigint`
- `Date` instances
- `Map`
- `Set`
- functions
- class instances
- DOM objects
- renderer handles
- solver objects

Dates/times in persisted metadata are ISO-8601 UTC strings.

---

# 4. Identity model

## 4.1 Branded ID pattern

Implementation pattern:

```ts
declare const brand: unique symbol;
export type Brand<T, TBrand extends string> = T & {
  readonly [brand]: TBrand;
};
```

Required persisted identity types:

```ts
export type ProjectId = Brand<string, "ProjectId">;
export type SceneId = Brand<string, "SceneId">;
export type PresentationTransitionId = Brand<string, "PresentationTransitionId">;
export type EntityId = Brand<string, "EntityId">;
export type ComponentInstanceId = Brand<string, "ComponentInstanceId">;
export type SystemId = Brand<string, "SystemId">;
export type RepresentationId = Brand<string, "RepresentationId">;
export type RelationshipId = Brand<string, "RelationshipId">;
export type ControlId = Brand<string, "ControlId">;
export type EquationId = Brand<string, "EquationId">;
export type GraphId = Brand<string, "GraphId">;
export type DatasetId = Brand<string, "DatasetId">;
export type AssetId = Brand<string, "AssetId">;
export type StoryboardId = Brand<string, "StoryboardId">;
export type StoryboardStepId = Brand<string, "StoryboardStepId">;
export type ClockId = Brand<string, "ClockId">;
export type EventDefinitionId = Brand<string, "EventDefinitionId">;
export type GlobalVariableId = Brand<string, "GlobalVariableId">;
export type ExportPresetId = Brand<string, "ExportPresetId">;
export type CommandId = Brand<string, "CommandId">;
export type TransactionId = Brand<string, "TransactionId">;
```

Registered canonical identifiers:

```ts
export type RegisteredTypeId = Brand<string, "RegisteredTypeId">;
export type PluginId = Brand<string, "PluginId">;
export type StateChannelId = Brand<string, "StateChannelId">;
export type CapabilityId = Brand<string, "CapabilityId">;
export type ObservableId = Brand<string, "ObservableId">;
export type SolverTypeId = Brand<string, "SolverTypeId">;
```

## 4.2 ID factory

```ts
export interface IdFactory {
  projectId(): ProjectId;
  sceneId(): SceneId;
  entityId(): EntityId;
  componentInstanceId(): ComponentInstanceId;
  systemId(): SystemId;
  representationId(): RepresentationId;
  relationshipId(): RelationshipId;
  controlId(): ControlId;
  equationId(): EquationId;
  graphId(): GraphId;
  datasetId(): DatasetId;
  assetId(): AssetId;
  storyboardStepId(): StoryboardStepId;
  commandId(): CommandId;
  transactionId(): TransactionId;
}
```

Production implementation uses `crypto.randomUUID()`.

Tests inject deterministic IDs.

## 4.3 Duplication rules

- Save/reopen preserves every persisted ID.
- Copy/paste into the same or another project creates new IDs for copied instances and rewrites internal references within the copied subgraph.
- Duplicating a Scene creates a new Scene ID plus new IDs for all scene-owned instances.
- Asset/dataset duplication may preserve the same logical reference only when the command explicitly means "reuse" rather than "copy".
- Registered type IDs and Plugin IDs are never regenerated.

---

# 5. Common metadata and extension contracts

```ts
export interface DocumentMetadata {
  readonly title: string;
  readonly description?: string;
  readonly tags: readonly string[];
  readonly createdAt: string; // ISO UTC
  readonly lastSavedAt?: string; // ISO UTC
  readonly authorDisplayName?: string;
}

export type ExtensionMap = Readonly<Record<string, JsonValue>>;
```

`lastSavedAt` changes only as part of an explicit save/document metadata operation, not on every simulation frame and not implicitly inside unrelated commands.

Extension keys must be namespaced.

---

# 6. ProjectDocument — exact Step 5 contract

```ts
export interface ProjectDocument {
  readonly schemaVersion: 1;
  readonly projectId: ProjectId;
  readonly metadata: DocumentMetadata;

  readonly curriculumProfiles: readonly CurriculumProfileRef[];
  readonly pluginLock: readonly PluginLockEntry[];

  readonly presentationFlow: PresentationFlow;
  readonly scenes: readonly SceneDefinition[];

  readonly assets: readonly AssetDefinition[];
  readonly datasets: readonly DatasetDefinition[];
  readonly globalVariables: readonly GlobalVariableDefinition[];

  readonly styleTheme: RegisteredConfigRef;
  readonly exportPresets: readonly ExportPresetDefinition[];

  readonly extensions?: ExtensionMap;
}
```

The earlier Step 4 request used the phrase `requiredPlugins`. The frozen architecture calls this `pluginLock`; therefore **`pluginLock` is the canonical persisted field**. No duplicate `requiredPlugins` root field is introduced.

## 6.1 Curriculum profile reference

```ts
export interface CurriculumProfileRef {
  readonly profileId: RegisteredTypeId;
  readonly version?: string;
  readonly enabled: boolean;
}
```

## 6.2 Plugin lock

```ts
export interface PluginLockEntry {
  readonly pluginId: PluginId;
  readonly requiredVersion: string;
  readonly compatibleRange?: string;
  readonly componentSchemaVersions?: Readonly<Record<string, number>>;
}
```

Step 5 stores/validates this metadata but does not install or execute plugins.

## 6.3 Registered config reference

```ts
export interface RegisteredConfigRef {
  readonly typeId: RegisteredTypeId;
  readonly schemaVersion: number;
  readonly configuration: JsonObject;
  readonly extensions?: ExtensionMap;
}
```

## 6.4 Global variables

```ts
export interface GlobalVariableDefinition {
  readonly id: GlobalVariableId;
  readonly name: string;
  readonly value: JsonValue;
  readonly metadata?: JsonObject;
}
```

The Units/Mathematics phase will later define semantic quantity encodings. Step 5 does not implement dimensional arithmetic.

## 6.5 Export preset

```ts
export interface ExportPresetDefinition {
  readonly id: ExportPresetId;
  readonly name: string;
  readonly typeId: RegisteredTypeId;
  readonly schemaVersion: number;
  readonly configuration: JsonObject;
  readonly extensions?: ExtensionMap;
}
```

---

# 7. PresentationFlow

`scenes[]` stores Scene definitions. PresentationFlow stores **references**, not duplicate Scene data.

```ts
export interface PresentationFlow {
  readonly entrySceneId: SceneId | null;
  readonly sceneOrder: readonly SceneId[];
  readonly transitions: readonly PresentationTransition[];
  readonly extensions?: ExtensionMap;
}
```

An empty new project uses:

```ts
{
  entrySceneId: null,
  sceneOrder: [],
  transitions: []
}
```

## 7.1 Transition

```ts
export type PresentationTrigger =
  | { readonly kind: "next" }
  | { readonly kind: "previous" }
  | { readonly kind: "choice"; readonly choiceId: string }
  | { readonly kind: "event"; readonly eventKey: string };

export interface PresentationTransition {
  readonly id: PresentationTransitionId;
  readonly fromSceneId: SceneId;
  readonly toSceneId: SceneId;
  readonly trigger: PresentationTrigger;
  readonly transitionTypeId?: RegisteredTypeId;
  readonly configuration?: JsonObject;
  readonly priority?: number;
  readonly extensions?: ExtensionMap;
}
```

### Step 5 implementation level

Step 5 implements:

- schema;
- stable references;
- validation;
- commands for adding/removing/reordering scenes and maintaining flow integrity.

Step 5 does **not** execute scene transitions or render transition animations.

### Flow validation

- `entrySceneId`, when non-null, must exist.
- every `sceneOrder` entry must exist and be unique.
- every Scene must occur exactly once in `sceneOrder` unless explicitly marked non-presentable in a later schema; Step 5 assumes all Scenes are presentable.
- transition source/destination must exist.
- duplicate transition IDs are errors.
- cycles in presentation flow are allowed because interactive lessons may intentionally loop.

---

# 8. SceneDefinition

```ts
export interface SceneDefinition {
  readonly id: SceneId;
  readonly name: string;
  readonly tags: readonly string[];

  readonly entityDefinitions: readonly EntityDefinition[];
  readonly systemDefinitions: readonly SystemDefinition[];
  readonly clockDefinitions: readonly ClockDefinition[];
  readonly eventDefinitions: readonly EventDefinition[];
  readonly relationshipDefinitions: readonly RelationshipDefinition[];
  readonly representations: readonly RepresentationDefinition[];
  readonly controls: readonly ControlDefinition[];

  readonly datasetRefs: readonly DatasetId[];
  readonly equationDefinitions: readonly EquationDefinition[];
  readonly graphDefinitions: readonly GraphDefinition[];

  readonly storyboard: StoryboardDefinition;
  readonly camera: RegisteredConfigRef;
  readonly audio: AudioSceneDefinition;

  readonly metadata?: JsonObject;
  readonly extensions?: ExtensionMap;
}
```

All of these are persisted definitions/configuration.

No current position/velocity/solver cache/current clock time belongs here.

## 8.1 Foundation registered definition envelope

For later subsystems whose semantic schema is not implemented in Step 5, use a stable envelope rather than inventing domain fields now.

```ts
export interface RegisteredDocumentNode<TId extends string> {
  readonly id: TId;
  readonly typeId: RegisteredTypeId;
  readonly schemaVersion: number;
  readonly configuration: JsonObject;
  readonly enabled: boolean;
  readonly metadata?: JsonObject;
  readonly extensions?: ExtensionMap;
}
```

Specialized aliases may use this envelope until their owning package introduces richer typed contracts.

```ts
export type ClockDefinition = RegisteredDocumentNode<ClockId>;
export type EventDefinition = RegisteredDocumentNode<EventDefinitionId>;
export type RelationshipDefinition = RegisteredDocumentNode<RelationshipId>;
export type ControlDefinition = RegisteredDocumentNode<ControlId>;
export type EquationDefinition = RegisteredDocumentNode<EquationId>;
export type GraphDefinition = RegisteredDocumentNode<GraphId>;
```

Storyboard and audio require stable root ownership but no behavior yet:

```ts
export interface StoryboardDefinition {
  readonly id: StoryboardId;
  readonly steps: readonly StoryboardStepEnvelope[];
  readonly extensions?: ExtensionMap;
}

export interface StoryboardStepEnvelope {
  readonly id: StoryboardStepId;
  readonly typeId: RegisteredTypeId;
  readonly schemaVersion: number;
  readonly configuration: JsonObject;
  readonly enabled: boolean;
}

export interface AudioSceneDefinition {
  readonly tracks: readonly RegisteredConfigRef[];
  readonly extensions?: ExtensionMap;
}
```

---

# 9. EntityDefinition

```ts
export interface EntityDefinition {
  readonly id: EntityId;
  readonly name: string;
  readonly entityTypeId?: RegisteredTypeId;
  readonly componentInstances: readonly ComponentInstance[];
  readonly tags: readonly string[];
  readonly visualDefaults?: JsonObject;
  readonly metadata?: JsonObject;
  readonly extensions?: ExtensionMap;
}
```

`entityTypeId` is optional classification/default metadata. It does not select a monolithic physics class.

An entity's physical meaning comes from its components.

## 9.1 Projectile composition example

```text
Entity Ball
├─ TranslationalBody
│  initialState.position = ...
│  initialState.velocity = ...
├─ MassProperty
│  configuration.mass = ...
└─ ProjectileModel
   configuration.gravity = ...
```

At runtime, `ProjectileModel` may own `transform.position` and `motion.velocity` for this entity.

The root Project/Scene schema never gains fields named `launchAngle`, `gravity`, `projectileVelocity`, etc.

---

# 10. ComponentInstance

```ts
export interface ComponentInstance {
  readonly instanceId: ComponentInstanceId;
  readonly componentTypeId: RegisteredTypeId;
  readonly componentSchemaVersion: number;
  readonly configuration: JsonObject;
  readonly initialState: JsonObject;
  readonly bindings: readonly ComponentBinding[];
  readonly enabled: boolean;
  readonly sourceLibraryItem?: LibrarySourceSnapshot;
  readonly metadata?: JsonObject;
  readonly extensions?: ExtensionMap;
}
```

## 10.1 Component bindings

```ts
export interface ComponentBinding {
  readonly key: string;
  readonly target: DocumentReference;
  readonly configuration?: JsonObject;
}
```

Step 5 preserves/validates reference shape only. Relationship semantics are later.

## 10.2 Library provenance snapshot

```ts
export interface LibrarySourceSnapshot {
  readonly libraryItemId: RegisteredTypeId;
  readonly libraryItemVersion: string;
  readonly sourcePackage?: string;
  readonly sourcePluginId?: PluginId;
}
```

This is traceability only. Existing project behavior does not live-link to the Library.

---

# 11. Registered ComponentDefinition contract

The persisted `ComponentInstance` is different from its registered type definition.

The registry-facing contract is:

```ts
export interface ComponentDefinition {
  readonly typeId: RegisteredTypeId;
  readonly schemaVersion: number;

  readonly requiredCapabilities: readonly CapabilityId[];
  readonly providedCapabilities: readonly CapabilityId[];

  readonly readStateChannels: readonly StateChannelId[];
  readonly writeStateChannels: readonly StateChannelId[];

  readonly observableDefinitions: readonly ObservableDefinition[];
  readonly solverRequirements: readonly SolverRequirement[];
  readonly assumptions: readonly AssumptionDefinition[];

  validateConfiguration(
    configuration: JsonObject,
    initialState: JsonObject
  ): readonly ValidationIssue[];

  resolveStateClaims(
    instance: ComponentInstance
  ): readonly LocalStateChannelClaim[];

  migrate?: ComponentMigrationHook;
}
```

Step 5 defines these interfaces and uses them when a test registry is supplied. It does not build the full plugin/physics registry implementation.

## 11.1 ObservableDefinition

```ts
export interface ObservableDefinition {
  readonly id: ObservableId;
  readonly valueKind: string;
  readonly description?: string;
}
```

## 11.2 Solver requirement

```ts
export interface SolverRequirement {
  readonly solverTypeId: SolverTypeId;
  readonly optional?: boolean;
}
```

---

# 12. State-channel authority

This is a hard validation rule.

## 12.1 Channel identifiers

Canonical local channel examples:

```text
transform.position
transform.orientation
motion.velocity
motion.angularVelocity
motion.acceleration
electrical.charge
thermal.temperature
quantum.state
detector.samples
```

`StateChannelId` uses dot-separated canonical identifiers and is never localized.

## 12.2 Effective references

```ts
export type StateChannelRef =
  | {
      readonly scope: "entity";
      readonly entityId: EntityId;
      readonly channel: StateChannelId;
    }
  | {
      readonly scope: "system";
      readonly systemId: SystemId;
      readonly channel: StateChannelId;
    };
```

## 12.3 Claims

```ts
export interface LocalStateChannelClaim {
  readonly channel: StateChannelId;
  readonly role: "authoritative-write" | "read";
}

export interface ResolvedStateChannelClaim {
  readonly ownerKind: "component" | "system";
  readonly ownerId: ComponentInstanceId | SystemId;
  readonly ref: StateChannelRef;
  readonly role: "authoritative-write" | "read";
}
```

There is no `last-writer-wins` mode.

Multiple force/field contributors do not become multiple writers of `motion.velocity`; they expose contributions/observables consumed by the authoritative dynamics system.

## 12.4 Conflict rule

For each active Scene and clock domain, after resolving component/system claims:

```text
count(authoritative writers for mutable StateChannelRef) <= 1
```

If the count is greater than one, validation emits an error and playback of the affected scene must later be blocked.

## 12.5 Valid example

```text
Ball:
  TranslationalBody       provides state shape; no authoritative writer
  MassProperty            no position writer
  ProjectileModel         writes Ball.transform.position
                          writes Ball.motion.velocity
```

Valid.

## 12.6 Invalid example

```text
Ball:
  ProjectileModel         writes Ball.transform.position
RigidWorldSystem:
  writes Ball.transform.position
```

Invalid unless configuration disables/delegates the ProjectileModel claim so the rigid system is the sole writer.

## 12.7 Coupled-system example

An electromechanical coupled system may own both mechanical and electrical state channels. Participant components provide parameters/capabilities but relinquish independent authoritative claims while coupled mode is active.

The coupling system—not callback order—owns convergence and updates.

---

# 13. SystemDefinition

```ts
export interface SystemDefinition {
  readonly id: SystemId;
  readonly name?: string;
  readonly systemTypeId: RegisteredTypeId;
  readonly systemSchemaVersion: number;
  readonly configuration: JsonObject;

  readonly participants: readonly SystemParticipantSelector[];
  readonly clockRef?: ClockId;
  readonly solverBinding?: RegisteredConfigRef;

  readonly declaredInputs: readonly StateChannelRef[];
  readonly declaredOutputs: readonly StateChannelRef[];

  readonly enabled: boolean;
  readonly metadata?: JsonObject;
  readonly extensions?: ExtensionMap;
}
```

## 13.1 Participant selectors

Step 5 supports explicit entity IDs and simple tag/capability query envelopes without implementing a runtime query engine.

```ts
export type SystemParticipantSelector =
  | { readonly kind: "entity"; readonly entityId: EntityId }
  | { readonly kind: "tag"; readonly tag: string }
  | { readonly kind: "capability"; readonly capabilityId: CapabilityId };
```

## 13.2 Registered SystemType contract

```ts
export interface SystemTypeDefinition {
  readonly typeId: RegisteredTypeId;
  readonly schemaVersion: number;
  readonly requiredCapabilities: readonly CapabilityId[];
  readonly providedCapabilities: readonly CapabilityId[];
  readonly solverRequirements: readonly SolverRequirement[];
  readonly assumptions: readonly AssumptionDefinition[];

  validateConfiguration(system: SystemDefinition): readonly ValidationIssue[];
  resolveStateClaims(system: SystemDefinition): readonly ResolvedStateChannelClaim[];
}
```

## 13.3 Required future system classes supported by this envelope

Without root schema changes:

- collision/contact world
- circuit network
- N-body gravitational/electromagnetic interaction
- particle gas/ensemble
- wave/PDE grid
- detector/acquisition scanner
- coupled multiphysics system
- reconstruction/inverse system

---

# 14. RepresentationDefinition

Representations are persisted observers/presentation objects; they do not own physical state.

```ts
export interface RepresentationDefinition {
  readonly id: RepresentationId;
  readonly representationTypeId: RegisteredTypeId;
  readonly representationSchemaVersion: number;

  readonly sourceBindings: readonly RepresentationSourceBinding[];
  readonly configuration: JsonObject;
  readonly layout: JsonObject;
  readonly visual: JsonObject;
  readonly relationshipRefs: readonly RelationshipId[];

  readonly enabled: boolean;
  readonly metadata?: JsonObject;
  readonly extensions?: ExtensionMap;
}
```

## 14.1 Source bindings

```ts
export type RepresentationSourceBinding =
  | { readonly kind: "entity"; readonly entityId: EntityId }
  | { readonly kind: "system"; readonly systemId: SystemId }
  | {
      readonly kind: "observable";
      readonly source: ObservableRef;
    }
  | { readonly kind: "dataset"; readonly datasetId: DatasetId }
  | { readonly kind: "asset"; readonly assetId: AssetId };

export type ObservableRef =
  | {
      readonly sourceKind: "entity-component";
      readonly entityId: EntityId;
      readonly componentInstanceId: ComponentInstanceId;
      readonly observableId: ObservableId;
    }
  | {
      readonly sourceKind: "system";
      readonly systemId: SystemId;
      readonly observableId: ObservableId;
    };
```

## 14.2 TextBlock proof

A definition/explanation uses:

```text
representationTypeId = physica:representation/text-block
configuration = { semanticRole: "definition", ... }
```

No root Scene change is required.

Inline dynamic values may later bind through `sourceBindings`; TextBlock never writes physical state.

---

# 15. Assets and datasets

## 15.1 AssetDefinition

```ts
export interface AssetDefinition {
  readonly id: AssetId;
  readonly uri: string; // project-internal logical URI
  readonly mediaType: string;
  readonly originalName?: string;
  readonly contentHash?: string;
  readonly byteLength?: number;
  readonly metadata?: JsonObject;
  readonly extensions?: ExtensionMap;
}
```

Step 5 validates logical references. ZIP packaging/content storage comes later unless the existing serialization package already has bootstrap support.

## 15.2 DatasetDefinition

```ts
export interface DatasetDefinition {
  readonly id: DatasetId;
  readonly name: string;
  readonly datasetTypeId: RegisteredTypeId;
  readonly datasetSchemaVersion: number;
  readonly storage: DatasetStorage;
  readonly provenance?: JsonObject;
  readonly metadata?: JsonObject;
  readonly extensions?: ExtensionMap;
}

export type DatasetStorage =
  | { readonly kind: "inline-json"; readonly value: JsonValue }
  | { readonly kind: "asset"; readonly assetId: AssetId };
```

Large data should use an Asset reference, not giant arrays in the root document.

Examples of data that must not be persisted per simulation frame:

- 10,000 particle positions per frame
- PDE grid snapshots per frame
- contact manifolds
- renderer vertex buffers
- integrator workspaces

---

# 16. Document reference type

```ts
export type DocumentReference =
  | { readonly kind: "scene"; readonly id: SceneId }
  | { readonly kind: "entity"; readonly sceneId: SceneId; readonly id: EntityId }
  | { readonly kind: "component"; readonly sceneId: SceneId; readonly entityId: EntityId; readonly id: ComponentInstanceId }
  | { readonly kind: "system"; readonly sceneId: SceneId; readonly id: SystemId }
  | { readonly kind: "representation"; readonly sceneId: SceneId; readonly id: RepresentationId }
  | { readonly kind: "relationship"; readonly sceneId: SceneId; readonly id: RelationshipId }
  | { readonly kind: "control"; readonly sceneId: SceneId; readonly id: ControlId }
  | { readonly kind: "equation"; readonly sceneId: SceneId; readonly id: EquationId }
  | { readonly kind: "graph"; readonly sceneId: SceneId; readonly id: GraphId }
  | { readonly kind: "dataset"; readonly id: DatasetId }
  | { readonly kind: "asset"; readonly id: AssetId };
```

Reference integrity validation must be centralized and reusable.

---

# 17. Document state versus runtime state

## 17.1 Persisted Document State

Examples:

- Scene composition
- component configuration
- initial conditions
- model choices
- system participant definitions
- PresentationFlow
- Storyboard
- representation layout/style
- graph definitions
- text definitions
- control definitions
- asset/dataset references
- plugin lock

## 17.2 Runtime State

Examples:

- current `position`
- current `velocity`
- current `orientation`
- current capacitor charge
- current decay population
- PRNG internal state
- ODE integrator state
- rigid-body contact manifolds
- particle buffers
- current PDE grid
- current clock times
- event queue
- current detector acquisition buffer
- solver diagnostics/caches

Runtime State is reconstructed later from:

```text
ProjectDocument + selected Scene + initialState + registered models/systems + deterministic runtime inputs
```

## 17.3 Derived observables

Examples:

- speed
- kinetic energy
- pressure estimate
- activity
- redshift-derived recession velocity
- graph data point at current time

Derived observables are computed from authoritative runtime state/data and are not authoritative state channels.

## 17.4 Explicit proof requirement

Step 5 tests must deep-freeze or checksum a `ProjectDocument`, perform simulated runtime-object changes in a separate fixture, and prove the persisted document remains unchanged.

---

# 18. Unknown plugin data preservation

Missing plugins must not destroy data.

## 18.1 Storage rule

The core schema validates the **envelope**:

```text
componentTypeId
componentSchemaVersion
configuration
initialState
metadata
extensions
```

but `configuration` and `initialState` are JSON payloads preserved intact when the registered type is unavailable.

The same principle applies to systems and representations.

## 18.2 Load behavior

```text
parse core envelope
      ↓
resolve registered type
      ├─ found → plugin/type-specific validation may run
      └─ missing → preserve payload, mark unresolved
```

Unresolved does not mean deleted.

## 18.3 Save behavior

If the user edits unrelated parts of a project and saves while a plugin is missing:

- unresolved envelope IDs remain the same;
- schema versions remain the same;
- opaque payloads remain semantically identical;
- unknown extension data remains present;
- no migration is attempted without the owning migration handler.

## 18.4 Execution rule

Unknown plugin payloads are data only. They are never executed, evaluated as code or interpreted as JavaScript.

---

# 19. Validation architecture

All validation produces typed issues.

```ts
export type ValidationSeverity = "fatal" | "error" | "warning" | "info";

export interface ValidationIssue {
  readonly code: string;
  readonly severity: ValidationSeverity;
  readonly message: string;
  readonly path?: string;
  readonly source: "schema" | "reference" | "capability" | "authority" | "plugin" | "semantic";
  readonly recoverable: boolean;
  readonly relatedIds?: readonly string[];
}

export interface ValidationReport {
  readonly issues: readonly ValidationIssue[];
  readonly hasFatal: boolean;
  readonly hasErrors: boolean;
}
```

## 19.1 Validation layers

Validation runs in this order:

### A. Structural/schema validation

Checks JSON shape, required fields, ID format, schema version type, finite numbers.

A malformed root document is a **fatal load error**.

### B. Reference integrity

Checks all persisted references resolve.

Dangling references are `error`, recoverable for editing/repair, and block affected playback.

### C. Registered type / plugin availability

Missing plugin/type is `warning` or recoverable `error` depending on whether the missing feature affects active content.

It is never a reason to discard payload data.

### D. Capability compatibility

When definitions are available, required/provided capability compatibility is validated.

### E. State-channel authority

Multiple authoritative writers for one resolved channel are `error` and block affected runtime construction.

### F. Semantic/project validation

Examples: invalid PresentationFlow refs, duplicate IDs, invalid system membership, invalid registry-specific configuration.

## 19.2 Future schema version

If `schemaVersion > CURRENT_PROJECT_SCHEMA_VERSION`, Step 5 returns a typed `UnsupportedFutureProjectVersion` fatal result for normal writable loading.

It must not silently coerce the document.

---

# 20. Serialization foundation

Step 5 implements JSON-level serialization and migration foundations, not the complete `.physica` ZIP packaging workflow unless already trivially scaffolded.

## 20.1 Canonical rules

- UTF-8 JSON
- deterministic lexical object-key ordering
- array order preserved
- two-space pretty format for human-readable fixtures
- no `undefined`
- no non-finite numbers
- no comments
- IDs stored as strings
- timestamps stored as ISO-8601 UTC strings
- optional fields omitted unless `null` has a defined semantic meaning

## 20.2 Root strictness

Unknown root fields are rejected.

Extension/plugin data belongs in explicit `extensions` or registered payload fields.

## 20.3 Tagged numeric structures reserved for later phases

The serialization contract reserves tagged objects for mathematical types, but Step 5 does **not** implement the Units/Mathematics semantics.

Examples of future compatible shapes:

```json
{ "$type": "complex", "re": 1.0, "im": 2.0 }
{ "$type": "vec3", "x": 1.0, "y": 2.0, "z": 3.0 }
{ "$type": "quantity", "value": 20, "unit": "m/s" }
```

Step 5 treats such objects inside opaque registered payloads as JSON objects.

## 20.4 Canonical serializer APIs

```ts
export interface ProjectJsonSerializer {
  stringify(document: ProjectDocument): string;
  parse(text: string): ProjectParseResult;
}
```

`parse` performs structural validation/migration before returning a document.

---

# 21. Migration foundation

## 21.1 Project migration contract

```ts
export interface ProjectMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(input: JsonObject): JsonObject;
}

export interface ProjectMigrationRegistry {
  register(migration: ProjectMigration): void;
  migrateToCurrent(input: JsonObject): MigrationResult;
}
```

Rules:

- migrations are strictly `n → n+1`;
- every intermediate version must exist;
- no migration is registered for version 1 because there is no earlier released schema;
- failed migration returns the original input plus error details and does not overwrite it;
- component/plugin migrations remain separate hooks owned by their registered definitions.

Step 5 tests the registry behavior with synthetic test versions, not fictitious released Physica versions.

---

# 22. Command architecture

Commands are document-edit intents. They are not runtime physics events.

## 22.1 Command envelope

```ts
export interface Command<TPayload extends JsonObject = JsonObject> {
  readonly id: CommandId;
  readonly type: RegisteredTypeId;
  readonly label?: string;
  readonly payload: TPayload;
}
```

## 22.2 Handler

```ts
export interface CommandContext {
  readonly idFactory: IdFactory;
}

export interface CommandApplyResult {
  readonly document: ProjectDocument;
  readonly inverse: Command;
  readonly changes: readonly DocumentChange[];
}

export interface CommandHandler<TPayload extends JsonObject = JsonObject> {
  validate(document: ProjectDocument, command: Command<TPayload>): readonly ValidationIssue[];
  apply(document: ProjectDocument, command: Command<TPayload>, context: CommandContext): CommandApplyResult;
}
```

Handlers must be deterministic given the same document, command payload and injected ID factory.

## 22.3 Initial built-in command set for Step 5

Implement:

- `physica:command/add-scene`
- `physica:command/remove-scene`
- `physica:command/reorder-scenes`
- `physica:command/add-entity`
- `physica:command/remove-entity`
- `physica:command/add-component`
- `physica:command/remove-component`
- `physica:command/set-component-configuration`
- `physica:command/set-component-initial-state`
- `physica:command/add-system`
- `physica:command/remove-system`
- `physica:command/add-representation`
- `physica:command/remove-representation`
- `physica:command/set-project-metadata`

Later packages add relationship/equation/graph/storyboard-specific commands.

## 22.4 DocumentChange

```ts
export interface DocumentChange {
  readonly kind: "add" | "remove" | "replace" | "reorder";
  readonly path: string;
  readonly relatedIds: readonly string[];
}
```

This is notification/audit metadata, not the undo mechanism.

---

# 23. Transactions and undo/redo

## 23.1 Transaction

```ts
export interface CommandTransaction {
  readonly id: TransactionId;
  readonly label?: string;
  readonly commands: readonly Command[];
}
```

Transaction execution:

1. validate/apply commands sequentially against the intermediate immutable document;
2. collect inverse commands;
3. if any command fails, apply collected inverses in reverse order or discard the uncommitted intermediate document;
4. only publish the final document when the entire transaction succeeds;
5. store one history entry for the whole transaction.

Because Step 5 uses immutable intermediate documents, rollback should normally be implemented by **not publishing** a failed transaction's intermediate document rather than mutating and repairing the live document.

## 23.2 History entry

```ts
export interface HistoryEntry {
  readonly transactionId: TransactionId;
  readonly label?: string;
  readonly forward: readonly Command[];
  readonly inverse: readonly Command[]; // execution order already prepared for undo
}
```

History is runtime editor state and is not serialized into `.physica` in Step 5.

## 23.3 Redo

- Undo executes the stored inverse sequence atomically.
- Redo executes the original forward sequence atomically.
- A new normal command after undo clears the redo branch.

## 23.4 Runtime frames excluded

Runtime simulation state changes never generate `Command` or `HistoryEntry` objects merely because simulation time advanced.

---

# 24. ProjectStore

`ProjectStore` is framework-agnostic and lives in `packages/commands` (or a small commands-owned store module) because it owns command dispatch/history around a `ProjectDocument`.

```ts
export interface ProjectStore {
  getDocument(): ProjectDocument;
  getRevision(): number;

  dispatch(command: Command): DispatchResult;
  dispatchTransaction(transaction: CommandTransaction): DispatchResult;

  undo(): DispatchResult;
  redo(): DispatchResult;
  canUndo(): boolean;
  canRedo(): boolean;

  subscribe(listener: ProjectStoreListener): Unsubscribe;

  validate(): ValidationReport;

  replaceDocument(document: ProjectDocument, options?: ReplaceDocumentOptions): void;

  markSaved(): void;
  isDirty(): boolean;
}
```

## 24.1 Revision

`revision` is an ephemeral monotonically increasing store counter used for subscriptions/cache invalidation.

It is **not** `schemaVersion` and is not serialized.

## 24.2 Dirty state

`markSaved()` stores the current revision as the saved revision.

`isDirty()` is true when current revision differs from saved revision.

Undoing back to an equivalent document may still leave a different revision; therefore Step 5 should track a stable history/save marker rather than comparing revision integers alone. Recommended implementation:

- history position/index has a persistent-in-store save marker;
- transaction dispatch moves history position;
- `markSaved()` records current history position/token;
- non-history `replaceDocument()` resets history/save state according to options.

## 24.3 Store MUST NOT

`ProjectStore` must not:

- run simulation clocks;
- store RuntimeStateStore;
- render anything;
- execute plugins;
- perform filesystem I/O;
- install dependencies;
- own React/Zustand state;
- calculate physics;
- silently mutate metadata timestamps.

---

# 25. Immutability rules

- Public project objects are treated as deeply readonly.
- Commands return a new root `ProjectDocument`.
- Unchanged arrays/objects should be structurally shared where practical.
- Command handlers may use private local mutable builders as an implementation detail only if they never mutate the input document.
- Tests should `deepFreeze()` input documents in command tests to detect accidental mutation.

---

# 26. Package ownership and dependency direction

## 26.1 `packages/core-model`

Owns:

- JSON-safe types
- branded IDs and IdFactory interface
- ProjectDocument
- PresentationFlow
- SceneDefinition
- EntityDefinition
- ComponentInstance envelope
- SystemDefinition envelope
- RepresentationDefinition envelope
- Asset/Dataset definitions
- reference types
- state-channel/capability/observable interfaces
- validation issue/report types
- pure structural/reference validation helpers that require no plugin runtime

Must not import:

- `commands`
- `serialization`
- renderers
- editor/apps
- physics domain packages

## 26.2 `packages/serialization`

Owns:

- Zod structural schemas
- canonical JSON stringify/parse
- schema-version gate
- migration registry/foundation
- unknown opaque payload preservation tests

Depends on:

- `core-model`

Must not import:

- commands/editor/renderers/domain physics

## 26.3 `packages/commands`

Owns:

- Command/handler registry foundation
- built-in Step 5 commands
- transactions
- inverse-command undo/redo
- ProjectStore
- dirty/history state

Depends on:

- `core-model`

May use parsing/validation utilities only through a direction that does not create a cycle. Prefer pure core validation interfaces; do not make `commands` depend on package-file I/O.

## 26.4 `packages/events`

Step 5 does **not** implement runtime event scheduling.

It may expose only minimal shared event-definition types if the existing repository boundary requires them, but runtime `Collision`, `DecayOccurred`, etc. behavior waits for the runtime/event phase.

## 26.5 Architecture rule

No package-internal cross-imports. Import package public entry points only.

---

# 27. Zod structural schemas

`packages/serialization` must provide Zod schemas corresponding to core persisted envelopes.

Required minimum:

- `ProjectDocumentSchemaV1`
- `PresentationFlowSchemaV1`
- `SceneDefinitionSchemaV1`
- `EntityDefinitionSchemaV1`
- `ComponentInstanceSchemaV1`
- `SystemDefinitionSchemaV1`
- `RepresentationDefinitionSchemaV1`
- `AssetDefinitionSchemaV1`
- `DatasetDefinitionSchemaV1`
- registered-envelope schemas

Core envelopes should use `.strict()`.

Opaque `configuration`, `initialState`, `metadata` and `extensions` values use recursive JSON schemas and are retained.

Zod parse results are converted to Physica typed result objects; raw Zod exceptions must not be the teacher-facing validation contract.

---

# 28. Error/result contracts

Step 5 should avoid exception-driven normal control flow.

```ts
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

Suggested parse result:

```ts
export type ProjectParseResult = Result<
  { readonly document: ProjectDocument; readonly validation: ValidationReport },
  ProjectLoadError
>;
```

Suggested command result:

```ts
export type DispatchResult = Result<
  { readonly revision: number; readonly changes: readonly DocumentChange[] },
  CommandError
>;
```

---

# 29. Reference and uniqueness validation

At minimum Step 5 validates:

- Project ID format
- unique Scene IDs
- unique PresentationTransition IDs
- unique Entity IDs across the whole Project (recommended global uniqueness even though references include Scene context)
- unique ComponentInstance IDs
- unique System IDs
- unique Representation IDs
- unique Dataset/Asset IDs
- Scene refs in PresentationFlow
- component references in bindings
- System explicit participant Entity IDs
- System declared input/output refs
- Representation source refs
- Dataset Asset refs
- Scene datasetRefs
- relationshipRefs on Representations

Because UUIDs are globally unique, duplicate IDs anywhere in the same project are treated as errors even if their container scopes differ.

---

# 30. Future-proofing schema proofs

These are **schema fixtures only**. Step 5 must not implement their physics.

## 30.1 Projectile

```text
Scene
└─ Entity Ball
   ├─ TranslationalBody component
   ├─ MassProperty component
   └─ ProjectileModel component
```

No root changes.

## 30.2 Pulley

```text
Scene
├─ Entity MassA
├─ Entity MassB
├─ Entity Pulley
├─ Entity String
└─ System ConnectedConstraintSystem(participants...)
```

No root changes.

## 30.3 Circuit

```text
Scene
├─ Entity Battery
├─ Entity Resistor
├─ Entity Switch
└─ System CircuitNetwork
```

Topology/configuration is system/component payload.

## 30.4 Particle gas

```text
Scene
├─ Entity Container
└─ System ParticleEnsembleSystem
```

10,000 particle runtime positions are Runtime State, not persisted per frame.

## 30.5 Wave grid

```text
Scene
├─ Entity Source
├─ Entity Boundary
└─ System WaveGridSystem
```

Grid samples are runtime buffers/checkpoints, not Scene fields.

## 30.6 Radioactive sample

```text
Entity Sample
├─ RadioactiveSpecies
└─ StochasticDecayModel
```

Current undecayed count/random state is runtime state.

## 30.7 Ultrasound acquisition

```text
Scene
├─ Entity Transducer
├─ Entity TissueLayerA
├─ Entity TissueLayerB
├─ System LayeredPropagationSystem
└─ System AcquisitionSystem
```

Detector samples are runtime/acquisition state or explicit Dataset output, not root fields.

## 30.8 Tomography acquisition + reconstruction

```text
Scene
├─ Entity Source
├─ Entity DetectorArray
├─ System ProjectionAcquisitionSystem
└─ System ReconstructionSystem
```

Projection datasets use DatasetDefinition/Asset references.

## 30.9 Galaxy/redshift observation

```text
Entity Galaxy
├─ SpectrumSource
└─ RedshiftModel
Representation Spectrum
Graph HubblePlot
```

No astronomy-specific root fields.

## 30.10 3D rigid body

```text
Entity Body
├─ Transform3D initial state
└─ RigidBody component
System RigidWorld
```

3D values live inside registered payloads until the mathematics/coordinate packages provide typed semantic structures.

## 30.11 Explanatory TextBlock

```text
Representation
  representationTypeId = physica:representation/text-block
  sourceBindings = []
  configuration.semanticRole = definition
```

No physics state is required.

## 30.12 Experimental dataset

```text
Project.datasets[]
└─ DatasetDefinition(type = experimental-table, storage = asset or inline-json)
Scene.datasetRefs[] → DatasetId
GraphDefinition → DatasetId
```

No root schema change.

**Conclusion:** all required proof cases fit the frozen Project/Scene model.

---

# 31. Step 5 test matrix

## 31.1 ID tests

- generated IDs match UUID v4 format
- branded constructors reject invalid persisted strings during parsing
- deterministic test IdFactory works
- duplicate IDs detected

## 31.2 Schema tests

- valid empty Project parses
- valid one-Scene Project parses
- missing required root field fails
- unknown root field fails
- invalid schemaVersion fails
- future schemaVersion returns typed unsupported-version result
- non-finite values rejected before serialization

## 31.3 Reference tests

- valid PresentationFlow
- dangling entrySceneId
- dangling transition target
- dangling System participant
- dangling Representation source
- dangling Dataset Asset ref

## 31.4 Component/system composition tests

- valid entity with three components
- duplicate component instance IDs
- one authoritative writer accepted
- two authoritative writers rejected
- entity writer + System writer conflict rejected
- system-only writer accepted

## 31.5 Unknown plugin preservation tests

Load a project containing:

```text
org.example.plugin:component/custom-model
```

without registering that type.

Then:

1. modify unrelated project metadata;
2. serialize;
3. parse again;
4. assert plugin envelope, configuration, initialState, metadata and extensions are preserved semantically.

## 31.6 Serialization tests

- Project round trip
- stable IDs
- deterministic canonical JSON for the same semantic document
- array order preserved
- undefined impossible/omitted
- NaN/Infinity rejected
- ISO timestamp schema check

## 31.7 Command tests

- AddScene / inverse RemoveScene
- AddEntity / inverse RemoveEntity
- AddComponent / inverse RemoveComponent
- SetComponentConfiguration restores old payload on undo
- SetComponentInitialState restores old payload
- Add/Remove System
- Add/Remove Representation
- SetProjectMetadata undo

## 31.8 Transaction tests

- two-command transaction succeeds atomically
- second-command failure publishes no partial document
- undo transaction reverses all commands
- redo transaction reapplies all commands
- new command after undo clears redo branch

## 31.9 ProjectStore tests

- listener called once per committed transaction
- failed transaction emits no document update
- markSaved/isDirty behavior
- replaceDocument resets history according to options
- runtime fixture changes do not alter document

## 31.10 Randomized history test

Generate at least 100 valid document commands using deterministic IDs.

Apply all, undo all, and deep-compare with initial ProjectDocument.

Then redo all and deep-compare with the first final ProjectDocument.

## 31.11 Future-proof fixture tests

Schema-only fixtures for all 12 cases in Section 30 parse and pass reference integrity.

---

# 32. Example fixtures required in Step 5

Step 5 must create:

```text
examples/system/schema-roundtrip/
examples/system/undo-redo/
```

These examples require no real renderer.

## 32.1 `schema-roundtrip`

Contains a small JSON/TypeScript fixture demonstrating:

- Project
- one or two Scenes
- Entity
- Component
- System
- Representation including a TextBlock envelope
- Asset/Dataset reference
- unknown plugin payload
- serialize → parse → equality

## 32.2 `undo-redo`

Demonstrates:

- create empty ProjectStore
- transaction adds Scene + Entity + Component
- inspect document
- undo
- redo
- verify stable identities

If the Example Gallery runtime is not implemented yet, these may be non-visual executable fixtures with metadata/README. Do not build renderer functionality merely to make them visual.

---

# 33. Step 5 exact package/file intent

Codex may adapt filenames to the established package conventions from Step 3, but ownership must remain equivalent.

Suggested structure:

```text
packages/core-model/src/
├─ ids.ts
├─ json.ts
├─ metadata.ts
├─ project.ts
├─ presentation-flow.ts
├─ scene.ts
├─ entity.ts
├─ component.ts
├─ system.ts
├─ representation.ts
├─ assets.ts
├─ datasets.ts
├─ references.ts
├─ state-channels.ts
├─ validation.ts
└─ index.ts

packages/serialization/src/
├─ json-value-schema.ts
├─ project-schema-v1.ts
├─ canonical-json.ts
├─ project-parser.ts
├─ migrations.ts
└─ index.ts

packages/commands/src/
├─ command.ts
├─ command-registry.ts
├─ builtins/
├─ transaction.ts
├─ history.ts
├─ project-store.ts
└─ index.ts
```

Do not create physics-domain implementations in these packages.

---

# 34. What Step 5 WILL implement

Step 5 implements only:

1. branded IDs and IdFactory;
2. JSON-safe core data types;
3. ProjectDocument V1;
4. PresentationFlow schema;
5. SceneDefinition;
6. EntityDefinition;
7. ComponentInstance envelope;
8. ComponentDefinition interface;
9. state-channel claims/interfaces and conflict validation;
10. SystemDefinition envelope and SystemType interface;
11. RepresentationDefinition envelope;
12. Dataset/Asset/reference envelopes;
13. structural and reference validators;
14. Zod schemas;
15. canonical JSON serialization/parsing;
16. migration registry foundation;
17. unknown-plugin payload preservation;
18. Command/handler foundation;
19. initial built-in document commands;
20. transactions;
21. inverse-command undo/redo;
22. ProjectStore;
23. exact tests in Section 31;
24. `schema-roundtrip` and `undo-redo` fixtures.

---

# 35. What Step 5 MUST NOT implement

Do not implement:

- physics model algorithms
- projectile calculations
- solvers
- RuntimeStateStore execution
- runtime scheduler
- clocks engine
- checkpoint/replay
- renderer primitives
- SVG/Pixi/Three behavior
- Physics Library browser or drag/drop
- unit/dimension arithmetic
- vector/matrix math engine
- animation engine
- TextBlock rendering/animation
- equation engine
- graph engine
- relationship engine
- Storyboard execution
- controls behavior
- audio engine
- PhysScript
- React editor functionality
- file-system save dialog
- full ZIP `.physica` packaging
- plugin execution/sandbox
- curriculum-specific physics

If Codex encounters a need for one of these to complete Step 5, it must stop that portion and report the architectural mismatch rather than implementing ahead.

---

# 36. Definition of Done for Step 5

Step 5 is complete only when all are true:

- TypeScript strict mode passes.
- Package dependency lint passes.
- Core model has no editor/renderer/domain imports.
- All persisted IDs are stable branded UUID v4 strings.
- V1 ProjectDocument and Scene structures are implemented.
- Root schema contains no topic-specific physics fields.
- Document state/runtime state boundary is reflected in APIs/tests.
- Component/System authority conflicts are detected.
- Unknown plugin payloads survive unrelated edit + roundtrip.
- Canonical JSON parse/stringify tests pass.
- Future-version projects fail safely.
- Migration registry foundation exists without fictitious production migrations.
- All specified built-in commands support undo.
- Transactions are atomic.
- Randomized 100-command undo/redo test passes.
- All 12 future-proof schema fixtures fit without root-schema modifications.
- `schema-roundtrip` fixture exists and passes.
- `undo-redo` fixture exists and passes.
- Step 2 architecture documents are not rewritten.
- `docs/CURRENT_STATE.md` is updated operationally by Codex after implementation.

---

# 37. Architecture audit result

## Result: PASS

No contradiction requiring an architecture freeze reopening was found.

### Clarifications made, not architecture changes

1. The persisted plugin requirement field is named `pluginLock`, consistent with ADR-019, rather than adding a second `requiredPlugins` field.
2. UUID v4 is selected for persisted instance IDs; registered type IDs remain namespaced strings.
3. Undo/redo uses inverse commands and atomic transactions rather than project snapshots.
4. Structural Zod schemas live in `serialization`; core-model remains the lower-level type owner.
5. Runtime event scheduling remains out of Step 5 even though document EventDefinition envelopes are represented.
6. Full `.physica` ZIP packaging remains a later serialization/export concern; Step 5 implements the project-JSON foundation.

These decisions refine implementation details while preserving the frozen architecture.

---

# 38. Handoff to Step 5

**Next platform:** Codex

Codex must read this file plus the frozen owning documents and implement only Section 34.

