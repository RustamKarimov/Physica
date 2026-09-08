# Phase 2 — Project and Slide Foundation

**Status:** Approved for implementation on 2026-09-07
**Owner:** `PhysicaStudio.Document` for saved truth, `PhysicaStudio.Authoring` for mutations, `PhysicaStudio.Desktop` for interaction
**Depends on:** Project Constitution, ADR-001 through ADR-009, Package Dependencies, Phase 1 visual design package

## 1. Objective

Turn the approved studio shell into a dependable presentation-authoring workspace without coupling saved projects to Avalonia or pre-empting later physics, animation, graph, and presentation systems.

At the Phase 2 gate, a teacher must be able to create a lesson, add and organize slides, manipulate scene nodes on a 2D canvas, control layers, undo and redo every mutation, apply document-level design settings, save the project, close it, reopen it, and recover unsaved work.

## 2. Non-goals

Phase 2 does not implement:

- rich text, equations, media decoding, or final shape artwork;
- timeline mutation or animation playback;
- physics entities, solvers, observables, or scientific validation;
- presenter mode, interactive classroom controls, export, or collaboration;
- final ribbon icon layouts for Font, Paragraph, or later functional groups.

Those controls remain visible with honest readiness. Phase 2 establishes the state and command contracts they will use.

## 3. Authority boundaries

### Saved document state

`PhysicaStudio.Document` owns all state required to reproduce a lesson:

- project identity and format version;
- document metadata and theme selection;
- ordered sections, slides, masters, assets, and project settings;
- slide canvas, background, guides, notes, and ordered scene nodes;
- separate model and presentation transforms;
- stable IDs and extension data needed for future-compatible round trips.

It contains no Avalonia types, file dialogs, editor selection, window sizes, or transient playback state.

### Authoring state

`PhysicaStudio.Authoring` owns:

- the current immutable project snapshot;
- the active slide and selected node IDs;
- undo/redo stacks and transaction grouping;
- document commands and validation before mutation;
- dirty/saved revision tracking;
- autosave scheduling requests.

Selection and active-slide state are session state and are not serialized into the lesson package.

### Desktop state

`PhysicaStudio.Desktop` owns:

- platform file pickers and window lifetime;
- ribbon, keyboard, pointer, drag, and resize input;
- zoom, panel state, and viewport origin;
- user-facing error and recovery presentation.

Desktop views send authoring commands. They do not mutate records directly.

## 4. Persistent model

### Stable format

- `ProjectFormat.Current` starts at version `1`.
- IDs are GUIDs created once and retained across save, duplicate, undo, and migration according to command semantics.
- JSON uses camel-case names and string enums.
- Unknown future package versions are rejected without modifying the file.
- Migrations are explicit, ordered, deterministic transforms and never depend on UI or machine locale.
- Extension-data dictionaries are reserved at project, slide, and node boundaries so compatible unknown metadata can survive round trips.

### Project

`LessonProject` contains identity, title, timestamps, format version, metadata, theme, canvas defaults, slide sections, masters, assets, and the ordered slide collection.

### Slide

`SlideDocument` contains identity, name, optional section/layout IDs, hidden state, background, notes, guide settings, and ordered scene nodes.

### Scene node

`SceneNode` contains identity, name, kind, parent relationship, layer order, visibility, lock state, geometry, style-reference boundary, model transform, presentation transform, and extension data.

The two transforms are never merged:

- `ModelTransform` represents the model-space placement later owned or constrained by physics.
- `PresentationTransform` represents visual offset, scale, rotation, and opacity authored for explanation.

Phase 2 geometry commands change presentation geometry only. Later physics commands must pass through physics-owned contracts.

## 5. `.physica` package

A `.physica` file is a ZIP package with forward-compatible entry names:

```text
project.json
assets/<content-hash>/<variant>
fonts/<licensed-font>
thumbnails/<slide-id>.png
previews/<cache-key>
migrations/history.json
```

Only `project.json` is required in Phase 2. Optional cached data is never authoritative.

### Save rules

1. Validate the project snapshot.
2. Serialize deterministically to a temporary file beside the destination.
3. Flush and close the archive.
4. Replace the destination atomically where the platform permits.
5. Retain the previous valid file until replacement succeeds.
6. Mark the authoring revision saved only after successful replacement.

Large assets are copied by content hash and are not re-encoded for metadata-only edits. Later incremental package updates may optimize copy cost without changing the public package layout.

### Load rules

1. Open read-only and verify that `project.json` exists.
2. Read the format version before full materialization.
3. Reject newer unsupported versions with a teacher-readable diagnostic.
4. Apply required migrations in memory.
5. Validate IDs, ordering, references, canvas limits, and node values.
6. Publish one complete immutable project snapshot or no state at all.

## 6. Recovery and autosave

Autosaves live outside the lesson package under the platform application-data directory. The recovery store contains lightweight project JSON snapshots and metadata, not duplicated embedded assets.

- Journals are keyed by project ID and original path fingerprint.
- Writes are atomic and cancellable.
- Autosave never marks the document manually saved.
- A clean manual save consolidates or removes older recovery entries.
- Recovery never overwrites the original project without an explicit Save action.
- Retention and compaction limits prevent unbounded storage growth.

## 7. Command and history model

Every mutation implements a UI-independent authoring command with:

