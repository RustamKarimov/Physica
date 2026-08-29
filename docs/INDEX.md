# Physica Repository Specification Index

## Source-of-truth priority

1. `PROJECT_CONSTITUTION.md`
2. Approved ADRs in `DECISIONS.md`
3. The owning subsystem specification
4. `CURRENT_STATE.md` for operational status only
5. `PHYSICA_Architecture_Frozen_Master_Blueprint.md` for broader product context

When documents conflict, the higher item wins. `CURRENT_STATE.md` never changes architecture.

## Documentation set

| File | Primary ownership |
|---|---|
| `PRODUCT_CONTRACT.md` | product contract, user modes, desktop/web/local-first product promise |
| `PROJECT_CONSTITUTION.md` | constitutional invariants, source-of-truth hierarchy |
| `ARCHITECTURE.md` | layering, package responsibilities, desktop/web topology |
| `PACKAGE_DEPENDENCIES.md` | dependency DAG, public import rules |
| `PROJECT_MODEL.md` | Project, PresentationFlow, Scene, EntityDefinition, Representation identity, document state |
| `COMPONENT_MODEL.md` | ComponentInstance, capability declarations, state writer declarations |
| `SYSTEM_MODEL.md` | SystemDefinition, system state ownership, multi-entity membership/coupling |
| `RUNTIME_STATE.md` | RuntimeStateStore, authoritative state channels, derived state/cache rules |
| `REGISTRY_ARCHITECTURE.md` | registry IDs, registration metadata, discovery |
| `PHYSICS_LIBRARY.md` | LibraryItem, Prefab, MaterialPreset, Instrument definitions, drag creation commands |
| `MATHEMATICS_AND_UNITS.md` | Quantity, Vec2/Vec3, Complex, Matrix, Quaternion, NumericsPolicy |
| `CONSTANTS_AND_PROVENANCE.md` | ConstantsRegistry, ModelProvenance |
| `COORDINATES_AND_FRAMES.md` | coordinate types, reference frames, scale modes |
| `CLOCKS_AND_TIME.md` | ClockDefinition, clock graph, pause/run/scrub/rate/link |
| `RUNTIME_SCHEDULER.md` | scheduler phases, system dependency order, event ordering key |
| `CHECKPOINT_AND_REPLAY.md` | checkpoint cadence, snapshot payload, replay algorithm, seed state |
| `COMMANDS_AND_EVENTS.md` | Command, Transaction, EventDefinition, RuntimeEvent |
| `RENDERER_ARCHITECTURE.md` | RendererAdapter, Camera service, render layers, projection service |
| `PICKING_AND_SELECTION.md` | PickingService, PickResult |
| `TYPOGRAPHY_AND_I18N.md` | TypographyService, LocaleService, TextSegmentationService |
| `TEXT_CONTENT.md` | TextBlock, text roles, structured text spans |
| `ANIMATION_ENGINE.md` | Animation, Sequence/Parallel/Stagger, presentation transform channels |
| `EQUATION_ENGINE.md` | EquationModel, semantic token identity, transform matcher/validator |
| `GRAPH_AND_DATA_ENGINE.md` | Dataset, DataSeries, GraphModel, sampling policy |
| `RELATIONSHIPS.md` | Relationship, dependency DAG |
| `CONTROLS.md` | ControlDefinition, binding targets, interaction modes |
| `STORYBOARD.md` | Storyboard, StoryboardStep, PresentationFlow |
| `PHYSICS_RUNTIME.md` | PhysicalModelRuntime, SystemRuntime, observable publication |
| `SOLVER_ARCHITECTURE.md` | SolverAdapter, solver capability metadata, precision/error policies |
| `COMPUTE_BACKEND.md` | ComputeBackend, job/result protocol |
| `PLUGIN_ARCHITECTURE.md` | PluginManifest, PluginLock, plugin SDK, permissions |
| `PHYSSCRIPT_SPEC.md` | grammar, AST, command mapping |
| `SERIALIZATION.md` | package manifest, asset URI scheme, schema version fields |
| `PROJECT_MIGRATION.md` | migration registry, migration chain |
| `VALIDATION.md` | ValidatorRegistry, ValidationResult, severity policy |
| `EXAMPLE_SYSTEM.md` | ExampleRegistry, example manifest, build command, coverage CI |
| `CURRICULUM_COVERAGE.md` | CurriculumProfile, coverage status, topic capability matrix |
| `SECURITY.md` | security policy, sandbox permissions |
| `LICENSING.md` | license manifest, attribution/redistribution rules |
| `AUDIO_ENGINE.md` | AudioRepresentation, AudioSignal, audio render/synchronization |
| `ACCESSIBILITY.md` | accessibility requirements, reduced-motion behavior |
| `PERFORMANCE.md` | performance budgets, benchmark tiers |
| `TESTING.md` | test pyramid, visual reference policy, benchmark fixtures |
| `EXPORT.md` | export presets, fixed-frame video timeline, web bundle |
| `ROADMAP.md` | phase order, release gates |
| `DECISIONS.md` | ADR log |
| `CURRENT_STATE.md` | operational state only |
| `HANDOVER.md` | session continuity |

## Step 2 clarification

`TEXT_CONTENT.md` and ADR-032 were added because the user explicitly requires normal definitions/explanations and their animations. This is a specification clarification within the pre-existing extensible Representation architecture, not a root-schema redesign.