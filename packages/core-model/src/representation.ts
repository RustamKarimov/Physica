import type {
  AssetId,
  ComponentInstanceId,
  DatasetId,
  EntityId,
  ObservableId,
  RegisteredTypeId,
  RelationshipId,
  RepresentationId,
  SystemId,
} from "./ids";
import type { JsonObject } from "./json";
import type { ExtensionMap } from "./metadata";

export interface RepresentationDefinition {
  readonly id: RepresentationId;
  readonly representationTypeId: RegisteredTypeId;
  readonly representationSchemaVersion: number;
  readonly sourceBindings: readonly RepresentationSourceBinding[];
  readonly configuration: JsonObject;
  readonly layout: JsonObject;
  readonly visual: JsonObject;
  readonly relationshipRefs: readonly RelationshipId[];
  readonly enabled: boolean;
  readonly metadata?: JsonObject;
  readonly extensions?: ExtensionMap;
}

export type RepresentationSourceBinding =
  | { readonly kind: "entity"; readonly entityId: EntityId }
  | { readonly kind: "system"; readonly systemId: SystemId }
  | { readonly kind: "observable"; readonly source: ObservableRef }
  | { readonly kind: "dataset"; readonly datasetId: DatasetId }
  | { readonly kind: "asset"; readonly assetId: AssetId };

export type ObservableRef =
  | {
      readonly sourceKind: "entity-component";
      readonly entityId: EntityId;
      readonly componentInstanceId: ComponentInstanceId;
      readonly observableId: ObservableId;
    }
  | {
      readonly sourceKind: "system";
      readonly systemId: SystemId;
      readonly observableId: ObservableId;
    };
