# Canvas Guidance and Snapping — 2026-09-13

**Initial implementation commit:** `440476bd71eda3fcd4aae356e9296048edec1ef5`
**Review-recovery commit:** `1959d5c342683a2d29ff20f50e6f795209ed376a`
**Platform exercised:** Windows x64
**Acceptance state:** UI wired
**User decision:** Initial implementation rejected; recovery pending review

## First teacher review — failed

The user found six blocking defects in the launched application:

- The Grid ribbon icon did not represent a grid.
- 10, 20, and 40-unit grids looked effectively identical because the renderer
  multiplied small authored intervals until they reached a common screen density.
- Ruler scale could not be adjusted.
- Guide positions could not be entered precisely.
- The close-panel glyph was not a close icon.
- The flat popup was difficult to understand and exposed too few useful controls.

No acceptance state was promoted.

## Review recovery

- Grid lines now render at the exact saved interval; 10, 20, and 40 have different
  line densities at ordinary zoom levels.
- The grid has direct 10/20/40 presets and retains exact numeric entry.
- Rulers support Auto, exact numeric entry, and 50/100/200-unit presets. Ruler scale
  remains transient editor state and does not dirty the lesson.
- Every guide exposes an exact position field, units, visible lock state, and remove
  action, in addition to direct canvas dragging.
- The popup is organized into Display, Grid and ruler, Snapping, and Guides cards.
- Grid, snapping, margin, safe-area, and close actions now use recognizable vector
  icons rather than fallback artwork.

## Implemented teacher workflow

- Open one compact guidance panel from View or Design ribbon commands.
- Toggle transient rulers and saved grid, guide, margin, and safe-area overlays.
- Set grid spacing in slide-space units.
- Enable snapping and independently select object, grid, guide, and slide targets.
- Add horizontal or vertical centre guides; drag unlocked guides directly on the slide.
- Lock, unlock, remove, or clear guides.
- Move a single object, selection, or group with deterministic full-bounds snapping.
- Resize from a corner with snapping while retaining Shift proportional and Ctrl/Command centre-based behavior.
- Hold Alt/Option during a move or resize to bypass snapping.
- Undo and redo saved guide and snap-setting changes.

## Authority and compatibility

- The lesson stores guide positions, grid spacing, snap categories, and overlay visibility in UI-independent document contracts.
- Ruler visibility remains transient editor state.
- Snap tolerance is converted from eight screen pixels to slide units at the current zoom.
- Object edits commit only presentation transforms; model transforms remain unchanged.
- Guidance and snap feedback are authoring-only rendering. They do not enter scene snapshots, thumbnails, presenter views, or exports.
- Missing new fields in an older version-1 project receive non-intrusive defaults.

## Automated evidence

| Layer | Result | Coverage |
| --- | --- | --- |
| Model/service | Pass | Round trip, backward defaults, validation, undo, and model-transform separation |
| Snapping | Pass | Complete-bounds grid targets and deterministic equal-distance priority |
| UI component | Pass | Zoom-consistent guide hit tolerance and structural reachability of the real controls |
| Full repository | 101 passed, 0 failed | Existing document, render, history, navigator, canvas, grouping, and viewport suites remain green; explicit ruler mode and recovery-structure checks added |
| Build | Pass | .NET solution compiled with zero warnings and zero errors |

The changed C# files pass the repository whitespace formatter. A repository-wide formatting check still reports pre-existing formatting debt in unrelated preview-rendering files; those files were not changed in this slice.

## Launcher and Computer evidence

`Launch Physica.bat` opened exactly one responsive `PhysicaStudio.Desktop` window on Windows. The Computer controller failed during its own initialization before it could observe or send input to Physica. The required reset and one retry failed with:

- `setup refresh had errors`
- `trusted Node process exited unexpectedly`

Therefore no screenshot, pointer, focus, keyboard, or DPI claim is made.

## Manual acceptance checklist

1. Open **View**. Confirm **Grids** has a recognizable grid icon; toggle **Rulers** and **Grids**; use **More → Guides** to open the panel, then confirm the X closes it.
2. Toggle grid, guides, margins, and safe area. Confirm thumbnails stay clean.
3. Choose 10, 20, and 40 grid presets and confirm that each produces a visibly different density.
4. Switch the ruler between Auto, 50, 100, 200, and one custom interval; confirm major ticks and labels update.
5. Add one vertical and one horizontal guide. Enter exact positions, drag each, lock one, and confirm both dragging and numeric editing are disabled while locked.
6. Change grid spacing and guide positions, then use Undo/Redo.
7. Move a single object and a group near the grid, a guide, the slide centre/edge, and another object. Confirm the colored snap line and stable placement.
8. Corner-resize near the same targets. Repeat with Shift, Ctrl, and Ctrl+Shift.
9. Hold Alt while moving or resizing and confirm snapping is bypassed.
10. Save, close the project without exiting the app, reopen it, and confirm guide/settings persistence while ruler interval resets as transient workspace state.

## Remaining limitations

- Real pointer feel, visual polish, keyboard focus, save/reopen, and undo from the running controls are not verified.
- Windows 100%, 125%, 150%, and 200% DPI runs are pending.
- Apple Silicon macOS verification is pending.
- Margin and safe-area distances use current canvas defaults; editing those distances belongs to the remaining slide-design slice.
