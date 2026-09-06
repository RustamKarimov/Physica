# Current State

**Product:** Physica Studio — clean native rebuild  
**Active milestone:** Phase 1 Studio shell complete — awaiting user approval  
**Mandatory stop:** Shell approval gate before Phase 2

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

## Completed in the rebuild

- Legacy recovery bundle and remote tags verified.
- New orphan history created.
- .NET 10 SDK installed and pinned.
- Architecture boundaries, governance, dependency ledger, and cross-platform project layout established.
- Seven approved concept images preserved under `docs/product/approved-concepts/`.
- Complete manifest-driven ribbon: 13 primary tabs, all approved command groups, and 15 contextual ribbon categories.
- Collapsible slide/object navigator, contextual inspector, animation stack, and multi-track timeline shell.
- Topic-dropdown and search-based physics object library with recognizable symbolic previews and readiness badges.
- 2D and reserved 3D workspace selectors, Master/outline/section/assets surfaces, and graph/observable command galleries.
- Native Feature Map and learner-facing Present Preview with interactive-control shells.
- Windows launcher smoke test: responsive native window started successfully from `Launch Physica.bat`.
- Deterministic locked restore and Release build: zero warnings and zero errors.
- Foundation suite: 5/5 tests passing.
- Checkpoint evidence recorded in `docs/checkpoints/phase-01/`.

## Awaiting user approval

Review the Phase 1 shell for readability, ribbon organization, workspace density, panel behavior, timeline vocabulary, object-library organization, and learner presentation quality. Phase 2 must not begin until this gate is approved.

The macOS launcher and CI job are configured. Native macOS build evidence will be added after the first GitHub Actions matrix run.

## Explicitly not active

- Project editing and persistence.
- Physics solvers and objects.
- Scientific graphs and observables.
- Timeline mutation and animation rendering.
- Export, installers, and update channel.

Those capabilities remain visible as Planned. No code may represent them as complete.

