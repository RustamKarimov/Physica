# Phase 1 Visual Recovery — Concept 01 Checkpoint

**Date:** 2026-09-07  
**Scope:** Standing-wave authoring studio only  
**Status:** Implemented on Windows; awaiting user visual approval  
**Gate status:** Gate A partial; Gates B and C incomplete

## Evidence

- `concept-01-comparison.png` — approved reference and regenerated application side by side.
- `concept-01-regenerated-1672x941.png` — normalized comparison viewport.
- `concept-01-regenerated-native.png` — native Windows DPI capture at 1942 × 1102.
- `concept-01-grouped-ribbon-1672x941.png` — normalized compact grouped-ribbon state.
- `concept-01-grouped-ribbon-native.png` — native grouped-ribbon state.
- `concept-01-objects-gallery-open-1672x941.png` — normalized proof of the expanded Objects command gallery.
- `concept-01-objects-gallery-open-native.png` — native proof of the expanded Objects command gallery.
- `concept-01-ribbon-refined-1672x941.png` — normalized evenly spaced ribbon with full command names and integrated More launchers.
- `concept-01-ribbon-refined-native.png` — native refined-ribbon capture.
- `concept-01-ribbon-refined-gallery-1672x941.png` — normalized proof of the borderless ribbon-style Objects gallery.
- `concept-01-ribbon-refined-gallery-native.png` — native refined-gallery capture.

The screenshots are captured from the running Avalonia application. The approved concept image is not embedded in the application.

## Implemented in this slice

- 30 px custom title bar and quick-access controls.
- 32 px ribbon tabs with Physics selected.
- 88 px compact Physics ribbon organized into Clipboard, Objects, Environment, Measurements, Representations, Constraints, and Validate.
- Hybrid ribbon groups show at most two quick commands plus an always-active, full-size More command; each launcher opens the complete icon gallery for that group.
- Groups divide the command band evenly rather than bunching together, and command widths adapt within controlled bounds so full names remain readable.
- Planned commands remain visible with explicit status inside a borderless ribbon-style gallery but do not claim unfinished functionality.
- Distinct vector icons rather than Unicode command glyphs.
- 224 px collapsible slide dock with five rendered lesson thumbnails.
- Fluid center workbench with a retained 16:9 scientific scene.
- 344 px collapsible contextual inspector.
- 260 px collapsible batched timeline.
- 24 px status bar with honest Preview and planned-runtime state.
- Material standing-wave supports, phase envelope, nodes, antinode, equilibrium line, frequency control, equation, and legend.

## Verification

- `dotnet build PhysicaStudio.slnx --no-restore`: passed with zero warnings and zero errors.
- `dotnet test PhysicaStudio.slnx --no-restore`: 9 passed, 0 failed.
- `Launch Physica.bat`: opened a responsive `Physica Studio` window.
- Windows UI Automation invoked `Show all Objects commands` successfully and confirmed all seven Physics group launchers are enabled.
- Native and normalized screenshots captured from the launcher-started process.

## Honest limitations

- The scene, values, inspector, ribbon, and timeline are visual shell data. No physics runtime or authoring mutation is claimed.
- The approved reference uses a visually wider paper surface than a true 16:9 slide. Physica preserves the product requirement for a real 16:9 presentation canvas.
- Animation, graph, and presenter slices remain unapproved experimental work and are not part of this checkpoint.
- macOS fidelity, interaction qualification, performance ceilings, and accessibility automation are not yet complete.
- Gate A remains open until the user approves this slice and the remaining four slices are reviewed.
