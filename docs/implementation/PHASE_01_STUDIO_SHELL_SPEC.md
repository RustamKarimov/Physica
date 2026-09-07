# Phase 1 — Visual Recovery and Architecture Qualification

## Objective

Replace the rejected Phase 1 shell with a professional, native authoring environment whose visual quality is comparable to or better than the seven approved concepts. Prove that the selected platform can sustain the intended interaction density and multi-gigabyte product architecture before functional authoring begins.

## Binding references

Before editing visible interface code, read all of:

- `docs/product/REFERENCE_IMAGE_ANALYSIS.md`
- `docs/product/INTERFACE_STRUCTURE.md`
- `docs/product/VISUAL_DESIGN_SYSTEM.md`
- `docs/product/visual-design-tokens.json`

These documents are the detailed visual and structural source of truth for this phase. Implementation is paused until the user reviews this design package.

- `01-standing-wave-authoring.png`: application chrome, ribbon, authoring hierarchy, apparatus, inspector, and compact timeline.
- `03-multitrack-condition-keyframes.png`: hierarchical track density, condition editing, event semantics, and playhead tools.
- `04-animation-gallery-bezier.png`: animation gallery, vector-path editing, curve controls, and contextual tools.
- `05-automatic-graphs-bindings.png`: quantity selection, field visualization, scientific graphs, bindings, and graph inspector.
- `06-learner-presentation.png`: cinematic dark learner view and checkpoint navigation.
- `07-presentation-interactive-controls.png`: light investigation view, apparatus, live graph, equations, and classroom controls.

Concept 02 remains the construction-workflow reference and must be represented by the shell's object-library and scene-building affordances.

## Required implementation

Implementation resumes one reference slice at a time. The concept-01 authoring slice must be built and visually compared before work begins on the animation, graph, or presenter slices.

1. A tokenized Physica design system with custom templates, vector icons, high-DPI behavior, semantic readiness colors, and minimum readable typography.
2. A compact responsive ribbon with command priorities, size classes, overflow policies, contextual accents, real icons, and expandable galleries.
3. A main authoring slice with a large standing-wave slide, recognizable apparatus, annotations, equations, polished slide thumbnails, compact inspector, and professional timeline.
4. A timeline/animation slice with virtualized hierarchy, viewport rendering, condition/pause/pass-through semantics, animation gallery, and Bézier editor.
5. A graph/binding slice with field visualization, scientific axes, automatic graph preview, observable selector, and binding inspector.
6. Dark and light presenter slices with learner-only composition, navigation, checkpoint progress, polished controls, and inactivity-ready chrome.
7. Honest readiness labels. Mock data may demonstrate the final visual contract but must not claim active physics or authoring behavior.

## Architecture constraints

- Avalonia is not a scene-object or keyframe object model.
- Scene visuals consume immutable `SceneSnapshot` data.
- The timeline consumes `TimelineViewportQuery` and produces a batched `TimelineRenderBatch`.
- Installed content is represented by manifests and lightweight asset references.
- Physics, timeline, rendering, and document projects never depend on Avalonia.
- All XAML bindings are compiled unless an isolated exception is documented.
- Stock glyph placeholders and generic lettered physics objects are forbidden.

## Gate A — Visual fidelity

Capture full-resolution platform-specific screenshots for the authoring studio, timeline/animation workspace, graph/binding workspace, dark presenter, and light interactive presenter. Compare them beside the approved references. Automated comparisons guard regressions; explicit user approval is authoritative.

## Gate B — Interaction quality

Verify ribbon navigation and overflow, panel collapse and resize, workspace switching, timeline pan/zoom/expand, selection-dependent inspector content, light/dark slide switching, presenter navigation, interactive-control feedback, keyboard focus, and accessible names.

## Gate C — Performance qualification

On Windows x64 and Apple Silicon macOS, target 60 fps for standard 1080p scenes, sub-50 ms common property feedback, responsive timeline navigation at 2,000 tracks and 100,000 synthetic keyframes, virtualized browsing of 50,000 assets, progressive opening of a 2 GB test package within five seconds, bounded memory across repeated workspace cycles, and no simulation or graph computation on the UI thread.

## Completion

Phase 1 remains incomplete until Gates A–C pass on both operating systems and the user explicitly approves the recovered environment. Phase 2 must not begin earlier.
