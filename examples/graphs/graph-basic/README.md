# Compare motion on one set of axes

This executable example builds a unit-aware displacement–time dataset with measured and modelled series. It persists both the dataset and graph through the root project envelopes, then resolves the graph into renderer-neutral screen-layout coordinates.

The two curves use solid and dashed line styles so the comparison does not depend on colour alone. A measured sample is marked and the expected preview includes an explicit legend and accessible summary.

Run its test with:

```text
pnpm exec vitest run examples/graphs/graph-basic
```
