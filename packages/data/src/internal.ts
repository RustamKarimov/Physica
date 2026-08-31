import {
  isJsonValue,
  type JsonObject,
  type JsonValue,
} from "@physica/core-model";

export function freezeDeep<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      freezeDeep(child);
    }
  }
  return value;
}

export function cloneJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(cloneJson);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, cloneJson((value as JsonObject)[key]!)]),
    );
  }
  return value;
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function finiteJsonObject(value: unknown): JsonObject | undefined {
  return isJsonValue(value) && asRecord(value)
    ? (cloneJson(value) as JsonObject)
    : undefined;
}
