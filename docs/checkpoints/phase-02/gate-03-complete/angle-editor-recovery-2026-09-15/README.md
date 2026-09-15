# Angle Editor Recovery — 2026-09-15

## Trigger

The teacher rejected the stock-looking gradient angle slider and plain numeric input. After reviewing the purpose-built replacement, the teacher requested a smaller circle so the thumb fits the available row more comfortably.

## Implemented control

- `PhysicaGradientEditor` uses the reusable `PhysicaAngleEditor`; it no longer contains a stock Avalonia `Slider` or generic standalone angle `TextBox`.
- `PhysicaAngleSlider` draws the rail, progress, five cardinal reference ticks, thumb, and focus halo in one custom control.
- The visible thumb diameter is 11 px; its focused halo is 14 px. The complete rail remains the pointer target, so visual reduction does not make dragging harder.
- The numeric field is 32 px high, integrates a visually separated degree suffix, and uses the same dark Physica property-control language as the inspector.
- Supported input: pointer drag, exact text, 1° arrow and wheel changes, 15° Shift-arrow and Page changes, Home for 0°, and End for 360°.
- The component is reusable for future shape rotation, vectors, cameras, paths, and other object formatting.

## Evidence

- Isolated Desktop build: passed with zero warnings and zero errors.
- Foundation/UI-contract suite: 113 passed, zero failed.
- Official Windows launcher: opened one responsive process, PID 14072.
- Computer controller: Not run successfully. Initialization failed before app observation after reset and retry, so no automated pointer or screenshot acceptance is claimed.

## Required teacher check

1. Confirm the smaller thumb is visually balanced at 0°, middle values, and 360°.
2. Drag across the entire rail and verify the number follows smoothly.
3. Type an exact decimal value and verify the thumb follows.
4. Use arrows, Shift+arrows, Page Up/Down, Home/End, and the pointer wheel.
5. Confirm the value field and degree suffix remain aligned at different right-panel widths.

## Reference

- `references/teacher-angle-thumb-review.png`
