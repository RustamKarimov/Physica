# Architecture Decisions

## ADR-001 — Native .NET desktop foundation

**Status:** Accepted  
**Decision:** C# 14, .NET 10 LTS, Avalonia 12.1.x, and custom retained-mode rendering form the application foundation. JavaScript and browser runtimes do not ship as the authoring, animation, or physics runtime.

## ADR-002 — Interface-first activation

**Status:** Accepted  
**Decision:** The complete Studio shell and command inventory are implemented and reviewed before functional authoring or physics work. Commands carry explicit readiness metadata and remain disabled when Planned.

## ADR-003 — Professional multi-track timeline

**Status:** Accepted  
**Decision:** Object, property, physics-system, parameter, representation, camera, audio, interaction, event, marker, and checkpoint tracks share one authoritative timeline. Story cards cannot replace it.

## ADR-004 — Dual clock and condition authority

**Status:** Accepted  
**Decision:** Physics time and presentation time are independent. Condition keyframes retain their physical predicate, not a stale calculated timestamp.

## ADR-005 — Native Manim-style animation

**Status:** Accepted  
**Decision:** Manim-quality effects are implemented in the native retained scene system. Manim may be a comparison oracle but is not embedded in the application.

## ADR-006 — New clean history with recoverable legacy

**Status:** Accepted  
**Decision:** The legacy repository is preserved by verified bundle, immutable tags, and a tracked-change patch before the new orphan history replaces `main`.

