# Accessibility

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns keyboard, reduced-motion, color, math and semantic reading requirements.

## Scope

Editor, presentation, web viewer, text/equations/diagrams and controls.

## Owned concepts

- accessibility requirements
- reduced-motion behavior

## Dependencies

- `TEXT_CONTENT.md`
- `TYPOGRAPHY_AND_I18N.md`
- `CONTROLS.md`

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

- keyboard navigation
- color-independent encoding
- readable final state under reduced motion
- MathML where supported

## This subsystem MUST NOT

- make hover the only access path
- hide meaning in color only

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- keyboard E2E
- contrast
- reduced motion
- screen-reader smoke

## Example Gallery obligations

- `reduced-motion-presentation`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Teaching text

`TextBlock` keeps semantic roles and reading order. Animated text always has a final complete readable state; reduced-motion mode may skip staged reveal while preserving content.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §24 -->
# 24. ACCESSIBILITY

Required:

- keyboard-navigable editor controls;
- high-contrast support;
- color-blind-safe semantic modes;
- text alternatives for diagrams where practical;
- MathML accessibility through equation renderer;
- reduced-motion presentation option;
- line/style alternatives to color-only encoding;
- minimum interactive target sizes.

Reduced-motion affects presentation animation, not the correctness of physics state.

---

