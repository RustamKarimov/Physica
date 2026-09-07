# Physica Studio Interface Structure

**Status:** Binding Phase 1 information architecture  
**Depends on:** `REFERENCE_IMAGE_ANALYSIS.md`, `VISUAL_DESIGN_SYSTEM.md`  
**Implementation state:** Specification only; interface implementation is paused pending review.

## 1. Structural objective

Physica Studio is a presentation authoring environment with a physics-aware scene and timeline. Its interface must feel closer to a mature creative application than to a dashboard, form editor, or IDE.

The structural priority is:

1. Lesson slide and scientific content.
2. Current authoring task.
3. Contextual properties.
4. Timeline and temporal relationships.
5. Navigation and application status.

No readiness indicator, debug label, or architecture message may outrank those priorities.

## 2. Shell anatomy

```text
Application window
├─ Title bar / quick access
├─ Ribbon
│  ├─ Tab strip
│  ├─ Active command groups
│  └─ Optional contextual-tab strip
├─ Authoring workspace
│  ├─ Left dock
│  │  ├─ Slides / Outline / Sections / Masters / Assets
│  │  └─ Optional task browser: Physics Objects or other gallery
│  ├─ Center workbench
│  │  ├─ Canvas toolbar
│  │  └─ 16:9 slide viewport
│  ├─ Right contextual inspector
│  └─ Bottom workspace
│     ├─ Timeline & Keyframes
│     ├─ Animation Curves
│     ├─ Data Table
│     ├─ Presenter Notes
│     ├─ Event Log
│     └─ Validation Results
└─ Status bar
```

All four authoring edges are independently collapsible. The center canvas expands into the released space.

## 3. Reference desktop metrics

Metrics use device-independent pixels at 100% scale.

| Element | Default | Minimum | Maximum | Behavior |
| --- | ---: | ---: | ---: | --- |
| Window design viewport | 1672 × 941 | 1180 × 720 | none | Reference fidelity is evaluated at 1672 × 941 |
| Title bar | 30 | 28 | 34 | Never grows with ribbon |
| Ribbon tab strip | 32 | 30 | 36 | Horizontal overflow after group compression |
| Ribbon command band | 88 | 80 | 96 | Fixed height per density profile |
| Status bar | 24 | 22 | 28 | May hide low-priority fields |
| Left slide dock | 224 | 184 | 320 | Resizable and collapsible |
| Auxiliary browser | 248 | 220 | 360 | Docked or overlay based on width |
| Right inspector | 344 | 300 | 460 | Resizable and collapsible |
| Bottom timeline | 260 | 180 | 60% workspace | Resizable and collapsible |
| Timeline header column | 228 | 196 | 340 | Resizable independently |
| Timeline row | 26 | 24 | 32 | Group rows may be 30 |
| Slide outer padding | 16 | 10 | 28 | Workbench around paper |

### Responsive behavior

At widths above 1500 px, the reference composition is fully docked. From 1280–1499 px, ribbon groups collapse by priority and auxiliary libraries open as overlays. Below 1280 px, one side panel is collapsed by default. Typography and target size do not shrink below their accessibility minimums.

The order of sacrifice is:

1. Hide low-priority status items.
2. Collapse ribbon groups into galleries.
3. Convert auxiliary libraries to overlays.
4. Collapse the non-focused side panel.
5. Collapse the bottom workspace.

The canvas is never made unusably narrow merely to keep every panel visible.

## 4. Title bar and quick access

The title bar contains:

- Physica mark and product name.
- Backstage affordance.
- Quick Access commands: Save, Undo, Redo, and user-configurable additions.
- Document name and dirty-state marker.
- Optional sync state.
- Native window controls.

It uses the darkest chrome token and contains no oversized branding.

## 5. Ribbon structure

### Tabs

Primary tabs:

- File
- Home
- Insert
- Design
- Transitions
- Animate
- Physics
- Equations
- Graphs & Data
- Draw
- View
- Present
- Help

Selection is indicated by brighter text and a restrained accent line or shallow surface change.

### Command sizing

- **Large:** gallery launchers and dominant actions; 44–56 px command footprint.
- **Medium:** icon plus label; 34–44 px.
- **Small:** 18–20 px icon with adjacent label; 24–30 px row.

Every group declares priority and collapse behavior in `RibbonManifest`.

### Overflow model

Groups collapse in this order:

1. Labels shorten only where the approved command name remains clear.
2. Small related commands form two- or three-row stacks.
3. Low-priority commands move into the group overflow.
4. The group becomes one gallery launcher.
5. Ribbon band scroll is a last resort and must not change its height.

### Animation scaling

The Animate ribbon contains playback, Add Animation, Add Keyframe, triggers, common transforms, timing, easing, and Edit Curve. The full catalog opens in an anchored gallery with:

- search,
- Favorites,
- Recently used,
- Entrance,
- Emphasis,
- Transform,
- Exit,
- Motion,
- Physics,
- Camera,
- Manim-style,
- Custom.

This is the permanent answer to “what happens when more animations are added.”

### Contextual tabs

Contextual tabs appear only for relevant selections and use a restrained category tint. They do not create a second permanent ribbon.

## 6. Left dock

### Primary navigator

Switchable modes:

- Slides
- Outline
- Sections
- Master layouts
- Assets

