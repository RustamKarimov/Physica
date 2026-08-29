import {
  PLUGIN_ID_PATTERN,
  REGISTERED_TYPE_ID_PATTERN,
  STATE_CHANNEL_ID_PATTERN,
  UUID_V4_PATTERN,
  type AssetDefinition,
  type ComponentInstance,
  type DatasetDefinition,
  type EntityDefinition,
  type PresentationFlow,
  type ProjectDocument,
  type RepresentationDefinition,
  type SceneDefinition,
  type SystemDefinition,
} from "@physica/core-model";
import { z } from "zod";
import { JsonObjectSchema, JsonValueSchema } from "./json-value-schema";

const UuidV4Schema = z.string().regex(UUID_V4_PATTERN);
const RegisteredTypeIdSchema = z.string().regex(REGISTERED_TYPE_ID_PATTERN);
const PluginIdSchema = z.string().regex(PLUGIN_ID_PATTERN);
const StateChannelIdSchema = z.string().regex(STATE_CHANNEL_ID_PATTERN);
const PositiveSchemaVersion = z.number().int().positive();
const ExtensionMapSchema = z.record(RegisteredTypeIdSchema, JsonValueSchema);
const IsoUtcSchema = z
  .string()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
      Number.isFinite(Date.parse(value)),
    "Expected an ISO-8601 UTC timestamp.",
  );

const DocumentMetadataSchema = z
  .object({
    title: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()),
    createdAt: IsoUtcSchema,
    lastSavedAt: IsoUtcSchema.optional(),
    authorDisplayName: z.string().optional(),
  })
  .strict();

export const RegisteredConfigRefSchemaV1 = z
  .object({
    typeId: RegisteredTypeIdSchema,
    schemaVersion: PositiveSchemaVersion,
    configuration: JsonObjectSchema,
    extensions: ExtensionMapSchema.optional(),
  })
  .strict();

const RegisteredDocumentNodeSchema = z
  .object({
    id: UuidV4Schema,
    typeId: RegisteredTypeIdSchema,
    schemaVersion: PositiveSchemaVersion,
    configuration: JsonObjectSchema,
    enabled: z.boolean(),
    metadata: JsonObjectSchema.optional(),
    extensions: ExtensionMapSchema.optional(),
  })
  .strict();

const PresentationTriggerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("next") }).strict(),
  z.object({ kind: z.literal("previous") }).strict(),
  z.object({ kind: z.literal("choice"), choiceId: z.string() }).strict(),
  z.object({ kind: z.literal("event"), eventKey: z.string() }).strict(),
]);

const PresentationTransitionSchema = z
  .object({
    id: UuidV4Schema,
    fromSceneId: UuidV4Schema,
    toSceneId: UuidV4Schema,
    trigger: PresentationTriggerSchema,
    transitionTypeId: RegisteredTypeIdSchema.optional(),
    configuration: JsonObjectSchema.optional(),
    priority: z.number().finite().optional(),
    extensions: ExtensionMapSchema.optional(),
  })
  .strict();

export const PresentationFlowSchemaV1 = z
  .object({
    entrySceneId: UuidV4Schema.nullable(),
    sceneOrder: z.array(UuidV4Schema),
    transitions: z.array(PresentationTransitionSchema),
    extensions: ExtensionMapSchema.optional(),
  })
  .strict() as unknown as z.ZodType<PresentationFlow>;

export const DocumentReferenceSchemaV1 = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("scene"), id: UuidV4Schema }).strict(),
  z
    .object({
      kind: z.literal("entity"),
      sceneId: UuidV4Schema,
      id: UuidV4Schema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("component"),
      sceneId: UuidV4Schema,
      entityId: UuidV4Schema,
      id: UuidV4Schema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("system"),
      sceneId: UuidV4Schema,
      id: UuidV4Schema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("representation"),
      sceneId: UuidV4Schema,
      id: UuidV4Schema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("relationship"),
      sceneId: UuidV4Schema,
      id: UuidV4Schema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("control"),
      sceneId: UuidV4Schema,
      id: UuidV4Schema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("equation"),
      sceneId: UuidV4Schema,
      id: UuidV4Schema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("graph"),
      sceneId: UuidV4Schema,
      id: UuidV4Schema,
    })
    .strict(),
  z.object({ kind: z.literal("dataset"), id: UuidV4Schema }).strict(),
  z.object({ kind: z.literal("asset"), id: UuidV4Schema }).strict(),
]);

const ComponentBindingSchema = z
  .object({
    key: z.string(),
    target: DocumentReferenceSchemaV1,
    configuration: JsonObjectSchema.optional(),
  })
  .strict();

const LibrarySourceSnapshotSchema = z
  .object({
    libraryItemId: RegisteredTypeIdSchema,
    libraryItemVersion: z.string(),
    sourcePackage: z.string().optional(),
    sourcePluginId: PluginIdSchema.optional(),
  })
  .strict();

