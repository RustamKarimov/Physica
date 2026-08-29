# Step 6 — Mathematics, Units, Coordinates and Clocks Implementation Specification

**Status:** Audited implementation specification  
**Phase:** Autonomous execution, first unfinished phase after Step 5  
**Owning frozen specifications:** `MATHEMATICS_AND_UNITS.md`, `COORDINATES_AND_FRAMES.md`, `CLOCKS_AND_TIME.md`  
**Higher authorities:** `PROJECT_CONSTITUTION.md`, approved ADRs in `DECISIONS.md`

---

# 1. Purpose

Step 6 establishes the deterministic quantitative foundation used by every later physics, solver, renderer, data, control and presentation subsystem.

It implements:

1. numeric primitives and one shared tolerance policy;
2. SI dimensions, units, scalar quantities, uncertainty and precision metadata;
3. typed physical coordinate spaces and extensible reference-frame transforms;
4. named document clock definitions and transient deterministic clock state;
5. the required foundational examples and scientific tests.

The phase does not implement a physics model, runtime scheduler, renderer, checkpoint service or editor.

---

# 2. Source-of-truth audit

This specification preserves:

- Constitution: physics remains authoritative and presentation never changes physical state;
- ADR-004: persisted definitions remain separate from runtime state;
- ADR-007: clocks are named and resolved independently of display refresh;
- ADR-010: physical coordinates are right-handed and ordinary world `+y` is upward;
- ADR-012: presentation/layout transforms are not physical transforms;
- ADR-021: future scientific constants and models can carry provenance without changing these numeric primitives;
- ADR-022: canonical identifiers are separate from localized display strings;
- ADR-028: lower-level package dependency direction remains acyclic.

No ADR change is required.

## 2.1 Pre-implementation audit findings

The specification was checked against the Constitution, ADR-004/005/007/010/012/019/021/022/028, the frozen dependency map and all three owning subsystem documents.

Resolved architecture-compatible details:

- the frozen package map has no coordinates package, so coordinate semantics are a public mathematics module rather than a new package;
- core-model retains opaque registered ClockDefinition envelopes, while clocks owns semantic parsing/validation and runtime state through a one-way clocks → core-model dependency;
- reference-frame runtime providers use generic typed configuration and do not import core-model's higher-layer JSON aliases;
- render timing is only an input supplied by the future scheduler; clocks never read browser/wall time;
- examples remain honest executable foundation fixtures and record richer runtime/render artifacts as pending.

No dependency inversion, state-authority conflict, document/runtime leakage, serialization migration, plugin-isolation change or frozen-rule contradiction remains. The implementation may proceed.

---

# 3. Exact scope

## 3.1 In scope

- finite real-number validation;
- `NumericsPolicy` and approximate comparisons;
- immutable `Vec2`, `Vec3`, `Complex`, `Matrix`, `Quaternion`, `Interval` and sampled-series values;
- vector, matrix, quaternion and complex operations needed by later packages;
- typed result errors for undefined/singular operations;
- seven-base SI dimension algebra;
- semantic dimensionless kinds;
- unit definitions, registry, SI prefix handling and deterministic expression parsing;
- affine unit conversion including Celsius-like offset units;
- scalar `Quantity`, uncertainty and display precision metadata;
- immutable quantity arithmetic with dimension/semantic checks;
- typed local/world/reference/view/camera/layout/data/image coordinates;
- 2D-in-3D plane conversion;
- right-handed rigid/Galilean reference-frame transforms;
- reference-frame provider registry and cycle/reference validation;
- explicit educational visual scaling metadata;
- mandatory simulation and presentation clock definitions;
- optional named clocks and acyclic links;
- transient clock state, run/pause/rate/scrub and deterministic advancement;
- conditional link resolution through caller-supplied boolean conditions;
- public validation/report APIs;
- unit/scientific/serialization-boundary tests and required examples.

## 3.2 Out of scope

- Runtime Scheduler phase execution;
- checkpoint/replay;
- browser or `requestAnimationFrame` ownership;
- event queue execution;
- solver integration;
- relativistic/Lorentz transform implementation;
- non-Cartesian coordinate solvers;
- camera projection/rendering;
- picking/hit testing;
- graph transforms;
- animation clocks driving animations;
- audio scheduling;
- vector-valued Quantity arithmetic beyond explicit component mapping;
- symbolic algebra;
- arbitrary-precision arithmetic;
- physical constants catalog;
- editor controls or UI;
- physics-domain models.

---

# 4. Packages allowed to change

Primary:

