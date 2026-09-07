# Physica Studio Visual Design System

**Status:** Binding Phase 1 design guide  
**Visual floor:** Seven approved concepts in `docs/product/approved-concepts/`  
**Machine-readable source:** `docs/product/visual-design-tokens.json`  
**Scope:** Editor chrome, ribbons, panels, canvas overlays, timeline, graphs, scientific visuals, and learner presentation.

## 1. Design principles

### 1.1 The lesson is the hero

Application chrome must recede. The slide carries the strongest contrast, largest type, richest scientific illustration, and clearest visual hierarchy.

### 1.2 Dense, not cramped

Professional density is achieved through a 4 px spacing grid, aligned property columns, compact iconography, and predictable disclosure. It is not achieved by shrinking essential text.

### 1.3 Scientific beauty is functional

Vectors, graphs, equations, paths, fields, dimensions, and apparatus must be scientifically meaningful and visually composed. Decorative polish may clarify meaning; it may not invent false physical data.

### 1.4 One semantic color vocabulary

The same meaning keeps the same color family across canvas, timeline, inspector, graph, and presentation.

### 1.5 No placeholder visual debt

A feature may be disabled or marked Planned, but anything visible in an approved screenshot must look intentional and production-quality. Placeholder-quality art is not allowed to enter the visual baseline.

## 2. Typography

### 2.1 Font families

| Role | Family | Fallback | Use |
| --- | --- | --- | --- |
| Interface | Inter Variable | Segoe UI, SF Pro Text, sans-serif | Ribbon, panels, timeline, controls |
| Lesson display | Source Serif 4 | Georgia, serif | Slide titles and selected instructional headings |
| Mathematics | STIX Two Math | Cambria Math, serif | Equations and mathematical symbols |
| Monospace | JetBrains Mono | Cascadia Mono, monospace | Diagnostic IDs and optional data views only |

The selected fonts must be recorded in the dependency/license ledger before bundling. Platform-native fallbacks are allowed only when the bundled face is unavailable during development.

### 2.2 Editor type scale

| Token | Size | Line height | Weight | Use |
| --- | ---: | ---: | ---: | --- |
| UI caption | 12 px | 16 px | 450 | Nonessential metadata only |
| UI body | 13 px | 18 px | 450 | Default labels and controls |
| UI emphasis | 13 px | 18 px | 600 | Selected values and commands |
| Panel title | 13 px | 18 px | 650 | Dock and inspector headings |
| Dialog subtitle | 15 px | 21 px | 500 | Supporting dialog hierarchy |
| Dialog title | 20 px | 28 px | 650 | Modal and backstage titles |

No essential command, property label, timeline label, object name, or value may be smaller than 13 px at 100% scaling. Text below 13 px is limited to secondary timestamps, status metadata, and dense graph tick labels where contrast and spacing remain adequate.

### 2.3 Lesson type scale at 1920 × 1080

| Role | Size range | Minimum classroom use |
| --- | ---: | --- |
| Lesson title | 42–54 px | 40 px |
| Section heading | 30–38 px | 28 px |
| Explanatory body | 22–28 px | 20 px |
| Equation display | 36–56 px | 32 px |
| Diagram label | 18–24 px | 18 px |
| Graph axis title | 18–22 px | 17 px |
| Graph tick | 15–18 px | 15 px |
| Presenter navigation | 16–18 px | 16 px |

Lesson typography scales with the slide, not the editor zoom. The author may deliberately choose smaller text, but accessibility diagnostics must warn below classroom thresholds.

### 2.4 Typographic behavior

- UI numbers use tabular figures.
- Quantities keep symbol, value, and unit visually distinct but aligned.
- Mathematical variables are italic; units and descriptive subscripts are upright.
- Ellipsis is used only when a command opens a dialog or gallery.
- Uppercase micro-labels use increased tracking and never carry long sentences.

## 3. Color system

### 3.1 Editor chrome

| Token | Value | Use |
| --- | --- | --- |
| `chrome.deepest` | `#071018` | Title bar and deepest recess |
| `chrome.base` | `#0D1821` | Window background |
| `chrome.raised` | `#14212B` | Ribbon and primary panels |
| `chrome.control` | `#192A35` | Inputs, buttons, selected rows |
| `chrome.hover` | `#223744` | Hover surface |
| `chrome.selected` | `#1B3B4B` | Restrained active selection |
| `border.subtle` | `#263744` | Hairline dividers |
| `border.strong` | `#3B5568` | Focused section boundaries |
| `text.primary` | `#EDF3F7` | Primary editor text |
| `text.secondary` | `#AFBEC9` | Secondary labels |
| `text.muted` | `#738695` | Metadata and disabled labels |
| `text.disabled` | `#53636F` | Planned command labels |

