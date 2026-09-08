# Current State

**Product:** Physica Studio — professional native physics lesson authoring system
**Active milestone:** Phase 2 project and slide foundation
**Review result:** The original Phase 1 shell was rejected on 2026-09-06
**Phase 1 decision:** Main authoring shell accepted for continued development on 2026-09-07; remaining qualification debt retained
**Current activity:** Phase 2 acceptance recovery; Gate 1 shared-renderer implementation is UI wired, but production feature work remains frozen until Computer interaction evidence and user approval pass

The concise phase-by-phase dashboard is maintained in `docs/PHASE_PROGRESS.md`. The binding Phase 2 implementation plan is `docs/implementation/PHASE_02_PROJECT_SLIDE_FOUNDATION_SPEC.md`.
The full offline feature dashboard is `PROJECT_PROGRESS.html`, styled by `project-progress.css`. It must stay synchronized with readiness changes.
The binding visible-feature verification procedure is `skills/physica-acceptance-audit/SKILL.md`. Phase 2 evidence and blocking status are maintained in `docs/acceptance/PHASE_02_ACCEPTANCE_MATRIX.md`.

## Acceptance-control system

The user rejected test-count-based completion claims on 2026-09-08. All user-visible work now advances through four acceptance states: **Model only**, **UI wired**, **Interaction verified**, and **User accepted**.

- A build or unit-test result proves only the layer it exercises.
- Actual pointer, keyboard, focus, scrolling, resizing, and drag-and-drop workflows require launcher-driven application evidence.
- Computer-driven verification is required when the Computer capability and its instructions are available.
- A failed blocking matrix row prevents later-phase work.
- Phase 2 has three mandatory user checkpoints: shared renderer, slide navigator, and complete Phase 2.
- Chat reports must separate model/service, UI component, rendered-output, and end-to-end results rather than reporting only a total test count.
- Development launchers now refuse to start a second Physica process. Windows checks for `PhysicaStudio.Desktop.exe`; macOS checks the corresponding process command. A repeated launch reports that the app is already running and exits successfully instead of reaching `dotnet run` and producing a locked-file build error.

## Phase 2 Gate 1 implementation status

The shared-renderer implementation now converts the authoritative `SlideDocument` into one immutable `SceneSnapshot`. The editor, navigator thumbnails, and current-slide presenter preview consume that same snapshot type through one renderer. The five standing-wave reference slides are document scene nodes; the former hard-coded editor and thumbnail controls have been removed. Blank slides render without invented content, duplicated slides preserve visual primitives with independent IDs, canvas aspect ratio drives preview dimensions, and authoring revisions invalidate the editor and thumbnail snapshots.

The full solution currently reports 39 passing tests and zero failures. This proves model/service and render-contract behavior only. It includes document visual validation and round trips, shared snapshot mapping, blank/duplicate/aspect cases, image asset-reference propagation, and invalidation across edits, undo, and redo.

Gate 1 is **not accepted**. The Computer controller failed before application input on its initial attempt, retry, reset, and final retry with `windows sandbox failed: helper_unknown_error: setup refresh had errors`. The real launcher started a responsive process, but pointer, focus, screenshot, DPI, and presenter workflow evidence remain Not run. See `docs/checkpoints/phase-02/gate-01-shared-renderer/README.md`.

Gate 2 must not begin until Gate 1 has application-level evidence and explicit user approval.

The user then reported that the real navigator could not select even one slide, could not start a drag, and kept fixed-size thumbnails when the left panel was resized. A first correction addressed those visible symptoms but retained an invalid interaction architecture. The subsequent real-app failure was captured as an unhandled Windows COM exception from Avalonia native drag/drop after selection rebuilt the pointer's source visual.

Commit `5499ea5b59bfeae9387e41a8458889f5d0e421f8` removes native OLE drag/drop, implements synchronous internal pointer-capture reordering with insertion targeting and edge scrolling, keeps thumbnail instances stable during selection, removes duplicate scene rebuilds, and contains gesture exceptions. The solution builds with zero warnings/errors; three focused regressions and all 46 tests pass. Computer initialization still fails before application input, so the correction remains **UI wired**, not Interaction verified. Detailed evidence is in `docs/checkpoints/phase-02/gate-02-slide-navigator/CRASH_RECOVERY_2026-09-08.md`.

Commit `d32e3c1d3d32e334f2a9ba84e9168741c23ff907` adds persisted automatic-versus-custom naming, position-based renumbering for slides and sections, backward-compatible project loading, and explicit rename workflows. Slides can be renamed from a visible navigator-toolbar pencil, by double-clicking the slide name, or with F2. Section headings expose their own pencil and double-click editor. Enter or focus loss commits; Escape cancels. Teacher names become custom and remain unchanged when items are inserted or moved. Only automatic names are recalculated from current visual order.

