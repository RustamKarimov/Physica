# Slide Design Settings Evidence — 2026-09-13

**Tested implementation commit:** 979f77a
**Readiness:** UI wired — teacher review and controlled interaction evidence remain required
**Launcher:** Launch Physica.bat
**Windows process:** one responsive PhysicaStudio.Desktop process, PID 18700

## Implemented workflow

- Design-ribbon Themes, Variants, Fill, Gradient, Transparency, Slide Size, Orientation, Margins, and Safe Areas commands open the contextual Slide Design inspector.
- Project-wide Physica Light, Physica Dark, and Laboratory theme presets.
- Per-slide Theme, Solid, and Gradient backgrounds with validated colours and transparency.
- Widescreen 16:9, Standard 4:3, custom dimensions, Landscape, and Portrait.
- Explicit Scale to fit and Keep size and position policies before applying a size change.
- Editable project-wide margin and safe-area distances with a route to the persistent Guides workspace.
- Image Background remains Planned until the Phase 3 asset workflow exists.

## Architecture evidence

- LessonProject.Theme, LessonProject.Canvas, and SlideDocument.Background remain the respective authorities.
- One resize command updates the canvas, affected top-level presentation transforms, and guide positions as one undoable history entry.
- Scale to fit applies once at each top-level node. Nested descendants are not double-scaled.
- Model transforms remain byte-for-byte equivalent through resize and undo.
- Keep size and position preserves node state and clamps only out-of-range guides.
- Editor, thumbnails, and current-slide presenter continue to consume the same SceneSnapshot; the snapshot now renders gradient backgrounds as well as theme and solid backgrounds.
- Theme, background, canvas, margin, and safe-area values serialize and reopen through the existing versioned project package.

## Automated evidence

- Six focused scenarios pass:
  - uniform scale/centre math and model-transform preservation;
  - nested-group single scaling;
  - keep-size policy and guide clamping;
  - theme/background/inset serialization and undo;
  - theme-colour resolution through the shared snapshot;
  - real Design-ribbon/contextual-inspector structural reachability.
- Full repository result: 109 passed, 0 failed.
- Full solution build: 0 warnings, 0 errors.

These checks prove command, validation, persistence, render-contract, and static UI-wiring behavior. They do not prove pointer interaction, layout quality, colour appearance, operating-system DPI behavior, or teacher usability.

## Computer-based interaction attempt

The Computer controller was initialized only after its complete operating and confirmation instructions were read. Its first state request failed with "trusted Node process exited unexpectedly"; the required reset and single retry failed with the same error before Physica could be observed or controlled. No screenshots, pointer actions, or keyboard actions were produced.

## Required teacher review

1. Open Design and confirm the inspector is readable at the normal right-panel width.
2. Switch among the three themes and verify the current slide and every thumbnail update.
3. Apply Theme, Solid, and Gradient backgrounds and use Undo/Redo.
4. Switch Widescreen to Standard and Landscape to Portrait using both resize policies.
5. Confirm grouped and ungrouped content stays visually coherent.
6. Edit margins/safe areas, open Guides, and verify their overlays agree.
7. Save, close the project without exiting Physica, reopen it, and confirm all settings.

## Remaining limitations

- Interaction status cannot advance beyond UI wired until real application evidence is available.
- Windows 100%, 125%, 150%, and 200% DPI runs are not recorded.
- Apple Silicon macOS has not been tested.
- Image backgrounds, imported/custom themes, and theme editing are later-phase features.
- The Phase 2 gate remains blocked on recovery UX, representative lesson workflow, cross-platform evidence, and final user approval.

