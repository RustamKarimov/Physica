# Circle to ellipse

This Step 13 example evaluates a 64-sample closed-path morph at 0 s, 2 s and 4 s. Equal arc-length resampling gives the circle and ellipse identical point cardinality; stable semantic IDs classify compatible objects as morphs and incompatible objects as explicit replacements.

The example also verifies that an open path and a closed shape do not receive fabricated intermediate geometry. They cross-fade through the typed `replace` fallback instead.

Run it from the repository root with `pnpm vitest run examples/animation/circle-to-ellipse`.