Slide thumbnails preserve the lesson aspect ratio, show the slide number, and indicate current selection with a thin saturated outline. Thumbnail contents are rendered from the real scene snapshot.

### Physics Objects browser

Required order:

1. Header and close/pin controls.
2. Search field.
3. Topic dropdown.
4. Optional compact filters: 2D/3D, apparatus/model/representation, readiness, favorites.
5. Recognizable thumbnail grid.
6. “Browse all objects” action and pack status.

The browser never uses persistent topic tabs. Search matches names, synonyms, curriculum labels, quantities, and apparatus functions.

## 7. Center workbench and slide

The workbench is a neutral dark surface. The slide is always 16:9 by default and fits without distortion.

The slide renderer owns:

- background,
- master content,
- authored content,
- physics objects,
- automatic representations,
- annotation layer,
- interaction overlay,
- selection overlay,
- authoring guides.

Selection handles, path controls, and floating toolbars are overlays and never become serialized lesson objects.

### Canvas toolbar

A compact toolbar provides:

- selection mode,
- pan,
- zoom,
- fit,
- rulers/guides,
- snap,
- 2D/3D workspace,
- preview.

It remains visually quieter than the ribbon.

## 8. Right contextual inspector

Inspector tabs or sections:

- Content
- Physics
- Geometry
- Appearance
- Materials
- Animation
- Bindings
- Interaction
- Accessibility
- Validation

Only relevant sections are expanded. A property row follows:

```text
[property label] [value/editor] [unit or binding action]
```

Rules:

- Labels align to a consistent column.
- Numeric editors use tabular numerals.
- Units are explicit and adjacent.
- Mixed multi-selection values use a clear indeterminate state.
- Bound values show their source and cannot silently accept a conflicting manual writer.
- Advanced solver settings are disclosed, not mixed into everyday teaching controls.

## 9. Bottom workspace

Tabs:

- Timeline & Keyframes
- Animation Curves
- Data Table
- Presenter Notes
- Event Log
- Validation Results

The bottom workspace may collapse to a 32 px disclosure strip. Its expanded height persists per workspace preset.

## 10. Timeline structure

```text
Timeline
├─ Toolbar
│  ├─ transport
│  ├─ time display
│  ├─ zoom
│  ├─ snap and frame rate
│  ├─ add key/event
│  └─ filter/search
├─ Fixed row headers
│  ├─ object/system groups
│  └─ nested property/representation tracks
└─ Time viewport
   ├─ ruler and global markers
   ├─ clips and continuous regions
   ├─ property keys and curves
   ├─ physical conditions
   ├─ pauses/pass-throughs/waits
   └─ playhead and selection overlay
```

Track controls:

- expand/collapse,
- visibility,
- lock,
- mute,
- solo,
- group,
- filter,
- search.

The timeline is rendered as a virtualized viewport. Track headers may use recycled controls; keys, curves, clips, grids, and ruler are batched drawing primitives.

### Semantic keys

| Event | Shape | Color family | Meaning |
| --- | --- | --- | --- |
| Property key | diamond | blue | Authored value at a presentation time |
| Physics condition | diamond with inner mark | purple | Time derived from physical state |
| Pause checkpoint | square | orange | Presentation stops for teacher |
| Pass-through | circle/diamond | teal | Event occurs without stopping |
| Interaction wait | outlined marker | amber | Await learner/teacher input |
| Slide transition | tall marker | neutral/blue | Slide boundary |

Trigger and pause remain separate fields.

## 11. Workspace presets

Built-in presets:

- **Design:** large canvas, slides visible, inspector visible, timeline collapsed.
- **Animate:** timeline expanded, animation stack visible, slides compact.
- **Physics:** object browser or model tree visible, physics inspector open.
- **Graphs:** quantity browser, graph inspector, timeline medium.
- **Master:** master layouts left, inheritance inspector right.
- **Present:** learner view only.

Presets rearrange panels; they do not create separate document models.

## 12. Presenter structure

### Dark cinematic mode

```text
Safe content frame
├─ Title and explanatory copy
├─ Primary scientific visual
├─ equations / values / callouts
├─ inquiry prompt
├─ checkpoint rail
└─ fading navigation capsule
```

### Light interactive mode

```text
Safe content frame
├─ Title and live-state badge
├─ wide apparatus/simulation region
├─ aligned investigation cards
│  ├─ audience controls
│  ├─ live equations and values
│  └─ live graph / measurement
├─ checkpoint rail
└─ presentation navigation
```

The presenter receives immutable scene and control snapshots. It cannot expose editor selection, panel state, or teacher-only controls to the audience.

## 13. Readiness communication

Readiness must be honest but quiet:

- Planned commands are disabled with a tooltip.
- Preview capabilities show a small badge in the relevant panel or Feature Map.
- The slide itself is not covered with development banners.
- No released screenshot may resemble a diagnostic build.
- The Feature Map is the detailed source of readiness information.

## 14. Implementation hold and restart gate

No further shell styling is authorized by this document alone. Implementation resumes only after the reference analysis, interface structure, and visual design system are reviewed together.

When it resumes, the first implementation slice is only:

1. title bar,
2. Home/Physics ribbon shell,
3. slide navigator,
4. center wave slide,
5. right wave inspector,
6. expanded timeline,
7. status bar.

That slice must be screenshot-compared against approved concept 01 before the other workspaces are built.

