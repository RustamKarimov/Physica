# Physica Studio Approved-Reference Analysis

**Status:** Binding visual analysis for Phase 1  
**Source set:** `docs/product/approved-concepts/01` through `07`  
**Reference resolution:** 1672 × 941 pixels, 1.7779:1  
**Purpose:** Define what makes the approved concepts look and behave like one professional product before implementation resumes.

## 1. Authority and interpretation

The seven approved images are the minimum visual-quality floor for Physica Studio. They are not loose wireframes and they are not merely examples of where panels might be placed. Their shared hierarchy, density, visual restraint, scientific illustration quality, interaction vocabulary, and classroom presentation quality are binding.

The implementation must reproduce the design system inferred from the complete set, not copy a single image literally. Values below are normalized from the 1672 × 941 references and must scale through design tokens. Small optical corrections are expected when actual text shaping and platform rendering differ.

The following user decisions override details visible in individual images:

- The Physics Objects browser uses one prominent search field and one topic dropdown. It does not use permanent topic tabs.
- The ribbon shows priority animation commands. The complete animation library appears in an expandable, searchable gallery, with favorites and recent items, so additional animations do not make the ribbon grow indefinitely.
- Scientific or usability errors in a reference may be corrected, but polish, clarity, density, and presentation quality may not be reduced.

## 2. Shared visual signature

All seven images use the same visual language:

1. A restrained near-black editor shell recedes behind the lesson.
2. The slide is the brightest and most important surface.
3. Compact controls are grouped by fine dividers and alignment, not large cards.
4. Cyan-blue identifies active physics and selected scientific representations.
5. Orange identifies contrast, antinodes, pauses, and instructional emphasis.
6. Purple identifies equations, graph curves, and authored animation regions.
7. Teal identifies continuous physics, pass-through events, and valid live bindings.
8. Content uses editorial typography: a serif display face for lesson titles and a neutral sans-serif face for interface and explanatory text.
9. Scientific objects are recognizable illustrations with material, depth, and functional detail. They are not generic circles, letters, emoji, or diagram placeholders.
10. Dense workspaces remain calm because every row, icon, label, boundary, and highlight has consistent scale.

## 3. Image-by-image analysis

### 01 — Standing-wave authoring studio

**Role:** Establishes the default authoring workspace and the overall quality floor.

**Structure**

- Compact title bar, ribbon tabs, command ribbon, working area, and status bar.
- Left slide navigator occupies roughly 14% of the width.
- Right contextual inspector occupies roughly 22–23%.
- Central editor occupies the remaining fluid width.
- Timeline occupies roughly the lower 27–29% of the working area.
- The slide is centered in a neutral dark workbench with a subtle shadow and a clean 16:9 paper surface.

**Visual properties**

- Editor chrome is layered through small luminance changes rather than thick borders.
- Ribbon icons are quiet monoline graphics; selected tabs receive a restrained highlight.
- Slide title is a dark navy serif, substantially larger than body copy.
- Standing-wave apparatus is materially recognizable: end supports, attachment points, string, equilibrium line, multiple phase traces, nodes, and antinode annotations.
- The active wave uses a saturated blue line. Historical/phase traces use low-opacity blue.
- Orange and blue annotation colors create a stable instructional convention.
- The inspector is a compact property grid with aligned numeric fields and attached unit selectors.
- The timeline has a ruler, playback tools, nested tracks, semantic key shapes, clips, and a thin luminous playhead.

**Non-negotiable lesson**

The central scientific artwork carries most of the visual quality. A polished shell around crude scene shapes still fails this reference.

### 02 — Projectile scene construction

**Role:** Establishes object-library browsing, model construction, selection feedback, and automatic-output configuration.

**Structure**

- Left slide navigator plus a secondary Physics Objects browser.
- Large central light slide.
- Right physics inspector organized into collapsible sections.
- Timeline is collapsed to a narrow disclosure bar to maximize construction space.

**Visual properties**

- Object tiles contain recognizable, high-quality apparatus previews on a controlled dark tile background.
- The object browser is visually dense but not cramped; thumbnails dominate over labels.
- The slide uses a realistic ground cutaway, launcher, ball, target, axes, measurement dimension, and dashed physical trajectory.
- Selection is communicated with small blue handles and a compact floating toolbar near the object.
- Physics properties distinguish initial conditions, environment, automatic outputs, and validation.
- Checkboxes and validation states are subordinate to the model rather than visually dominant.

**Required adaptation**

Replace the topic tabs shown in the concept with:

- a full-width search field,
- a topic dropdown,
- optional compact filters,
- favorites and recent items.

### 03 — Multi-track timeline and condition keyframes

**Role:** Defines the authoritative sequencing workspace.

**Structure**

- Animate ribbon selected.
- Dark lesson canvas above a large expanded timeline.
- Right inspector focused on a physics-condition keyframe.
- Timeline occupies approximately 38–41% of the working area.

