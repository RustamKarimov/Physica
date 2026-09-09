# Layers correction — 2026-09-09

## User-observed results before correction

| Scenario | Result |
| --- | --- |
| Switch between Inspector and Layers | Pass |
| Select objects from the canvas and Layers | Pass |
| Rename with F2 | Pass |
| Rename with double-click | Fail |
| Reorder by dragging a layer | Fail |
| Move Forward one layer | Pass |
| Move Backward one layer | Fail |
| Send to Back / Bring to Front | Pass |
| Undo / redo | Pass |
| Delete | Pass |
| Inspector/Layers header appearance | Rejected |

## Corrections in `f14c411`

- Replaced the stretched rectangular view buttons with compact transparent tabs and a restrained active underline.
- Routed a double press through the authoritative layer-row pointer handler so it starts inline rename instead of being swallowed by selection.
- Preserved the drop decision before pointer capture is released; capture loss previously cleared the drag state before the reorder command could run.
- Restricted drop hit testing to actual layer rows and added before/after insertion feedback plus edge scrolling.
- Added an atomic one-layer ordering command. It swaps selected blocks with the adjacent unselected layer while preserving internal order, so Forward followed by Backward is an exact inverse.

## Evidence

- Model regression: exact Forward/Backward inverse passes.
- Structural UI regressions: double-click routing and retained drag decision pass.
- Full repository suite: 75 passed, 0 failed.
- Solution build: passed with zero warnings and zero errors.
- Computer-driven verification: not run because the local Windows controller failed during initialization before application input.

## Acceptance status

The corrected Layers workflow remains **UI wired**. It must not advance to Interaction verified until the user retests:

1. Header appearance.
2. Double-click rename.
3. Direct drag above and below another layer, including the blue insertion line.
4. Forward followed by Backward returning the exact prior order.

Grouping has not started and remains blocked by this correction review.
