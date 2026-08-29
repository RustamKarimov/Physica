# Stochastic checkpoint scrub

This executable foundation example checkpoints the complete state of a deterministic xorshift32 source together with the global runtime event-sequence position. After advancing beyond the checkpoint, replay restores both and emits the exact same four-sample tail and sequence position.

Saving only the original seed would restart the stream and produce the wrong next sample; the checked-in output makes that distinction explicit. The SVG is a trace preview, while `pending-artifacts.json` records richer artifacts gated on the renderer and gallery runtime.
