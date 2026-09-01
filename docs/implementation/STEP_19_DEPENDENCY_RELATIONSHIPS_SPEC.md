# Step 19 — Dependency Relationships Implementation Specification

**Status:** IMPLEMENTATION-READY

**Owning roadmap item:** Phase 5, Step 5.1 — Dependency relationship engine

**Primary owner:** `@physica/relationships`

## 1. Purpose and source audit

Step 19 adds deterministic attach, follow, bind, offset, tangent, normal and derived-property relationships. The design was audited against the Constitution, ADR-014, Dynamic Relationship Engine, Runtime State, Mathematics and Units, Coordinates and Frames, Runtime Scheduler, package dependencies and the generic `RelationshipDefinition` project envelope.

No Architecture Blocker, ADR, root schema change, third-party dependency or authoritative physics writer is required. Relationships are reactive derived state. They never replace a simultaneous constraint solver and cannot write an authoritative physical channel.

## 2. Persisted contract

The V1 envelope type is `physica:relationship/dependency-v1`. Its JSON-safe configuration contains one tagged operation, ordered typed inputs and a derived target descriptor. Inputs reference either an external observable key or another relationship output. Supported values are finite scalar, boolean, text, `vec2`, `vec3`, and a finite ordered 2D curve.

Targets are limited to derived, representation, presentation or layout properties. Physical-authority targets are rejected. Unknown generic relationship envelopes remain preserved by the core model.

## 3. Compilation and evaluation

Compilation validates identifiers, values, operation arity/type, missing references and duplicate identities, then performs a deterministic topological sort. Cycles are rejected with the stable set of involved IDs. Evaluation uses that order and an injected read-only external-value resolver.

Attach and follow resolve a source position plus optional offset. Bind passes a value through. Offset applies finite scalar/vector offsets. Tangent and normal evaluate the declared piecewise-linear curve at a finite parameter, use centered adjacent samples at an exact interior point, one-sided endpoint behavior, and reject a curve with no distinct points. Normal is the left-hand perpendicular of the normalized tangent. Derived operators are a closed V1 set: add, subtract, scale, magnitude and component extraction.

## 4. Dirty propagation and scheduler integration

`RelationshipStateStore` owns derived relationship outputs and input fingerprints. A changed external input marks only its direct and transitive dependants dirty; unchanged branches retain their prior immutable values. A relationship runtime task executes only in `physica:scheduler/relationships`, after observables and before acquisition. It reads through injected sources and publishes only to the relationship store.

The task does not mutate the project document, Runtime State Store, clocks, physics state or presentation state. Consumers explicitly read relationship results.

## 5. Units, coordinates and errors

Values may carry an optional unit expression. Arithmetic requires compatible kinds and, where both operands specify units, exact canonical unit identity in this initial contract. Curve points and parameters are world/model values; screen-layout coordinates are not accepted. Failures are typed and stable: malformed definition, invalid value, missing input, type mismatch, cycle, singular curve and forbidden authority.

## 6. Test and example requirements

Targeted tests cover all seven operations, deterministic ordering, cycle/missing-reference rejection, tangent/normal endpoints and singular curves, dirty propagation, deep freezing, repeated evaluation and absence of document/runtime/physics writes.

The required `examples/relationships/tangent-follower` artifact ships metadata, README, deterministic executable output, exact expected JSON, accessible expected SVG preview, automated test and truthful pending binary-media obligations. The desktop proof must use the real relationship evaluator.

## 7. Definition of Done

Step 19 is complete when the envelope, compiler, evaluator, store and scheduler task are exported; the example and tests pass; relationship authority boundaries are demonstrated; and operational state records exact evidence. This step does not claim simultaneous constraints, smoothing dynamics, arbitrary user code or solver ownership.
