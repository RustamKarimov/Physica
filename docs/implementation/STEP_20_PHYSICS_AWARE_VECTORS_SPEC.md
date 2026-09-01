# Step 20 — Physics-Aware Vectors Implementation Specification

**Status:** IMPLEMENTATION-READY

**Owning roadmap item:** Phase 5, Step 5.2 — Physics-aware vectors

**Primary owners:** `@physica/relationships`, Physics Library built-ins, desktop presentation

## 1. Purpose and source audit

Step 20 makes a vector representation read mathematical vector observables instead of behaving as a decorative arrow. It was audited against the Constitution, Component/System models, Physics Library, Dynamic Relationships, Mathematics and Units, Coordinates and Frames, Renderer Architecture and package dependencies.

The visual arrow is never an authority. No new solver, renderer dependency, root schema field or third-party package is required.

## 2. Persisted and resolved contracts

The representation type is `physica:representation/physics-vector-v1`. It uses the existing generic `RepresentationDefinition` envelope and declares relationship references for origin and vector values. Configuration contains a finite non-negative world scale, arrow styling, an accessible label and optional unit expression.

Resolution accepts a `vec2` origin and a mathematical `vec2` vector from the relationship engine. It returns an immutable renderer-neutral plan containing world tail, world head, unscaled mathematical vector, magnitude, normalized direction when defined, scaled display displacement, style and accessible scientific summary.

A zero vector is valid: head equals tail, magnitude is zero, direction is absent and the representation remains selectable/announced without fabricating a direction.

## 3. Coordinates, units and authority

All endpoints remain world/model values. Camera and renderer layers own screen conversion. World scale affects only representation displacement, never the source observable or reported physical magnitude. Resolution rejects scalar/boolean/text inputs and non-finite styling.

The built-in `vector-arrow` Library item is classified as a representation and advertises compatible observable targets and control recommendations. Instantiation still occurs through normal representation/document commands; the Library item does not bypass project ownership.

## 4. Test and example requirements

Tests cover ordinary and zero vectors, scale separation, magnitude/direction, type rejection, immutability, deterministic repeated resolution and proof that source relationship values remain unchanged.

`examples/relationships/velocity-vector` ships metadata, README, executable exact output, expected JSON, accessible SVG preview, automated test and truthful pending native/media artifacts. The launcher shows a real resolved velocity vector with magnitude and components, explicitly labelled as a contract preview rather than final artwork.

## 5. Definition of Done

Step 20 is complete when persisted validation, renderer-neutral resolution, Library metadata, example, tests and launcher proof pass. It does not implement screen-space picking, 3D arrows, vector-field plots or authoritative physics integration.
