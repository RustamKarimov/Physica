# Slide Design Palette Recovery — 2026-09-13

## Teacher finding

The second colour-control recovery failed visual review. The stock Avalonia ColorPicker exposed a large grey flyout, oversized spectrum, full-height gradient bars, mode tabs, and raw component sliders. It was technically capable but visually unrelated to the approved Physica interface.

Theme selection also lacked a convincing visible result in the built-in lesson because its background, text, and accents were stored as literal colours rather than semantic project-theme colours.

## Binding correction

- Removed the stock ColorPicker from every product surface and removed its package dependency.
- Added reusable `PhysicaColorField` control with a compact colour chip, exact value, and vector disclosure icon.
- Added a 292 px Physica-owned menu using the approved chrome, spacing, typography, radius, and elevation tokens.
- Added a six-column theme matrix with lighter and darker derivations, a compact standard-colour row, selected/hover outlines, tooltips, accessible names, and exact hexadecimal entry.
- Kept advanced component sliders and a large spectrum out of the ordinary background workflow.
- Added UI-independent semantic colour references (`theme:background`, `theme:surface`, `theme:heading`, `theme:body`, `theme:accent`, and `theme:secondaryAccent`).
- Resolved semantic colours in the shared scene snapshot builder, so editor, thumbnails, and later presenter output receive the same final colours.
- Converted the built-in standing-wave lesson to a Theme background and semantic text, surface, and accent colours. Theme selection therefore changes the visible composition coherently while literal colours remain literal.

## Verification by evidence layer

- Model/render contract: semantic theme-colour resolution test passes.
- UI structure: the main inspector uses `PhysicaColorField`; its menu contains the theme matrix, standard palette, and exact-value field; no stock ColorPicker remains.
- Build: isolated Desktop build passed with 0 warnings and 0 errors while preserving the user's already-running application process.
- Automated suite: 111/111 passed from an isolated output directory.
- Real application interaction: Not run. Computer initialization failed twice with `trusted Node process exited unexpectedly`, including a reset, before any application input. The user's existing Physica process was deliberately not terminated or replaced.
- Windows launcher: Not rerun because an older Physica instance was already open and the launcher correctly prevents a second instance.

## Required teacher review

After closing the currently open instance and relaunching with `Launch Physica.bat`:

1. Open **Design → Fill**, then open Primary colour.
2. Confirm the menu is compact, visually integrated, and contains only theme swatches, standard swatches, and exact entry.
3. Select a swatch, apply the background, then undo and redo.
4. Switch the background to **Use project theme**, select several Light and Dark theme variants, and confirm the entire built-in slide changes coherently and remains readable.
5. Compare the active slide with its thumbnail.

## Readiness

The correction is **UI wired** and remains a blocking Phase 2 review item until the teacher approves the real application. Automated success is not treated as visual acceptance.
