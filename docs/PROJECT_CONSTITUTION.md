# Physica Studio Project Constitution

## Product authority

Physica Studio is a professional physics lesson authoring and presentation environment. It is not a gallery of pre-rendered demonstrations. A teacher must be able to design slides, configure physical models without programming, sequence explanations on a detailed timeline, present a clean learner view, and safely manipulate physical quantities during a lesson.

## Non-negotiable architecture

- The document is the saved authoring truth; runtime state is reconstructable.
- Physics owns physical state. Timeline actions may request parameter changes but may not become competing solvers.
- Observables are the only source for derived graphs, values, vectors, paths, equations, and measurements.
- Physical and presentation transforms are distinct.
- Each mutable channel has exactly one authoritative writer.
- Seeking restores a deterministic checkpoint and replays commands.
- Physics and domain projects never reference desktop UI types.
- Released objects use recognizable professional artwork, never letter placeholders.
- Incomplete features are visible and honestly marked Planned, Shell ready, Preview, Active, or Validated.
- The shell is approved before Phase 2 behavior begins.

## Product-quality definition

Scientific correctness alone is insufficient. A capability is complete only when scientific correctness, authoring usability, animation quality, presentation quality, accessibility, serialization, and deterministic replay work together.

## Cross-platform and ownership

Windows and macOS are first-class targets. The GitHub `main` branch is the shared development authority. The dependency stack must remain compatible with a future proprietary product; required notices and replacement strategies are recorded in the dependency ledger.

