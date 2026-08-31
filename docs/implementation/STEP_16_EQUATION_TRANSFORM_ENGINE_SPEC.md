# Step 16 — Equation Transform Engine Implementation Specification

**Status:** IMPLEMENTATION-READY

**Owning roadmap item:** Phase 4, Step 4.2 — Equation transform engine

**Primary owner:** `@physica/equations`

## 1. Purpose and source audit

Step 16 turns two semantic `EquationModelV1` snapshots into one honest, deterministic presentation transition. It proposes node correspondence by semantic evidence, accepts explicit teacher overrides, verifies only algebra that the pinned symbolic engine can establish, and evaluates FLIP-style matched motion plus explicit enter/exit fragments.

The design was audited against the Project Constitution, approved ADRs, package dependencies, Equation Engine, Mathematics and Units, Animation Engine, text/typography boundaries, the Step 15 equation model and the earlier matched-transform contract. It requires no Architecture Blocker, ADR, root `ProjectDocument` schema change, workspace package, third-party dependency, clock, solver or physical-state channel.

## 2. Scope and ownership

`@physica/equations` owns:

- one serializable V1 equation-transform definition;
- deterministic semantic-node matching and teacher correspondence overrides;
- conservative automatic equivalence and declared-substitution verification;
- typed validation suitable for teacher-facing diagnostics;
- renderer-neutral fragment layout plans and arbitrary-progress motion evaluation;
- the `v-u-at-rearrangement`, `substitution` and `cancel-and-simplify` examples;
- a launcher-visible, presentation-grade desktop proof.

Step 16 does not implement multi-step derivation authoring, an equation timeline, automatic equation solving, proof certificates, domain/assumption inference, unit checking, custom macro semantics, graphing, variable binding, document text embedding, formula-to-graph animation or export capture. Those remain later roadmap work.

## 3. Persisted transform contract

An equation transform uses the existing `EquationDefinition` envelope with type ID `physica:equation/transform-v1` and schema version 1. The envelope ID uses the existing `EquationId` document identity because the root schema already stores registered equation definitions by that identity.

`EquationTransformV1` stores only document/configuration data:

- stable transform `id` and non-empty `name`;
- complete source and target `EquationModelV1` snapshots;
- a deterministic `tokenCorrespondence` list;
- one frozen `equivalenceStatus`;
- a structured `verificationMethod` and teacher-readable explanation;
- optional finite JSON metadata.

The allowed status values are exactly those frozen by the Equation Engine:

- `VERIFIED_EQUIVALENT`;
- `VERIFIED_SUBSTITUTION`;
- `TEACHER_DECLARED`;
- `UNVERIFIED_PRESENTATION`.

Compiled match indexes, rendered markup, layout boxes, inverse transforms, evaluated frames, browser elements, timers and symbolic-engine instances are runtime-only and never serialized.

The transform serializer embeds source and target models through the same validated JSON shape as `physica:equation/model-v1`. Parsing rejects malformed/duplicate IDs, missing correspondence endpoints, duplicate source or target claims, a mismatch between the stored verification result and its method, non-JSON metadata and unsupported type/schema versions. The existing model parser continues to reject transform envelopes; callers select the parser for the registered type they own.

## 4. Semantic matching and overrides

Every semantic node is indexed with its stable node ID, traversal path, parent/operator context, kind, fingerprint and canonical value. Matching is deterministic and consumes every source and target node at most once.

Teacher overrides are validated and applied first because they are explicit author intent. An override names one existing source node ID and one existing target node ID. Duplicate source or target claims, missing endpoints and self-contradictory overrides are typed errors. An override controls presentation correspondence only and never changes validity status.

Remaining nodes are proposed in the frozen priority order:

1. equal persistent semantic node ID;
2. equal symbolic atom identity;
3. equal structural role under already-related parent/context;
4. equal canonical-expression fingerprint;
5. optional equal non-empty glyph hint supplied by the renderer;
6. unmatched source/target nodes become explicit exits/entries.

Ambiguous candidates are consumed in stable semantic traversal order with lexical ID tie-breaking. Each correspondence records its method and whether it was proposed or teacher-overridden. Glyph fallback is a low-confidence presentation aid only: glyphs never become mathematical identity and never affect verification.

The resulting immutable match plan contains matched pairs, source-only exits and target-only entries. No array-position-only, geometry-proximity or renderer-handle matching is permitted.

## 5. Mathematical validity

Verification is separate from visual matching. All automatic verification uses the already-pinned `@cortex-js/compute-engine` 0.120.0 canonical model; no local algebra implementation or tolerance policy is invented.

For an automatic equivalence request:

- ordinary expressions are simplified and accepted only when `isEqual()` returns `true`;
- equations of the form `lhs = rhs` are converted to simplified residuals `lhs - rhs` and accepted only when the residuals return `true` from `isEqual()`;
- `false` or `undefined` never becomes a validity claim; the result is `UNVERIFIED_PRESENTATION` with an explanation.

Residual comparison intentionally proves a conservative subset. It can verify `v=u+at` to `v-u=at`, but it does not infer domain assumptions for division, cancellation by an unknown expression or transformations that merely share sampled solutions.

For a substitution request, the author supplies a non-empty JSON-safe symbol map. Physica validates the symbols and values, applies Compute Engine `subs()` to the source, simplifies the result and assigns `VERIFIED_SUBSTITUTION` only when it equals the target. A failed or unsupported check remains `UNVERIFIED_PRESENTATION`.

