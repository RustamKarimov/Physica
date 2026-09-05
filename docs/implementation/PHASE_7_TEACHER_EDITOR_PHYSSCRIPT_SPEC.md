# Phase 7 — Teacher Editor and PhysScript Implementation Specification

**Status:** Approved for implementation by autonomous phase execution  
**Roadmap scope:** Phase 7, Steps 7.1–7.5  
**Health gate:** HC-04 after Step 7.5

## Purpose

Phase 7 turns the existing foundation demonstrations into the first coherent teacher-authoring surface. It adds a project home, template creation, a real inspector, explicitly separated layout and physical manipulation, a multi-domain timeline, and the first version of the deterministic PhysScript language. It does not add mechanics curriculum content, a new solver, arbitrary code execution, or the final packaged project-file workflow.

## Owning packages and dependency boundary

- `apps/desktop` owns the teacher-facing shell, home/templates, selection, inspector presentation, manipulation-mode controls and authoring workflow.
- `@physica/commands` owns PhysScript parsing, validation, canonical serialization and reversible command-intent mapping. PhysScript is an authoring notation over project commands; it is not a runtime or a second document store.
- `@physica/storyboard` owns the editor-neutral advanced timeline model, deterministic validation/compilation and playhead evaluation for animation, named-clock, audio and acquisition tracks.
- `@physica/core-model`, the Runtime Scheduler, clocks, solvers, acquisition services and audio remain authoritative for their existing contracts. Phase 7 consumes those contracts and does not create substitutes.

No new workspace package, third-party dependency, project schema version or ADR is required. The desktop may add existing workspace dependencies on `@physica/commands` and `@physica/physics-library` because the teacher shell directly consumes their public APIs.

## Step 7.1 — Home, library and templates

The initial desktop route is a stable teacher-authoring shell. It provides metadata-driven templates for a blank investigation, a motion explanation and an equation walkthrough. Creating a template produces a valid in-memory `ProjectDocument` through the authoritative project store. The left library is searchable and uses the built-in Physics Library catalog rather than a parallel hard-coded object registry.

The prior foundation and solver observatories remain available as an on-demand archive. They are dynamically imported so the authoring shell does not eagerly load Pixi, Three, MathLive and every solver backend. This closes the stable-shell lazy-loading debt scheduled for HC-04.

## Step 7.2 — Inspector

Selection is explicit. The inspector exposes five stable tabs:

1. **Model** — entity identity, attached component type and editable initial numeric values;
2. **Visual** — presentation-only stage position and representation summary;
3. **Relationships** — references involving the selection;
4. **Data** — observable and dataset summaries;
5. **Validation** — teacher-readable errors, warnings and information from project validation and local authoring checks.

Edits to document-owned values dispatch commands through the project store. Transient tab/selection state and layout previews are not serialized as physics state.

## Step 7.3 — Layout drag and physical drag

The stage has a visible mode switch and never guesses intent:

- **Layout mode** changes only presentation placement. It does not change the component initial state or live runtime input.
- **Physics mode** routes pointer movement to a component initial-state command (or reports that the selected item has no editable physical coordinates). It never writes representation layout as a side effect.

Both modes are keyboard reachable and are described in the UI. The stage uses meaningful geometric glyphs rather than placeholder circles containing first letters.

## Step 7.4 — Advanced timeline

`@physica/storyboard` adds immutable V1 timeline definitions for four track kinds: `animation`, `clock`, `audio` and `acquisition`. Each clip declares its own clock key; render time is never silently substituted for physics, audio or acquisition time.

Compilation performs deterministic validation, enforces unique IDs and finite non-negative timing, and returns tracks/clips in stable declared order. Evaluation at a finite playhead returns active clips and normalized progress without advancing any clock or writing runtime state. Track payloads remain data-driven JSON so owning engines interpret them later.

The desktop shows all four track kinds, a scrubber, active-clip state and the clock attached to each track. This is an authoring view, not a competing scheduler.

## Step 7.5 — PhysScript V1

PhysScript V1 is a small line-oriented declarative language. Canonical source begins with `physica 1` and one quoted `scene` declaration. Supported statements are:

- `model <alias> type <namespaced-type-id>`;
- `set <alias>.<property> = <scalar-or-quoted-string> [unit]`;
- `show <namespaced-representation-type-id> of <alias>`;
- `graph <alias>.<observable> against <identifier>`;
- `step "<label>"`;
- `pause simulation when <alias>.<observable> = <number> [unit]`;
- `transform equation <identifier> to <identifier>`.

The grammar permits namespaced registered type IDs but no plugin grammar injection. It cannot execute JavaScript, Python, shell commands, network access or arbitrary functions.

The parser returns an AST plus line/column diagnostics and recovers at line boundaries. Validation checks the version, scene presence, duplicate aliases, namespaced type references and statement references. The serializer emits one canonical representation, making parse–serialize–parse stable.

Bidirectional visual synchronization is represented as deterministic command intents. Each supported AST statement maps to a closed PhysScript command-intent type with JSON payload, stable source order and no executable callback. The inverse mapping reconstructs the same semantic AST. The desktop applies script only after successful parse/validation and keeps the authoritative `ProjectStore` as the document writer.

## User-visible workflow

The teacher can create a project from a template, search and add a library model, select and inspect it, change layout without changing physics, change an initial physical position through a command, scrub multiple timeline tracks, author or load PhysScript, inspect precise diagnostics, canonicalize valid source, undo/redo document edits and download a truthful JSON project snapshot.

This is the first useful authoring milestone, but it is not the final curriculum experience. The templates and examples are intentionally small and their labels state what remains foundational.

## Example Gallery artifacts

Phase 7 ships complete Gallery artifacts for:

- `examples/physcript/physcript-projectile`;
- `examples/physcript/physcript-equation-transform`;
- `examples/editor/teacher-authoring-workflow`.

Each contains metadata, README, executable exact output, expected JSON, accessible expected SVG preview, automated test and truthful pending declarations for deferred `.physica`, raster/video and shared-runtime evidence. The root example ledger must reconcile all entries.

## Verification and completion

Targeted tests must cover timeline validation/evaluation, PhysScript valid and invalid parsing, canonical round trip, intent round trip, all three examples and the desktop typecheck/build. Then run the complete frozen-install, format, lint, architecture, typecheck, test and application-build gates required by HC-04. `Launch Physica.bat --check` must remain green.

Phase 7 is complete only after the HC-04 report audits all prior step obligations, package direction, source size and duplication, test health, examples, stable-shell lazy loading and launcher usability. Update `docs/CURRENT_STATE.md`, commit and push; do not begin Phase 8.
