import type { ComponentInstance } from "./component";
import type { EntityId, RegisteredTypeId } from "./ids";
import type { JsonObject } from "./json";
import type { ExtensionMap } from "./metadata";

export interface EntityDefinition {
  readonly id: EntityId;
  readonly name: string;
  readonly entityTypeId?: RegisteredTypeId;
  readonly componentInstances: readonly ComponentInstance[];
  readonly tags: readonly string[];
  readonly visualDefaults?: JsonObject;
  readonly metadata?: JsonObject;
  readonly extensions?: ExtensionMap;
}
