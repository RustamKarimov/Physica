# Step 21 — Interactive Controls Implementation Specification

**Status:** IMPLEMENTATION-READY

**Owning roadmap item:** Phase 5, Step 5.3 — Interactive controls

**Primary owner:** `@physica/controls`

## 1. Purpose and source audit

Step 21 adds slider, number/unit field, toggle, button, vector handle, physical drag, layout drag and probe contracts. It was audited against the Constitution, Controls and Interaction System, Project Model, Commands and Events, Runtime Scheduler, Units, Picking and Selection, Accessibility and package dependencies.

Controls never mutate `ProjectDocument` directly. Document/initial-state changes are commands; live inputs are transient control state; presentation and layout changes are routed to their owning layers. Physical drag and layout drag are separate persisted kinds and separate action types.

## 2. Persisted contract and registry

The V1 envelope type is `physica:control/interactive-v1`. Configuration contains one tagged control definition, accessible label, optional description, binding target and kind-specific validated fields. Binding targets are document parameter, initial physical state, live runtime input, presentation property, layout property or measurement probe.

A package-local immutable registry describes the eight built-in control kinds, accepted value kind, keyboard behavior and recommended targets. It does not extend the frozen Physics Library item-class enum or introduce editor dependencies.

## 3. Values, units and interaction routing

Control values are finite scalar, boolean, `vec2` or action pulses. Sliders and number fields clamp and optionally snap to finite ranges. Number fields parse a selected display unit through the central unit registry and convert to the configured canonical unit with the shared conversion function; incompatible dimensions or semantic kinds fail explicitly.

Interactions produce immutable `ControlAction` descriptors. An injected router dispatches document commands, initial-state commands, presentation actions or layout actions to their owners. Live-runtime inputs enter `ControlInputStore`, whose queued actions are applied by a runtime task in `physica:scheduler/document-control`. Probes are read-only and cannot be set.

Buttons emit action pulses. Vector handles accept `vec2`. Physical drag emits initial/live physical input actions only; layout drag emits layout-property actions only. Neither kind is silently reinterpreted.

## 4. Accessibility and security

Every control requires a non-empty accessible label. Slider/number/vector controls expose deterministic keyboard increments; toggle/button are keyboard activatable; drag surfaces have non-pointer action equivalents; probes expose textual values. Definitions and values are JSON-safe, bounded and non-executable.

## 5. Test and example requirements

Tests cover all eight kinds, malformed envelopes, clamp/snap, affine and ordinary unit conversion, incompatible units, value-kind mismatch, read-only probes, action routing, document non-mutation, physical/layout drag separation, scheduler phase, queue order and immutable snapshots.

Required examples are `examples/controls/live-parameter-binding` and `examples/controls/physical-vs-layout-drag`, each with full metadata, README, executable output, exact JSON, accessible SVG preview, automated test and truthful pending artifact ledger. The launcher controls use these real APIs.

## 6. Definition of Done

Step 21 is complete when definitions, parsing, registry, interaction normalization, router/store/task, tests, both examples and launcher proof pass. It does not implement editor widgets, network collaboration, arbitrary scripts or a new physics writer.
