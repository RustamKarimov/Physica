import type { Result } from "./json";

declare const brand: unique symbol;

export type Brand<T, TBrand extends string> = T & {
  readonly [brand]: TBrand;
};

export type ProjectId = Brand<string, "ProjectId">;
export type SceneId = Brand<string, "SceneId">;
export type PresentationTransitionId = Brand<
  string,
  "PresentationTransitionId"
>;
export type EntityId = Brand<string, "EntityId">;
export type ComponentInstanceId = Brand<string, "ComponentInstanceId">;
export type SystemId = Brand<string, "SystemId">;
export type RepresentationId = Brand<string, "RepresentationId">;
export type RelationshipId = Brand<string, "RelationshipId">;
export type ControlId = Brand<string, "ControlId">;
export type EquationId = Brand<string, "EquationId">;
export type GraphId = Brand<string, "GraphId">;
export type DatasetId = Brand<string, "DatasetId">;
export type AssetId = Brand<string, "AssetId">;
export type StoryboardId = Brand<string, "StoryboardId">;
export type StoryboardStepId = Brand<string, "StoryboardStepId">;
export type ClockId = Brand<string, "ClockId">;
export type EventDefinitionId = Brand<string, "EventDefinitionId">;
export type GlobalVariableId = Brand<string, "GlobalVariableId">;
export type ExportPresetId = Brand<string, "ExportPresetId">;
export type CommandId = Brand<string, "CommandId">;
export type TransactionId = Brand<string, "TransactionId">;

export type RegisteredTypeId = Brand<string, "RegisteredTypeId">;
export type PluginId = Brand<string, "PluginId">;
export type StateChannelId = Brand<string, "StateChannelId">;
export type CapabilityId = Brand<string, "CapabilityId">;
export type ObservableId = Brand<string, "ObservableId">;
export type SolverTypeId = Brand<string, "SolverTypeId">;

export type PersistedUuid =
  | ProjectId
  | SceneId
  | PresentationTransitionId
  | EntityId
  | ComponentInstanceId
  | SystemId
  | RepresentationId
  | RelationshipId
  | ControlId
  | EquationId
  | GraphId
  | DatasetId
  | AssetId
  | StoryboardId
  | StoryboardStepId
  | ClockId
  | EventDefinitionId
  | GlobalVariableId
  | ExportPresetId
  | CommandId
  | TransactionId;

export const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const REGISTERED_TYPE_ID_PATTERN =
  /^[a-z0-9][a-z0-9.-]*:[a-z0-9][a-z0-9._/-]*$/;
export const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9.-]*$/;
export const STATE_CHANNEL_ID_PATTERN =
  /^[a-z][a-zA-Z0-9]*(?:\.[a-z][a-zA-Z0-9]*)+$/;

export interface InvalidIdentifier {
  readonly kind: "invalid-identifier";
  readonly value: string;
  readonly expected: "uuid-v4" | "registered-type" | "plugin" | "state-channel";
}

export function isUuidV4(value: string): boolean {
  return UUID_V4_PATTERN.test(value);
}

export function parseUuid<TId extends PersistedUuid>(
  value: string,
): Result<TId, InvalidIdentifier> {
  return isUuidV4(value)
    ? { ok: true, value: value as TId }
    : {
        ok: false,
        error: { kind: "invalid-identifier", value, expected: "uuid-v4" },
      };
}

export function parseRegisteredTypeId(
  value: string,
): Result<RegisteredTypeId, InvalidIdentifier> {
  return REGISTERED_TYPE_ID_PATTERN.test(value)
    ? { ok: true, value: value as RegisteredTypeId }
    : {
        ok: false,
        error: {
          kind: "invalid-identifier",
          value,
          expected: "registered-type",
        },
      };
}

export function parsePluginId(
  value: string,
): Result<PluginId, InvalidIdentifier> {
  return PLUGIN_ID_PATTERN.test(value)
    ? { ok: true, value: value as PluginId }
    : {
        ok: false,
        error: { kind: "invalid-identifier", value, expected: "plugin" },
      };
}

export function parseStateChannelId(
  value: string,
): Result<StateChannelId, InvalidIdentifier> {
  return STATE_CHANNEL_ID_PATTERN.test(value)
    ? { ok: true, value: value as StateChannelId }
    : {
        ok: false,
        error: {
          kind: "invalid-identifier",
          value,
          expected: "state-channel",
        },
      };
}

export function registeredTypeId(value: string): RegisteredTypeId {
  const result = parseRegisteredTypeId(value);
  if (!result.ok) {
    throw new TypeError(`Invalid registered type ID: ${value}`);
  }
  return result.value;
}

