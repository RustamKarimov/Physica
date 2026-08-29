# Project Constitution

**Status:** Frozen initial implementation specification

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Purpose

Highest-level non-negotiable rules for all Physica code and specifications.

## Scope

Scientific authority, architectural boundaries, privacy, extensibility and product invariants.

## Owned concepts

- constitutional invariants
- source-of-truth hierarchy

## Dependencies

- No subsystem dependency beyond the Constitution.

## Global dependency direction

```text
mathematics / units / schemas
        ↓
core-model / commands / clocks / events / data
        ↓
runtime / solver interfaces / relationships
        ↓
renderers / equations / graphs / controls / storyboard
        ↓
physics domain packages
        ↓
editor / viewer / gallery
```

Cross-cutting registries and SDK packages expose interfaces without importing editor internals. Package cycles are forbidden.

## Invariants / required behavior

- one state drives all views
- physics/layout/presentation separation
- explicit assumptions
- seeded stochastic reproducibility
- registry extensibility

## This subsystem MUST NOT

- silently alter physics for visuals
- hard-code curriculum concepts into root schema
- allow editor internals into physics packages

## Serialization behavior

Persist only document/configuration data owned by this subsystem. Runtime caches, renderer handles and transient solver state are excluded unless an owning serialization specification explicitly defines them.

## Validation and errors

Invalid configuration must return typed validation results suitable for teacher-facing messages; developer exceptions are not the normal scientific-validation UI.

## Extension / plugin behavior

Extension points use registry/SDK contracts and namespaced IDs. Unknown plugin data is preserved when applicable; editor-specific code is not a substitute for a registry contract.

## Testing obligations

- architecture lint
- freeze checklist

## Example Gallery obligations

- No standalone user-visible example required unless this subsystem exposes a user-visible feature.

## Definition of Done

The subsystem contract is implemented only when its public API/schema is documented, tests pass, serialization/validation behavior is covered, architecture boundaries are respected and every user-visible capability has its required Example Gallery artifacts.

## Normative source material incorporated from the frozen master

The following source material is owned here for implementation detail. Where it conflicts with an approved ADR, the ADR wins.

<!-- Source: Master §2 -->
# 2. NON-NEGOTIABLE SCIENTIFIC PRINCIPLES

1. **Physics state is authoritative.**  
   A velocity arrow reads velocity from the physical model. The model does not infer velocity from the drawn arrow.

2. **One state drives all views.**  
   Objects, arrows, graphs, numbers, equations, detector traces and tables subscribe to the same state/observables.

3. **Physics and layout are separate.**  
   Moving a graph panel must not change a physical coordinate.

4. **Simulation and presentation are separate.**  
   A teacher can pause the simulation and continue explaining with transforms, highlights and equations.

5. **Assumptions are explicit.**  
   Every model declares approximations, validity conditions and warnings.

6. **Analytical models are preferred when they are the intended physics.**  
   Numerical integration is not used simply because it is convenient.

7. **Stochastic models are seedable.**  
   Random decay, Brownian motion and molecular distributions can be replayed.

8. **Visual metaphors are labelled.**  
   Photons, atoms, fields, tissue layers and cosmological analogies are not allowed to imply false literalism.

9. **Curriculum terminology is a profile, not hard-coded physics.**

10. **No AI is required to author, simulate, validate or render physics.**

---

<!-- Source: Master §28 -->
# 28. CORE FUTURE-PROOFING TEST

Before the core schema is frozen, all of these must fit without introducing a new root Project/Scene concept:

- equation morphing;
- vector addition;
- projectile;
- pulley;
- rigid collision;
- gas with thousands of particles;
- Brownian motion;
- standing waves;
- numerical wave field;
- double slit;
- two-lens ray trace;
- electric field;
- charged particle in E and B;
- capacitor transient;
- transformer;
- radioactive stochastic decay;
- detector counts;
- ultrasound layered echoes;
- A-scan;
- tomography projections;
- image reconstruction;
- spectrum/redshift;
- Hubble graph;
- astronomical scale zoom;
- experiment data;
- uncertainty/error bars;
- 3D rigid body;
- a new curriculum plugin;
- a multi-scene presentation with scene transitions;
- a numerical simulation scrubbed backward and forward;
- a plugin project opened while the plugin is missing;
- a project using right-to-left UI/text;
- a scene rendered through mixed SVG/Pixi/Three layers;
- an advanced control that changes live runtime state without overwriting initial conditions.

If any requires a new root concept, architecture review reopens before implementation proceeds.

---

<!-- Source: Master §42 -->
# 42. FINAL ARCHITECTURE FREEZE CHECKLIST

Before application feature coding begins, the team must answer **yes** to every item:

- Is persistent Document State separate from Runtime State and derived observables?
- Is there exactly one authoritative writer per mutable physical state channel?
- Can scene-level systems represent multi-entity interactions without entity-schema changes?
- Can numerical/stochastic simulations scrub through checkpoint/replay deterministically?
- Is physics stepping independent of render refresh rate?
- Is runtime event ordering deterministic across workers?
- Can a project sequence and transition between multiple scenes?
- Do SVG/Pixi/Three renderers share camera transforms and picking identities?
- Can presentation transforms move a representation without silently changing physics?
- Are data sampling and detector acquisition independent of render FPS?
- Can Library/prefab updates avoid silently changing existing projects?
- Are plugins sandboxed/declarative enough to avoid editor and OS coupling?
- Are constants, scientific model versions and provenance reproducible?
- Can projects display localized/RTL UI/text without changing canonical physics identifiers?
- Are fonts/assets/license metadata deterministic and redistributable?
- Can one schema represent 2D and 3D state?
- Can it represent scalar/vector/complex fields?
- Can it represent thousands of particles?
- Can it represent graph topology?
- Can it represent constraints?
- Can it represent stochastic events?
- Can it represent detector samples and images?
- Can it represent reconstruction results?
- Can it represent experimental datasets?
- Can it represent multiple clocks?
- Can it represent audio?
- Can it represent astronomical logarithmic scale?
- Can topic modules add components without root-schema edits?
- Can unknown plugin data survive save/reopen?
- Can every observable feed a graph, label or equation?
- Can simulation pause while presentation continues?
- Can an example project use the same runtime as the editor?
- Can a deterministic preview be generated from every example?
- Can every Cambridge topic map to existing solver/representation classes?
- Can every extended topic map to the same classes?
- Can every stage-visible physics entity be created through the Physics Library without editor-specific hard-coding?
- Can plugin packages add Library items and prefabs without modifying the central editor?

If any answer is no, the schema is not frozen.

---