Chrome levels must differ enough to establish depth without visible banding. Large areas may not use saturated accent fills.

### 3.2 Semantic accents

| Meaning | Primary | Soft/background | Use |
| --- | --- | --- | --- |
| Selection / ordinary key | `#168CFF` | `#123653` | Handles, active tab, ordinary keys |
| Live physics / pass-through | `#25C9C3` | `#133B3B` | Physics regions, live bindings |
| Condition / authored graph | `#9B68D7` | `#33264A` | Physics conditions, potential curves |
| Instruction / pause | `#F29A2E` | `#4B321A` | Antinodes, pause checkpoints |
| Valid / running | `#52CC7A` | `#193B29` | Validation and live-state dots |
| Warning / wait | `#E8B85B` | `#493B20` | Assumptions and interaction waits |
| Error / destructive | `#E36363` | `#4A2428` | Invalid state and reset/destructive |

Color is always paired with shape, label, or icon. It cannot be the only carrier of meaning.

### 3.3 Light lesson surface

| Token | Value |
| --- | --- |
| `paper.canvas` | `#F4F5F3` |
| `paper.surface` | `#FFFFFF` |
| `paper.card` | `#FBFCFC` |
| `paper.border` | `#D5DADE` |
| `paper.grid` | `#DCE2E6` |
| `ink.heading` | `#11284B` |
| `ink.body` | `#34424D` |
| `ink.muted` | `#697985` |
| `ink.blue` | `#0878F9` |
| `ink.orange` | `#ED7F18` |

### 3.4 Dark lesson surface

| Token | Value |
| --- | --- |
| `night.canvas` | `#020817` |
| `night.surface` | `#071225` |
| `night.card` | `#0A1730` |
| `night.border` | `#1D3352` |
| `night.text` | `#F5F8FB` |
| `night.secondary` | `#C3CED8` |
| `night.wave` | `#1EC8FF` |
| `night.node` | `#168CFF` |
| `night.antinode` | `#FF8D1A` |

Glow is derived from the same hue at 10–28% opacity and must never reduce line sharpness.

## 4. Spacing and geometry

### 4.1 Base grid

All layout spacing is a multiple of 4 px. Optical exceptions are limited to one-pixel hairlines and icon path alignment.

| Token | Value | Typical use |
| --- | ---: | --- |
| `space.1` | 4 | icon-to-label, dense gaps |
| `space.2` | 8 | control padding, row gaps |
| `space.3` | 12 | panel internal spacing |
| `space.4` | 16 | card padding, slide workbench margin |
| `space.5` | 20 | large group spacing |
| `space.6` | 24 | dialog and slide component spacing |
| `space.8` | 32 | major lesson grouping |
| `space.12` | 48 | presentation sections |
| `space.16` | 64 | 1080p presentation safe margin |

### 4.2 Radii

| Element | Radius |
| --- | ---: |
| Ribbon/input/button | 3–4 px |
| Panel card | 5–6 px |
| Floating gallery | 6–8 px |
| Lesson card | 10–12 px |
| Presentation navigation capsule | full/pill |

The editor is comparatively square and precise. Larger radii belong to learner-facing cards and transient floating surfaces.

### 4.3 Borders and elevation

- Default divider: 1 px `border.subtle`.
- Focus ring: 2 px `accent.selection` with 2 px outer gap.
- Selected slide: 2 px saturated blue outline.
- Editor floating surface: 0 8 24 at 28% black plus a one-pixel border.
- Lesson card: 0 4 14 at 10–14% black.
- Slide paper: 0 8 28 at 30–36% black on the workbench.

Elevation is never simulated by thick outlines.

## 5. Iconography

### 5.1 Style

- 20 px nominal grid for ordinary commands; 24 px for large ribbon commands.
- 1.5–1.75 px stroke at 100% scale.
- Round caps and joins unless the physical symbol requires precision.
- Monochrome by default; semantic tint only for selected/contextual actions.
- Optical centering is required; mathematical centering alone is insufficient.
- Filled icons are reserved for primary playback and status emphasis.

### 5.2 Sources

- Fluent System Icons supply general application actions.
- Physica-owned vectors supply physics, graph, apparatus, condition, and representation actions.
- Every icon has a stable key, SVG/vector source, accessible name, and light/dark variants if required.