- `packages/mathematics`
- `packages/units`
- `packages/clocks`

Integration-only when required:

- `packages/core-model` public helper compatibility only; no dependency on the three primary packages;
- root test/workspace configuration;
- `examples/math/units-and-dimensions`;
- `examples/math/vector-operations`;
- `examples/rendering/coordinate-spaces` as a non-rendered coordinate proof until renderer infrastructure exists;
- `examples/time/two-clocks`;
- `docs/CURRENT_STATE.md`.

No new workspace package is created.

## 4.1 Coordinate package resolution

The frozen repository/package map contains no standalone coordinates package. Creating one would change the frozen package topology. Coordinate and reference-frame primitives therefore live in the `coordinates` public module of `@physica/mathematics`, where they depend only on that package's vector/quaternion/matrix primitives.

This is an internal module ownership decision, not a new architecture layer. Renderers and physics packages may later consume it through the public `@physica/mathematics` export.

---

# 5. Dependency direction

```text
@physica/mathematics   (no workspace dependencies)
        ↑
@physica/units         (mathematics only)
        ↑
@physica/clocks        (core-model type/envelope boundary)
```

`@physica/core-model` must not import mathematics, units or clocks during this phase. `@physica/clocks` may import public `ClockId`, `ClockDefinition`, `IdFactory`, `RegisteredTypeId`, `Result` and validation types from core-model. The dependency is one-way. Clock times are documented canonical seconds, so clocks does not need a runtime dependency on units merely to wrap numbers.

No React, Zustand, renderer, solver, runtime-scheduler or physics-domain import is allowed.

---

# 6. Numeric foundation

## 6.1 Finite number invariant

Every public numeric constructor rejects `NaN`, positive/negative infinity and malformed shapes. Ordinary arithmetic may return a typed error if a result becomes non-finite.

Programmer convenience constructors may throw `RangeError` for malformed literals. Operations whose failure is a normal mathematical possibility return `Result`.

## 6.2 NumericsPolicy

```ts
export interface NumericsPolicy {
  readonly absoluteTolerance: number;
  readonly relativeTolerance: number;
  readonly zeroThreshold: number;
  readonly singularityThreshold: number;
  readonly maxIterations: number;
}

export const DEFAULT_NUMERICS_POLICY: NumericsPolicy;

export function approximatelyEqual(
  a: number,
  b: number,
  policy?: NumericsPolicy,
): boolean;
```

Comparison uses:

```text
|a-b| <= max(absoluteTolerance, relativeTolerance * max(|a|, |b|))
```

Zero checks use `zeroThreshold`. Matrix inversion and quaternion/vector normalization use `singularityThreshold`.

The default policy is immutable. Callers may inject a validated policy; packages must not scatter unrelated epsilon literals.

## 6.3 Mathematical errors

```ts
export type MathematicsError =
  | { kind: "invalid-number"; operation: string; value: number }
  | { kind: "dimension-mismatch"; operation: string }
  | { kind: "zero-vector"; operation: string }
  | { kind: "singular-matrix"; operation: string }
  | { kind: "shape-mismatch"; operation: string; left: readonly number[]; right: readonly number[] }
  | { kind: "invalid-interval"; minimum: number; maximum: number };
```

Errors are deterministic data and contain no localized UI text.

---

# 7. Vector contracts

```ts
export interface Vec2 { readonly x: number; readonly y: number }
export interface Vec3 { readonly x: number; readonly y: number; readonly z: number }

export const VEC2_ZERO: Vec2;
export const VEC3_ZERO: Vec3;

export function vec2(x: number, y: number): Vec2;
export function vec3(x: number, y: number, z: number): Vec3;
```

Required operations:

- add/subtract;
- scalar multiply/divide;
- dot product;
- `crossVec3`;
- squared magnitude/magnitude;
- distance;
- linear interpolation;
- component mapping;
- approximate equality;
- normalization returning `Result<VecN, MathematicsError>`;
- projection/rejection with typed zero-vector failure;
- `angleBetween` clamping the cosine to `[-1, 1]`.

All results are new deeply readonly plain objects. Input objects are never mutated.

---

# 8. Complex, matrix and quaternion contracts

## 8.1 Complex

```ts
export interface Complex { readonly real: number; readonly imaginary: number }
```

Implement add, subtract, multiply, divide with zero-denominator failure, conjugate, magnitude, argument, polar construction, exponential and approximate equality.

## 8.2 Matrix

```ts
export interface Matrix {
  readonly rows: number;
  readonly columns: number;
  readonly data: readonly number[]; // row-major
}
```