**Visual properties**

- The dark slide demonstrates that scientific objects remain luminous and legible on a non-white background.
- Timeline rows are hierarchical: system, parameters, representations, equations, camera, and narration.
- Ordinary keyframes, physics-condition keyframes, pauses, and pass-through events have distinct shapes and colors.
- Parameter tracks show values and interpolated curves where useful.
- Condition events include meaningful labels directly on the timeline.
- Physics simulation is represented as a continuous base region, distinct from authored presentation clips.
- The condition editor separates trigger, value change, transition, and presentation behavior.
- “Continue playing” and “Pause for teacher” are independent behavior choices.

**Non-negotiable lesson**

The timeline is not a sequence of story cards. It is a professional multi-object, multi-property editor whose density remains readable.

### 04 — Animation gallery and Bézier editing

**Role:** Defines scalable animation discovery, animation stacking, path editing, and the relation between ribbon and galleries.

**Structure**

- Animate ribbon plus a contextual Vector Path Tools tab.
- Searchable animation gallery opens below the ribbon without permanently consuming it.
- Central slide shows equations, a charged particle, a physical circular path, and an authored annotation path.
- Right panel combines an animation stack and vector-path properties.
- Timeline remains visible below the slide.

**Visual properties**

- Gallery is organized into favorites, recent, Manim-style, motion, and physics-aware groups.
- Tiles use real vector previews with compact names; the gallery is a temporary anchored surface.
- The selected physical path is visibly locked to the Lorentz-force model.
- The selected authored path exposes cubic Bézier handles and editable points.
- Equations and annotations use an editorial hierarchy rather than raw math text.
- Animation clips are labeled, colored, and stacked across object/property rows.

**Scalability rule**

Only high-frequency commands remain in the ribbon. All other effects live in the searchable gallery. The gallery supports category filters, favorites, recents, and command search; therefore the animation catalog can grow without ribbon overflow.

### 05 — Automatic graphs and physics bindings

**Role:** Defines graph creation, observable selection, live binding, and compound scientific layouts.

**Structure**

- Graphs ribbon selected.
- Quantity chooser appears as an anchored searchable gallery.
- Central slide contains a charge diagram, field vectors, a probe callout, equations, and a two-plot graph card.
- Right panel is graph-specific.
- Timeline shows charge parameters, separation, representations, graphs, and equations.

**Visual properties**

- The slide is not a collection of unrelated widgets. Diagram, probe, equations, and graphs share alignment and explanatory flow.
- Vector direction and color agree with graph legend and inspector binding.
- Graph axes use scientific units, restrained grids, readable labels, and correctly discontinuous curves.
- The live-binding badge is small, semantic, and attached to the graph—not a dominant banner.
- Graph card uses a light border, slight elevation, and internal spacing sufficient for two plots.
- Purple and blue distinguish potential and field without breaking the broader palette.

**Non-negotiable lesson**

A graph must look publication-ready in the editor and presentation-ready on the slide. Default plotting-library styling is unacceptable.

### 06 — Clean learner presentation

**Role:** Defines the cinematic, teacher-led presentation experience.

**Structure**

- No editor ribbon, panels, selection handles, or authoring metadata.
- Lesson content fills the 16:9 frame inside generous safe margins.
- A checkpoint/progress rail sits above a centered floating navigation capsule.
- Minimal slide number and live-physics status sit at opposite lower corners.

**Visual properties**

- Very dark navy background with subtle spatial glow.
- Large white serif title and comfortable sans-serif explanatory text.
- Electric-blue wave with layered low-opacity phase traces.
- Orange antinode annotation and blue node annotations.
- Equations are large enough to read from a classroom distance.
- Bottom navigation is a translucent dark capsule with a single saturated blue primary action.
- Secondary controls are quiet, separated by fine dividers, and labelled.
- Presentation chrome is visually subordinate and may fade when inactive.

### 07 — Interactive learner presentation

**Role:** Defines audience-visible investigation controls and automatic scientific updates.

**Structure**

- Light full-screen lesson surface.
- Large interactive apparatus region across the upper third.
- Three aligned cards below: controls, equations/values, and live graph.
- Checkpoint rail and presentation controls remain at the bottom.

**Visual properties**

- Warm off-white background reduces glare while preserving high contrast.
- Deep navy serif title anchors the page.
- Apparatus uses the same recognizable materials as the authoring reference.
- Controls are compact and fully labelled with quantity symbols, units, ranges, current values, and teacher/audience visibility.
- Blue indicates active values and controls; red is reserved for reset/destructive emphasis.
- Equations are typeset, aligned, substituted numerically, and paired with bound-state status.
- Graph has publication-quality axes, grid, fill, and summary values.
- Cards use fine gray borders, modest radii, slight shadow, and generous internal alignment.

