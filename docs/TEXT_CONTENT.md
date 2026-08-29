# Text Content and Teaching Explanations

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns semantic normal text used for definitions and explanations.

## Scope

TextBlock roles, structured spans, dynamic observable spans, text layout semantics and text-specific example requirements.

## Owned concepts

- TextBlock
- text roles
- structured text spans

## Dependencies

- `PROJECT_MODEL.md`
- `TYPOGRAPHY_AND_I18N.md`
- `ANIMATION_ENGINE.md`
- `EQUATION_ENGINE.md`

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

- keep inline equations semantic
- support definitions/body/captions/callouts/lists
- support RTL-safe animation segmentation

## This subsystem MUST NOT

- rasterize teaching text as the canonical representation
- let text own physical state

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- serialization
- RTL segmentation
- dynamic binding

## Example Gallery obligations

- `text-definition-reveal`
- `text-bullets-stagger`
- `text-highlight-and-dim`
- `text-matched-replacement`
- `text-dynamic-observable`
- `text-rtl-reveal`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

# Text content clarification — first-class teaching text

This specification closes a presentation-content gap discovered during Step 2. It does **not** change the root Project/Scene architecture because `Representation` is already registry-driven and extensible.

## TextBlock representation

Normal teaching text is a first-class `Representation` named `TextBlock`.

A `TextBlock` contains semantic content rather than flattened glyphs.

```text
TextBlock
├─ id
├─ role
├─ blocks[]
├─ styleRef
├─ layout
├─ localization
├─ accessibility
├─ bindings[]
└─ animationHints
```

Supported semantic roles include:

- `Heading`
- `Body`
- `Definition`
- `Explanation`
- `Caption`
- `Callout`
- `Quote`
- `BulletList`
- `NumberedList`
- `ExaminerNote`
- `WarningText`
- `LabelGroup`

A block may contain inline spans:

- plain text;
- emphasis / strong emphasis;
- inline equation reference;
- variable/observable value span;
- unit-aware dynamic value;
- glossary/definition term;
- non-breaking scientific token.

Inline mathematics is owned by the Equation Engine and embedded by reference rather than converted to ordinary text.

## Text animations

The Animation Engine supports text-specific operations:

- appear / disappear;
- fade;
- reveal by block;
- reveal by paragraph;
- reveal by line;
- reveal by word;
- reveal by semantic span;
- reveal by grapheme cluster;
- bullet-by-bullet stagger;
- highlight text range;
- underline / box emphasis;
- dim non-selected text;
- change emphasis/weight;
- replace text;
- matched-text transform;
- definition term → definition reveal;
- callout enter/exit;
- dynamic-value update transition.

Text animation MUST NOT split strings by UTF-16 code units. Grapheme segmentation and locale-aware word/line segmentation are required so Arabic, accented characters and other scripts animate correctly.

## Layout and accessibility

Text uses the deterministic typography system, supports RTL layout, wrapping, maximum width, line spacing and semantic reading order. Reduced-motion mode resolves animations to their final readable state. Presentation text must remain selectable/accessibility-readable in interactive output when technically possible.

## Physics relationship

Text is not a physics model. Static explanations are document content. Dynamic numeric/text spans may subscribe to observables through Relationships, but they do not become alternate state authorities.

## Library entries

The Physics Library exposes presets for:

- Text Block;
- Definition;
- Explanation;
- Caption;
- Callout;
- Quote;
- Bullet List;
- Examiner Note;
- Warning.

These are presets of the canonical `TextBlock`, not unrelated implementations.

## Example obligations

Mandatory foundation examples:

- `text-definition-reveal`
- `text-bullets-stagger`
- `text-highlight-and-dim`
- `text-matched-replacement`
- `text-dynamic-observable`
- `text-rtl-reveal`


## ADR-032 — Teaching text is a first-class semantic Representation

**Decision**

Definitions, explanatory paragraphs, captions, callouts, quotations and lists are represented by the canonical registry type `TextBlock` with semantic roles and structured spans. Text-specific animation operates on semantic/layout units, with locale-aware grapheme segmentation.

**Reason**

Physica is a presentation authoring tool, not only a simulator. Physics explanations frequently require ordinary text, and treating that content as unstructured labels would weaken layout, animation, accessibility, localisation and export.

**Consequences**

- no root schema change is needed because `Representation` is extensible;
- the renderer, animation engine, typography/i18n layer, accessibility layer and Physics Library implement the shared `TextBlock` contract;
- inline equations remain Equation Engine objects referenced from text;
- dynamic text may observe physical observables but never owns physical state.

**Alternatives rejected**

- generic SVG text nodes only;
- one representation type per text role;
- rasterized text;
- English-only character animation.
