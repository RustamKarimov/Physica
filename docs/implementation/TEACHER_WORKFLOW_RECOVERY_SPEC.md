# Teacher Workflow Recovery — Minimum Usable Authoring Slice

**Status:** Approved corrective implementation specification

## Problem

The Phase 7 authoring shell and Phase 8–12 subject Alphas prove document,
scientific and registry infrastructure, but they do not yet prove the primary
product promise: a teacher can create a multi-scene lesson and present it.
Subject observatories must therefore stop being the default measure of visible
progress.

## Outcome

The development launcher opens a teacher-first workflow in which a teacher can:

1. start a blank or starter lesson;
2. add, select, rename, reorder and remove scenes;
3. add real Physics Library objects to the selected scene;
4. position objects using persisted presentation layout;
5. edit an object's name and initial model values;
6. edit scene title, teaching objective, speaker notes and duration;
7. preview the ordered scenes in a separate presentation/player surface;
8. download a schema-validated JSON snapshot and reopen it without losing
   scene order, authored metadata, object layout or physical initial state.

This is an early teacher acceptance checkpoint. It is not the final package,
renderer, animation, audio or export implementation.

## Architecture

- ProjectDocument, SceneDefinition, PresentationFlow,
  EntityDefinition.visualDefaults and component initial state remain the
  persistent authorities.
- Every edit is dispatched through the existing ProjectStore; new scene and
  entity presentation commands are undoable and validated.
- Physical initial state remains separate from presentation layout.
- Preview reads the persisted document and never writes physical state.
- Reopen uses @physica/serialization; no parallel editor-only project format
  is introduced.
- Physics Library instantiation remains metadata-driven.
- No root schema version, ADR, solver, clock or third-party dependency changes.

## User interface

- The app defaults to the Author route.
- The authoring workspace exposes a lesson outline, Library, stage, inspector,
  timeline and Preview Lesson action.
- The preview exposes previous/next scene navigation, scene progress, teacher
  notes and a clean learner-facing canvas.
- Subject Alphas remain available under a secondary Demos area for engineering
  inspection.

## Persistence rules

- Scene teaching fields use namespaced scene metadata keys:
  physica:lesson/objective, physica:lesson/notes and
  physica:lesson/durationSeconds.
- Entity stage layout uses visualDefaults.x and visualDefaults.y in logical
  stage pixels.
- JSON download is labelled honestly as a development snapshot. ZIP-based
  atomic .physica packaging remains Phase 20 work.
- Invalid or unsupported files show a teacher-readable error and do not replace
  the current project.

## Acceptance

- Command inverse tests restore exact documents for scene and entity
  presentation edits.
- Desktop typecheck/build passes.
- An automated workflow covers blank lesson to two scenes to object placement
  to metadata edit to serialization round trip to preview order.
- The launcher check passes.
- docs/CURRENT_STATE.md records this corrective checkpoint and any remaining
  limitations before curriculum progression resumes.

## Explicitly deferred

- ZIP-based atomic .physica packages and recovery;
- polished renderer-backed apparatus for every Library item;
- authored transitions, recording and deterministic media export;
- final presentation themes and accessibility certification;
- remaining curriculum phases.
