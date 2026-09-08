---
name: physica-acceptance-audit
description: Govern user-visible Physica Studio changes, readiness transitions, audits, checkpoints, and completion claims. Use whenever UI behavior changes or a feature may advance beyond Model only.
---

# Physica Acceptance Audit

Use this procedure with the owning specification and automated tests. It is the binding acceptance process for user-visible Physica Studio work.

## Preconditions

1. Read `AGENTS.md`, `docs/CURRENT_STATE.md`, the constitution, decisions, and owning specification.
2. Read the active matrix under `docs/acceptance/`.
3. Verify local/remote state and stop on unexplained edits or divergence.
4. Do not work on a later phase while the current matrix has a blocking failure or an unapproved user gate.

## Acceptance states

- **Model only:** A backend contract, command, or calculation exists without a complete teacher workflow.
- **UI wired:** The real interface reaches the capability, but interaction evidence is incomplete or failing.
- **Interaction verified:** Application-level tests and a launcher-driven Computer run pass on every currently available required platform.
- **User accepted:** The user approved the named gate after reviewing its evidence.

These states are separate from product readiness labels such as Planned, Preview, Active, and Validated. Never infer one classification from the other.

Never use a passing build, unit-test count, XAML string check, direct view-model call, or static screenshot as proof that a teacher workflow works.

## Visible-change workflow

1. Define the teacher action and its visible, persisted, undo, keyboard, and accessibility results before implementation.
2. Identify authoritative document and rendering state. Flag mock data, hard-coded artwork, name-based switching, placeholders, and disposable caches.
3. Update the matrix row before promoting readiness.
4. Test the model/service layer, then real controls, then rendered output, then the complete application.
5. Launch with `Launch Physica.bat` on Windows or `Launch Physica.command` on macOS.
6. Use the Computer capability for real pointer, keyboard, focus, scrolling, resizing, and drag/drop workflows after reading its instructions. Do not substitute direct method calls.
7. Capture representative screenshots; use a short recording only when motion or transient feedback requires it.
8. For project mutations, save, close without exiting, reopen, and compare the restored result.
9. Record the commit, platform, display scale, exact actions, expected and observed results, evidence paths, failures, and limitations.
10. Run the broader suite at a gate boundary. Request user approval only after every non-user row passes.

## Evidence rules

- Store concise reports under `docs/checkpoints/<phase>/<gate>/`.
- Keep representative review evidence, not raw diagnostic dumps.
- Classify failures as blocking, non-blocking, or specification-deferred and include reproduction steps.
- A blocking failure keeps the gate open and prevents later-phase work.
- Mark unavailable platform or Computer verification **Not run**; never infer a pass.
- Screenshot comparison detects regression but never replaces user approval.

## Phase 2 gates

Run in order:

1. **Shared renderer:** editor, thumbnail, presenter preview, and export boundary consume one document-driven scene output; blank, edited, duplicated, aspect-ratio, and background cases agree.
2. **Slide navigator:** single/Ctrl/Shift selection, direct dragging, insertion feedback, automatic scrolling, block movement, contextual keyboard commands, undo/redo, and sections work through the real UI.
3. **Complete Phase 2:** canvas selection and transforms, pan/zoom/fit, guides/snapping, save/close/reopen/recovery, Windows DPI, macOS, and final user approval pass.

Do not begin Phase 3 until all three gates are User accepted unless the user explicitly amends project governance.

## Gate report

Keep chat reports concise and link to repository evidence. State:

1. Gate result, tested commit, platforms, and scales.
2. Teacher workflows that passed.
3. Blocking failures and honest limitations.
4. Automated results separated into model/service, UI component, rendered-output, and end-to-end layers.
5. Required user action, if any.

Never report only a total test count.
