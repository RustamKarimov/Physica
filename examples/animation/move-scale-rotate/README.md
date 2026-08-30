# Move, scale and rotate

This Step 11 example schedules translation, rotation and scale on one representation. It evaluates the same immutable schedule at 0 s, 1 s, 2 s and then 1 s again, proving that reverse and scrub use the same deterministic presentation-time evaluator.

Run it from the repository root with `pnpm vitest run examples/animation/move-scale-rotate`.
