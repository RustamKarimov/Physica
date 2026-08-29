import type { AssetId, DatasetId, RegisteredTypeId } from "./ids";
import type { JsonObject, JsonValue } from "./json";
import type { ExtensionMap } from "./metadata";

export interface DatasetDefinition {
  readonly id: DatasetId;
  readonly name: string;
  readonly datasetTypeId: RegisteredTypeId;
  readonly datasetSchemaVersion: number;
  readonly storage: DatasetStorage;
  readonly provenance?: JsonObject;
  readonly metadata?: JsonObject;
  readonly extensions?: ExtensionMap;
}

export type DatasetStorage =
  | { readonly kind: "inline-json"; readonly value: JsonValue }
  | { readonly kind: "asset"; readonly assetId: AssetId };