The solution builds with zero warnings/errors and all 53 foundation tests pass, including six focused naming/compatibility scenarios and UI-structure coverage. `Launch Physica.bat` started the expected responsive binary. The Computer controller again failed during initialization before any app input, including retry and reset, so rename and renumber workflows remain **UI wired**, not Interaction verified. Evidence is in `docs/checkpoints/phase-02/gate-02-slide-navigator/NAMING_RECOVERY_2026-09-08.md`.

Commit `efc82d4` completes the section-management command and UI wiring. Sections now collapse without altering the lesson, accept the current multi-slide selection, move as contiguous blocks, and can be removed without deleting slides. A slide dragged across a section boundary changes its section membership in the same atomic reorder command. Every saved mutation remains undoable/redoable, automatic section names follow visual order, and abandoned empty sections are removed deterministically. The suite reports 57 passing tests and the solution builds with zero warnings/errors. `Launch Physica.bat` started responsive process 34932. Computer initialization failed before app input after retry, reset, and final retry, so this work remains **UI wired**. Evidence is in `docs/checkpoints/phase-02/gate-02-slide-navigator/SECTION_MANAGEMENT_2026-09-09.md`.


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

Windows evidence is stored in `docs/checkpoints/phase-01-recovery/`. The shell checkpoint built with zero warnings and errors, and `Launch Physica.bat` opens a responsive window. Windows accessibility automation also verifies that every Physics group gallery launcher is enabled and invokable while its unfinished child commands remain disabled.

Remaining Phase 1 qualification debt:

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

The user explicitly authorized Phase 2 implementation after accepting the regenerated main authoring shell. The remaining Phase 1 qualification slices stay open and must be completed before release qualification. Animation runtime, physics solvers, scientific graph engines, content packs, export systems, installers, and the update channel remain outside Phase 2.

## Phase 2 implementation checkpoint

Completed across the first two functional slices:

- Binding implementation specification covering every Phase 2 part and compatibility rule.
- Versioned immutable project, slide, section, theme, canvas, guide, snap, scene-node, and separated transform contracts.
- Validation, normalization, unknown-field preservation, migration routing, safe `.physica` ZIP save/load, and external recovery snapshots.
- UI-independent authoring session with stable state identities, dirty tracking, bounded undo/redo, slide/section commands, node/layer commands, and deterministic snapping.
- Active New, Open, Save, Save As, Save Copy, Recover, Close, New Slide, Duplicate Slide, Delete Slide, Section, Undo, and Redo commands.
- Slide selection and deterministic up/down ordering, plus atomic section creation and assignment: one section action is one history entry and one undo removes both the assignment and section.
- Keyboard workflows for new, open, save, save as, undo, redo, and slide reordering.
- Ctrl/Command toggle selection, Shift range selection, Delete-key removal, and internal pointer-capture ordering for selected slide blocks; real pointer acceptance remains pending.
- Honest blank thumbnails and blank-slide context: empty slides no longer show arbitrary wave previews, standing-wave inspector values, or fake timeline tracks.
- Visible collapsible section headings, multi-slide assignment, block reordering, safe section removal, and cross-boundary drag semantics.
- Project Close now returns to a New/Open/Recent start center; only the title-bar Exit control ends the application. Recent saved lessons persist outside project documents.
- Session-backed slide navigator, document title/dirty marker, localized command readiness, and recovery-safe close behavior.
- Honest Feature Map state: project save/recovery is Active; canvas selection/transforms remain Shell ready until pointer editing is connected.

Prior automated result: the full solution built with zero warnings and errors and the then-current suite reported 31 passing tests. That result covers model, service, direct session/view-model, and structural checks only. It is not evidence that the real pointer, keyboard, focus, layout, thumbnail, drag/drop, canvas, project-lifecycle, or cross-platform workflows pass. No UI feature may be promoted from this aggregate count.

The critical review is recorded in `docs/checkpoints/phase-02/PHASE_02_CRITICAL_AUDIT.md`. Its verdict is binding: Phase 2 is incomplete, and backend-only contracts are not teacher-accessible features.

Still required for the Phase 2 gate:

- Real-application interaction proof for section create/rename/collapse/reorder/reassignment/removal and drag-between-section behavior; the command and UI paths are wired.
- Pointer selection, drag, resize, rotation, multi-selection, grouping, and layer panel activation.
- Theme/background, slide size, orientation, guide, margin, safe-area, zoom, pan, and snapping UI activation.
- Automated recovery scheduling, Save/Discard/Cancel close decision, and recovery chooser UX.
- Full keyboard/accessibility workflow coverage and Windows/macOS acceptance runs; core file/history/reorder shortcuts are connected.
- Representative Phase 2 lesson project and user functional-canvas approval.

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
