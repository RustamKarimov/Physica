# Phase 2 Slide Design Visual Recovery — 2026-09-13

**Implementation commit:** `ef54aec`
**State:** UI wired; teacher review required
**User failure evidence:** `user-rejected-theme-inspector-2026-09-13.png`

## Failed real-app scenario

The first teacher review found three blocking defects:

1. The Slide Design surface and Standing Wave object inspector were visible in the same grid cell, making labels and fields overlap.
2. Themes and Variants exposed the same plain preset workflow and did not communicate genuinely different visual choices.
3. Background colour selection required the teacher to type a hexadecimal value.

This failure blocked acceptance of the original slide-design slice.

## Recovery

- The object inspector now binds to `ShowStandingWaveInspector`; Slide Design and object inspectors are mutually exclusive in both layout and hit testing.
- The theme dropdown is replaced by a visual gallery containing Light, Dark, and Laboratory families, each with three named and visibly different palettes.
- All nine variants are document-backed `ThemeDefinition` values and persist through the existing project format.
- Primary and secondary background colours are selected through explicit target buttons with live swatches.
- Twelve immediate colour swatches cover common neutral, lesson, accent, warning, and dark-canvas uses.
- A custom HSL editor provides graphical slider selection and live preview.
- Hexadecimal entry remains available inside an Advanced expander for precise reuse, but is no longer the primary workflow.
- Solid backgrounds disable the secondary colour target; gradients enable it; theme backgrounds disable custom fill controls.

## Verification evidence

- Focused slide-design tests: 7 passed.
- Complete foundation suite: 110 passed.
- Solution build: 0 warnings, 0 errors.
- `Launch Physica.bat` opened one responsive `PhysicaStudio.Desktop` process.
- A repeated launcher invocation left the verified process count at one.

These results establish model behavior, project wiring, inspector mutual exclusion, palette distinctness, and launch health. They do not establish pointer usability or visual approval.

## Computer verification limitation

The Computer controller was initialized according to its current instructions. Both the initial call and the required reset/retry failed before app observation with `windows sandbox failed: helper_unknown_error: setup refresh had errors`. No pointer, keyboard, or screenshot evidence is claimed.

## Required teacher review

1. Open Design → Themes and confirm the Standing Wave fields are not visible beneath Slide Design.
2. Select several variants across all three families and confirm their gallery previews are clearly different.
3. Change the Background type to Solid, select a primary swatch, adjust H/S/L, and apply.
4. Change to Gradient, select the secondary target, choose a different colour, and apply.
5. Confirm the Advanced hexadecimal field remains usable for exact values.
6. Confirm the already accepted size, orientation, scaling, dimension, and transparency controls remain intact.

The row remains **UI wired** until this real application workflow is accepted.
