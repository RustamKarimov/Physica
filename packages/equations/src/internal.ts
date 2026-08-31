import {
  isJsonValue,
  type JsonObject,
  type JsonValue,
} from "@physica/core-model";
import type { EquationError, EquationResult } from "./types";

export function freezeDeep<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      freezeDeep(child);
    }
  }
  return value;
}

export function isJsonArray(value: JsonValue): value is readonly JsonValue[] {
  return Array.isArray(value);
}

export function cloneJson(value: JsonValue): JsonValue {
  if (isJsonArray(value)) {
    return value.map((item) => cloneJson(item));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, cloneJson(value[key]!)]),
    );
  }
  return value;
}

export function checkedJson(
  value: unknown,
  error: EquationError,
): EquationResult<JsonValue> {
  if (!isJsonValue(value)) return { ok: false, error };
  return { ok: true, value: cloneJson(value) };
}

export function checkedJsonObject(
  value: unknown,
  error: EquationError,
): EquationResult<JsonObject> {
  const checked = checkedJson(value, error);
  if (!checked.ok) return checked;
  if (
    checked.value === null ||
    isJsonArray(checked.value) ||
    typeof checked.value !== "object"
  ) {
    return { ok: false, error };
  }
  return { ok: true, value: checked.value };
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    return undefined;
  }
  return value as Record<string, unknown>;
}

export function stableJson(value: JsonValue): string {
  if (isJsonArray(value)) {
    return "[" + value.map(stableJson).join(",") + "]";
  }
  if (value !== null && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + stableJson(value[key]!))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}
