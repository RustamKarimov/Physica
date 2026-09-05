# Physica — Project Health Checkpoints

**Status:** ACTIVE PROJECT GOVERNANCE

**Applies from:** Step 12 onward, with the first audit looking back across all completed work

**Completed:** HC-00 through HC-05 passed after repairs; see the reports under `docs/health-checkpoints/`. Next scheduled checkpoint: HC-06 after Phase 11.

## 1. Purpose

Ordinary phase verification proves the current change. A Project Health Checkpoint asks whether the growing product still forms one coherent, maintainable, scientifically trustworthy system and whether earlier roadmap steps actually delivered their assigned outcomes.

Health checkpoints are deliberately less frequent than phase checks. They occur where subsystems integrate or a public preview creates a stable baseline. They do not replace per-phase tests, examples, self-review, CURRENT_STATE updates or Git checkpoints.

## 2. Required audit dimensions

At every checkpoint audit:

1. **Roadmap completion integrity** — map every completed step to its specification, implementation, public exports, tests, examples, visible proof and limitations. Reopen a step if a promised outcome is missing, a placeholder or outside its boundary.
2. **Architecture and authority** — re-check dependency direction, package ownership, ADRs, document/runtime separation, single-authoritative-writer, clock/scheduler ownership, plugin isolation and presentation/physics separation.
3. **Cross-step integration** — exercise end-to-end paths across serialization, undo/redo, runtime scheduling, rendering, examples and the launcher-visible desktop app.
4. **Scientific correctness** — rerun applicable reference, dimensional, invariant, determinism, replay and solver tests.
5. **Maintainability** — inspect dead files/exports, duplicate abstractions, oversized modules/classes/functions, hidden coupling, cycles, stale compatibility code, TODO/FIXME debt and fixture duplication. Size is a review signal, not an automatic rewrite mandate.
6. **Product and teacher workflow** — confirm capabilities remain discoverable, keyboard usable, reduced-motion readable and represented by truthful examples.
7. **Performance and supply chain** — compare relevant benchmarks/build sizes, dependencies/licenses and unbounded work or memory growth.
8. **Documentation truthfulness** — reconcile ROADMAP, CURRENT_STATE, specs, ADRs, manifests and pending-example obligations with code.

## 3. Audit procedure

1. Pause progression at the last fully completed step and record the exact clean baseline commit.
2. Construct or update the completed-step evidence matrix.
3. Run targeted cross-package integration tests, then complete CI/build/launcher checks.
4. Run architecture, dependency-cycle, unused/dead-code and code-size diagnostics appropriate to the toolchain.
5. Inspect flagged code and refactor only where it reduces real risk without changing frozen behavior.
6. Review as software architect, scientific-computing reviewer, physics teacher and UX/accessibility reviewer.
7. Classify findings as **fixed**, **reopened step**, **recorded debt** or **Architecture Blocker**.
8. Correct regressions and false completion claims before progression.
9. Publish a report under `docs/health-checkpoints/`, update CURRENT_STATE and make a verified Git checkpoint.

Recorded debt needs an owner, reason, consequence and latest safe resolution boundary. Architecture Blockers follow the autonomous stop protocol.

## 4. Scheduled checkpoints

| Checkpoint | Boundary | Integration purpose |
| --- | --- | --- |
| HC-00 | Immediately after Step 12 | Retrospective baseline for Steps 0–12; integrates reveal with model, clocks, scheduler, renderers and Library. |
| HC-01 | After Phase 3, Step 3.4 | Animation Preview: scheduler, reveal, morph/matched transform and camera animation. |
| HC-02 | After Phase 4, Step 4.4 | Equation/Graph Preview and equation-transform release gate. |
| HC-03 | After Phase 6, Step 6.10 | Physics Runtime Preview across solver adapters, events, clocks and checkpoints. |
| HC-04 | After Phase 7, Step 7.5 | Teacher Editor completion and real authoring workflows. |
| HC-05 | After Phase 8 | Mechanics Alpha and first curriculum-wide vertical slice. |
| HC-06 | After Phase 11 | Waves/Optics plus Electricity/Fields preview cluster. |
| HC-07 | After Phase 13 | Thermal/Oscillations integration boundary. |
| HC-08 | After Phase 17 | Modern/Medical/Astronomy cluster and accumulated curriculum growth. |
| HC-09 | After Phase 19 | Practical + Extended Alpha and full curriculum surface. |
| HC-10 | After Phase 20, before 1.0 RC handoff | Distribution/export/gallery audit and final evidence reconciliation. |

These are minimum checkpoints. Do not add a full audit merely because a fixed number of commits or days elapsed.

## 5. Early triggers

Run an unscheduled checkpoint before the next phase when:

- a frozen ADR, root schema version or package boundary changes;
- a completed step is reopened by regression or missing evidence;
- CI, launcher, canonical serialization or architecture checks remain broken across a phase boundary;
- competing clocks, schedulers, state stores, solvers, registries or rendering authorities appear;
- dependency cycles, plugin-isolation violations or document/runtime leakage are detected;
- concentrated code growth cannot be reviewed safely in ordinary phase self-review;
- a solver or migration changes scientific reproducibility;
- a release-gate example fails presentation, accessibility or scientific acceptance;
- achievable pending example artifacts remain unfulfilled through the next checkpoint.

## 6. Passing rule

A checkpoint passes only when every completed step has current evidence or is reopened; regressions are fixed; the supported CI/build/launcher baseline passes; architecture/scientific invariants hold; maintenance findings are fixed or bounded; examples/docs make no false claims; and CURRENT_STATE identifies the exact next task.

Reports state scope, commands/results, findings/corrections, reopened work, debt, blockers and the new baseline commit.
