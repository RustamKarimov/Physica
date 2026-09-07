# Current State

**Product:** Physica Studio — professional native physics lesson authoring system
**Active milestone:** Phase 1 visual recovery and architecture qualification
**Review result:** The original Phase 1 shell was rejected on 2026-09-06
**Mandatory stop:** Gates A–C and explicit user approval before Phase 2
**Current activity:** Concept-01 authoring slice polished for exclusive full-screen startup and optically centered inspector sections; awaiting user visual review

The concise phase-by-phase dashboard is maintained in `docs/PHASE_PROGRESS.md`.

## Binding visual authority

The seven images in `docs/product/approved-concepts/` are the minimum visual-quality references for Physica Studio. They are not loose layout sketches. The recovered interface may improve their scientific details and usability, but it may not reduce their polish, density, legibility, icon quality, scientific artwork, or presentation quality.

The screenshots in `docs/checkpoints/phase-01/` record the rejected shell. They are retained as negative evidence and must never be used as visual baselines.

## Design specification gate

On 2026-09-07 the user stopped the iterative shell implementation because it was proceeding without a sufficiently explicit reference analysis. The user subsequently authorized regeneration from these three documents as one design package:

1. `docs/product/REFERENCE_IMAGE_ANALYSIS.md`
2. `docs/product/INTERFACE_STRUCTURE.md`
3. `docs/product/VISUAL_DESIGN_SYSTEM.md`

The machine-readable values are stored in `docs/product/visual-design-tokens.json`.

Implementation restarted with the single concept-01 authoring slice defined in `INTERFACE_STRUCTURE.md`. It has been compared directly with the approved reference, but it is not an approved baseline until the user accepts it.

## Concept-01 regeneration checkpoint

The Windows concept-01 slice now includes:

- Custom dark window chrome and compact manifest-driven Physics ribbon.
- A hybrid ribbon density model: every group exposes at most two quick commands and an always-active, full-size `More` command that reveals the complete command inventory.
- Ribbon groups use natural content widths with explicit breathing space; they no longer stretch merely to fill the available band, and visible names do not clip or split single words.
- Group galleries use the same borderless icon-and-label language as the ribbon while retaining quiet readiness labels for Planned commands without enabling unfinished product behavior.
- The desktop shell starts in exclusive full-screen mode, covering the operating-system taskbar while retaining visible minimize, restore, and explicitly named Exit controls.
- The title disclosure arrow is explicitly sized and vertically aligned with the product name.
- Distinct vector icons for every visible ribbon command.
- Five presentation-quality standing-wave lesson thumbnails.
- A retained 16:9 standing-wave scene with material supports, phase traces, node/antinode annotations, an equation card, frequency control, and legend.
- Collapsible slide, inspector, and timeline regions.
- Compact, aligned Physics, Appearance, and Bindings inspector sections with increased external spacing, bordered rounded headers, and vertically centered disclosure content.
- The inspector remains wheel-scrollable without displaying a persistent vertical scrollbar.
- Batched timeline rendering with semantic property, condition, pause, and pass-through colors.
- Quiet, honest Preview and planned-runtime status.

Windows evidence is stored in `docs/checkpoints/phase-01-recovery/`. The solution builds with zero warnings and errors, all ten foundation tests pass, and `Launch Physica.bat` opens a responsive window. Windows accessibility automation also verifies that every Physics group gallery launcher is enabled and invokable while its unfinished child commands remain disabled.

Still required before Gate A:

- User approval of concept-01.
- Animation/timeline reference slice.
- Graph/binding reference slice.
- Dark presenter reference slice.
- Light interactive presenter reference slice.
- macOS captures.

Gate B interaction qualification and Gate C performance qualification remain incomplete.

## Current execution boundary

Phase 1 is being rebuilt as five qualification slices:

1. Main authoring studio.
2. Timeline and animation workspace.
3. Graph and physics-binding workspace.
4. Dark learner presentation.
5. Light interactive presentation.

No Phase 2 project editing, animation runtime, physics solver, scientific graph engine, content pack, export system, installer, or update-channel work may begin before the recovered shell passes its visual, interaction, and performance gates and receives explicit user approval.

## Platform status

C# 14, .NET 10, and Avalonia 12.1 remain provisional. Avalonia is the native windowing, input, accessibility, and composition host; Physica owns the visible design system, ribbon, canvas, timeline, and presentation rendering.

The qualification implementation must use:

- Custom Physica control templates and vector icons rather than stock control appearance or Unicode glyphs.
- A retained scene model rendered as batches rather than one UI control per scene object.
- A viewport-based timeline rather than one UI control per keyframe.
- Compiled bindings.
- Lazy, indexed content contracts suitable for multi-gigabyte installations and projects.

If the recovered shell cannot meet the approved visual references and performance targets on Windows and macOS after one focused optimization cycle, Phase 2 remains blocked and the Desktop implementation moves to Qt Quick/C++ behind the same UI-independent contracts.

## Session protocol

At the start of every session:

1. Verify `origin` is `https://github.com/RustamKarimov/Physica.git`.
2. Stop if the working tree contains unexplained edits.
3. Fetch remote changes and compare local `HEAD` with `origin/main`.
4. Fast-forward only; never discard local work.
5. Read this file, the constitution, decisions, and the owning subsystem specification.

At the end of a substantial session, run relevant tests and builds, update this file and feature status, commit, push, and verify matching local/remote commit IDs.

## Legacy preservation

The prior JavaScript/Tauri Physica implementation is not an architectural foundation for this product. It remains recoverable through:

- GitHub tag `legacy/pre-studio-rebuild-2026-09-06` at legacy committed state `f3130285a29889b69f61d72673b615c94402c1bd`.
- GitHub tag `legacy/phase13-wip-2026-09-06` containing the saved uncommitted Phase 13 work.
- Verified local bundle `D:\Programming\Codex\Physica-Legacy-Backup-20260906\Physica-legacy-all.bundle`.
- Local tracked-change patch `D:\Programming\Codex\Physica-Legacy-Backup-20260906\legacy-tracked-wip.patch`.

## Preserved foundation

- Legacy recovery bundle and remote tags verified.
- New orphan history created.
- .NET 10 SDK installed and pinned.
- Architecture boundaries, governance, dependency ledger, and cross-platform project layout established.
- Seven approved concept images preserved under `docs/product/approved-concepts/`.
- The manifest-driven inventory of 13 primary ribbon tabs, all approved command groups, and 15 contextual categories remains reusable.
- The localization foundation, feature readiness model, launch scripts, cross-platform CI, and domain package boundaries remain valid.
- The rejected Desktop XAML, placeholder icon mapping, and simplistic scientific artwork are not compatibility surfaces.

## Explicitly not complete

- Phase 1 visual qualification.
- Windows/macOS screenshot baselines for the recovered shell.
- Interaction qualification.
- Performance qualification.
- User approval of the recovered shell.

- Project editing and persistence.
- Physics solvers and objects.
- Scientific graphs and observables.
- Timeline mutation and animation rendering.
- Export, installers, and update channel.

Those capabilities remain visible as Planned. No documentation or feature status may describe Phase 1 as complete until all five qualification conditions are satisfied.
