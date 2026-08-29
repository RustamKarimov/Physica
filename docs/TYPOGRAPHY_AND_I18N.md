# Typography and Internationalisation

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns deterministic fonts, text shaping/layout infrastructure, locale and RTL behavior.

## Scope

Bundled redistributable fonts, fallback policy, locale formatting, bidi/RTL and segmentation services.

## Owned concepts

- TypographyService
- LocaleService
- TextSegmentationService

## Dependencies

- `LICENSING.md`
- `ACCESSIBILITY.md`

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

- use redistributable pinned fonts
- support RTL from layout layer
- locale-aware grapheme/word segmentation

## This subsystem MUST NOT

- depend on arbitrary host fonts for deterministic export

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- cross-platform text snapshot
- Arabic RTL layout
- number/unit locale formatting

## Example Gallery obligations

- `typography-deterministic`
- `rtl-text`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Text segmentation service

Text animations and selection use locale-aware grapheme/word/line segmentation. The contract must not assume whitespace-delimited languages or UTF-16 code-unit characters. BiDi/RTL shaping and deterministic layout occur before animation geometry is resolved.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §27A.4–27A.5 -->
## 27A.4 Deterministic typography

Physica bundles approved redistributable UI/scientific fonts or uses renderer-owned bundled math fonts.

Saved projects refer to semantic typography tokens plus optional packaged user fonts/assets.

Visual regression and deterministic export cannot depend on arbitrary host font substitution.

## 27A.5 Text and localization

Text content is Unicode.

UI/localized strings are separate from physics identifiers.

Diagram labels may specify language/direction, while physical quantity identifiers remain canonical.

<!-- Source: Master §21.2 -->
## 21.2 Internationalisation and locale

UI text, curriculum terminology and Library descriptions use message keys rather than hard-coded English strings.

Canonical project numbers use locale-independent storage.

Display formatting supports locale decimal/group separators without changing numeric values.

Right-to-left UI and bidirectional text are supported at the design-system level.

Equation semantics remain language-independent.

---