Construction validates positive integer shape and exact data length. Implement:

- identity and zero matrices;
- get without exposing mutable storage;
- add/subtract/scale;
- transpose;
- matrix × matrix;
- matrix × Vec2/Vec3 for exact 2×2/3×3 shapes;
- determinant using deterministic pivoted elimination;
- inverse using deterministic Gauss-Jordan elimination;
- approximate equality.

At each pivot choose the remaining row with the greatest absolute pivot; equal pivots retain lowest row index. Singular operations return `singular-matrix`.

## 8.3 Quaternion

```ts
export interface Quaternion {
  readonly w: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}
```

Implement identity, normalization, conjugate, Hamilton product, axis-angle construction, Vec3 rotation, quaternion-to-3×3 matrix and approximate equality. Zero axis/quaternion normalization returns a typed error.

---

# 9. Interval and sampled data types

```ts
export interface Interval {
  readonly minimum: number;
  readonly maximum: number;
  readonly minimumInclusive: boolean;
  readonly maximumInclusive: boolean;
}

export interface Sample<TValue> {
  readonly argument: number;
  readonly value: TValue;
}

export interface SampledSeries<TValue> {
  readonly samples: readonly Sample<TValue>[];
}
```

Intervals reject `minimum > maximum`; equal endpoints require both inclusive. Sampled series validation requires finite, strictly increasing arguments. Interpolation policy remains owned by later data/solver packages.

---

# 10. SI dimensions

## 10.1 Representation

```ts
export interface Dimension {
  readonly mass: number;
  readonly length: number;
  readonly time: number;
  readonly electricCurrent: number;
  readonly thermodynamicTemperature: number;
  readonly amountOfSubstance: number;
  readonly luminousIntensity: number;
}
```

Dimension exponents must be finite safe integers in Step 6. This covers the frozen curriculum and avoids floating equality ambiguity. A later architecture-compatible extension may introduce rational exponent objects if a real model requires them.

Export immutable constants for dimensionless and each SI base dimension.

Implement equality, multiply (add exponents), divide (subtract), integer power, and exact integer root. A root fails when any exponent is not divisible by the root degree.

## 10.2 Semantic dimensionless kind

```ts
export type SemanticDimensionlessKind =
  | "generic"
  | "angle"
  | "solid-angle"
  | "ratio"
  | "refractive-index"
  | "strain"
  | "probability"
  | "count"
  | `plugin:${string}`;
```

Non-dimensionless quantities must use `null`. Dimensionless quantities default to `generic`. Addition/subtraction require equal semantic kinds. Multiplication/division preserve a non-generic semantic kind only when the other operand is dimensionless generic with canonical value semantics; otherwise the result becomes generic when dimensionless.

Angles remain dimensionless in algebra while retaining semantic identity for display and validation.

---

# 11. Unit definitions and registry

## 11.1 Unit identity

```ts
declare const unitIdBrand: unique symbol;
export type UnitId = string & { readonly [unitIdBrand]: "UnitId" };

export interface UnitDefinition {
  readonly id: UnitId;
  readonly symbol: string;
  readonly name: string;
  readonly dimension: Dimension;
  readonly scale: number;
  readonly offset: number;
  readonly semanticKind: SemanticDimensionlessKind | null;
  readonly prefixPolicy: "none" | "si-decimal";
  readonly aliases: readonly string[];
}
```

Canonical conversion is:

```text
canonicalSI = displayValue * scale + offset
displayValue = (canonicalSI - offset) / scale
```

`scale` must be finite and strictly positive. Offset must be finite. Affine offset units cannot participate in multiplication, division or exponentiation expressions; they may be used only as the complete unit expression.

Unit IDs use lowercase namespaced identifiers such as `si:metre`, independent of localized names.

## 11.2 Registry

```ts
export interface UnitRegistry {
  register(definition: UnitDefinition): Result<void, UnitError>;
  get(id: UnitId): UnitDefinition | undefined;
  resolveSymbol(symbolOrAlias: string): Result<UnitDefinition, UnitError>;
  parse(expression: string): Result<ParsedUnit, UnitError>;
}
```

Registration rejects duplicate IDs, symbols and aliases. Resolution is exact and case-sensitive because `m` and `M` differ. Localized labels belong above this package.

## 11.3 Built-in units

The default registry includes:

- dimensionless one, radian, steradian, percent;
- metre, kilogram, second, ampere, kelvin, mole, candela;
- gram as a prefixable scaled mass unit;
- hertz, newton, pascal, joule, watt, coulomb, volt, farad, ohm, siemens, weber, tesla, henry;
- litre, minute, hour, degree, Celsius;
- common aliases where unambiguous.