export const ComponentInstanceSchemaV1 = z
  .object({
    instanceId: UuidV4Schema,
    componentTypeId: RegisteredTypeIdSchema,
    componentSchemaVersion: PositiveSchemaVersion,
    configuration: JsonObjectSchema,
    initialState: JsonObjectSchema,
    bindings: z.array(ComponentBindingSchema),
    enabled: z.boolean(),
    sourceLibraryItem: LibrarySourceSnapshotSchema.optional(),
    metadata: JsonObjectSchema.optional(),
    extensions: ExtensionMapSchema.optional(),
  })
  .strict() as unknown as z.ZodType<ComponentInstance>;

export const EntityDefinitionSchemaV1 = z
  .object({
    id: UuidV4Schema,
    name: z.string(),
    entityTypeId: RegisteredTypeIdSchema.optional(),
    componentInstances: z.array(ComponentInstanceSchemaV1),
    tags: z.array(z.string()),
    visualDefaults: JsonObjectSchema.optional(),
    metadata: JsonObjectSchema.optional(),
    extensions: ExtensionMapSchema.optional(),
  })
  .strict() as unknown as z.ZodType<EntityDefinition>;

export const StateChannelRefSchemaV1 = z.discriminatedUnion("scope", [
  z
    .object({
      scope: z.literal("entity"),
      entityId: UuidV4Schema,
      channel: StateChannelIdSchema,
    })
    .strict(),
  z
    .object({
      scope: z.literal("system"),
      systemId: UuidV4Schema,
      channel: StateChannelIdSchema,
    })
    .strict(),
]);

const SystemParticipantSelectorSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("entity"), entityId: UuidV4Schema }).strict(),
  z.object({ kind: z.literal("tag"), tag: z.string() }).strict(),
  z
    .object({
      kind: z.literal("capability"),
      capabilityId: RegisteredTypeIdSchema,
    })
    .strict(),
]);

export const SystemDefinitionSchemaV1 = z
  .object({
    id: UuidV4Schema,
    name: z.string().optional(),
    systemTypeId: RegisteredTypeIdSchema,
    systemSchemaVersion: PositiveSchemaVersion,
    configuration: JsonObjectSchema,
    participants: z.array(SystemParticipantSelectorSchema),
    clockRef: UuidV4Schema.optional(),
    solverBinding: RegisteredConfigRefSchemaV1.optional(),
    declaredInputs: z.array(StateChannelRefSchemaV1),
    declaredOutputs: z.array(StateChannelRefSchemaV1),
    enabled: z.boolean(),
    metadata: JsonObjectSchema.optional(),
    extensions: ExtensionMapSchema.optional(),
  })
  .strict() as unknown as z.ZodType<SystemDefinition>;

const ObservableRefSchema = z.discriminatedUnion("sourceKind", [
  z
    .object({
      sourceKind: z.literal("entity-component"),
      entityId: UuidV4Schema,
      componentInstanceId: UuidV4Schema,
      observableId: RegisteredTypeIdSchema,
    })
    .strict(),
  z
    .object({
      sourceKind: z.literal("system"),
      systemId: UuidV4Schema,
      observableId: RegisteredTypeIdSchema,
    })
    .strict(),
]);

const RepresentationSourceBindingSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("entity"), entityId: UuidV4Schema }).strict(),
  z.object({ kind: z.literal("system"), systemId: UuidV4Schema }).strict(),
  z
    .object({ kind: z.literal("observable"), source: ObservableRefSchema })
    .strict(),
  z.object({ kind: z.literal("dataset"), datasetId: UuidV4Schema }).strict(),
  z.object({ kind: z.literal("asset"), assetId: UuidV4Schema }).strict(),
]);

export const RepresentationDefinitionSchemaV1 = z
  .object({
    id: UuidV4Schema,
    representationTypeId: RegisteredTypeIdSchema,
    representationSchemaVersion: PositiveSchemaVersion,
    sourceBindings: z.array(RepresentationSourceBindingSchema),
    configuration: JsonObjectSchema,
    layout: JsonObjectSchema,
    visual: JsonObjectSchema,
    relationshipRefs: z.array(UuidV4Schema),
    enabled: z.boolean(),
    metadata: JsonObjectSchema.optional(),
    extensions: ExtensionMapSchema.optional(),
  })
  .strict() as unknown as z.ZodType<RepresentationDefinition>;

export const AssetDefinitionSchemaV1 = z
  .object({
    id: UuidV4Schema,
    uri: z.string().min(1),
    mediaType: z.string().min(1),
    originalName: z.string().optional(),
    contentHash: z.string().optional(),
    byteLength: z.number().int().nonnegative().optional(),
    metadata: JsonObjectSchema.optional(),
    extensions: ExtensionMapSchema.optional(),
  })
  .strict() as unknown as z.ZodType<AssetDefinition>;

const DatasetStorageSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("inline-json"), value: JsonValueSchema }).strict(),
  z.object({ kind: z.literal("asset"), assetId: UuidV4Schema }).strict(),
]);

export const DatasetDefinitionSchemaV1 = z
  .object({
    id: UuidV4Schema,
    name: z.string(),
    datasetTypeId: RegisteredTypeIdSchema,
    datasetSchemaVersion: PositiveSchemaVersion,
    storage: DatasetStorageSchema,
    provenance: JsonObjectSchema.optional(),
    metadata: JsonObjectSchema.optional(),
    extensions: ExtensionMapSchema.optional(),
  })
  .strict() as unknown as z.ZodType<DatasetDefinition>;

const StoryboardStepEnvelopeSchema = z
  .object({
    id: UuidV4Schema,
    typeId: RegisteredTypeIdSchema,
    schemaVersion: PositiveSchemaVersion,
    configuration: JsonObjectSchema,
    enabled: z.boolean(),
  })
  .strict();

const StoryboardDefinitionSchema = z
  .object({
    id: UuidV4Schema,
    steps: z.array(StoryboardStepEnvelopeSchema),
    extensions: ExtensionMapSchema.optional(),
  })
  .strict();

const AudioSceneDefinitionSchema = z
  .object({
    tracks: z.array(RegisteredConfigRefSchemaV1),
    extensions: ExtensionMapSchema.optional(),
  })
  .strict();

export const SceneDefinitionSchemaV1 = z
  .object({
    id: UuidV4Schema,
    name: z.string(),
    tags: z.array(z.string()),
    entityDefinitions: z.array(EntityDefinitionSchemaV1),
    systemDefinitions: z.array(SystemDefinitionSchemaV1),
    clockDefinitions: z.array(RegisteredDocumentNodeSchema),
    eventDefinitions: z.array(RegisteredDocumentNodeSchema),
    relationshipDefinitions: z.array(RegisteredDocumentNodeSchema),
    representations: z.array(RepresentationDefinitionSchemaV1),
    controls: z.array(RegisteredDocumentNodeSchema),
    datasetRefs: z.array(UuidV4Schema),
    equationDefinitions: z.array(RegisteredDocumentNodeSchema),
    graphDefinitions: z.array(RegisteredDocumentNodeSchema),
    storyboard: StoryboardDefinitionSchema,
    camera: RegisteredConfigRefSchemaV1,
    audio: AudioSceneDefinitionSchema,
    metadata: JsonObjectSchema.optional(),
    extensions: ExtensionMapSchema.optional(),
  })
  .strict() as unknown as z.ZodType<SceneDefinition>;

const CurriculumProfileRefSchema = z
  .object({
    profileId: RegisteredTypeIdSchema,
    version: z.string().optional(),
    enabled: z.boolean(),
  })
  .strict();

const PluginLockEntrySchema = z
  .object({
    pluginId: PluginIdSchema,
    requiredVersion: z.string(),
    compatibleRange: z.string().optional(),
    componentSchemaVersions: z
      .record(RegisteredTypeIdSchema, PositiveSchemaVersion)
      .optional(),
  })
  .strict();

const GlobalVariableDefinitionSchema = z
  .object({
    id: UuidV4Schema,
    name: z.string(),
    value: JsonValueSchema,
    metadata: JsonObjectSchema.optional(),
  })
  .strict();

const ExportPresetDefinitionSchema = z
  .object({
    id: UuidV4Schema,
    name: z.string(),
    typeId: RegisteredTypeIdSchema,
    schemaVersion: PositiveSchemaVersion,
    configuration: JsonObjectSchema,
    extensions: ExtensionMapSchema.optional(),
  })
  .strict();

export const ProjectDocumentSchemaV1 = z
  .object({
    schemaVersion: z.literal(1),
    projectId: UuidV4Schema,
    metadata: DocumentMetadataSchema,
    curriculumProfiles: z.array(CurriculumProfileRefSchema),
    pluginLock: z.array(PluginLockEntrySchema),
    presentationFlow: PresentationFlowSchemaV1,
    scenes: z.array(SceneDefinitionSchemaV1),
    assets: z.array(AssetDefinitionSchemaV1),
    datasets: z.array(DatasetDefinitionSchemaV1),
    globalVariables: z.array(GlobalVariableDefinitionSchema),
    styleTheme: RegisteredConfigRefSchemaV1,
    exportPresets: z.array(ExportPresetDefinitionSchema),
    extensions: ExtensionMapSchema.optional(),
  })
  .strict() as unknown as z.ZodType<ProjectDocument>;
