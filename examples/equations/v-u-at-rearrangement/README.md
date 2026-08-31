# Rearrange without losing the terms

This Phase 4 Step 4.2 example transforms `v=u+at` into `v-u=at`. Physica compares the simplified residuals, records `VERIFIED_EQUIVALENT` only after the pinned Compute Engine establishes equality, and keeps that proof status separate from the semantic-node correspondence used for presentation.

The executable output also builds a renderer-neutral FLIP plan, evaluates exact start/mid/end frames and round-trips the V1 transform envelope. Moving terms changes presentation geometry only; it does not write physics state or infer assumptions.

Run it from the repository root with `pnpm vitest run examples/equations/v-u-at-rearrangement`.
