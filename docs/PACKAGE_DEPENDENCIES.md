# Project and Dependency Direction

Allowed compile-time references point downward only:

```text
PhysicaStudio.Desktop
  -> PhysicaStudio.Authoring
  -> PhysicaStudio.Presentation
  -> PhysicaStudio.Rendering2D
  -> PhysicaStudio.Rendering3D

PhysicaStudio.Authoring
  -> PhysicaStudio.Document
  -> PhysicaStudio.Timeline

PhysicaStudio.Presentation
  -> PhysicaStudio.Document
  -> PhysicaStudio.Timeline
  -> PhysicaStudio.Observables

PhysicaStudio.Timeline
  -> PhysicaStudio.Document
  -> PhysicaStudio.Physics
  -> PhysicaStudio.Observables

PhysicaStudio.Rendering2D / Rendering3D
  -> PhysicaStudio.Document
  -> PhysicaStudio.Observables

PhysicaStudio.Physics
  -> PhysicaStudio.Document
  -> PhysicaStudio.Observables

PhysicaStudio.Observables
  -> PhysicaStudio.Document
```

Forbidden:

- Any domain project referencing `PhysicaStudio.Desktop` or Avalonia.
- A renderer calculating authoritative physics.
- An authoring view model becoming saved document state.
- A topic pack bypassing quantities, scheduling, events, or observables.