SI decimal prefixes from quecto through quetta are table-driven and exact powers of ten. Prefix parsing first attempts an exact registered symbol, then the longest valid prefix plus a prefixable unit symbol.

## 11.4 Unit expression grammar

```text
expression := product ("/" product)*
product    := factor (("*" | whitespace) factor)*
factor     := symbol exponent?
exponent   := "^" signedInteger
```

Step 6 does not support parentheses or fractional exponents. Empty text means dimensionless one. Parsing is deterministic left-to-right. Multiple division operators are legal and apply sequentially.

`ParsedUnit` contains dimension, multiplicative scale, semantic kind and normalized source expression. Offset is zero except when the expression is one standalone affine unit.

---

# 12. Quantity, uncertainty and precision

```ts
export type PrecisionPolicy =
  | { readonly kind: "automatic" }
  | { readonly kind: "decimal-places"; readonly places: number }
  | { readonly kind: "significant-figures"; readonly figures: number };

export type Uncertainty =
  | { readonly kind: "absolute"; readonly canonicalValue: number; readonly confidenceLevel?: number }
  | { readonly kind: "relative"; readonly fraction: number; readonly confidenceLevel?: number };

export interface Quantity {
  readonly canonicalValue: number;
  readonly dimension: Dimension;
  readonly displayUnit: ParsedUnit;
  readonly uncertainty?: Uncertainty;
  readonly precisionPolicy: PrecisionPolicy;
  readonly semanticKind: SemanticDimensionlessKind | null;
}
```

All canonical values are SI-compatible finite numbers. `displayUnit` is the immutable parsed unit expression rather than only a registry ID because compound/prefixed display expressions such as `km h^-1` may not have a separately registered named unit. It remains JSON-safe and contains an optional standalone UnitId when applicable.

Required operations:

- create from display value and registered unit;
- convert display value to another compatible unit without changing canonical value;
- read display value;
- add/subtract with identical dimension and semantic kind;
- multiply/divide producing a canonical coherent display unit reference;
- integer power and exact root;
- scalar multiply;
- approximate equality using `NumericsPolicy`;
- map scalar value while preserving metadata only when dimension remains unchanged;
- validate uncertainty and precision policy.

Uncertainty propagation in Step 6:

- add/subtract: absolute uncertainties combine by root-sum-square;
- multiply/divide: relative uncertainties combine by root-sum-square;
- scalar multiply: absolute uncertainty scales by absolute scalar;
- power `n`: relative uncertainty scales by `|n|`;
- missing uncertainty remains missing unless both/one supplied; a supplied uncertainty is propagated with zero contribution from missing operands.

This is a generic independent-uncertainty container, not a claim about experimental correlation. Correlated uncertainty remains a later data-analysis concern.

---

# 13. Coordinate-space contracts

## 13.1 Space identities

```ts
export type CoordinateSpaceKind =
  | "entity-local"
  | "physical-world"
  | "reference-frame"
  | "scene-view"
  | "camera"
  | "screen-layout"
  | "graph-data"
  | "image-detector";

export interface Coordinate3<TSpace extends CoordinateSpaceKind> {
  readonly space: TSpace;
  readonly value: Vec3;
}

export interface Direction3<TSpace extends CoordinateSpaceKind> {
  readonly space: TSpace;
  readonly value: Vec3;
}
```

Position and direction are distinct. Translation applies to positions but not directions. Constructors validate finite components. APIs do not accept an untagged Vec3 where a coordinate is required.

## 13.2 2D plane

Canonical 2D physical space is the `z = 0` plane of the same right-handed 3D system. `liftPhysical2D(Vec2)` returns physical-world Coordinate3 with `z=0`. `projectPhysicalTo2D` returns a typed error if `|z|` exceeds policy tolerance unless the caller explicitly chooses orthographic discard.

## 13.3 Reference frames

```ts
declare const referenceFrameIdBrand: unique symbol;
export type ReferenceFrameId = string & {
  readonly [referenceFrameIdBrand]: "ReferenceFrameId";
};

export interface ReferenceFrameDefinition<TConfiguration = unknown> {
  readonly id: ReferenceFrameId;
  readonly name: string;
  readonly parentId: ReferenceFrameId | null;
  readonly transformTypeId: string;
  readonly configuration: TConfiguration;
}

export interface GalileanFrameConfiguration {
  readonly originAtEpoch: Vec3;
  readonly orientationToParent: Quaternion;
  readonly velocityRelativeToParent: Vec3;
  readonly epochSeconds: number;
}
```

