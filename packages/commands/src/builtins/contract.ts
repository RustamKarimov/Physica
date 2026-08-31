import {
  registeredTypeId,
  type ComponentInstance,
  type ComponentInstanceId,
  type DocumentMetadata,
  type EntityDefinition,
  type EntityId,
  type JsonObject,
  type PresentationTransition,
  type RepresentationDefinition,
  type RepresentationId,
  type SceneDefinition,
  type SceneId,
  type SystemDefinition,
  type SystemId,
} from "@physica/core-model";
import type { Command } from "../command";
import {
  LIBRARY_COMMAND_TYPES,
  type InstantiateLibraryItemPayload,
  type RemoveLibraryInstantiationPayload,
} from "../library-instantiation";

export const BUILTIN_COMMAND_TYPES = {
  ...LIBRARY_COMMAND_TYPES,
  addScene: registeredTypeId("physica:command/add-scene"),
  removeScene: registeredTypeId("physica:command/remove-scene"),
  reorderScenes: registeredTypeId("physica:command/reorder-scenes"),
  addEntity: registeredTypeId("physica:command/add-entity"),
  removeEntity: registeredTypeId("physica:command/remove-entity"),
  addComponent: registeredTypeId("physica:command/add-component"),
  removeComponent: registeredTypeId("physica:command/remove-component"),
  setComponentConfiguration: registeredTypeId(
    "physica:command/set-component-configuration",
  ),
  setComponentInitialState: registeredTypeId(
    "physica:command/set-component-initial-state",
  ),
  addSystem: registeredTypeId("physica:command/add-system"),
  removeSystem: registeredTypeId("physica:command/remove-system"),
  addRepresentation: registeredTypeId("physica:command/add-representation"),
  removeRepresentation: registeredTypeId(
    "physica:command/remove-representation",
  ),
  setProjectMetadata: registeredTypeId("physica:command/set-project-metadata"),
} as const;

export interface AddScenePayload {
  readonly scene: SceneDefinition;
  readonly sceneIndex?: number;
  readonly orderIndex?: number;
  readonly restoreEntrySceneId?: SceneId | null;
  readonly restoreTransitions?: readonly IndexedTransition[];
}

export interface RemoveScenePayload {
  readonly sceneId: SceneId;
}

export interface ReorderScenesPayload {
  readonly sceneOrder: readonly SceneId[];
}

export interface AddEntityPayload {
  readonly sceneId: SceneId;
  readonly entity: EntityDefinition;
  readonly index?: number;
}

export interface RemoveEntityPayload {
  readonly sceneId: SceneId;
  readonly entityId: EntityId;
}

export interface AddComponentPayload {
  readonly sceneId: SceneId;
  readonly entityId: EntityId;
  readonly component: ComponentInstance;
  readonly index?: number;
}

export interface RemoveComponentPayload {
  readonly sceneId: SceneId;
  readonly entityId: EntityId;
  readonly componentInstanceId: ComponentInstanceId;
}

export interface SetComponentConfigurationPayload {
  readonly sceneId: SceneId;
  readonly entityId: EntityId;
  readonly componentInstanceId: ComponentInstanceId;
  readonly configuration: JsonObject;
}

export interface SetComponentInitialStatePayload {
  readonly sceneId: SceneId;
  readonly entityId: EntityId;
  readonly componentInstanceId: ComponentInstanceId;
  readonly initialState: JsonObject;
}

export interface AddSystemPayload {
  readonly sceneId: SceneId;
  readonly system: SystemDefinition;
  readonly index?: number;
}

export interface RemoveSystemPayload {
  readonly sceneId: SceneId;
  readonly systemId: SystemId;
}

export interface AddRepresentationPayload {
  readonly sceneId: SceneId;
  readonly representation: RepresentationDefinition;
  readonly index?: number;
}

export interface RemoveRepresentationPayload {
  readonly sceneId: SceneId;
  readonly representationId: RepresentationId;
}

export interface SetProjectMetadataPayload {
  readonly metadata: DocumentMetadata;
}

export interface IndexedTransition {
  readonly index: number;
  readonly transition: PresentationTransition;
}

export type BuiltinCommand = Command<
  | AddScenePayload
  | RemoveScenePayload
  | ReorderScenesPayload
  | AddEntityPayload
  | RemoveEntityPayload
  | AddComponentPayload
  | RemoveComponentPayload
  | SetComponentConfigurationPayload
  | SetComponentInitialStatePayload
  | AddSystemPayload
  | RemoveSystemPayload
  | AddRepresentationPayload
  | RemoveRepresentationPayload
  | SetProjectMetadataPayload
  | InstantiateLibraryItemPayload
  | RemoveLibraryInstantiationPayload
>;
