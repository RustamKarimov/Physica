# Phase 2 Acceptance Matrix

**Phase status:** In progress — acceptance recovery
**Current gate:** Gate 3 — Complete Phase 2 (retained-canvas slice)
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
| One document-driven scene output feeds editor, thumbnail, presenter preview, and export boundary | UI wired | Architecture assertions pass; Computer side-by-side capture is Not run | Architecture test and side-by-side captures from one document |
| Blank slide thumbnail is truly blank | UI wired | Empty documents build zero layers; launcher capture is Not run | Launcher capture and rendered-image assertion |
| Edited slide thumbnail exactly reflects slide content | UI wired | Text/shape/background mappings pass contract tests; application comparison is Not run | Text, shape, image, and background comparison |
| Duplicate is visually identical with independent IDs | UI wired | Primitive equivalence and independent IDs pass; pixel comparison is Not run | ID assertion and pixel comparison before/after editing the copy |
| Thumbnail preserves slide aspect ratio and consistent dimensions | UI wired | Responsive 16:9/4:3 layout checks pass; live resize and display-scale runs are Not run | 16:9 and alternate-size checks at 100%, 125%, 150%, and 200% scaling |
| Thumbnail invalidates after every visible mutation | UI wired | Edit/background/undo/redo revision tests pass; real-control and reopen evidence is Not run | Edit, undo, redo, background, reorder, and reopen scenarios |
| Gate 1 user approval | Not run | All preceding rows must pass | Review captures and user decision |

Gate 1 working-tree evidence: `docs/checkpoints/phase-02/gate-01-shared-renderer/README.md`. The Computer controller failed before any input with a Windows sandbox-helper error, so no row is promoted to Interaction verified. On 2026-09-09 the user manually reviewed the repaired thumbnails and navigator and explicitly authorized progression to the next part. That authorization opens Gate 3 implementation, but it does not erase the missing controlled captures, DPI run, or macOS evidence.

## Gate 2 — Slide navigator

| Requirement | Current state | Blocking finding | Required evidence |
| --- | --- | --- | --- |
| Single selection and active-slide behavior | UI wired | Selection now updates stable thumbnail instances; real click/focus proof is Not run | Computer-driven click/focus run and accessibility-state check |
| Ctrl/Command toggle selection | UI wired | Corrected surface preserves modifier input; real workflow is Not run | Real modifier-click workflow on Windows and macOS |
| Shift range selection with stable anchor | UI wired | Prior native-drag crash is removed and stable-instance regressions pass; real modifier gesture is Not run | Forward and reverse ranges with visual-state assertions |
| Direct thumbnail drag, threshold, and insertion indicator | UI wired | Internal pointer-capture drag and before/after indicators compile; application-level proof is Not run | Drag from thumbnail body with before/after captures |
| Automatic scrolling during drag | UI wired | Edge-scroll logic is connected; sustained real pointer behavior is Not run | Drag first/last slides beyond the visible viewport |
| Contiguous and non-contiguous selected-slide movement | UI wired | Selected-block command and internal gesture are connected; visual drop, undo, and redo proof is Not run | Ordered-ID assertions, visual drop proof, undo, and redo |
| Delete, duplicate, reorder, undo, and redo respect selection/focus context | UI wired | Window-level keyboard behavior is unverified | Navigator, text-editing, canvas, and no-selection scenarios |
| Sections support create, rename, collapse, reorder, reassignment, and removal | UI wired | All commands and visible controls are wired; real popup, pointer, keyboard, round-trip, and accessibility proof remain missing | Full section workflow, round trip, undo, and redo |
| Gate 2 user approval | Not run | Gate 1 and all preceding Gate 2 rows must pass | Review captures and user decision |

Navigator correction evidence: `docs/checkpoints/phase-02/gate-02-slide-navigator/README.md`, `docs/checkpoints/phase-02/gate-02-slide-navigator/CRASH_RECOVERY_2026-09-08.md`, `docs/checkpoints/phase-02/gate-02-slide-navigator/NAMING_RECOVERY_2026-09-08.md`, and `docs/checkpoints/phase-02/gate-02-slide-navigator/SECTION_MANAGEMENT_2026-09-09.md`. Latest tested correction commit: `efc82d4`.

The user manually reviewed the corrected Windows navigator on 2026-09-09 and authorized progression. Exact launcher-driven scenario captures remain acceptance debt because the Computer controller could not initialize.

## Gate 3 — Complete Phase 2

| Requirement | Current state | Blocking finding | Required evidence |
| --- | --- | --- | --- |
| Canvas selection, multi-selection, transforms, layers, grouping, lock, and hide | UI wired | The user accepted the corrected marquee and PowerPoint-style resize modifiers. Layers now provides synchronized selection, rename, visibility, lock, direct reorder and z-order commands; grouping and controlled cross-platform evidence remain incomplete | Real Layers workflow, grouping workflow, and one undo entry per gesture |
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
| Model/service and render contracts | 74 passed on 2026-09-09. New layer scenarios cover range selection, atomic multi-object reordering, lock/visibility/rename validation, boundary movement, view-model synchronization, and undo | Validation, serialization, command results, history, selection stability, transform authority, resize modifier geometry, layer order, automatic/custom naming, section semantics, snapping calculations, scene mapping, aspect math, and invalidation | Real pointer, keyboard, focus, pixel equivalence, drag/drop, or usability |
| UI component | 8 canvas-render/geometry scenarios pass; structural scenarios verify canvas and Layers event wiring, including visibility, lock, inline rename, and direct pointer reorder routes | Geometry-aware surface behavior and static reachability of real controls | Actual pointer capture, modifier input, complete lifecycle, or cross-platform behavior |
| Rendered output | No accepted gate evidence | Aspect ratio, content equivalence, invalidation, visual regression | Usability or user approval |
| End-to-end | The user manually accepted corrected canvas behavior. Layers commit `f1d377b` passed 74 checks and launcher-started process 26892 was responsive. Computer initialization failed twice before input with Windows sandbox-helper errors, so no controlled Layers input was captured | Process startup and the user's canvas acceptance | Layers pointer behavior, visual equivalence, cross-platform behavior, or Layers user approval |

## Required gate record

Record the commit and dirty state; OS, architecture, resolution, and scale; launcher; scenario IDs and exact actions; expected and observed results; tests separated by evidence layer; evidence paths; failures, limitations, and user decision.