export function pluginId(value: string): PluginId {
  const result = parsePluginId(value);
  if (!result.ok) {
    throw new TypeError(`Invalid plugin ID: ${value}`);
  }
  return result.value;
}

export function stateChannelId(value: string): StateChannelId {
  const result = parseStateChannelId(value);
  if (!result.ok) {
    throw new TypeError(`Invalid state channel ID: ${value}`);
  }
  return result.value;
}

export interface IdFactory {
  projectId(): ProjectId;
  sceneId(): SceneId;
  presentationTransitionId(): PresentationTransitionId;
  entityId(): EntityId;
  componentInstanceId(): ComponentInstanceId;
  systemId(): SystemId;
  representationId(): RepresentationId;
  relationshipId(): RelationshipId;
  controlId(): ControlId;
  equationId(): EquationId;
  graphId(): GraphId;
  datasetId(): DatasetId;
  assetId(): AssetId;
  storyboardId(): StoryboardId;
  storyboardStepId(): StoryboardStepId;
  clockId(): ClockId;
  eventDefinitionId(): EventDefinitionId;
  globalVariableId(): GlobalVariableId;
  exportPresetId(): ExportPresetId;
  commandId(): CommandId;
  transactionId(): TransactionId;
}

type RuntimeCrypto = {
  randomUUID(): string;
};

function runtimeCrypto(): RuntimeCrypto {
  const cryptoProvider = (globalThis as { crypto?: RuntimeCrypto }).crypto;
  if (!cryptoProvider) {
    throw new Error("crypto.randomUUID() is unavailable in this runtime.");
  }
  return cryptoProvider;
}

function generatedId<TId extends PersistedUuid>(): TId {
  return runtimeCrypto().randomUUID() as TId;
}

export class CryptoIdFactory implements IdFactory {
  projectId = (): ProjectId => generatedId();
  sceneId = (): SceneId => generatedId();
  presentationTransitionId = (): PresentationTransitionId => generatedId();
  entityId = (): EntityId => generatedId();
  componentInstanceId = (): ComponentInstanceId => generatedId();
  systemId = (): SystemId => generatedId();
  representationId = (): RepresentationId => generatedId();
  relationshipId = (): RelationshipId => generatedId();
  controlId = (): ControlId => generatedId();
  equationId = (): EquationId => generatedId();
  graphId = (): GraphId => generatedId();
  datasetId = (): DatasetId => generatedId();
  assetId = (): AssetId => generatedId();
  storyboardId = (): StoryboardId => generatedId();
  storyboardStepId = (): StoryboardStepId => generatedId();
  clockId = (): ClockId => generatedId();
  eventDefinitionId = (): EventDefinitionId => generatedId();
  globalVariableId = (): GlobalVariableId => generatedId();
  exportPresetId = (): ExportPresetId => generatedId();
  commandId = (): CommandId => generatedId();
  transactionId = (): TransactionId => generatedId();
}

export class DeterministicIdFactory implements IdFactory {
  private counter: number;

  constructor(seed = 0) {
    if (!Number.isSafeInteger(seed) || seed < 0) {
      throw new RangeError(
        "Deterministic ID seed must be a non-negative safe integer.",
      );
    }
    this.counter = seed;
  }

  private next<TId extends PersistedUuid>(): TId {
    const suffix = this.counter.toString(16).padStart(12, "0");
    this.counter += 1;
    if (suffix.length > 12) {
      throw new RangeError("Deterministic ID space exhausted.");
    }
    return `00000000-0000-4000-8000-${suffix}` as TId;
  }

  projectId = (): ProjectId => this.next();
  sceneId = (): SceneId => this.next();
  presentationTransitionId = (): PresentationTransitionId => this.next();
  entityId = (): EntityId => this.next();
  componentInstanceId = (): ComponentInstanceId => this.next();
  systemId = (): SystemId => this.next();
  representationId = (): RepresentationId => this.next();
  relationshipId = (): RelationshipId => this.next();
  controlId = (): ControlId => this.next();
  equationId = (): EquationId => this.next();
  graphId = (): GraphId => this.next();
  datasetId = (): DatasetId => this.next();
  assetId = (): AssetId => this.next();
  storyboardId = (): StoryboardId => this.next();
  storyboardStepId = (): StoryboardStepId => this.next();
  clockId = (): ClockId => this.next();
  eventDefinitionId = (): EventDefinitionId => this.next();
  globalVariableId = (): GlobalVariableId => this.next();
  exportPresetId = (): ExportPresetId => this.next();
  commandId = (): CommandId => this.next();
  transactionId = (): TransactionId => this.next();
}
