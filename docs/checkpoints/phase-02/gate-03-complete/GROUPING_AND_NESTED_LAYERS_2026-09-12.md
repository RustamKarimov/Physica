# Phase 2 Gate 3 — Grouping and Nested Layers

**Tested commit:** `cecb3e4`  
**Date:** 2026-09-12  
**Platform:** Windows x64  
**Readiness:** UI wired — teacher interaction not yet accepted

## Behavior implemented

- Group and Ungroup are reachable from the Layers toolbar and through Ctrl+G / Ctrl+Shift+G while the canvas or Layers pane has focus.
- Only two or more siblings at the same hierarchy level can be grouped. Nested groups are supported by grouping an existing group with one of its siblings.
- A group is a real persisted document node with a stable ID and `ParentId` relationships. It is not a temporary selection or a drawn placeholder box.
- Layer rows indent by hierarchy depth and group rows expand or collapse without changing the document.
- Canvas hit testing and marquee selection treat the top-level group as one object. The Layers pane can still select a child for precise editing.
- Group transforms are stored once and composed into descendant render snapshots. Visibility and locking are inherited.
- Reordering is restricted to siblings, and a group subtree stays contiguous.
- Delete removes the selected group subtree atomically. Ungroup removes only the container, preserves the rendered result, and selects its released children.
- Group, transform, reorder, delete, and ungroup operations participate in the normal single-command undo/redo history.
- Automatic group names remain unique after ungrouping or regrouping.

## Evidence by layer

| Layer | Scenarios | Result |
| --- | --- | --- |
| Model/command | Atomic group/ungroup and history; nested parent relationships; inherited visibility/lock/transform; subtree deletion; sibling-only ordering; package round trip | Passed |
| Shared renderer | Group emits no fake primitive; descendants compose container state; group bounds derive from descendant output; ungroup preserves output bounds | Passed |
| UI structure | Group/Ungroup actions, readiness, hierarchy disclosure, indentation, icons, tooltips, and keyboard routes are present in the compiled desktop shell | Passed |
| Full repository | Build and test of all projects | 80 passed, 0 failed |
| Launcher | `Launch Physica.bat` produced one responsive `PhysicaStudio.Desktop` window | Passed — process 9804 |
| Computer interaction | Initialization, clean reset, and retry | Not run — Windows helper exited before it could observe or operate the app |

Automated evidence does not prove click targets, modifier handling, drag feel, disclosure clarity, transform feel, or usability.

## Teacher review scenario

1. Open **Layers** and Ctrl-select two sibling object rows.
2. Click the Group icon. Confirm one group row appears, the children are indented, and the group alone is selected.
3. Use the group chevron to collapse and expand its children.
4. Drag, resize, and rotate the selected group on the canvas. Confirm every child moves together and one Undo restores the whole gesture.
5. Hide and show the group, then lock it. Confirm all children follow and cannot be transformed while the group is locked.
6. Reorder the group in Layers. Confirm its children remain inside it and move as one contiguous block.
7. Select the group and click Ungroup. Confirm the visible scene does not jump and the released children remain selected.
8. Create a nested group by grouping one existing group with a sibling; repeat collapse, transform, Undo, and Ungroup.

## Known limitations and blockers

- The Computer controller failed before application input with a Windows sandbox-helper startup error after the required reset and retry. This is tooling evidence, not interaction success.
- No macOS grouping run or controlled Windows DPI run exists.
- Selection outlines remain axis-aligned after rotation.
- The current 2D transform contract does not expose affine shear; non-uniform scaling combined with nested rotation is therefore intentionally constrained to the existing bounds-and-rotation representation.
- Grouping cannot advance to Interaction verified or User accepted until the teacher review scenario is completed.
