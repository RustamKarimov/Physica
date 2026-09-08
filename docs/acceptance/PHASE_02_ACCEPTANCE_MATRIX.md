# Phase 2 Acceptance Matrix

**Phase status:** In progress — acceptance recovery
**Current gate:** Gate 1 — Shared renderer
**Later-phase work:** Blocked until all three gates are user accepted
**Binding procedure:** `skills/physica-acceptance-audit/SKILL.md`

## State definitions

| State | Meaning |
| --- | --- |
| Model only | Backend contract or command exists without a complete teacher workflow. |
| UI wired | Reachable in the real interface, but interaction evidence is incomplete or failing. |
| Interaction verified | Application-level tests and launcher-driven Computer checks pass on required available platforms. |
| User accepted | The user approved the named gate after reviewing evidence. |
| Not implemented | Required behavior does not exist. |
| Not run | Required verification has not been performed. |

No row advances from a test count alone. Every Interaction verified row requires an evidence link, tested commit, platform, and display scale.

## Gate 1 — Shared renderer

| Requirement | Current state | Blocking finding | Required evidence |
| --- | --- | --- | --- |
| One document-driven scene output feeds editor, thumbnail, presenter preview, and export boundary | Not implemented | Editor and thumbnail still have separate/static paths | Architecture test and side-by-side captures from one document |
| Blank slide thumbnail is truly blank | UI wired | Blank variant exists but is not document-rendering proof | Launcher capture and rendered-image assertion |
| Edited slide thumbnail exactly reflects slide content | Not implemented | Thumbnail renderer does not consume arbitrary scene nodes | Text, shape, image, and background comparison |
| Duplicate is visually identical with independent IDs | Model only | Document duplication is tested; rendered equivalence is not | ID assertion and pixel comparison before/after editing the copy |
| Thumbnail preserves slide aspect ratio and consistent dimensions | Failing | Navigator layout does not reliably enforce slide ratio | 16:9 and alternate-size checks at 100%, 125%, 150%, and 200% scaling |
| Thumbnail invalidates after every visible mutation | Not implemented | No authoritative render-cache invalidation path | Edit, undo, redo, background, reorder, and reopen scenarios |
| Gate 1 user approval | Not run | All preceding rows must pass | Review captures and user decision |

## Gate 2 — Slide navigator

| Requirement | Current state | Blocking finding | Required evidence |
| --- | --- | --- | --- |
| Single selection and active-slide behavior | UI wired | No application-level focus/pointer proof | Computer-driven click/focus run and accessibility-state check |
| Ctrl/Command toggle selection | UI wired | Only direct session tests prove ID changes | Real modifier-click workflow on Windows and macOS |
| Shift range selection with stable anchor | UI wired | Gesture and anchor behavior are unverified | Forward and reverse ranges with visual-state assertions |
| Direct thumbnail drag, threshold, and insertion indicator | Failing | Current workflow relies on a small handle and incomplete feedback | Drag from thumbnail body with before/after captures |
| Automatic scrolling during drag | Not implemented | No accepted edge-scroll behavior | Drag first/last slides beyond the visible viewport |
| Contiguous and non-contiguous selected-slide movement | Model only | Command exists; UI and product semantics are incomplete | Ordered-ID assertions, visual drop proof, undo, and redo |
| Delete, duplicate, reorder, undo, and redo respect selection/focus context | UI wired | Window-level keyboard behavior is unverified | Navigator, text-editing, canvas, and no-selection scenarios |
| Sections support create, rename, collapse, reorder, reassignment, and removal | Model only | Only basic creation/assignment is available | Full section workflow, round trip, undo, and redo |
| Gate 2 user approval | Not run | Gate 1 and all preceding Gate 2 rows must pass | Review captures and user decision |

## Gate 3 — Complete Phase 2

| Requirement | Current state | Blocking finding | Required evidence |
| --- | --- | --- | --- |
| Canvas selection, multi-selection, transforms, layers, grouping, lock, and hide | Model only | Backend commands lack an accepted authoring canvas | Real pointer/keyboard workflow with one undo entry per gesture |
| Pan, zoom, fit, viewport persistence, and focus | Not implemented | Fixed reference surface is not a functional viewport | Mouse, touchpad, keyboard, fit, and boundary scenarios |
| Guides, grid, margins, safe areas, and snapping | Model only | Logical snapping is not exposed or DPI-tested | Visible controls and drag/resize assertions across zoom levels |
| Save, close without exiting, reopen, and exact round trip | UI wired | Complete lifecycle and edited-scene proof are missing | Launcher workflow and document/render comparison |
| Autosave, recovery chooser, and Save/Discard/Cancel | Not implemented | Recovery foundation lacks the complete teacher UX | Crash, unsaved, and clean-save scenarios with original-file protection |
| Windows DPI verification | Not run | Required scales lack evidence | 100%, 125%, 150%, and 200% captures and interaction logs |
| Apple Silicon macOS verification | Not run | No macOS acceptance run | Equivalent launcher and workflow evidence |
| Representative Phase 2 lesson | Not implemented | No accepted end-to-end authoring project | Create, edit, organize, save, reopen, recover, and continue |
| Gate 3 user approval | Not run | Every Phase 2 requirement must pass | Final review package and user decision |

## Automated evidence ledger

| Layer | Current evidence | May prove | Does not prove |
| --- | --- | --- | --- |
| Model/service | Existing suite contributes to the previously reported 31 tests; refresh exact counts at the next successful run | Validation, serialization, command results, history, snapping calculations | Pointer, keyboard, focus, layout, rendering, drag/drop, or usability |
| UI component | No accepted gate evidence | Real-control input and visual-state changes | Complete lifecycle or cross-platform behavior |
| Rendered output | No accepted gate evidence | Aspect ratio, content equivalence, invalidation, visual regression | Usability or user approval |
| End-to-end | No accepted gate evidence | Real launcher workflow across components | User approval by itself |

## Required gate record

Record the commit and dirty state; OS, architecture, resolution, and scale; launcher; scenario IDs and exact actions; expected and observed results; tests separated by evidence layer; evidence paths; failures, limitations, and user decision.