### 5.3 Forbidden icon practices

- Unicode or emoji as icons.
- A letter inside a circle as an object preview.
- Reusing one generic symbol for unrelated commands.
- Tiny raster icons that blur at high DPI.
- Unlicensed icon packs or unexplained copied assets.

## 6. Component specifications

### 6.1 Buttons

| Type | Height | Padding | Visual behavior |
| --- | ---: | --- | --- |
| Compact tool | 28 px | 6 px horizontal | Icon-first; quiet background |
| Standard | 32 px | 10–12 px | Label or icon + label |
| Primary | 36 px | 14 px | Saturated blue, used sparingly |
| Presentation primary | 48–56 px | 18 px | Circular/pill play action |

States: default, hover, pressed, selected, focused, disabled, planned, preview. Disabled controls retain sufficient contrast to remain discoverable but do not resemble active commands.

### 6.2 Inputs

- Default height: 28–32 px.
- Numeric values align right.
- Unit selectors attach to the value field with one shared border.
- Focus uses a blue outline; invalid uses red plus diagnostic icon and text.
- Slider thumb is 12–14 px, track 3–4 px, active portion saturated blue.
- Toggle is compact and uses both position and color.

### 6.3 Ribbon command

- Icon occupies the upper visual center.
- Label uses 13 px, maximum two lines.
- Large command footprint does not exceed 64 px width without a gallery need.
- Group footer uses 12 px muted text.
- Hover affects only the command surface, not the entire group.

### 6.4 Panel header

- Height: 30–32 px.
- Disclosure chevron: 14–16 px.
- Title: 13 px semibold.
- Optional status or pin action aligns right.
- Panel header and section header use distinct elevation levels.

### 6.5 Inspector property row

- Height: 28–32 px.
- Label column: 42–48%.
- Editor column: remaining width minus unit/binding action.
- Horizontal gap: 8 px.
- Vertical rhythm: no arbitrary margins between adjacent rows.

### 6.6 Floating gallery

- Anchored beneath its launcher.
- Search remains visible while content scrolls.
- Width follows content class: 320–520 px.
- Maximum height: 70% of work area.
- Sections support Favorites, Recent, categories, and “See all.”
- Escape closes; arrow keys navigate; focus returns to launcher.

### 6.7 Object tile

- Thumbnail owns at least 60% of tile area.
- Object name uses 13 px semibold.
- Category/status is secondary.
- Hover reveals favorite and details actions.
- Readiness is a small badge or corner mark, not a replacement for artwork.

### 6.8 Timeline

- Ruler height: 24–28 px.
- Row height: 24–28 px.
- Group row: 28–32 px.
- Playhead: 1–2 px saturated blue with a compact time chip.
- Keyframe hit target: at least 18 px even when drawn key is 7–9 px.
- Selected clips use an outline plus subtle fill change.
- Low zoom collapses dense keys into a density visualization.

## 7. Scientific visual language

### 7.1 Apparatus

Every apparatus illustration must include:

- recognizable silhouette,
- functional connection points,
- material cues,
- light direction consistent within the slide,
- correct scale relationship to nearby objects,
- a light- and dark-background treatment,
- vector-safe edges at presentation zoom.

Style target: refined educational illustration, halfway between precise technical diagram and lightly dimensional product illustration. Avoid cartoon exaggeration and photorealistic noise.

### 7.2 Lines and vectors

| Element | Typical stroke at 1080p |
| --- | ---: |
| Guide/grid | 1 px |
| Equilibrium/reference line | 1.5–2 px, dashed |
| Diagram outline | 2–3 px |
| Primary physical path | 3–4 px |
| Primary vector | 3–4 px plus clear arrowhead |
| Selected path | base stroke + 1–2 px halo |

Vector labels sit near the middle or head with sufficient offset. Components use consistent colors and do not overlap object outlines.

### 7.3 Wave rendering

- Primary instantaneous wave is crisp and saturated.
- Phase/history traces use the same hue at decreasing opacity.
- Nodes use blue outlined or filled markers.
- Antinodes use orange markers/braces.
- Equilibrium is neutral dashed gray.
- Glow remains behind the crisp source path.
- Amplitude changes preserve attachment constraints.

### 7.4 Fields

- Field density adapts to viewport and local magnitude.
- Singularities use exclusion regions.
- Arrows/streamlines do not obscure charges or labels.
- Positive and negative sources remain distinguishable by sign, hue, and shape.
- Field and potential representations keep a stable legend.