- stable command ID;
- user-facing description resource ID;
- deterministic `Apply` operation;
- validation before publication;
- one resulting immutable project snapshot.

Undo stores prior immutable snapshots initially. The public history contract allows later memory-optimized inverse payloads without changing callers. Continuous pointer edits use a transaction:

1. capture the starting snapshot;
2. preview transient geometry in the view;
3. commit one command on release;
4. create one undo entry, regardless of pointer event count.

Redo is cleared by any new committed command after undo.

## 8. Phase parts and implementation order

### P2.1 — Persistent contracts and validation

- Replace placeholder document records with versioned immutable contracts.
- Add factories with safe defaults.
- Add document validation and deterministic normalization.
- Preserve all public contract names required by later phases.

**Gate:** construction, validation, and compatibility tests pass without Desktop references.

### P2.2 — Serialization, package I/O, and migration boundary

- Implement deterministic JSON options.
- Implement package save/load and explicit result diagnostics.
- Implement the migration interface and version-routing pipeline.
- Test round trip, corrupt package, missing entry, and unsupported future version.

**Gate:** a representative multi-slide project round-trips without ID or value loss.

### P2.3 — Authoring session and undo/redo

- Implement immutable project session state and revision tracking.
- Implement command execution, undo, redo, saved revision, and grouped transactions.
- Implement slide add, duplicate, delete, move, rename, section assignment, and visibility commands.

**Gate:** all commands undo and redo exactly; dirty state matches the saved revision.

### P2.4 — Scene-node and layer commands

- Add, duplicate, delete, rename, reorder, group, ungroup, lock, hide, and transform scene nodes.
- Reject editing locked nodes.
- Maintain stable ordering and valid parent references.
- Keep model and presentation transforms independent.

**Gate:** complex multi-selection/layer command sequences round-trip and undo correctly.

### P2.5 — Theme, canvas, guides, zoom, and snapping

- Activate project theme and slide-background contracts.
- Persist slide size, orientation, guides, margins, safe areas, grid, and snap settings.
- Keep zoom and pan transient to the editor session.
- Implement deterministic snapping against grid, guides, slide edges, centers, and peer-node bounds.

**Gate:** snapping is stable across scale factors and never changes the saved model transform.

### P2.6 — Desktop activation

- Activate New, Open, Save, Save As, Save Copy, Recover, Close, New Slide, Duplicate Slide, Delete Slide, Section, Undo, Redo, and core View/Design commands.
- Replace static thumbnails and title text with session-backed data.
- Add selection, drag, resize, layer ordering, panel state, and keyboard operations incrementally.
- Preserve current visual quality; activation may not replace polished mock artwork with crude placeholders.
- Keep Font and Paragraph icon/layout refinements deferred until their Phase 3 functional implementation, as approved by the user.

**Gate:** the teacher can author, save, reopen, edit, undo, recover, and continue a representative lesson through the polished shell.

### P2.7 — Phase verification

- Domain and dependency-direction tests.
- Serialization and migration tests.
- Undo/redo and transaction tests.
- Slide, section, layer, transform, guide, and snapping tests.
- Keyboard and accessibility tests for activated commands.
- Windows and macOS launch/build checks.
- Representative project and checkpoint screenshots.

## 9. Compatibility rules

- No public persisted property is removed or repurposed after release; migrations add or transform explicitly.
- New enum values must preserve unknown-value diagnostics rather than silently substitute behavior.
- Coordinates use slide-space doubles independent of pixels and DPI.
- Times use integer ticks or `TimeSpan`, never frame numbers as authority.
- File paths are package-relative URIs or external asset references, never machine-specific absolute paths in portable projects.
- Culture affects display only; serialized numbers and identifiers are culture invariant.
- Optional caches are disposable and versioned independently.
- Commands operate on IDs, never list indexes as durable identity.
- UI-specific types cannot cross into Document or Authoring.

## 10. Performance and reliability budgets

- Metadata-only save must not decode or re-encode embedded media.
- Common commands publish within 50 ms for a representative 50-slide project.
- Undo history has configurable count and memory budgets.
- Thumbnail generation and package inspection run off the UI thread.
- Project load publishes progressively to Desktop only after the authoritative document is validated.
- Cancellation leaves the previous project and destination file untouched.

## 11. Phase 2 acceptance workflow

The binding execution and evidence procedure is `skills/physica-acceptance-audit/SKILL.md`; live status is maintained in `docs/acceptance/PHASE_02_ACCEPTANCE_MATRIX.md`. Backend or direct view-model tests may establish **Model only** but cannot establish UI interaction or phase completion.

The checkpoint project will demonstrate:

1. Create a lesson and rename it.
2. Add sections and at least five slides.
3. Duplicate, reorder, hide, and delete slides.
4. Add several non-physics scene nodes and manipulate their presentation transforms.
5. Lock, hide, group, reorder, undo, and redo those edits.
6. Change slide background, size, guides, and snapping.
7. Save to `.physica`, close, reopen, and verify exact round trip.
8. Make an unsaved edit, restart, recover it, and save safely.

Phase 2 is complete only when this workflow passes on Windows and macOS and the user approves the functional canvas checkpoint.

The workflow is reviewed through three mandatory gates in order: shared renderer, slide navigator, and complete Phase 2. A blocking failure or missing user approval keeps Phase 3 suspended.
