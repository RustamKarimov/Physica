# Phase 2 Slide Design Settings Specification

**Status:** Binding implementation specification
**Owner:** `PhysicaStudio.Document`, `PhysicaStudio.Authoring`, `PhysicaStudio.Rendering2D`, and `PhysicaStudio.Desktop`
**Acceptance gate:** Phase 2 Gate 3

## Purpose

This slice activates the Design-ribbon controls needed to configure a lesson's visual canvas without weakening the shared-renderer, undo, serialization, or future physics boundaries.

## Authority and scope

- `LessonProject.Theme` is the project-wide theme authority.
- `LessonProject.Canvas` is the project-wide slide-size, orientation, margin, and safe-area authority.
- `SlideDocument.Background` is the per-slide background authority.
- Editor, navigator thumbnails, and presenter receive the resulting state through the same `SceneSnapshot` builder.
- Viewport zoom, pan, and ruler interval remain transient editor state.
- Image backgrounds remain Planned until the Phase 3 asset workflow can select, package, validate, and recover the referenced asset.

## Teacher workflow

Design commands open a contextual **Slide Design** surface in the existing Inspector workspace. The surface remains available while the teacher changes theme, slide background, dimensions, orientation, margins, or safe area. Selecting a scene object returns the Inspector to the object context.

The surface provides:

- A visual project-theme gallery with three families and three genuinely distinct colour variants in each family.
- Per-slide Theme, Solid, and Gradient background modes.
- Primary and secondary colour swatches, a custom HSL editor, and hexadecimal entry retained as an advanced path.
- Widescreen 16:9, Standard 4:3, and Custom canvas sizes.
- Landscape and Portrait orientation.
- An explicit resize policy before dimensions are applied.
- Independently editable left, top, right, and bottom margins and safe-area insets.
- A direct route to the Guides workspace for visibility and snapping controls.

The Slide Design surface is mutually exclusive with every object-specific inspector. Switching to Design must remove the previous inspector from layout and hit testing; it may never place two inspector surfaces in the same grid cell.

## Resize policies

Changing canvas dimensions must never silently choose a destructive layout policy.

### Scale to fit

- Compute one uniform scale: `min(newWidth / oldWidth, newHeight / oldHeight)`.
- Centre the old canvas inside the new canvas.
- Apply the resulting layout transform only to top-level scene nodes; group descendants continue to inherit their parent transform and are not double-scaled.
- Preserve every `SpatialTransform2D` model transform exactly.
- Scale the top-level presentation transform so the rendered composition retains its proportions.
- Relocate guide positions by the same scale and centring offset, then clamp them to the new canvas.

### Keep size and position

- Preserve every scene-node geometry, model transform, and presentation transform exactly.
- Preserve guide positions when valid and clamp only positions outside the new canvas.

Both policies preserve slide IDs, node IDs, hierarchy, layers, background, notes, and snapping settings. One size operation produces one history entry and one undo restores the complete prior project.

## Validation

- Canvas width and height must be finite and between 100 and 20,000 slide units.
- Margin and safe-area values must be finite and non-negative.
- Horizontal insets must leave usable slide width; vertical insets must leave usable slide height.
- Background opacity must be between 0 and 1.
- User-entered colours must use `#RGB`, `#ARGB`, `#RRGGBB`, or `#AARRGGBB` hexadecimal form.
- Theme backgrounds resolve from the project's `background` colour; solid and gradient backgrounds use the slide values.
- Invalid input does not create history or mutate the project and is reported in the status bar.

## Rendering

- `SlideSceneSnapshotBuilder` remains the only document-to-render mapping.
- Snapshot logical size always equals the current project canvas.
- Theme, solid, and gradient backgrounds are rendered by `DocumentSceneSurface` for editor, thumbnail, and presenter surfaces.
- Guidance overlays are authoring-only and are not included in thumbnails or presentation.
- A canvas-size mutation invalidates every slide snapshot because it changes every preview's logical size.

## Readiness and acceptance

The following Design commands become **Active / UI wired** in this slice: Themes, Variants, Fill, Gradient, Transparency, Slide Size, Orientation, Margins, and Safe Areas. Image Background remains Planned.

Promotion beyond UI wired requires real-application evidence for:

1. Applying and undoing each theme/background mode.
2. Matching editor, thumbnail, and current-slide presenter backgrounds.
3. Widescreen, Standard, Custom, Landscape, and Portrait changes.
4. Both resize policies on ungrouped and nested grouped content.
5. Save, close, reopen, and recovery of all design values.
6. Margin and safe-area editing and overlay agreement.
7. Windows DPI and macOS rendering.
