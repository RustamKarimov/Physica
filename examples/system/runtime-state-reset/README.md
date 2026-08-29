# Runtime state reset

This executable example demonstrates the hard boundary between saved project definitions and transient simulation state. One authoritative writer changes a position channel, then the Runtime State Store restores its initial values without creating a document edit.
