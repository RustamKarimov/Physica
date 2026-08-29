# Deterministic runtime events

This executable example queues three same-time runtime events from different scheduler phases. Stable ordering is independent of insertion order, and an event emitted by a physical-event handler is intentionally processed in the next cycle.
