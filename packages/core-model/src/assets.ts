import type { AssetId } from "./ids";
import type { JsonObject } from "./json";
import type { ExtensionMap } from "./metadata";

export interface AssetDefinition {
  readonly id: AssetId;
  readonly uri: string;
  readonly mediaType: string;
  readonly originalName?: string;
  readonly contentHash?: string;
  readonly byteLength?: number;
  readonly metadata?: JsonObject;
  readonly extensions?: ExtensionMap;
}