### 7.5 Graphs

- Axes have explicit quantity and unit.
- Grid is low contrast and subordinate.
- Curves use 2–3 px at 1080p.
- Discontinuities are broken, never connected across excluded domains.
- Multiple curves use both color and line/marker differences.
- Tick density adapts to available space.
- Live-update status is attached to the graph in a quiet badge.
- Default output is publication-quality; styling is not delegated to a plotting-library default theme.

### 7.6 Equations

- True math layout and glyph shaping.
- Baselines align across multi-step derivations.
- Bound quantities may receive semantic color, but excessive rainbow tokenization is forbidden.
- Numerical substitution is clearly separated from symbolic form.
- Matching-transform correspondence has a visible editing overlay only in authoring mode.

## 8. Light and dark compatibility

Each scientific representation defines:

- light-background stroke/fill,
- dark-background stroke/fill,
- selected state,
- disabled/ghost state,
- print-safe state.

Automatic contrast selection must be deterministic and overridable. Minimum text contrast follows WCAG AA; thin scientific marks require visual testing beyond simple contrast ratios.

The same object must remain recognizable across:

1. white paper,
2. warm light paper,
3. dark navy presentation,
4. custom colored slide,
5. grayscale print.

## 9. Motion and feedback

Editor feedback is short and functional:

- Hover: 80–120 ms.
- Press: immediate.
- Panel expand/collapse: 140–180 ms.
- Gallery open: 120–160 ms.
- Workspace rearrangement: 180–240 ms.
- Tooltip delay: 500–700 ms.

Presentation motion follows the authored timeline and is not constrained to UI durations.

Reduced-motion mode removes nonessential easing, glow pulses, and animated panel travel while preserving physics meaning through snapshots or direct changes.

## 10. Accessibility and input

- Essential editor text is at least 13 px.
- Pointer targets are at least 28 × 28 px; critical presentation controls are at least 44 × 44 px.
- Every command, object tile, keyframe, and control has an accessible name.
- Focus is always visible.
- Keyboard navigation follows visual order.
- Timeline exposes a structured keyboard model independent of its batched rendering.
- Semantic states combine color with shape/icon/text.
- High-contrast and reduced-motion modes are first-class tokens, not later patches.
- Scaling is tested at Windows 100%, 125%, 150%, and 200%, plus macOS Retina.

## 11. Screenshot fidelity process

Every reference slice follows this sequence:

1. Render at 1672 × 941 and at the operating system’s native high-DPI scale.
2. Capture the complete application window.
3. Place implementation and approved reference side by side.
4. Produce a 50% opacity overlay and pixel-difference heat map.
5. Review region proportions, alignment, typography, icon density, contrast, scientific artwork, and empty-space balance.
6. Record every mismatch as a named issue.
7. Correct one system at a time—tokens, layout, component, or artwork.
8. Re-capture without manually staging pixels outside the application.

Automated comparison detects regressions but cannot approve taste. User approval remains the visual gate.

## 12. Visual acceptance checklist

### Shell

- [ ] Chrome uses the defined elevation ladder.
- [ ] Ribbon proportions match the reference family.
- [ ] No stock-looking control breaks the visual language.
- [ ] No Unicode or placeholder icon appears.
- [ ] Sidebars and timeline align precisely with the canvas.
- [ ] Essential text is readable at 100%.

### Canvas

- [ ] Slide is the visual focus.
- [ ] Scientific objects are recognizable and materially resolved.
- [ ] Labels, vectors, equations, and graphs are presentation-ready.
- [ ] Light and dark backgrounds are equally convincing.
- [ ] Selection overlays are precise and unobtrusive.

### Timeline

- [ ] Track hierarchy reads immediately.
- [ ] Semantic key types are distinguishable by shape and color.
- [ ] Ruler, playhead, clips, and rows share one geometry.
- [ ] Dense content remains responsive and visually calm.

### Presenter

- [ ] No authoring chrome leaks into audience view.
- [ ] Content is legible from classroom distance.
- [ ] Navigation is polished and subordinate.
- [ ] Interactive controls expose quantity, unit, range, value, and state.
- [ ] Teacher-only controls remain hidden.

## 13. Governance

Any implementation that needs a token not covered here must add it to the machine-readable token file and explain the use. Hard-coded one-off colors, fonts, radii, and spacing values in visible production controls are prohibited.

Changing a binding token or structural rule requires:

1. documented reason,
2. screenshots of all affected reference slices,
3. accessibility review,
4. user approval if the change materially alters the approved visual language.

