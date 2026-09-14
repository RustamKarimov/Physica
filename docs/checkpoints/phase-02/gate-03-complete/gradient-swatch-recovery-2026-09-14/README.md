# Swatch Geometry and Multi-stop Gradient Recovery — 2026-09-14

**Gate:** Phase 2 Gate 3 — Complete Phase 2  
**Implementation commit:** `f03fce1`  
**Acceptance state:** UI wired — awaiting teacher review

## Teacher findings

The teacher's fourth colour review demonstrated that both the quick and advanced palettes still painted colours as nearly invisible vertical lines. The layouts distributed grid cells correctly, but each button retained only its content width inside the cell. The teacher also rejected the two-colour-only gradient model as unsuitable for a professional authoring application.

The three supplied captures are preserved under `references/`.

## Corrections

### Swatch geometry

- Quick theme swatches now have an explicit 44 px painted width.
- Quick standard and recent swatches have an explicit 25.2 px painted width.
- Advanced swatches have an explicit 44 px painted width.
- Each palette is left-aligned and the widths, margins, column count, and available container width have been checked together.
- The explicit background-painting control template and selected check treatment remain in place.

### Multi-stop gradients

- `SlideBackground` now supports an authoritative `GradientDefinition` with stable stop IDs, Linear or Radial geometry, angle, and 2–32 ordered stops.
- Legacy two-colour packages still resolve through a compatibility fallback.
- Document validation covers type, angle, stop count, unique IDs, position range, and colour format.
- The shared scene snapshot carries every stop; the common editor/thumbnail/presenter surface renders all stops for linear and radial gradients.
- The Slide Design inspector replaces primary/secondary fields with a gradient editor containing a preview rail, selectable and draggable stop handles, double-click and Add stop insertion, removal down to the two-stop minimum, exact stop position, reusable colour selection, type, and linear angle.
- One **Apply background** operation stores the complete gradient as one undoable command.

## Verification

- Isolated Desktop build: passed with zero warnings and zero errors.
- Foundation suite: 113 passed, zero failed.
- Added evidence covers four-stop JSON round trip, stable stop IDs, shared-renderer order/colours/type/angle, old two-colour compatibility, invalid stop validation, and static reachability of the editor interactions.
- Official `Launch Physica.bat`: one responsive Windows process, PID 8948.
- Computer-driven inspection: Not run. The helper failed during initialization with `windows sandbox failed: helper_unknown_error: setup refresh had errors`, then failed identically after reset and retry.

Automated results do not prove the visual appearance or interaction quality. This remains UI wired until teacher review.

## Teacher review

1. For Solid colour, open both the quick palette and **More colours…** and confirm every cell is a clearly filled rectangle rather than a line.
2. For Gradient, add at least two extra stops; drag them and enter exact percentages.
3. Select each stop and assign visibly different colours.
4. Double-click the gradient rail to add a stop; remove stops and verify removal stops at two.
5. Change the linear angle, then select Radial and Apply.
6. Compare the editor and thumbnail, then test undo/redo and save/reopen.
