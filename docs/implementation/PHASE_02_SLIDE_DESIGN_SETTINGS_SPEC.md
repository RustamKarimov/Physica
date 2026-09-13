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

- A visual project-theme gallery with three families and three genuinely distinct colour variants in each family. Selecting a theme updates the project theme and immediately refreshes slides that use the Theme background mode.
- Per-slide Theme, Solid, and Gradient background modes.
- Compact primary and secondary colour fields. Each field opens a Physica-owned menu containing a PowerPoint-style theme-colour matrix, a restrained standard-colour row, the current colour, and exact hexadecimal entry. Advanced colour controls must be deliberately opened and may not dominate the inspector.
- A clear custom-background override notice with a one-click **Use project theme** action, so a teacher can understand why changing a theme does not recolour a manually overridden slide.
- Widescreen 16:9, Standard 4:3, and Custom canvas sizes.
- Landscape and Portrait orientation.
- An explicit resize policy before dimensions are applied.
- Independently editable left, top, right, and bottom margins and safe-area insets.
- A direct route to the Guides workspace for visibility and snapping controls.

The Slide Design surface is mutually exclusive with every object-specific inspector. Switching to Design must remove the previous inspector from layout and hit testing; it may never place two inspector surfaces in the same grid cell.

## Colour-control visual contract

- The closed field is a single 32 px control with a 24 px colour chip, an exact value, and a vector disclosure icon.
- The menu uses Physica chrome, 4 px geometry, 13 px essential text, an 8 px internal rhythm, and a maximum width of 304 px.
- Theme colours appear as a six-column matrix with lighter and darker derivations, followed by a one-row standard palette.
- Swatches are compact squares with hover and selected outlines; they are not full-height bars, unlabeled gradients, or exposed component sliders.
- Exact colour entry is always available, but a teacher is never required to type a hexadecimal value for ordinary selection.
- The control must be reusable by later shape, text, graph, vector, and physics-representation inspectors.
- The stock Avalonia ColorPicker visual is not an approved product surface.

## Theme application contract

- A project theme supplies semantic colours such as background, surface, heading, body, accent, and secondary accent.
- Scene styles may reference those semantic colours through UI-independent document tokens; the shared snapshot builder resolves them before rendering.
- Built-in example lessons use Theme backgrounds and semantic theme colours so selecting a theme visibly changes the whole composition without changing geometry or physics.
- Explicit hexadecimal colours remain literal and do not change when a theme changes.
- Per-slide Solid and Gradient backgrounds remain explicit overrides and display the override notice.

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
