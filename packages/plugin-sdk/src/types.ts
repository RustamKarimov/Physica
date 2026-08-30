import type {
  AssetDefinition,
  AssetId,
  CapabilityId,
  ClockDefinition,
  ControlDefinition,
  DatasetDefinition,
  DatasetId,
  DocumentReference,
  EntityDefinition,
  EquationDefinition,
  EventDefinition,
  GraphDefinition,
  JsonObject,
  PluginId,
  PluginLockEntry,
  RegisteredTypeId,
  RelationshipDefinition,
  RepresentationDefinition,
  SystemDefinition,
} from "@physica/core-model";

export type LibraryItemClass =
  | "smart-model"
  | "prefab"
  | "visual-object"
  | "instrument"
  | "representation"
  | "material-preset";

export type LibrarySourceKind = "built-in" | "plugin" | "my-library";
export type LibraryDimensionality = "2D" | "3D" | "BOTH";

export interface LibrarySource {
  readonly kind: LibrarySourceKind;
  readonly sourcePackage: string;
  readonly pluginId?: PluginId;
}

export interface LibraryThumbnail {
  readonly kind: "asset" | "procedural";
  readonly uri: string;
  readonly altText: string;
}

export interface LocalPoint3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface LibraryAnchorDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly anchorTypeId: RegisteredTypeId;
  readonly position: LocalPoint3;
  readonly compatiblePortTypeIds: readonly RegisteredTypeId[];
}

export interface LibraryPortDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly portTypeId: RegisteredTypeId;
  readonly direction: "input" | "output" | "bidirectional";
  readonly maximumConnections: number;
  readonly anchorId?: string;
}

export type CompatibleTargetDefinition =
  | {
      readonly kind: "entity-type";
      readonly typeId: RegisteredTypeId;
    }
  | {
      readonly kind: "capability";
      readonly capabilityId: CapabilityId;
    }
  | {
      readonly kind: "anchor-type";
      readonly anchorTypeId: RegisteredTypeId;
    }
  | {
      readonly kind: "port-type";
      readonly portTypeId: RegisteredTypeId;
      readonly minimumCount: number;
      readonly maximumCount: number;
    }
  | {
      readonly kind: "observable-kind";
      readonly valueKind: string;
    }
  | {
      readonly kind: "dataset";
    };

export interface EditablePropertyDefinition {
  readonly path: string;
  readonly displayName: string;
  readonly valueKind: string;
  readonly unitId?: string;
}

export interface LibraryAssumption {
  readonly id: string;
  readonly description: string;
}

export interface LibraryVisualVariant {
  readonly id: string;
  readonly displayName: string;
  readonly visual: JsonObject;
}

export interface LibraryLicenseMetadata {
  readonly spdxId: string;
  readonly attribution?: string;
  readonly sourceUrl?: string;
}

export interface LibraryModelProvenance {
  readonly modelId: RegisteredTypeId;
  readonly version: string;
  readonly reference: string;
}

export type LibraryCreationReference =
  | { readonly kind: "prefab"; readonly definitionId: RegisteredTypeId }
  | { readonly kind: "instrument"; readonly definitionId: RegisteredTypeId }
  | { readonly kind: "material"; readonly definitionId: RegisteredTypeId };

