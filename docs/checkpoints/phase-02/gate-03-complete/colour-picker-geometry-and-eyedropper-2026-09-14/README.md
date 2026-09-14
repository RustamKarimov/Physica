# Colour Picker Geometry and Eyedropper Recovery — 2026-09-14

## Trigger

Teacher-provided Windows captures showed that focused custom-rendered controls drew cyan rectangles outside their own surfaces. The gradient editor also used an oversized angle input. The teacher requested screen colour sampling for both solid fills and gradient stops, with one reusable foundation for later object formatting.

## Corrected implementation

- `PhysicaColorSpectrum` and `PhysicaGradientStopSurface` now draw focus adorners against `new Rect(Bounds.Size)` in local coordinates.
- The linear-gradient angle row, slider, and numeric field use a compact 32 px property-row rhythm.
- `PhysicaColorField` exposes one **Pick from screen** action alongside the quick and advanced palette workflows.
- `IScreenColorSampler` is the only platform boundary. Windows sampling is implemented once with desktop-pixel coordinates; callers receive an Avalonia `Color` and have no native dependencies.
- `PhysicaEyedropperOverlay` covers the active display, uses a crosshair, shows a live swatch and hexadecimal value, applies on left click, and cancels with Escape.
- Because solid background and selected gradient stops already use `PhysicaColorField`, both workflows receive the eyedropper without separate implementations. Later shape, text, graph, vector, and physics-representation inspectors must reuse the same control.
- macOS sampling remains a required platform adapter and is not claimed as implemented.

## Automated evidence

- Isolated desktop build: passed, zero warnings and zero errors.
- Foundation and UI-contract suite: 113 passed, zero failed.
- Regression assertions cover local-coordinate focus bounds, compact angle geometry, the shared field route, overlay, and platform sampler.

Automated checks prove build integration and static control contracts. They do not prove pointer feel, exact pixels, cross-application sampling, multi-monitor behavior, or macOS behavior.

## Real-application evidence

- `Launch Physica.bat` opened one responsive `PhysicaStudio.Desktop` Windows process.
- Computer-based inspection could not initialize. It failed with the Windows helper `setup refresh had errors`, then failed again after reset. No automated screenshot or pointer evidence is claimed.
- The teacher must close and relaunch any pre-correction process before reviewing the final build.

## Required teacher check

1. In Design > Fill, focus the advanced Custom spectrum; the cyan focus border must stay exactly around the spectrum control.
2. In Design > Gradient, add and select several stops; the focus border must stay around the gradient rail and never surround Stop colour or Position.
3. Confirm the angle numeric editor matches the height of other inspector fields.
4. Open a solid colour field, choose **Pick from screen**, move over several visible colours, click one, and confirm the field updates.
5. Repeat the eyedropper from two different gradient stops and confirm only the selected stop changes before Apply background.
6. Press Escape in sampling mode and confirm no colour changes.

## References

- `references/gradient-focus-and-angle-reference.png`
- `references/custom-spectrum-focus-reference.png`
