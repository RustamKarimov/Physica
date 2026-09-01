# Step 22 — Storyboard Orchestration Implementation Specification

**Status:** IMPLEMENTATION-READY

**Owning roadmap item:** Phase 5, Step 5.4 — Storyboard

**Primary owner:** `@physica/storyboard`

## 1. Purpose and source audit

Step 22 adds teacher-authored lesson orchestration around the existing animation, reveal, morph and camera step families. It was audited against the Constitution, Storyboard and Presentation System, Project Model, Commands and Events, Runtime Scheduler, Clocks and Time, Animation Engine and existing `PresentationFlow`.

Storyboard does not become a solver or clock. It emits deterministic directives to owning systems at the storyboard scheduler phase. Presentation animation remains a later independent phase, so a paused simulation may still present an explanation.

## 2. Persisted lesson-step contract

The V1 envelope type is `physica:storyboard/lesson-step-v1`. A lesson step contains a stable ID/name, ordered actions and one advance rule. Actions are presentation-property actions, simulation commands (`play`, `pause`, `reset`, `seek`), teacher notes, camera cues or presentation-flow triggers. Advance rules are manual, finite presentation-duration wait, observable condition, or interaction pause.

Conditions compare an injected read-only scalar/boolean/text value using a closed operator set. Interaction pauses require an explicit interaction key. All payloads are JSON-safe and namespaced; arbitrary code and HTML are rejected.

## 3. Compilation and runtime

Compilation validates enabled lesson envelopes, duplicate IDs, action fields, advance rules and referenced transition triggers, preserving declared order. `StoryboardStateStore` owns transient current-step/status/directive history and explicit interaction resumptions. It never mutates the persisted storyboard.

Entering a step emits its actions exactly once. Manual steps advance only by an explicit request. Duration waits use the presentation clock state. Conditions are evaluated once per scheduler cycle against injected values. Interaction pauses advance only after their exact key is resumed. Completion is stable and emits no repeated actions.

`createStoryboardTask()` runs only in `physica:scheduler/storyboard`. It publishes immutable directives for simulation, presentation, camera, notes and flow. Owning application/scheduler adapters consume them; the task has no Runtime State Store writer identity.

## 4. Presentation flow and accessibility

Flow directives use the existing project-level `PresentationFlow` transitions and trigger vocabulary. Resolution selects a matching transition by priority then stable transition ID. Notes and interaction pauses include teacher/audience-readable text. Manual and paused states expose deterministic keyboard-operable continuation commands in the launcher.

## 5. Test and example requirements

Tests cover envelope round trips, all actions and advance rules, entry-once behavior, duration/condition/interaction advancement, explicit simulation directives, simultaneous simulation pause plus presentation directive, completion stability, flow priority, scheduler phase, immutability and no project/runtime/physics mutation.

Required examples are `examples/storyboard/projectile-explanation` and `examples/storyboard/multi-scene-presentation`, each with full metadata, README, deterministic executable output, exact JSON, accessible SVG preview, automated test and truthful pending binary/media obligations. Projectile data is a deterministic observable fixture, not a claim that Phase 6 physics already exists.

## 6. Definition of Done and Phase 5 gate

Step 22 and Phase 5 are complete when all four Phase 5 specifications are implemented together, all six examples and launcher proofs use real package APIs, targeted/full/frozen-install/launcher gates pass, a phase-level self-review finds no unowned authority or integration regression, and `CURRENT_STATE.md` records exact evidence and the next roadmap item.

This step does not implement authoring UI, media timelines, collaboration, conditional scripting, Phase 6 mechanics or final visual polish.
