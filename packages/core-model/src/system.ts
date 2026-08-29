import type { AssumptionDefinition, SolverRequirement } from "./component";
import type {
  CapabilityId,
  ClockId,
  EntityId,
  RegisteredTypeId,
  SystemId,
} from "./ids";
import type { JsonObject } from "./json";
import type { ExtensionMap, RegisteredConfigRef } from "./metadata";
import type {
  ResolvedStateChannelClaim,
  StateChannelRef,
} from "./state-channels";
import type { ValidationIssue } from "./validation-types";

export interface SystemDefinition {
  readonly id: SystemId;
  readonly name?: string;
  readonly systemTypeId: RegisteredTypeId;
  readonly systemSchemaVersion: number;
  readonly configuration: JsonObject;
  readonly participants: readonly SystemParticipantSelector[];
  readonly clockRef?: ClockId;
  readonly solverBinding?: RegisteredConfigRef;
  readonly declaredInputs: readonly StateChannelRef[];
  readonly declaredOutputs: readonly StateChannelRef[];
  readonly enabled: boolean;
  readonly metadata?: JsonObject;
  readonly extensions?: ExtensionMap;
}

export type SystemParticipantSelector =
  | { readonly kind: "entity"; readonly entityId: EntityId }
  | { readonly kind: "tag"; readonly tag: string }
  | { readonly kind: "capability"; readonly capabilityId: CapabilityId };

export interface SystemTypeDefinition {
  readonly typeId: RegisteredTypeId;
  readonly schemaVersion: number;
  readonly requiredCapabilities: readonly CapabilityId[];
  readonly providedCapabilities: readonly CapabilityId[];
  readonly solverRequirements: readonly SolverRequirement[];
  readonly assumptions: readonly AssumptionDefinition[];

  validateConfiguration(system: SystemDefinition): readonly ValidationIssue[];
  resolveStateClaims(
    system: SystemDefinition,
  ): readonly ResolvedStateChannelClaim[];
}
