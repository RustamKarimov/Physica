# Phase 2 Canvas Guidance and Snapping

**Status:** Approved implementation slice under P2.5  
**Owners:** `PhysicaStudio.Document`, `PhysicaStudio.Authoring`, `PhysicaStudio.Desktop`

## Teacher workflow

A teacher can open the View or Design ribbon and:

1. show or hide rulers without changing the lesson;
2. show a saved grid and choose its slide-space spacing;
3. add horizontal or vertical guides, drag them, lock them, or remove them;
4. show saved margins and safe-area overlays;
5. enable snapping and independently choose grid, guide, slide, and object targets;
6. move or resize one object, a multi-selection, or a group and see the active snap line;
7. hold Alt/Option during a gesture to bypass snapping temporarily;
8. undo or redo every saved guidance-setting or guide-position change.

## Authority and persistence

- `CanvasDefinition` remains the project canvas authority for size, orientation, margins, and safe area.
- `SlideDocument.Guides` remains the ordered per-slide guide authority.
- `SlideDocument.SnapSettings` stores snap categories, logical grid spacing, and authoring-overlay visibility.
- Ruler visibility is transient workspace state and never dirties or serializes the lesson.
- Ruler major-interval choice is transient workspace state. Teachers can use automatic
  scaling, enter an exact interval, or use 50/100/200-unit presets.
- The grid renderer draws the saved interval itself. It must not silently coalesce
  10, 20, and 40-unit grids into the same visual interval.
- The guidance workspace is divided into Display, Grid and ruler, Snapping, and
  Guides sections. Each guide exposes an exact editable position and an explicit
  lock state in addition to direct canvas dragging.
- Physics/model transforms are never changed by this slice. Snapped object edits commit only `PresentationTransform2D` values through one authoring command.
- Thumbnails, presenter views, exports, and scene snapshots never contain grid, ruler, guide, margin, safe-area, or snap-feedback artwork.

## Coordinate and DPI rules

- All persisted distances use slide-space doubles, independent of pixels and DPI.
- The saved snap threshold is interpreted as screen pixels. Desktop converts it to logical slide units using the active viewport zoom before calling the UI-independent snap engine.
- Grid density is reduced visually when zoomed out, but the saved snap lattice remains unchanged.
- Guide, ruler, selection, and snap-feedback strokes remain visually constant across zoom levels.

## Snapping contract

- Move snapping evaluates the left, centre, and right edges on X and the top, centre, and bottom edges on Y of the complete selected group.
- Targets are grid lines, visible or hidden saved guides, slide edges and centres, and peer-object edges and centres.
- Selected objects and descendants of selected groups are excluded from peer targets.
- Resize snapping first snaps the dragged corner point, then applies proportional and centre-based modifier rules. This preserves Shift aspect locking and Ctrl/Command centre anchoring.
- Candidate resolution is deterministic: minimum absolute adjustment, then stable source priority and target position.
- Snap feedback reports target axis, source kind, and slide-space position; it is transient and cleared on release, cancellation, or capture loss.

## Interface

- View ribbon commands `Rulers`, `Grids`, `Guides`, `Snapping`, and `Margins` are Active.
- Design ribbon commands `Guides`, `Margins`, and `Safe Areas` open the same compact guidance panel.
- The panel exposes honest toggles, grid spacing, snap categories, guide creation, guide list, lock, removal, and margin/safe-area values.
- Rulers occupy quiet top and left viewport bands and do not shrink or alter the saved slide.
- Overlays use restrained semantic styling: neutral grid, cyan guides, amber margins, violet safe area, and bright cyan snap feedback.

## Acceptance scenarios

- Saved settings round-trip with older format-1 projects receiving defaults.
- Add, drag, lock, remove, undo, and redo guide operations.
- Move snapping for one object, multi-selection, and nested group.
- Resize snapping with Shift, Ctrl/Command, and combined modifiers.
- Alt/Option bypass.
- Identical snapped slide-space results at 25%, 100%, and 800% zoom for equivalent screen-distance input.
- Model transforms remain byte-for-byte unchanged.
- Blank and populated thumbnails plus presenter preview contain no authoring overlays.
- Launcher-driven pointer, keyboard, panel, zoom, save, reopen, and undo/redo review.

The slice remains **UI wired** until launcher-driven interaction evidence exists. Automated calculations, XAML structure, or a successful build cannot promote it to Interaction verified.
