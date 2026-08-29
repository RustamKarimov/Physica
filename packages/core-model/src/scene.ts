import type { EntityDefinition } from "./entity";
import type {
  ClockId,
  ControlId,
  DatasetId,
  EquationId,
  EventDefinitionId,
  GraphId,
  IdFactory,
  RelationshipId,
  RegisteredTypeId,
  SceneId,
  StoryboardId,
  StoryboardStepId,
} from "./ids";
import { registeredTypeId } from "./ids";
import type { JsonObject } from "./json";
import type { ExtensionMap, RegisteredConfigRef } from "./metadata";
import type { RepresentationDefinition } from "./representation";
import type { SystemDefinition } from "./system";

export interface SceneDefinition {
  readonly id: SceneId;
  readonly name: string;
  readonly tags: readonly string[];
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
  readonly storyboard: StoryboardDefinition;
  readonly camera: RegisteredConfigRef;
  readonly audio: AudioSceneDefinition;
  readonly metadata?: JsonObject;
  readonly extensions?: ExtensionMap;
}

export interface RegisteredDocumentNode<TId extends string> {
  readonly id: TId;
  readonly typeId: RegisteredTypeId;
  readonly schemaVersion: number;
  readonly configuration: JsonObject;
  readonly enabled: boolean;
  readonly metadata?: JsonObject;
  readonly extensions?: ExtensionMap;
}

export type ClockDefinition = RegisteredDocumentNode<ClockId>;
export type EventDefinition = RegisteredDocumentNode<EventDefinitionId>;
export type RelationshipDefinition = RegisteredDocumentNode<RelationshipId>;
export type ControlDefinition = RegisteredDocumentNode<ControlId>;
export type EquationDefinition = RegisteredDocumentNode<EquationId>;
export type GraphDefinition = RegisteredDocumentNode<GraphId>;

export interface StoryboardDefinition {
  readonly id: StoryboardId;
  readonly steps: readonly StoryboardStepEnvelope[];
  readonly extensions?: ExtensionMap;
}

export interface StoryboardStepEnvelope {
  readonly id: StoryboardStepId;
  readonly typeId: RegisteredTypeId;
  readonly schemaVersion: number;
  readonly configuration: JsonObject;
  readonly enabled: boolean;
}

export interface AudioSceneDefinition {
  readonly tracks: readonly RegisteredConfigRef[];
  readonly extensions?: ExtensionMap;
}

export function createEmptyScene(
  idFactory: IdFactory,
  name: string,
): SceneDefinition {
  return {
    id: idFactory.sceneId(),
    name,
    tags: [],
    entityDefinitions: [],
    systemDefinitions: [],
    clockDefinitions: [],
    eventDefinitions: [],
    relationshipDefinitions: [],
    representations: [],
    controls: [],
    datasetRefs: [],
    equationDefinitions: [],
    graphDefinitions: [],
    storyboard: {
      id: idFactory.storyboardId(),
      steps: [],
    },
    camera: {
      typeId: registeredTypeId("physica:camera/default"),
      schemaVersion: 1,
      configuration: {},
    },
    audio: {
      tracks: [],
    },
  };
}
