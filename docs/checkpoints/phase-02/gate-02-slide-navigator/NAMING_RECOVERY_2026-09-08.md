# Slide and Section Naming Recovery — 2026-09-08

**Acceptance state:** UI wired — launcher-driven Computer interaction verification not available
**Tested code commit:** `d32e3c1d3d32e334f2a9ba84e9168741c23ff907`
**Platform:** Windows x64, launcher smoke check; display-scale interaction runs not completed
**Starting commit:** `65ae9ce2f729465c72518046b74aa3b3ad2c4b8e`

## Teacher workflows implemented

- Rename the active slide using the visible pencil action in the slide navigator toolbar.
- Rename a slide by double-clicking its displayed name or pressing F2 while the navigator is active.
- Rename a section using the visible pencil action beside its heading or by double-clicking the heading.
- Commit an inline name with Enter or by leaving the field; cancel with Escape.
- Preserve teacher-entered names through insertion, movement, undo, redo, save, and reopen.
- Renumber only system-generated `Slide n` and `Section n` names according to current visual order.
- Order automatic section names by the first slide belonging to each section, so creating a section near the top after one at the bottom produces `Section 1` at the top and `Section 2` below.
- Treat projects saved before the naming-mode property existed as custom-named, preventing old teacher titles from being overwritten.

## Automated evidence

| Layer | Result | Coverage |
| --- | --- | --- |
| Model/service | Pass | Automatic slide and section numbering, custom-name preservation, undo/redo, serialization, and legacy JSON behavior |
| UI structure | Pass | Visible rename actions, inline editors, accessibility names, double-click handlers, and F2 wiring are present in the compiled shell |
| Rendered output | Not run | Computer screenshot capture was unavailable |
| End-to-end | Partial | `Launch Physica.bat` started the expected binary and the process reported responsive; real pointer and keyboard rename actions were not executed |

Full solution build: zero warnings and zero errors. Foundation suite: 53 passed, 0 failed.

## Blocking verification failure

The Computer controller failed before it could enumerate or control Windows surfaces. The initial call, retry, reset, and final retry ended with `windows sandbox failed: helper_unknown_error: setup refresh had errors`. No pointer, keyboard, focus, or screenshot result is inferred from the successful build or process check.

## Required acceptance run

1. Launch with `Launch Physica.bat`.
2. Select a slide and use the toolbar pencil, double-click, and F2 routes separately.
3. Create sections at the bottom and then near the top; confirm positional automatic numbering.
4. Rename both sections, move their slides, undo, redo, save, close, and reopen.
5. Confirm custom names remain unchanged and empty names are rejected.

Gate 2 remains open until this real interaction run and the other navigator requirements pass.
