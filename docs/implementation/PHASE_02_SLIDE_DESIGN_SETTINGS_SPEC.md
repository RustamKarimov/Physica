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
- Compact primary and secondary colour fields. Each field opens a Physica-owned quick palette containing a PowerPoint-familiar theme-colour matrix, standard and recent colours, and a deliberate route to a separate advanced chooser. The workflow adopts familiar hierarchy without copying PowerPoint's light-grey visual styling.
- A clear custom-background override notice with a one-click **Use project theme** action, so a teacher can understand why changing a theme does not recolour a manually overridden slide.
- Widescreen 16:9, Standard 4:3, and Custom canvas sizes.
- Landscape and Portrait orientation.
- An explicit resize policy before dimensions are applied.
- Independently editable left, top, right, and bottom margins and safe-area insets.
- A direct route to the Guides workspace for visibility and snapping controls.

The Slide Design surface is mutually exclusive with every object-specific inspector. Switching to Design must remove the previous inspector from layout and hit testing; it may never place two inspector surfaces in the same grid cell.

## Colour-control visual contract

- The closed field is a single 32 px control with a 24 px colour chip, an exact value, and a vector disclosure icon.
- The quick palette uses Physica's dark chrome, restrained elevation, 4 px geometry, 13 px essential text, an 8 px internal rhythm, and a compact width near 320 px. It must feel native to Physica rather than copied from another product.
- Theme colours are real filled square swatches arranged as base-colour columns with predictable light-to-dark shades. Every cell retains a minimum visible width and height; no template or layout state may collapse a swatch into a line.
- Standard colours are a restrained one-row palette. Recent colours contain the latest successful selections for the current application session, remove duplicates, and remain reachable without opening the advanced chooser.
- Hover uses a high-contrast outline, selection uses a two-part accent/check treatment, and light swatches retain a visible neutral border. Colour values are exposed through tooltips and accessible names.
- The quick palette applies a selected colour immediately and closes. It contains no exposed component sliders, spectrum, or permanent hexadecimal form.
- **More colours…** opens a separate Physica-owned modal chooser. Its Standard view provides an extended curated palette; its Custom view provides a saturation/value field, hue control, live old/new preview, RGB values, and exact hexadecimal entry. Apply and Cancel are explicit and do not mutate the slide until Apply.
- **Pick from screen** is part of the reusable `PhysicaColorField`, not a background-specific command. It enters a deliberate full-screen sampling mode, shows a live colour preview and exact hexadecimal value, applies only on click, and cancels with Escape. Screen capture is isolated behind a platform adapter so the same field can be used by later shape, text, graph, vector, and physics-representation inspectors without duplicating native code.
- The advanced chooser supports pointer selection, keyboard focus, Enter/Cancel behavior, and clear validation. It must not reuse the stock Avalonia ColorPicker visual.
- The control must be reusable by later shape, text, graph, vector, and physics-representation inspectors.
- Gradient editing uses an ordered collection of two to thirty-two colour stops. A teacher can select, add, remove, recolour, and reposition stops on a gradient rail; choose Linear or Radial geometry; and control the linear angle. Two colours are only the default, never the storage or interface limit.

## Gradient background contract

- `SlideBackground` retains its legacy primary/secondary fields only for loading earlier Phase 2 packages. New gradient mutations store one `GradientDefinition` with stable stop IDs, geometry, angle, and ordered stops.
- A gradient contains at least two and at most thirty-two stops. Stop positions are finite values from 0 to 1 and may coincide to create a hard edge. Rendering sorts by position and preserves stable order for coincident stops.
- Linear gradients support a 0–360 degree angle. Radial gradients use the slide centre in this slice; editable centre, focal point, radius, and spread belong to the later full Fill-formatting phase.
- The inspector shows a real gradient preview rail and movable stop handles. Double-clicking the rail or choosing Add stop inserts an interpolated colour in the largest available gap. Remove stop is disabled at the two-stop minimum.
- Selecting a handle exposes its colour and exact 0–100% position. Colour selection uses the same `PhysicaColorField` as solid fills.
- Focus outlines for the spectrum and gradient-stop rail are drawn in each control's local coordinate space and may never enclose neighbouring editor rows. Angle and position editors use the same compact 32 px property-row height as other inspector fields.
- Changes remain a local preview until **Apply background**. One Apply creates one undoable command containing the complete gradient. Canceling or leaving the surface without Apply does not silently mutate the lesson.
- Editor, thumbnail, and presenter resolve the same ordered gradient-stop snapshot. Save/reopen and undo/redo preserve stop IDs, colours, positions, geometry, and angle exactly.

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
