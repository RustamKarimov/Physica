# Phase 2 — Project and Slide Foundation Checkpoint

**Date:** 2026-09-07
**Status:** In progress; project persistence and slide-organization slices complete
**Specification:** `docs/implementation/PHASE_02_PROJECT_SLIDE_FOUNDATION_SPEC.md`

## Active now

- Versioned `.physica` project package with validated `project.json`.
- New, Open, Save, Save As, Save Copy, Recover, and safe Close.
- Session-backed slide navigator.
- Add, duplicate, delete, select, reorder, undo, and redo slide operations.
- Atomic section creation and slide assignment, exposed through the Home ribbon.
- Keyboard shortcuts for new, open, save, save as, undo, redo, and ordered slide movement.
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
- `dotnet test PhysicaStudio.slnx --no-build --no-restore`: 25 passed, 0 failed.
- Targeted whitespace formatting was applied to all new and modified Phase 2 C# files.
- The repository-wide formatter still reports pre-existing dense drawing-code whitespace in Phase 1 custom render controls; this is tracked cleanup, not a Phase 2 behavior failure.

## Remaining before the Phase 2 gate

- Advanced section editing, reassignment, navigator grouping, and drag reorder.
- Canvas pointer editing and layer interface.
- Design, guide, zoom, pan, and snapping interface.
- Recovery chooser and timed autosave coordinator.
- Keyboard, accessibility, Windows, and macOS workflow proof.
- Representative project and checkpoint screenshots.
