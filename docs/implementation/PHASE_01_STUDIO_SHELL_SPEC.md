# Phase 1 — Complete Visual Studio Shell Specification

## Objective

Deliver a readable, professional, navigable representation of the final authoring environment before functional subsystems are activated. The shell must make project scope and readiness inspectable without source-code knowledge.

## Required surfaces

- File backstage and all primary ribbon tabs/groups/commands from the approved inventory.
- Contextual ribbon inventory.
- Collapsible and resizable slide/outline/section/master/assets navigation.
- Searchable object library with one physics-topic dropdown, filters, recognizable thumbnails, and readiness states.
- Contextual inspector categories and mixed-value affordance.
- Switchable bottom workspace for timeline, curves, data, notes, event log, and validation.
- Multi-track timeline vocabulary including nested tracks, event lanes, global markers, and checkpoints.
- Animation stack and searchable gallery affordances.
- Graph and observable source selectors.
- Normal, Master, Presenter, 2D, and 3D workspace modes.
- Learner-facing presentation preview with optional classroom controls.
- Light and dark example slide compatibility.
- Feature Map with filters and totals by readiness.

## Interaction scope

Shell navigation, panel collapse/expand, ribbon selection, workspace modes, theme preview, and presenter preview may work. Commands that mutate lesson content or imply scientific behavior remain disabled with explanatory tooltips.

## Acceptance gate

Phase 1 stops for user review after:

- Windows build and launcher smoke test.
- macOS CI configuration validation.
- Manifest and readiness tests.
- Screenshot or equivalent visual evidence.
- Known limitations and Feature Map state reported.

No Phase 2 project-authoring behavior begins before approval.

