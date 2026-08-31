# Sample once, inspect at any frame

This executable example binds a velocity observable to an explicit simulation clock and samples it every 0.5 seconds. Acquiring the interval in one coarse window or several fine windows produces byte-identical canonical samples.

The graph cursor is presentation data. Moving it to 2.25 seconds interpolates the stored samples for a readout without re-evaluating the observable or mutating the dataset.

Run its test with:

```text
pnpm exec vitest run examples/graphs/graph-live-cursor
```