The built-in provider ID is `physica.frame:galilean-v1`.

For local position `p`, time `t`, rotation `R`, origin `o`, velocity `v`, epoch `t0`:

```text
parentPosition = o + v(t - t0) + R(p)
parentDirection = R(direction)
```

Inverse transformation applies inverse rotation after subtracting translated origin.

## 13.4 Provider registry

```ts
export interface ReferenceFrameTransformProvider<TConfiguration = unknown> {
  readonly typeId: string;
  validate(configuration: TConfiguration): readonly CoordinateValidationIssue[];
  toParentPosition(position: Vec3, timeSeconds: number, configuration: TConfiguration): Result<Vec3, CoordinateError>;
  fromParentPosition(position: Vec3, timeSeconds: number, configuration: TConfiguration): Result<Vec3, CoordinateError>;
  toParentDirection(direction: Vec3, configuration: TConfiguration): Result<Vec3, CoordinateError>;
  fromParentDirection(direction: Vec3, configuration: TConfiguration): Result<Vec3, CoordinateError>;
}
```

The registry is extensible for later Lorentz or specialist transforms without changing coordinate types.

## 13.5 Frame graph

The frame graph:

- rejects duplicate IDs;
- rejects missing parents;
- rejects self-parent links;
- rejects cycles;
- requires a known transform provider for execution but may preserve unknown definitions as opaque configuration;
- resolves a deterministic path through the nearest common ancestor;
- transforms positions/directions between frames at an explicit canonical time;
- never reads a global clock implicitly.

Root frame definitions have `parentId = null`; their transform configuration is ignored for world identity and must validate as identity-compatible.

---

# 14. Educational scale metadata

```ts
export type ScaleMode = "physical" | "educational" | "logarithmic";

export interface EducationalScale {
  readonly physicalScale: number;
  readonly visualScale: number;
  readonly scaleMode: ScaleMode;
  readonly notToScaleWarning: boolean;
}
```

Scales must be finite and positive. In physical mode they must be equal within policy tolerance and `notToScaleWarning` is false. Educational/logarithmic modes require the warning when the visual result is not physically proportional. This metadata never changes a physical coordinate or state value.

---

# 15. Clock document definitions

## 15.1 Separation

Persisted clock definitions live in `SceneDefinition.clockDefinitions` as Step 5 registered document nodes. Runtime `ClockState` lives only in `@physica/clocks` and is never serialized into `ProjectDocument` or command history.

## 15.2 Definition configuration

Built-in type ID: `physica:clock/domain-v1`.

```ts
export type ClockDomainKind =
  | "simulation"
  | "presentation"
  | "acquisition"
  | "audio"
  | "experiment"
  | "custom";

export interface ClockDomainConfigurationV1 {
  readonly key: string;
  readonly kind: ClockDomainKind;
  readonly initialTimeSeconds: number;
  readonly initialRate: number;
  readonly initiallyPaused: boolean;
  readonly link?: ClockLinkDefinition;
}

export interface ClockLinkDefinition {
  readonly parentClockId: ClockId;
  readonly rateMultiplier: number;
  readonly offsetSeconds: number;
  readonly synchronization: "always" | "conditional";
  readonly conditionKey?: string;
}
```

Keys are canonical ASCII identifiers matching `^[a-z][a-z0-9.-]*$`. Each scene must have exactly one enabled `simulation` and one enabled `presentation` clock. Their keys must be exactly `simulation` and `presentation`. Other keys are unique per scene.

Clock numeric fields and rates must be finite. Rate and multiplier may be negative for explicit reverse presentation/scrub behavior and may be zero; pause remains separately observable.

`createDefaultClockDefinitions(idFactory)` creates independent simulation and presentation definitions with time 0, rate 1 and initially paused state chosen explicitly by the caller (default paused).

---

# 16. Clock runtime state and graph

```ts
export interface ClockState {
  readonly clockId: ClockId;
  readonly timeSeconds: number;
  readonly rate: number;
  readonly running: boolean;
  readonly revision: number;
}

export interface ClockRuntimeSnapshot {
  readonly states: readonly ClockState[];
}

export type ClockControl =
  | { kind: "run"; clockId: ClockId }
  | { kind: "pause"; clockId: ClockId }
  | { kind: "set-rate"; clockId: ClockId; rate: number }
  | { kind: "scrub"; clockId: ClockId; timeSeconds: number };
```

