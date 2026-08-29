import type {
  ExportPresetId,
  GlobalVariableId,
  PluginId,
  RegisteredTypeId,
} from "./ids";
import type { JsonObject, JsonValue } from "./json";

export interface DocumentMetadata {
  readonly title: string;
  readonly description?: string;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly lastSavedAt?: string;
  readonly authorDisplayName?: string;
}

export type ExtensionMap = Readonly<Record<string, JsonValue>>;

export interface CurriculumProfileRef {
  readonly profileId: RegisteredTypeId;
  readonly version?: string;
  readonly enabled: boolean;
}

export interface PluginLockEntry {
  readonly pluginId: PluginId;
  readonly requiredVersion: string;
  readonly compatibleRange?: string;
  readonly componentSchemaVersions?: Readonly<Record<string, number>>;
}

export interface RegisteredConfigRef {
  readonly typeId: RegisteredTypeId;
  readonly schemaVersion: number;
  readonly configuration: JsonObject;
  readonly extensions?: ExtensionMap;
}

export interface GlobalVariableDefinition {
  readonly id: GlobalVariableId;
  readonly name: string;
  readonly value: JsonValue;
  readonly metadata?: JsonObject;
}

export interface ExportPresetDefinition {
  readonly id: ExportPresetId;
  readonly name: string;
  readonly typeId: RegisteredTypeId;
  readonly schemaVersion: number;
  readonly configuration: JsonObject;
  readonly extensions?: ExtensionMap;
}
