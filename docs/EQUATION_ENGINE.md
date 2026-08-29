# Semantic Equation Engine

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns editable semantic mathematics, identity and valid equation transformations.

## Scope

Math input, expression trees, rendered fragments, token IDs, correspondence and validity status.

## Owned concepts

- EquationModel
- semantic token identity
- transform matcher/validator

## Dependencies

- `MATHEMATICS_AND_UNITS.md`
- `ANIMATION_ENGINE.md`

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

- separate semantics from glyphs
- allow teacher correspondence override
- track validity/equivalence status

## This subsystem MUST NOT

- crossfade screenshots as equation transformations
- claim unverified manipulation is valid

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- symbol matching
- valid/invalid transform cases
- visual regression

## Example Gallery obligations

- `v-u-at-rearrangement`
- `substitution`
- `cancel-and-simplify`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §15 -->
# 15. SEMANTIC EQUATION ENGINE

Equations have three layers:

1. editable input;
2. semantic expression tree;
3. rendered visual fragments.

A rendered equation is never the source of mathematical identity.

## 15.1 Semantic matching

Transform priority:

1. explicit persistent token ID;
2. symbolic identity;
3. structural identity;
4. canonical-expression match;
5. text/glyph fallback;
6. enter/exit animation.

## 15.2 Supported equation animations

- rearrange;
- substitute;
- cancel;
- factor;
- expand;
- collect;
- isolate variable;
- insert numerical values;
- replace units;
- dimensional analysis;
- vector decomposition;
- matrix/complex extension;
- equation-to-graph highlighting.

## 15.3 Teacher workflow

The teacher enters multiple equation states and presses **Animate derivation**.

Physica proposes correspondences.

The teacher can visually override correspondence by selecting source and destination terms.

## 15.4 Stable identity and mathematical validity

Semantic node IDs are Physica identities and are not regenerated merely because a renderer or canonicalizer reformats an expression.

Equation transforms store:

```text
sourceExpression
targetExpression
tokenCorrespondence
equivalenceStatus
verificationMethod
```

`equivalenceStatus` may be:

- `VERIFIED_EQUIVALENT`;
- `VERIFIED_SUBSTITUTION`;
- `TEACHER_DECLARED`;
- `UNVERIFIED_PRESENTATION`.

Where the symbolic engine can verify an algebraic transformation safely, Physica performs the check.

The animation engine never implies mathematical equivalence solely because two expressions were visually transformed.

Custom notation/macros are isolated from semantic identity; unsupported semantics remain renderable but may lose automatic algebra verification.

---

