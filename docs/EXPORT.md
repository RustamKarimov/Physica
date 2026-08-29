# Playback and Export

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Owns presentation playback and deterministic export formats.

## Scope

Fullscreen presentation, static web viewer, SVG/PNG, video/audio, CSV/JSON and data/image exports.

## Owned concepts

- export presets
- fixed-frame video timeline
- web bundle

## Dependencies

- `RENDERER_ARCHITECTURE.md`
- `ANIMATION_ENGINE.md`
- `AUDIO_ENGINE.md`
- `SERIALIZATION.md`

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

- render video from deterministic timestamps
- bundle only required runtime/assets
- preserve warnings/metadata where required

## This subsystem MUST NOT

- screen-record realtime playback as canonical export

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- cross-platform deterministic frames
- self-contained web bundle

## Example Gallery obligations

- `export-smoke`

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §23 -->
# 23. EXPORT AND PLAYBACK

## 23.1 Presentation

Full-screen teacher playback:

- next/previous storyboard step;
- play/pause simulation;
- reset;
- live controls;
- presenter notes optional.

## 23.2 Interactive web export

A self-contained static web bundle containing only required runtime/modules/assets.

## 23.3 Still export

- SVG when representation remains vector;
- PNG at selectable resolution;
- PDF later through print/export pipeline.

## 23.4 Deterministic video export

Frame timestamps are calculated from the project timeline.

The exporter does not screen-record real-time playback.

Primary video target:

- WebM VP9 + Opus

A desktop encoding adapter may additionally produce MP4 where an approved platform encoder is available.

Video rendering uses offline deterministic frame evaluation, not realtime screen capture.

Fonts, assets, PRNG state, solver/checkpoint policy and project/plugin versions are fixed for the render job.

The first guaranteed codec/container target is WebM through the approved encoder adapter; additional formats are capabilities, not assumptions of the core project model.

## 23.5 Data export

- CSV;
- JSON;
- image/spectrum data where applicable.

---

