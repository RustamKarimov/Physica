# Presentation Animation Engine

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns Manim-like presentation animation independent of physics simulation.

## Scope

Animation contract, channels, composition, transforms, camera actions, scrubbing and text animation behavior.

## Owned concepts

- Animation
- Sequence/Parallel/Stagger
- presentation transform channels

## Dependencies

- `CLOCKS_AND_TIME.md`
- `PROJECT_MODEL.md`
- `TEXT_CONTENT.md`

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

- use presentation time domain
- keep transform stack separated
- resolve channel conflicts deterministically

## This subsystem MUST NOT

- modify authoritative physical state unless through explicit physics command
- use visual-only reverse as physics rewind

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- scrub/reverse/serialization
- channel conflict policy

## Example Gallery obligations

- `move-scale-rotate`
- `draw-vector`
- `circle-to-ellipse`
- `camera-follow`
- `text-definition-reveal`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.


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

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §14 -->
# 14. PRESENTATION ANIMATION ENGINE

Presentation animation is independent of physical evolution.

## 14.1 Core animation contract

```text
Animation
├─ id
├─ target
├─ clockDomain
├─ duration
├─ easing
├─ startState
├─ endState
├─ reversible
├─ scrubbable
└─ serializationPayload
```

## 14.2 Animation families

The architecture supports:

- appear/disappear;
- fade;
- write/draw/erase;
- grow/shrink;
- translate;
- rotate;
- scale;
- reflect;
- stretch;
- path morph;
- object replacement;
- matched transform;
- camera pan/zoom/follow;
- highlight/dim/isolate;
- stagger;
- parallel;
- sequence;
- delayed actions;
- path-follow;
- reveal masks;
- graph drawing;
- field reveal;
- particle/event emphasis;
- detector acquisition;
- multi-scale zoom.

## 14.3 Composition

```text
Sequence
Parallel
Stagger
Wait
Until
RepeatPresentation
```

No physics loop is implemented as a presentation repeat.

## 14.4 Transform/property stack

A representation resolves its visible state through ordered layers:

```text
physical/world transform
→ relationship-derived transform
→ representation/layout transform
→ presentation-animation transform
→ camera transform
```

Presentation animation normally modifies the presentation layer only.

It cannot silently change physical position, velocity, charge, temperature or another physics state variable.

## 14.5 Animation channel conflicts

Animations target typed channels.

If overlapping animations target the same channel, the scheduler applies an explicit policy:

- sequence;
- replace;
- additive;
- multiplicative;
- reject conflict.

There is no accidental "last callback wins" behavior.

Advanced keyframes may exist as an editor representation of the same Animation contract, but manual keyframing is never required for ordinary teaching.

---

