# Slide Navigator Crash Recovery — 2026-09-08

**Tested commit:** `5499ea5b59bfeae9387e41a8458889f5d0e421f8`
**Platform:** Windows x64
**Acceptance state:** UI wired; Computer interaction Not run

## Blocking defect reproduced

The user dragged a thumbnail, then attempted Shift range selection. The application paused and terminated. Launcher output captured this unhandled exception:

`System.Runtime.InteropServices.COMException` from Avalonia Win32 `DoDragDrop`, reached through `MainWindow.SlideItem_PointerMoved`.

The failure had three coupled causes:

1. Internal slide reordering incorrectly used native Windows OLE drag/drop.
2. Selection cleared and rebuilt the thumbnail collection while the pointer gesture still referenced the old visual.
3. The original pointer-pressed event was retained and reused asynchronously after its source could be invalidated.

## Correction

- Removed native `DragDrop.DoDragDropAsync` and all navigator data-transfer handlers.
- Implemented a synchronous internal pointer-capture gesture with a six-pixel threshold.
- Added before/after insertion targeting and edge scrolling within the slide navigator.
- Preserved selected-block movement semantics: dragging a selected slide keeps the selected block; clicking it without dragging reduces to one slide.
- Added lost-capture cleanup and exception containment so a gesture failure is cancelled and reported instead of terminating Physica.
- Added explicit authoring change kinds for document, selection, and persistence updates.
- Selection now updates stable observable thumbnail view-models without clearing the collection or rebuilding their rendered scenes.
- Removed duplicate full refreshes after session mutations and reused the cached active-slide scene.

## Verification

### Model/service and component-facing regression coverage

- Three focused navigator tests passed.
- Stable thumbnail identity and scene identity across Shift range selection are asserted.
- Forward/reverse range and Ctrl-style toggle semantics are asserted.
- Selection, document, and persistence event classifications are asserted.

### Broader suite

- Solution build: passed with zero warnings and zero errors.
- Full test suite: 46 passed, zero failed.

### Running application

The rebuilt launcher starts a responsive Physica process. The Computer controller failed before input with `windows sandbox failed: helper_unknown_error: setup refresh had errors` after the permitted retry/reset sequence. Therefore pointer, modifier, insertion-marker, auto-scroll, and drag-reorder scenarios remain **Not run**, and this report does not promote Gate 2 to Interaction verified.

## Required manual confirmation

1. Click several individual slides.
2. Shift-click forward and backward ranges.
3. Ctrl-click to add and remove slides.
4. Drag one thumbnail before and after another.
5. Select a range and drag the selected block.
6. Confirm the application remains responsive and alive throughout.

Any failure remains blocking and must be reported before further Phase 2 work.
