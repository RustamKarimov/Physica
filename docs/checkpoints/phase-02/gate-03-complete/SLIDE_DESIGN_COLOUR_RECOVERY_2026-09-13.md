# Slide Design Colour Recovery — 2026-09-13

## Finding

Teacher review identified two material problems in the Slide Design inspector:

- The custom colour editor was visually cramped, with exposed HSL bars and small colour bars that did not meet the approved professional interface standard.
- Choosing **Themes** did not visibly navigate to the theme gallery when the inspector was already scrolled to another design section, making the command appear to do nothing.

## Recovery decision

The inspector now follows the established professional presentation-editor pattern: a theme gallery controls the project theme, while per-slide solid and gradient backgrounds are explicit overrides. PowerPoint documents the same distinction between applying a theme and manually formatting a slide background. The implementation uses Avalonia's official `ColorPicker` for the compact preview and flyout palette/spectrum/components editor rather than maintaining a second bespoke colour-control implementation.

## Implemented

- Replaced the bespoke HSL/colour-bar editor with two compact, accessible `ColorPicker` controls for Primary and Secondary colour.
- Supplied the active theme colours as the picker's contextual palette.
- Retained exact colour entry inside the picker flyout.
- Added a clear custom-background override notice and **Use project theme** action.
- Routed Home/Design commands to the relevant Slide Design section; **Themes** now scrolls to the theme gallery.
- Preserved Theme, Solid, Gradient, opacity, undo/redo, and shared-renderer authority.
- Removed obsolete colour-editor styles and added compact Physica chrome for the official picker.
- Added structural tests for the new controls and routing.

## Verification

- `dotnet build PhysicaStudio.slnx --no-restore` — passed, 0 warnings, 0 errors.
- `dotnet test tests/PhysicaStudio.Foundation.Tests/PhysicaStudio.Foundation.Tests.csproj --no-restore` — passed, 110/110.
- `Launch Physica.bat` — one `PhysicaStudio.Desktop` process observed with title **Physica Studio**; no duplicate process was left running after the smoke check.
- Computer interaction evidence — not available: the Computer controller failed during Windows helper initialization before application input. This change therefore remains **UI wired**, not Interaction verified.

## Teacher review steps

1. Open **Design → Themes**. Confirm the theme gallery is brought into view and selecting a variant changes the project theme preview.
2. Select a slide using a solid or gradient background. Confirm the inspector explains the override and offers **Use project theme**.
3. Open Primary or Secondary colour. Confirm the compact control opens a palette/spectrum flyout with exact-value entry, then apply the background and undo it.
4. Review the same slide in the editor and thumbnail; confirm the background remains identical.

## Readiness

The colour and theme workflow is **UI wired** pending teacher review. No claim of interaction verification or Gate 3 completion is made by this record.
