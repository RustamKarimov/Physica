import type {
  ComponentInstanceId,
  EntityId,
  StateChannelId,
  SystemId,
} from "./ids";

export type StateChannelRef =
  | {
      readonly scope: "entity";
      readonly entityId: EntityId;
      readonly channel: StateChannelId;
    }
  | {
      readonly scope: "system";
      readonly systemId: SystemId;
      readonly channel: StateChannelId;
    };

export interface LocalStateChannelClaim {
  readonly channel: StateChannelId;
  readonly role: "authoritative-write" | "read";
}

export interface ResolvedStateChannelClaim {
  readonly ownerKind: "component" | "system";
  readonly ownerId: ComponentInstanceId | SystemId;
  readonly ref: StateChannelRef;
  readonly role: "authoritative-write" | "read";
}