`TEACHER_DECLARED` requires an explicit non-empty teacher statement. `UNVERIFIED_PRESENTATION` requires a non-empty reason. Neither is presented as symbolic proof. Unsupported/custom semantics remain renderable and matchable but unverified.

Verification results include a stable method identifier, pinned engine stamp and explanation. They do not store mutable Compute Engine state or a fabricated proof certificate.

## 6. FLIP, motion and enter/exit planning

The renderer supplies immutable source and target fragment layouts keyed by semantic node ID. A layout box contains finite top-left `x`/`y` and positive `width`/`height` in one declared presentation coordinate space. Duplicate IDs, unknown IDs, invalid boxes and mixed coordinate spaces are typed errors.

`createEquationMotionPlan()` joins validated layouts through the transform correspondence. It produces:

- matched destination fragments with First/Last inverse translation and scale;
- source-only exit fragments;
- target-only entry fragments;
- correspondence method and validity status for accessible diagnostics.

`evaluateEquationMotion(plan, progress, options)` is a pure function of explicit normalized progress. It uses deterministic smoothstep easing:

- matched fragments interpolate inverse translation/scale to the target identity transform;
- exits fade and gently scale down;
- entries fade and gently scale up;
- progress 0 and 1 resolve exactly to source and target presentation states;
- reduced motion resolves immediately to the final readable target;
- equal inputs always produce deeply equal, deeply frozen frames.

No timer, requestAnimationFrame, wall clock or DOM access exists in `@physica/equations`. A host preview may drive progress from the existing presentation clock or an interactive scrubber. This engine neither advances a clock nor writes ProjectDocument, runtime simulation or physical state.

## 7. Validation and error policy

Public operations return `EquationResult<T>` with stable error kinds for invalid transform definitions, unsupported envelopes, invalid verification requests, invalid substitutions, missing/duplicate correspondence endpoints, malformed overrides, invalid fragment layouts and invalid progress.

Teacher-authored data follows typed result paths. Throws are limited to application setup after validated built-in constants. Inputs are never mutated; successful models, transforms, plans and frames are deeply frozen.

## 8. Determinism, performance, accessibility and security

Matching uses bounded indexes and deterministic queues; normal behavior is linear in semantic-node count plus lexical ordering. Verification is bounded to one source/target check or one declared substitution check. Step 16 adds no evaluator loop, network access, dynamic code, trusted HTML path or dependency.

The desktop proof exposes play/replay and scrub controls, correspondence/status text, visible focus, readable source/target equations and a reduced-motion final state. Meaning is not communicated by motion or color alone. KaTeX remains configured with trust disabled. The proof uses semantic fragments rather than screenshots.

The launcher proof must derive every motion box from the fragments actually rendered in the transform stage. Hand-authored or index-derived placeholder coordinates are not acceptable release-gate evidence. Its visual partition must reconstruct the complete source at progress 0 and the complete target at progress 1 without missing operators, duplicate glyphs or unrelated atom cards. A compound term may remain grouped when atom-by-atom motion would imply a false derivation step. Presentation review must scrub the endpoints and intermediate states for all required examples and reject geometrically or mathematically misleading trajectories.

## 9. Test matrix

Targeted tests cover:

- matching by persistent ID, symbolic identity, structural context and canonical fingerprint;
- deterministic duplicate handling and input immutability;
- teacher overrides, missing endpoints and duplicate claims;
- matched, entering and exiting fragments plus optional glyph fallback;
- verified rearrangement, verified substitution and verified simplification;
- invalid/unsupported algebra remaining explicitly unverified;
- teacher-declared and presentation-only status semantics;
- V1 transform envelope creation, parsing, canonical round-trip and malformed data;
- exact FLIP endpoints, midpoint, enter/exit opacity, reduced motion and repeated scrubbing;
- invalid/non-finite layout/progress and mixed coordinate-space rejection;
- no document or physics-state mutation.

## 10. Example Gallery and release gate

The required examples are:

- `examples/equations/v-u-at-rearrangement` — verifies `v=u+at` → `v-u=at` by simplified residual equality and shows matched/reordered/enter/exit terms;
- `examples/equations/substitution` — verifies declared numerical substitution into a kinematics equation and shows symbol-to-value replacement;
- `examples/equations/cancel-and-simplify` — verifies `x+(y-y)` → `x` and shows the cancelled pair leaving while the retained subject remains matched.

Each ships metadata, README, executable deterministic output, expected JSON, accessible expected SVG preview, automated example test and truthful pending shared-runtime/capture obligations.

The desktop advances to “16 / Equation Transform”. It presents all three transforms, shows verification status and correspondence provenance, provides replay/scrub/reduced-motion behavior, and retains the Step 15 editor proof plus all earlier proofs below it. The gallery proof must be presentation-grade before progression. `Launch Physica.bat` remains the one-click development launcher; no installer or executable packaging is added.

## 11. Definition of Done and non-claims

Step 16 is complete when the public transform, persistence, matching, verification and motion contracts are exported; targeted tests cover the matrix above; all three gallery examples have every currently achievable artifact; the desktop proof is presentation-grade and launcher-visible; targeted suites, architecture checks, complete CI, all app builds, frozen install and launcher check pass; and `docs/CURRENT_STATE.md` records Step 4.2 complete with Step 4.3 graph engine next.

Completion is not automatic equation solving, a formal proof system, domain-assumption inference, a derivation editor, graphing, formula animation scheduling, variable binding, unit algebra or export capture. HC-02 remains scheduled after Phase 4 Step 4.4 unless an early trigger occurs.
