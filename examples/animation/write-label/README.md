# Write a Unicode-safe label

This Step 12 example writes `Force: é 👩‍🔬` by locale-aware grapheme clusters. The combined accent and scientist emoji are atomic segments, and reduced-motion evaluation exposes the full label immediately.

Run it with `pnpm vitest run examples/animation/write-label`.