## 16.1 Deterministic graph resolution

The graph is built from enabled known clock definitions. Validation rejects duplicate IDs/keys, missing mandatory domains, dangling parent links and cycles.

Topological ordering uses original definition order as the stable tie-breaker.

## 16.2 Advancement

```ts
advance(deltaSeconds, conditions?) -> Result<ClockAdvanceResult, ClockError>
```

The caller supplies a finite non-negative scheduler interval. No wall clock is read.

Independent running clocks advance by `deltaSeconds * rate`. Paused independent clocks remain unchanged.

An active linked clock resolves after its parent:

```text
childTime = offsetSeconds + parentTime * rateMultiplier
```

The child's own runtime rate/running flag remains control metadata but does not override an active link. A conditional link is active only when `conditions[conditionKey] === true`; when inactive, the clock behaves independently.

All state replacements are immutable. Every changed state increments its own revision once. One `advance` call returns old/new times and changed IDs for the later Runtime Scheduler.

## 16.3 Controls

- `run`/`pause` affect independent or conditionally unlinked behavior;
- `set-rate` validates finite input;
- `scrub` sets an independent/root clock directly;
- scrubbing an actively linked child is rejected because its parent is authoritative;
- after a parent scrub, linked descendants are resolved in topological order;
- controls do not create Project commands or mutate persisted initial definitions.

## 16.4 Snapshot

Snapshot/restore is an immutable in-memory boundary for the later checkpoint service. It is not project serialization. Restore requires the exact same clock ID set and finite state values.

---

# 17. Validation and errors

Each package exports domain-specific issues with stable codes, severity and canonical paths. Validation never silently repairs scientific data.

Normal invalid user/project input returns typed results. Programmer-only literal helpers may throw. Error messages are developer-facing English strings; later UI localization maps stable codes.

Required validation includes:

- finite numeric values and policy bounds;
- vector/matrix/quaternion shape and singular cases;
- valid dimension exponents;
- compatible dimensions/semantic kinds;
- unit identity/symbol/alias collisions;
- parser syntax/unknown/ambiguous symbols;
- affine-unit expression misuse;
- uncertainty/precision constraints;
- reference-frame IDs, parents, cycles and provider availability;
- right-handed/normalized rotation configuration;
- educational-scale truthfulness;
- clock IDs, keys, mandatory domains, links, cycles and finite fields;
- snapshot ID and finite-state integrity.

---

# 18. Document/runtime boundary

- Quantities, vectors and coordinate configurations are JSON-safe value objects when placed inside registered document configuration/initial-state payloads.
- Unit registries, frame registries, parsed-unit caches, matrix working buffers and clock runtime state are runtime services and are not persisted.
- A document stores canonical initial values and registered configuration, never a frame-by-frame clock time.
- Clock control during playback never becomes undo history unless a later explicit command commits an initial configuration change.
- Educational visual scale is representation/configuration metadata and cannot alter physical values.

---

# 19. State-channel authority

Step 6 introduces no physical state writer.

- Mathematics and units are pure values/functions.
- Coordinate transforms derive views of values and do not own physical channels.
- Clock state owns time-domain runtime values only.
- Clocks do not write Entity/System physical state; the later Runtime Scheduler invokes the single authoritative physics owner for a resolved interval.
- Presentation clocks cannot overwrite simulation state.

---

# 20. Observables

Step 6 exposes data suitable for later observables but does not implement the observable registry.

Potential later observables include quantity canonical/display values, clock time/rate/running state and frame-transformed positions. They are read-only derived values.

---

# 21. Events

Step 6 emits no RuntimeEvents and does not implement event ordering.

Clock advancement returns deterministic change records. The later Runtime Scheduler/events packages may translate those records into scheduler work or events without changing clock semantics.

---

# 22. Serialization

Public value objects must be JSON-safe:

- finite numbers only;
- readonly plain objects/arrays;
- no class instances, Maps, Sets, typed arrays, functions or symbols in persisted payloads;
- unit/frame/type identities are strings;
- runtime registries/caches are excluded.

No ProjectDocument root/schemaVersion change is required. Step 5 opaque registered configuration envelopes already preserve quantity, coordinate and clock payloads.

Tests must place representative Step 6 payloads inside Component/Clock registered nodes and prove canonical Step 5 serialize/parse preservation.

No project migration is registered because V1 remains V1.

---

# 23. Extensibility and plugins

