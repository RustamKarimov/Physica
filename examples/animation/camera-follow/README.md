# Camera follows, physics does not move

This Step 14 example samples a projectile at 0 s, 2 s and 4 s, then resolves parallel follow-target and orthographic zoom operations from the presentation clock. The checked-in output proves equal-time determinism and records the world trajectory before and after Camera resolution.

Camera motion changes only the view. It does not write physical coordinates, advance a clock or mutate Runtime State Store state.

Run it from the repository root with pnpm vitest run examples/animation/camera-follow.
