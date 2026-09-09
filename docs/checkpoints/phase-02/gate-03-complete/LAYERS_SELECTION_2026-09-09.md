# Layers and Selection Workspace — 2026-09-09

## Outcome

Commit `f1d377b` implements the first complete Layers/Selection slice for Phase 2 Gate 3. The feature is **Preview / UI wired**, not Interaction verified.

## Teacher workflow now exposed

- Switch the right panel between Inspector and Layers.
- Read the active slide's objects from front to back.
- Select one object, Ctrl/Command-toggle objects, or Shift-select a contiguous layer range.
- Select on the canvas and see the same selection in Layers, and conversely.
- Double-click a layer name or press F2 to rename it.
- Hide/show and lock/unlock individual objects.
- Drag one or several selected layers relative to another layer.
- Bring to front, bring forward, send backward, or send to back.
- Delete in the focused Layers workspace and undo/redo every document mutation.

Grouping is not included in this slice and remains a blocking part of the combined Gate 3 row.

## Automated evidence

| Evidence layer | Result | Scope |
| --- | --- | --- |
| Model/service | Pass | Range selection; atomic multi-layer reorder; relative order preservation; lock, visibility, rename and boundary validation; undo |
| View-model | Pass | Front-to-back list, canvas selection synchronization, visibility/lock refresh, rename and reorder refresh |
| UI structure | Pass | Inspector/Layers navigation and pointer, visibility, lock, rename and reorder event routes |
| Full suite | 74 passed, 0 failed | Repository model, render, UI component and structural checks |
| Build | Pass, 0 warnings/errors | `PhysicaStudio.slnx` |
| Launcher | Pass | `Launch Physica.bat` opened responsive Windows process 26892 |

These results do not prove real pointer capture, focus, drag feel, keyboard modifiers, visual quality, accessibility, DPI, or macOS behavior.

## Computer acceptance attempt

The required Computer controller was initialized, reset and retried before any application input. Both attempts failed inside the Windows helper:

1. `windows sandbox failed: helper_unknown_error: setup refresh had errors`
2. `windows sandbox failed: helper_unknown_error: apply deny-read ACLs`

No pointer, keyboard, focus, screenshot, or accessibility result is inferred from those failures. The visible application was left open for the user's manual review.

## Manual scenarios requested

1. Open **Layers** in the right panel and click a row; the matching canvas object must select.
2. Ctrl-click non-adjacent rows, then Shift-click to verify anchored range selection.
3. Drag a selected row, and then a selected block, above and below other rows; the canvas stacking must follow and Undo must restore it.
4. Toggle the eye and lock controls. Hidden objects must disappear; locked objects must refuse canvas transforms without crashing.
5. Double-click a layer name, enter a new name, press Enter, and verify Undo/Redo.
6. Use Front, Forward, Back and Bottom on one and multiple selected objects.

The slice remains at **UI wired** until this real workflow is reviewed.
