import type {
  AssetId,
  ComponentInstanceId,
  ControlId,
  DatasetId,
  EntityId,
  EquationId,
  GraphId,
  RelationshipId,
  RepresentationId,
  SceneId,
  SystemId,
} from "./ids";

export type DocumentReference =
  | { readonly kind: "scene"; readonly id: SceneId }
  | {
      readonly kind: "entity";
      readonly sceneId: SceneId;
      readonly id: EntityId;
    }
  | {
      readonly kind: "component";
      readonly sceneId: SceneId;
      readonly entityId: EntityId;
      readonly id: ComponentInstanceId;
    }
  | {
      readonly kind: "system";
      readonly sceneId: SceneId;
      readonly id: SystemId;
    }
  | {
      readonly kind: "representation";
      readonly sceneId: SceneId;
      readonly id: RepresentationId;
    }
  | {
      readonly kind: "relationship";
      readonly sceneId: SceneId;
      readonly id: RelationshipId;
    }
  | {
      readonly kind: "control";
      readonly sceneId: SceneId;
      readonly id: ControlId;
    }
  | {
      readonly kind: "equation";
      readonly sceneId: SceneId;
      readonly id: EquationId;
    }
  | {
      readonly kind: "graph";
      readonly sceneId: SceneId;
      readonly id: GraphId;
    }
  | { readonly kind: "dataset"; readonly id: DatasetId }
  | { readonly kind: "asset"; readonly id: AssetId };