export interface LibraryItemDefinition {
  readonly id: RegisteredTypeId;
  readonly schemaVersion: number;
  readonly version: string;
  readonly displayName: string;
  readonly description: string;
  readonly itemClass: LibraryItemClass;
  readonly source: LibrarySource;
  readonly domainTags: readonly string[];
  readonly curriculumTags: readonly string[];
  readonly topicTags: readonly string[];
  readonly searchTags: readonly string[];
  readonly physicalQuantityTags: readonly string[];
  readonly thumbnail: LibraryThumbnail;
  readonly defaultParameters: JsonObject;
  readonly editableProperties: readonly EditablePropertyDefinition[];
  readonly anchors: readonly LibraryAnchorDefinition[];
  readonly ports: readonly LibraryPortDefinition[];
  readonly compatibleTargets: readonly CompatibleTargetDefinition[];
  readonly recommendedRepresentationIds: readonly RegisteredTypeId[];
  readonly recommendedControlIds: readonly RegisteredTypeId[];
  readonly assumptions: readonly LibraryAssumption[];
  readonly visualVariants: readonly LibraryVisualVariant[];
  readonly dimensionality: LibraryDimensionality;
  readonly exampleIds: readonly string[];
  readonly requiredCoreRange: string;
  readonly requiredPlugins: readonly PluginLockEntry[];
  readonly dependentAssetIds: readonly AssetId[];
  readonly license: LibraryLicenseMetadata;
  readonly modelProvenance?: LibraryModelProvenance;
  readonly creation: LibraryCreationReference;
}

export interface LibraryProjectSnapshotTemplate {
  readonly templateSceneId: import("@physica/core-model").SceneId;
  readonly assets: readonly AssetDefinition[];
  readonly datasets: readonly DatasetDefinition[];
  readonly entityDefinitions: readonly EntityDefinition[];
  readonly systemDefinitions: readonly SystemDefinition[];
  readonly clockDefinitions: readonly ClockDefinition[];
  readonly eventDefinitions: readonly EventDefinition[];
  readonly relationshipDefinitions: readonly RelationshipDefinition[];
  readonly representations: readonly RepresentationDefinition[];
  readonly controls: readonly ControlDefinition[];
  readonly datasetRefs: readonly DatasetId[];
  readonly equationDefinitions: readonly EquationDefinition[];
  readonly graphDefinitions: readonly GraphDefinition[];
}

export interface PrefabTargetSlot {
  readonly id: string;
  readonly displayName: string;
  readonly placeholder: DocumentReference;
  readonly acceptedKinds: readonly DocumentReference["kind"][];
  readonly required: boolean;
}

export interface PrefabDefinition {
  readonly id: RegisteredTypeId;
  readonly schemaVersion: number;
  readonly version: string;
  readonly displayName: string;
  readonly source: LibrarySource;
  readonly targetSlots: readonly PrefabTargetSlot[];
  readonly snapshot: LibraryProjectSnapshotTemplate;
  readonly exampleIds: readonly string[];
}

export interface InstrumentPortRequirement {
  readonly role: string;
  readonly displayName: string;
  readonly compatiblePortTypeIds: readonly RegisteredTypeId[];
  readonly minimumCount: number;
  readonly maximumCount: number;
}

export interface InstrumentDefinition {
  readonly id: RegisteredTypeId;
  readonly schemaVersion: number;
  readonly version: string;
  readonly displayName: string;
  readonly source: LibrarySource;
  readonly prefabId: RegisteredTypeId;
  readonly portRequirements: readonly InstrumentPortRequirement[];
  readonly observableKinds: readonly string[];
  readonly allowIncompleteAuthoring: boolean;
  readonly exampleIds: readonly string[];
}

export interface MaterialPropertyDefinition {
  readonly propertyId: string;
  readonly value: number;
  readonly unitId: string;
  readonly uncertainty?: number;
  readonly validityContext?: JsonObject;
  readonly reference: string;
}

export interface MaterialPresetDefinition {
  readonly id: RegisteredTypeId;
  readonly schemaVersion: number;
  readonly version: string;
  readonly displayName: string;
  readonly source: LibrarySource;
  readonly properties: readonly MaterialPropertyDefinition[];
  readonly exampleIds: readonly string[];
  readonly license: LibraryLicenseMetadata;
}

export interface DeclarativePluginManifest {
  readonly id: PluginId;
  readonly version: string;
  readonly compatibleCoreRange: string;
}

export interface DeclarativeLibraryContributions {
  readonly libraryItems: readonly LibraryItemDefinition[];
  readonly prefabs: readonly PrefabDefinition[];
  readonly instruments: readonly InstrumentDefinition[];
  readonly materialPresets: readonly MaterialPresetDefinition[];
}
