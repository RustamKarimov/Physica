import type {
  CapabilityId,
  ComponentInstanceId,
  ObservableId,
  PluginId,
  RegisteredTypeId,
  SolverTypeId,
} from "./ids";
import type { JsonObject, Result } from "./json";
import type { ExtensionMap } from "./metadata";
import type { DocumentReference } from "./references";
import type { LocalStateChannelClaim } from "./state-channels";
import type { ValidationIssue } from "./validation-types";

export interface ComponentInstance {
  readonly instanceId: ComponentInstanceId;
  readonly componentTypeId: RegisteredTypeId;
  readonly componentSchemaVersion: number;
  readonly configuration: JsonObject;
  readonly initialState: JsonObject;
  readonly bindings: readonly ComponentBinding[];
  readonly enabled: boolean;
  readonly sourceLibraryItem?: LibrarySourceSnapshot;
  readonly metadata?: JsonObject;
  readonly extensions?: ExtensionMap;
}

export interface ComponentBinding {
  readonly key: string;
  readonly target: DocumentReference;
  readonly configuration?: JsonObject;
}

export interface LibrarySourceSnapshot {
  readonly libraryItemId: RegisteredTypeId;
  readonly libraryItemVersion: string;
  readonly sourcePackage?: string;
  readonly sourcePluginId?: PluginId;
}

export interface ObservableDefinition {
  readonly id: ObservableId;
  readonly valueKind: string;
  readonly description?: string;
}

export interface SolverRequirement {
  readonly solverTypeId: SolverTypeId;
  readonly optional?: boolean;
}

export interface AssumptionDefinition {
  readonly id: string;
  readonly description: string;
}

export interface ComponentMigrationError {
  readonly code: string;
  readonly message: string;
}

export interface ComponentMigrationHook {
  migrate(
    instance: ComponentInstance,
    targetSchemaVersion: number,
  ): Result<ComponentInstance, ComponentMigrationError>;
}

export interface ComponentDefinition {
  readonly typeId: RegisteredTypeId;
  readonly schemaVersion: number;
  readonly requiredCapabilities: readonly CapabilityId[];
  readonly providedCapabilities: readonly CapabilityId[];
  readonly readStateChannels: readonly import("./ids").StateChannelId[];
  readonly writeStateChannels: readonly import("./ids").StateChannelId[];
  readonly observableDefinitions: readonly ObservableDefinition[];
  readonly solverRequirements: readonly SolverRequirement[];
  readonly assumptions: readonly AssumptionDefinition[];

  validateConfiguration(
    configuration: JsonObject,
    initialState: JsonObject,
  ): readonly ValidationIssue[];

  resolveStateClaims(
    instance: ComponentInstance,
  ): readonly LocalStateChannelClaim[];

  readonly migrate?: ComponentMigrationHook;
}
