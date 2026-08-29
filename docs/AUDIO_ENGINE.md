# Audio Engine

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins.

## Purpose

Owns sound as a synchronized physics/presentation representation rather than an incidental browser effect.

## Scope

Oscillator tones, sampled audio, stereo level, waveform-to-audio, beats, Doppler extension, amplitude/frequency binding, offline deterministic rendering and clock synchronization.

## Owned concepts

- `AudioRepresentation`
- `AudioSignal`
- audio rendering adapter
- offline audio render
- audio clock/output synchronization

## Dependencies

- `CLOCKS_AND_TIME.md`
- `GRAPH_AND_DATA_ENGINE.md`
- `PHYSICS_RUNTIME.md`
- `EXPORT.md`

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

## Invariants / required behavior

- audio reads model/data observables; it does not become alternate physics state;
- generated audio follows an explicit clock domain;
- deterministic video export uses offline audio rendering where possible;
- reduced-motion does not disable required scientific audio content, though accessibility alternatives must exist.

## This subsystem MUST NOT

- calculate domain physics locally when the physics model already exposes the required observable;
- depend on realtime playback timing for deterministic export;
- make audio mandatory for understanding a concept without a visual/text alternative where accessibility requires one.

## Serialization

Persist AudioRepresentation definitions, signal bindings, source asset references, gain/pan settings and clock binding. Runtime audio nodes are never serialized.

## Testing obligations

- frequency/amplitude binding;
- clock pause/resume/scrub policy;
- offline output duration/sample-rate;
- deterministic generated tone reference;
- video/audio synchronization smoke test.

## Example obligations

- `tone-frequency-binding`
- `beats-audio`
- `waveform-to-audio`
- `doppler-audio-extension` when that physics module exists.

## Definition of Done

Public contracts, serialization, tests and required examples are complete, and export can consume audio without owning its physics.

## Normative source material

# 18. AUDIO ENGINE

Physics education includes sound.

Physica therefore includes an Audio Representation layer.

Capabilities:

- oscillator/tone;
- sampled audio;
- stereo level;
- amplitude/frequency binding;
- beats;
- Doppler audio extension;
- waveform-to-audio;
- audio synchronized to simulation/presentation clocks.

Audio is generated through Web Audio / offline rendering.

Exported video may include the generated audio track.

---

