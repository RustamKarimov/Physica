# Phase 2 Recovery — Gate 1 Shared Renderer

**Date:** 2026-09-08  
**Result:** Implementation and contract tests pass; acceptance remains open  
**Tested working tree base:** `140b2983369fbbbaf7f8018390ada1e45892aba1`  
**Platform:** Windows 11 Pro 64-bit, build 10.0.26200, .NET SDK 10.0.400  
**Launcher:** `Launch Physica.bat`

## Implemented authority

- `SlideDocument` now stores typed visual content and appearance for text, paths, shapes, images, and scientific representations.
- `SlideSceneSnapshotBuilder` converts one lesson/slide document into an immutable `SceneSnapshot` export boundary.
- The main editor, every navigator thumbnail, and the current-slide presenter preview bind to that same snapshot type and render through `DocumentSceneSurface`.
- The five reference slides are real scene-node documents. The former hard-coded editor and thumbnail controls were removed.
- Blank slides contain no render layers and therefore produce blank editor and thumbnail surfaces.
- Duplicate slides receive independent slide/node IDs while preserving equivalent render primitives.
- Preview dimensions derive from the authoritative project canvas rather than a portrait thumbnail constant.
- Authoring-session revisions rebuild editor and thumbnail snapshots after visible commands, undo, and redo.

## Scenario evidence

| ID | Scenario | Expected | Observed evidence | State |
| --- | --- | --- | --- | --- |
| G1-01 | Shared output | Editor, thumbnail, presenter, and later export consume one snapshot contract | Architecture assertions pass; all three live views bind `SceneSnapshot` | UI wired |
| G1-02 | Blank slide | No invented wave or placeholder content | Empty document builds zero render layers | UI wired |
| G1-03 | Edited content/background | Geometry and background changes reach editor and thumbnail; undo/redo restore them | Revision/invalidation assertions pass | UI wired |
| G1-04 | Duplicate | Same visual result with independent IDs | Primitive equivalence and identity assertions pass | UI wired |
| G1-05 | Aspect ratio | Preview follows the lesson canvas | 16:9 view-model and alternate 4:3 snapshot assertions pass | UI wired |
| G1-06 | Image boundary | Image nodes retain their project asset identity and opacity | Snapshot image-reference assertions pass; bitmap decoding belongs to the Phase 3 media implementation | UI wired |
| G1-07 | Launcher | Real development launcher starts a responsive process | `PhysicaStudio.Desktop` started and reported responsive | Process verified only |

## Automated evidence by layer

| Layer | Result | Scope |
| --- | --- | --- |
| Model/service and render contracts | 39 passed, 0 failed | Document validation/round trip, package/history commands, snapshot mapping, duplicate identity, aspect ratios, invalidation, undo/redo |
| UI component interaction | Not run | Requires real pointer/focus evidence |
| Rendered pixel output | Not run | No accepted screenshot/pixel-baseline evidence in this run |
| End-to-end teacher workflow | Not run | The launcher process check is not interaction proof |

Commands:

```text
dotnet test PhysicaStudio.slnx --no-restore --logger "console;verbosity=minimal"
```

## Blocking verification failure

The Computer controller failed during initialization before any application input. The first attempt, prescribed retry, reset, and final retry all ended with:

```text
windows sandbox failed: helper_unknown_error: setup refresh had errors
```

No pointer, keyboard, focus, screenshot, DPI, or presenter-navigation result is inferred from that failure. Computer verification is therefore **Not run**, not passed. The application was launched visibly for manual observation, but that is not promoted to interaction evidence until the required workflow is recorded.

## Remaining gate work

1. Recover the Computer controller and capture editor/thumbnail/presenter side-by-side evidence from the launcher-started application.
2. Exercise blank, edited, duplicate, background, undo, redo, and presenter scenarios with real controls.
3. Capture the required Windows display-scale evidence.
4. Resolve any application-level mismatch found by those runs.
5. Request explicit user approval. Do not start Gate 2 before this gate is accepted.