## 4. Normalized geometry

The following geometry is derived from the 1672 × 941 reference set. It is a starting contract for a 100% scale desktop viewport, not a hard-coded pixel layout.

| Region | Reference range | Default token |
| --- | ---: | ---: |
| Title bar | 3.0–3.8% of height | 30 px |
| Ribbon tabs | 3.0–3.8% of height | 32 px |
| Ribbon command area | 8.5–10.5% of height | 88 px |
| Status bar | 2.3–3.0% of height | 24 px |
| Slide navigator | 10–15% of width | 224 px |
| Auxiliary library | 14–17% of width when open | 248 px |
| Contextual inspector | 21–24% of width | 344 px |
| Expanded timeline | 25–41% of working height | 260 px default |
| Collapsed timeline | 3–4% of working height | 32 px |
| Editor slide aspect | 16:9 | Fit inside center |
| Presenter safe margin | 3.5–5.5% of frame | 64 px at 1080p |

Rules:

- The slide canvas receives the largest uninterrupted rectangle.
- Opening a library narrows or overlays the left work area; it never shrinks the inspector into illegibility.
- Increasing timeline height reduces canvas height, not ribbon density.
- Below the minimum editor width, side panels collapse or become overlays before typography shrinks.
- At high DPI, all dimensions scale from device-independent pixels and vector assets remain sharp.

## 5. Cross-reference component grammar

### Chrome and panels

- Near-black surfaces separated by one-pixel low-contrast lines.
- Three to five perceptible elevation levels, each created by small luminance shifts.
- Compact headers with disclosure chevrons and optional pin/close actions.
- Panel titles use uppercase or semibold micro-labels sparingly.
- Scrollbars are narrow and quiet until hovered.

### Ribbon

- Tabs are text-first and compact.
- Selected tab uses a restrained blue/teal indicator, not a large filled pill.
- Commands use 18–22 px monoline icons.
- Large commands are reserved for high-frequency or gallery-launching actions.
- Group labels sit below commands in muted text.
- Vertical separators define groups without heavy containers.

### Inspector

- Section headers: disclosure icon, title, optional status/action.
- Property rows: label, value/control, unit or binding action.
- Numeric values align vertically and use tabular numerals.
- Bound properties expose a small link/binding indicator.
- Validation is shown at the bottom of the relevant section.

### Scientific canvas

- Paper or lesson background is clean and uninterrupted.
- Objects use correct silhouette, proportions, material cues, and functional details.
- Labels use short leaders and avoid crossing scientific lines.
- Selection handles are 6–8 device-independent pixels.
- Floating toolbars sit near the selection and use real icons with compact labels.
- Automatic representations are visually distinct from manually authored annotations.

### Timeline

- A fixed row-header column aligns with a horizontally scrollable time viewport.
- Ruler, playhead, clips, keys, markers, and physics regions are drawn in batches.
- Nested rows use indentation and semantic icons.
- Rows target 24–28 px; track groups target 28–32 px.
- Ordinary key: blue diamond.
- Physics-condition key: purple diamond.
- Pause checkpoint: orange square.
- Pass-through event: teal circle/diamond.
- Interaction wait: outlined amber marker.
- Continuous physics: muted teal strip.
- Authored animation clip: purple/blue clip with label.

### Presentation

- Authoring chrome disappears completely.
- Navigation is reachable but visually subordinate.
- Teacher-only controls never leak into audience view.
- Large content respects a classroom-safe typography and contrast standard.
- Presentation ink is ephemeral and visually distinct from authored content.

## 6. Explicitly forbidden shortcuts

- Stock-theme appearance as the visible final design.
- Unicode characters or text standing in for command icons.
- Lettered circles or generic primitives standing in for physics objects.
- One UI control per scene object, graph point, or keyframe.
- A ribbon containing every available animation as a permanent button.
- Tiny text used to preserve a crowded layout.
- Large colorful readiness badges that compete with lesson content.
- Default plotting-library output.
- Flat, unlit apparatus when the reference uses material and depth.
- Claiming visual completion because region placement is similar.

## 7. Reference-derived acceptance questions

Every screenshot review must answer yes to all of the following:

1. Does the slide dominate attention over the editor chrome?
2. Is every physics object recognizable without reading its label?
3. Are text and values readable at 100% scaling?
4. Are spacing, alignment, and density consistent across ribbon, panels, and timeline?
5. Can ordinary, condition, pause, and pass-through keys be distinguished without reading a legend?
6. Do dark and light slides preserve scientific contrast and material quality?
7. Do equations, graphs, vectors, and labels look presentation-ready?
8. Does the interface avoid placeholder or developer-tool aesthetics?
9. Does every expanded gallery solve scale without making the ribbon taller?
10. Is the learner view clean enough to present without apology?

