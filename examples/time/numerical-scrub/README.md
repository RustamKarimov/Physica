# Numerical checkpoint scrub

This executable foundation example integrates a one-dimensional falling body with a fixed 0.25 s semi-implicit Euler step. It captures full runtime and solver state at 2 s, advances to 4 s, scrubs backward to 3 s, then replays forward to 4 s. The replayed position, velocity and event-sequence position exactly match uninterrupted execution.

The SVG is an honest expected preview of the checkpoint/replay trace, not a renderer capture. `pending-artifacts.json` records the later shared project, PNG, video and gallery-runtime obligations.
