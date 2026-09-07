# Phase 2 — Project and Slide Foundation Checkpoint

**Date:** 2026-09-07
**Status:** In progress; first functional slice complete
**Specification:** `docs/implementation/PHASE_02_PROJECT_SLIDE_FOUNDATION_SPEC.md`

## Active now

- Versioned `.physica` project package with validated `project.json`.
- New, Open, Save, Save As, Save Copy, Recover, and safe Close.
- Session-backed slide navigator.
- Add, duplicate, delete, select, undo, and redo slide operations.
- Dirty-state title marker and successful-save tracking.
- External recovery snapshots that do not overwrite the original lesson.
- UI-independent section, scene-node, transform, layer, theme, canvas, guide, and snapping commands ready for Desktop activation.

## Compatibility proof

- Unknown project, slide, and scene-node JSON fields have reserved extension-data storage and round-trip without loss.
- Unsupported future file versions are rejected without changing the active lesson.
- Corrupt/missing project entries are isolated behind `ProjectPackageException`.
- Physical model transforms and authored presentation transforms are separate persisted values.
- IDs, coordinates, ordering, timestamps, units boundaries, and file paths are independent of Avalonia and display DPI.

## Verification

- `dotnet build PhysicaStudio.slnx --no-restore`: passed with zero warnings and zero errors.
- `dotnet test PhysicaStudio.slnx --no-build --no-restore`: 24 passed, 0 failed.
- Targeted whitespace formatting was applied to all new and modified Phase 2 C# files.
- The repository-wide formatter still reports pre-existing dense drawing-code whitespace in Phase 1 custom render controls; this is tracked cleanup, not a Phase 2 behavior failure.

## Remaining before the Phase 2 gate

- Section and slide-reorder interface.
- Canvas pointer editing and layer interface.
- Design, guide, zoom, pan, and snapping interface.
- Recovery chooser and timed autosave coordinator.
- Keyboard, accessibility, Windows, and macOS workflow proof.
- Representative project and checkpoint screenshots.
