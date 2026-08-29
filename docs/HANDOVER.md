# Physica — Handover

## What Physica is

Physica is a free, local-first, desktop-first physics teaching authoring application with a shared web runtime. Teachers create scientifically authoritative simulations/diagrams and choreograph them with Manim-like presentation animation, equations, graphs, ordinary explanatory text, controls and Storyboards. Conventional programming is optional. AI is not required.

## What is frozen

The initial root architecture, state-authority rules, clocks/scheduler, solver adapter families, hybrid renderer responsibilities, registry/plugin model, project package strategy, Physics Library model, example system and package dependency direction are frozen.

`TextBlock` was clarified during Step 2 as the canonical semantic representation for definitions, paragraphs, captions, callouts, quotations and lists. This uses the already-frozen extensible Representation system and does not reopen the root schema.

## Source priority

1. `PROJECT_CONSTITUTION.md`
2. `DECISIONS.md`
3. owning subsystem spec
4. `CURRENT_STATE.md` for operational status
5. Architecture-Frozen Master Blueprint for broad context

## Read first in every new session

1. `AGENTS.md`
2. `docs/CURRENT_STATE.md`
3. only the specification files listed by the current task

## Current phase

Step 2 is complete. Step 3 is repository bootstrap.

## What must not be redesigned in Step 3

Do not implement or redesign physics models, renderer functionality, equation transforms, graphs, solver behavior, editor UX, Storyboard, PhysScript or curriculum modules. Bootstrap only the monorepo/toolchain/app/package skeleton and install the specification documents.

## Examples

Every future user-visible capability must ship a deterministic runnable example and gallery artifacts. Repository bootstrap may include only the minimal system smoke fixture required by its task.

## Maintaining status

After a substantial implementation task, update `CURRENT_STATE.md` with completed work, current task, next task, blockers and exact read-first files. Keep it short.
