# Atomic undo and redo

This non-visual Step 5 example creates an empty framework-independent `ProjectStore`, commits one transaction that adds a Scene, Entity, and Component, then undoes and redoes that history entry. The final assertion proves stable persisted identities and exact document restoration.

Runtime frames, UI state, rendering, and filesystem I/O are intentionally outside this example.