- UnitRegistry accepts namespaced custom unit definitions but rejects collisions.
- Custom units must resolve to an SI-compatible dimension/scale.
- ReferenceFrameRegistry accepts registered transform providers; unknown provider configuration remains preservable document JSON but cannot execute.
- Clock kind `custom` plus canonical keys supports registered subsystem clocks without root changes.
- Plugins do not inject parser grammar; they register symbols/aliases through the UnitRegistry.
- No plugin code executes in core-model or serialization.

---

# 24. Performance considerations

- numeric values are compact plain objects;
- matrix operations avoid hidden global caches and use local arrays;
- determinant/inverse algorithms are `O(n³)` and intended for small/medium teaching matrices;
- unit parsing may memoize successful immutable results inside a registry instance, invalidated on registration;
- frame-path resolution may cache paths per immutable graph instance;
- clock topological order is computed once per graph definition change;
- one clock advance is `O(number of clocks)`;
- no worker or GPU dependency is introduced.

Benchmark gates are not required for this foundation, but tests include 10,000 deterministic clock advances and representative extreme numeric ranges to catch pathological behavior.

---

# 25. Accessibility considerations

- canonical symbols are not the only user-facing identification; definitions include names for later localization;
- semantic dimensionless kinds let later UI announce angle/ratio meaning;
- quantity precision metadata enables stable screen-reader text later;
- educational scaling requires explicit not-to-scale warning metadata;
- examples include text descriptions and expected non-visual output;
- SVG previews use titles/descriptions and sufficient contrast;
- clock state is available as text data, not animation-only feedback.

No UI is implemented in this phase.

---

# 26. Physics Library requirements

Physics Library infrastructure does not yet exist, so Step 6 does not create hard-coded editor cards.

Machine-readable pending example/feature metadata must identify:

- units-and-dimensions;
- vector-operations;
- coordinate-spaces;
- two-clocks.

When LibraryRegistry exists, quantity/unit fields and coordinate/reference-frame configuration editors are registered through metadata-driven contracts. No curriculum-specific library item is added now.

---

# 27. Required examples

## 27.1 `examples/math/units-and-dimensions`

Executable fixture demonstrating:

- SI canonical storage;
- kilometre/metre and Celsius/kelvin conversion;
- force and energy dimension derivation;
- angle semantic kind;
- uncertainty propagation;
- canonical serialization of a Quantity payload.

Artifacts: package/entry source, metadata JSON, README, expected JSON, expected SVG preview and automated test.

## 27.2 `examples/math/vector-operations`

Executable fixture demonstrating Vec2/Vec3 addition, dot/cross product, normalization, quaternion rotation and matrix transform.

Same artifact set.

## 27.3 `examples/rendering/coordinate-spaces`

Non-rendered executable fixture demonstrating local → moving reference frame → physical world round-trip, 2D lift/project and educational-scale warning. It must be upgraded to a rendered example when renderer infrastructure exists.

Same artifact set plus machine-readable `pending-artifacts.json` recording the future real screenshot/video/project obligations.

## 27.4 `examples/time/two-clocks`

Executable fixture with independent simulation and presentation clocks. Simulation pauses while presentation advances, then a scrub is resolved deterministically. It does not pretend to run a projectile before runtime/physics exists.

Same artifact set plus `pending-artifacts.json` for future `.physica` runtime/gallery/video artifacts.

---

# 28. Test matrix

## 28.1 Numerics

- default/custom policy validation;
- finite-number rejection;
- absolute and relative approximate equality;
- atomic (`1e-30`) and astronomical (`1e30`) magnitude behavior.

## 28.2 Vectors

- Vec2/Vec3 arithmetic;
- dot/cross orientation using right-handed basis;
- magnitude/distance/interpolation;
- normalization and zero-vector failure;
- projection/rejection;
- angle clamping/edge cases;
- input deep-freeze/no mutation.

## 28.3 Complex/matrix/quaternion

- complex algebra and divide-by-zero;
- matrix shape failures;
- transpose/multiplication;
- determinants/inverse and singular failure;
- quaternion axis-angle rotation and inverse round-trip;
- quaternion/matrix rotation agreement.

## 28.4 Dimensions/units

- all seven base dimensions;
- derived dimension algebra;
- integer powers/roots and invalid root;
- dimensionless semantic-kind compatibility;
- built-in symbol resolution;
- all SI prefixes and longest-prefix behavior;
- parser multiplication/division/whitespace/exponents;
- syntax/unknown symbol/affine misuse failures;
- metre/kilometre, second/hour, gram/kilogram, degree/radian and Celsius/kelvin conversions;
- incompatible conversion rejection;
- duplicate registry identity/symbol/alias rejection.

