# Phase 2 Gate 3 — Canvas Viewport

**Tested commit:** `8025ca2`  
**Date:** 2026-09-13  
**Platform:** Windows x64  
**Readiness:** UI wired — teacher interaction not yet accepted

## Teacher-visible behavior

- The canvas starts in Fit Slide mode and recalculates that fit when side panels or the timeline change the available workspace.
- The status bar provides compact zoom-out, zoom percentage/options, zoom-in, and Fit Slide controls.
- The zoom menu exposes Fit Slide, Fit Width, actual size, and 25%, 50%, 75%, 100%, 150%, 200%, 400%, and 800% presets.
- The View ribbon's Zoom command opens the same authoritative menu; Fit applies Fit Slide.
- Ctrl/Command+wheel zooms around the pointer. Ordinary wheel input pans vertically; Shift+wheel pans horizontally.
- Middle-drag or Space+left-drag pans the slide without moving selected objects.
- Ctrl/Command+0 fits the slide; Ctrl/Command+1 selects actual size.
- Every slide retains its own view while the project remains open. Changing projects resets the viewport to Fit Slide.
- Viewport state remains in the Desktop session. It does not enter `.physica`, add an undo entry, or make the lesson dirty.
- Zoom is bounded from 10% to 800%; panning is clamped so at least part of the slide remains recoverable.
- Selection outlines, handles, and hit tolerances remain constant in screen pixels while slide artwork scales.

## Evidence by layer

| Layer | Scenarios | Result |
| --- | --- | --- |
| Viewport geometry/session | Fit Slide, Fit Width, pointer anchoring, pan limits, per-slide restoration, project reset, minimum/maximum zoom, and constant-screen overlay measurements | 10 passed |
| UI structure | Real viewport host, compact controls, zoom menu, View-ribbon commands, wheel input, middle/Space pan, and keyboard routes | Passed |
| Full repository | Build and all tests, including the corrected unordered grouping-selection assertion | 91 passed, 0 failed |
| Launcher | `Launch Physica.bat` produced one responsive committed window; a second invocation exited successfully and reported the existing instance | Passed — process 14500 |
| Computer interaction | Initialization, reset, and retry | Not run — Windows helper exited before application observation |

These results do not prove pointer capture, touchpad interpretation, visual smoothness, focus behavior, or teacher usability.

## Teacher review scenario

1. Confirm the slide initially fits the available canvas without being cropped.
2. Use the status-bar minus, percentage menu, plus, and Fit controls. Test Fit Slide, Fit Width, 25%, 100%, 200%, and 800%.
3. Place the pointer over a recognizable object and use Ctrl+wheel. Confirm that object remains under the pointer while zooming.
4. Use the wheel to pan vertically and Shift+wheel to pan horizontally.
5. Pan with the middle mouse button. Then hold Space and left-drag. Confirm neither gesture moves a slide object or creates an undo entry.
6. Select and transform an object at 25%, 100%, and 200%. Confirm selection handles stay the same screen size and remain easy to target.
7. Set two slides to visibly different zoom/pan positions, switch between them, and confirm each view is restored.
8. Collapse and reopen the Slides, Inspector, and Timeline panels while in Fit Slide and Fit Width. Confirm the slide recalculates cleanly.
9. Focus the canvas and test Ctrl+0 and Ctrl+1.
10. Pan extremely far in every direction and confirm part of the slide always remains visible.

## Known limitations and blockers

- Computer-based pointer and screenshot verification could not start because the Windows helper failed before it could observe the app.
- No controlled Windows DPI series or Apple Silicon macOS run exists.
- Touchpad gesture interpretation depends on the platform's wheel-event translation and needs real-device evidence.
- This slice does not activate rulers, grids, guides, snapping, margins, safe areas, themes, backgrounds, or slide-size editing.
- The row cannot advance beyond UI wired until the teacher review scenario passes.
