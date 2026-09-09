# Phase 2 Gate 3 — Retained Canvas Transform Slice

**Tested commit:** `7791ec7`
**Date:** 2026-09-09
**Platform:** Windows x64
**Readiness:** UI wired — teacher interaction not yet verified

## Behavior implemented

- The active slide's persisted `SceneNode` collection is the canvas authority.
- A pointer press selects the topmost visible primitive. Paths and waves are targeted by their visible stroke, not by the empty interior of a large bounding rectangle.
- Ctrl/Command toggles one object; Shift adds an object; clicking empty slide space clears selection.
- Dragging the selected body moves the selection. Four corner handles resize it and the round upper handle rotates it.
- During a gesture only a transient render preview changes. Pointer release writes one atomic presentation-transform command for every selected node, so one Undo reverses the complete gesture.
- Physical model transforms are never rewritten by canvas presentation editing.
- Arrow keys nudge by one logical unit; Shift+arrow nudges by ten. Ctrl/Command+A selects all visible nodes. Delete removes selected unlocked nodes.
- Locked selections are rejected atomically rather than partially transformed or deleted.
- Populated non-standing-wave slides now show an honest canvas-selection inspector instead of the false “No objects” state.

## Evidence by layer

| Layer | Scenarios | Result |
| --- | --- | --- |
| Model/command | Selection does not mutate revision; multi-object transform is one undo entry and preserves model authority; multi-delete is atomic and rejects locked selections | 3 passed |
| Render control | Topmost logical-coordinate targeting; visible-stroke path targeting; selection handles and transient preview | 3 passed |
| Desktop wiring | Real canvas surface binds selection and routes pointer events to document commits | 1 passed |
| Full repository | All projects build and all tests execute | 64 passed, 0 failed |
| Launcher | `Launch Physica.bat` starts the current desktop binary | Process 22700 responsive |
| Computer interaction | Initialize, reset, and one retry | Not run — controller exited unexpectedly before app input |

Automated results do not prove pointer capture, modifier keys, drag feel, visual selection clarity, or usability.

## Manual acceptance scenario

1. On a non-standing-wave slide, click a visible object. Confirm a blue selection outline, four square resize handles, and one round rotation handle appear.
2. Ctrl-click a second object, then Ctrl-click it again. Confirm it is added and then removed without starting a drag.
3. Shift-click multiple objects. Drag one selected visible object and confirm the whole selection moves.
4. Undo once and confirm the complete multi-object move returns in one step. Redo once.
5. Drag each kind of handle: a corner resizes and the round handle rotates.
6. Click near, but not on, a wave stroke. Confirm the wave is not selected; click on the stroke and confirm it is.
7. Use arrow and Shift+arrow nudging, Ctrl+A, Delete, Undo, and Redo while the canvas has focus.

## Known limitations

- Selection outlines are axis-aligned even after rotation.
- Layer ordering, grouping, lock/hide controls, object renaming, and selection-pane workflows are not yet active.
- Pan, zoom, fit, guides, grid, margins, safe areas, and snapping are later Gate 3 slices.
- No controlled Windows DPI captures or macOS interaction evidence exist yet.
- The Computer controller failure is tooling evidence, not a claim that the application interaction passed.
