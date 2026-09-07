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

## ADR-007 — Approved concepts are a binding visual floor

**Status:** Accepted
**Decision:** The seven approved concept images are minimum-quality product references, not approximate wireframes. Phase 1 requires comparable or better typography, density, iconography, scientific artwork, timeline clarity, and presenter quality. User approval is part of the gate and cannot be replaced by a passing build or screenshot metric.

## ADR-008 — Avalonia qualification and UI escape boundary

**Status:** Provisional
**Decision:** Avalonia remains the native host only while the recovered shell passes visual, interaction, high-DPI, Windows, macOS, and performance gates. All document, timeline, rendering-input, asset, and background-work contracts remain Avalonia-independent. If one focused optimization cycle cannot pass the gates, the Desktop implementation moves to Qt Quick/C++ before Phase 2.

## ADR-009 — Batched retained rendering and viewport timelines

**Status:** Accepted
**Decision:** Scientific scenes and dense timelines are rendered from immutable snapshots and viewport batches. Physica must not allocate one Avalonia control per scene object, graph sample, keyframe, or installed asset. Content and project assets are indexed and loaded progressively.

## ADR-010 — Phase 2 immutable document and command boundary

**Status:** Accepted
**Decision:** Saved lesson state is represented by immutable, versioned, UI-independent document snapshots. All editor mutations are issued through `PhysicaStudio.Authoring` commands with deterministic validation and undo/redo publication. Avalonia views may hold selection and viewport state but never become saved project authority.

## ADR-011 — User-authorized Phase 2 start with qualification debt retained

**Status:** Accepted by explicit user direction on 2026-09-07
**Decision:** The regenerated main authoring shell is accepted as the visual foundation for Phase 2. Remaining Phase 1 reference slices and cross-platform performance qualification remain tracked obligations and may not be falsely marked complete or omitted from later release gates. Ribbon icon refinements, including Font and Paragraph groups, are deferred until their functional phase.