## 28.5 Quantities

- canonical storage/display conversion;
- add/subtract compatibility;
- multiply/divide derived dimensions;
- semantic dimensionless rules;
- uncertainty propagation;
- precision validation;
- non-finite rejection;
- canonical JSON round-trip inside Step 5 payload.

## 28.6 Coordinates

- right-handed x×y=z;
- 2D lift/project;
- position versus direction translation behavior;
- stationary/translated/rotated/moving Galilean frames;
- explicit-time forward/inverse round-trip;
- multi-level common-ancestor transform;
- duplicate/missing/self/cyclic frame failures;
- unknown provider execution failure without payload loss;
- scale validation and not-to-scale enforcement.

## 28.7 Clocks

- mandatory simulation/presentation factory;
- unique IDs/keys and configuration parsing;
- missing mandatory domains;
- dangling/self/cyclic links;
- independent run/pause/rate;
- negative/zero rate behavior;
- linked affine time;
- conditional link active/inactive behavior;
- parent scrub propagation;
- linked-child scrub rejection;
- immutable input/state;
- snapshot/restore and mismatched snapshot rejection;
- deterministic 10,000-step repeat equality;
- render/display cadence independence proof;
- runtime state never enters ProjectDocument or command history;
- Step 5 canonical serialization of definitions only.

## 28.8 Examples/architecture

- four example expected-output tests;
- example metadata/README/preview coverage;
- package dependency architecture checks;
- no React/renderer/runtime-scheduler imports;
- full affected-package strict TypeScript and repository CI.

---

# 29. Self-review gates

## 29.1 Software architect

- public APIs are package-owned and cycle-free;
- no new package or root schema concept;
- runtime/document separation explicit;
- immutable results and typed failures;
- no hidden wall-clock dependency.

## 29.2 Physicist/scientific-computing reviewer

- canonical SI values and dimension algebra are correct;
- offset units cannot contaminate compound algebra;
- radians remain dimensionless but semantic;
- right-handed coordinate tests pass;
- Galilean transform signs and inverse are reference-tested;
- numerical tolerances are centralized;
- clock advancement is deterministic and refresh-independent.

## 29.3 Physics teacher

- unit conversion and uncertainty behavior are explainable;
- not-to-scale visual metadata is explicit;
- clock separation supports pause-the-physics/continue-the-explanation;
- examples do not claim physics that is not implemented.

## 29.4 UX/accessibility reviewer

- stable names/codes exist beyond symbols;
- semantic kinds and precision support meaningful announcements;
- examples have textual expected output and accessible previews;
- no essential result is animation-only.

Current-phase defects found in review must be corrected before checkpointing. Optional UI improvements remain out of scope.

---

# 30. Definition of Done

Step 6 is complete only when:

- this specification has passed the architecture audit;
- strict TypeScript passes for mathematics, units, clocks and examples;
- package architecture lint passes;
- all contracts in Sections 6–16 are exported through public package entry points;
- all public values are immutable and finite-number safe;
- dimensions, conversions and quantity arithmetic pass scientific reference tests;
- Vec/Matrix/Complex/Quaternion tests pass, including zero/singular cases;
- coordinate/reference-frame round trips and graph validation pass;
- mandatory named clocks, linking, pause/rate/scrub and snapshots pass deterministic tests;
- runtime state remains outside ProjectDocument and undo history;
- representative Step 6 document payloads round-trip through Step 5 serialization;
- all four examples and required metadata/README/expected previews/tests exist;
- pending richer example artifacts are machine-readable where infrastructure is unavailable;
- affected and aggregate repository suites pass;
- four-perspective self-review is recorded in `CURRENT_STATE.md`;
- a recoverable Git checkpoint is created where repository state permits;
- `CURRENT_STATE.md` records exact results and the next unfinished phase.

---

# 31. Explicit non-implementation boundary

Do not implement during Step 6:

- Runtime Scheduler;
- Checkpoint/Replay service;
- renderer camera or projection service;
- physics runtime/model algorithms;
- solver adapters;
- runtime events;
- animation engine;
- graph/equation/relationship/control/storyboard/audio behavior;
- Physics Library UI/registries;
- editor/viewer feature UI;
- PhysScript;
- curriculum packages;
- persistence ZIP packaging;
- Lorentz transforms;
- stable Physica 1.0 declarations.

Stop Step 6 when its Definition of Done is met, record the checkpoint, then continue autonomously to the Runtime Scheduler specification as the first unfinished next phase.
