import type { JsonValue, Result } from "@physica/core-model";

export interface CanonicalJsonError {
  readonly kind: "invalid-json-value" | "invalid-json-text";
  readonly code: string;
  readonly message: string;
  readonly path: string;
}

function invalidValue(
  code: string,
  message: string,
  path: string,
): Result<never, CanonicalJsonError> {
  return {
    ok: false,
    error: {
      kind: "invalid-json-value",
      code,
      message,
      path,
    },
  };
}

function normalize(
  value: unknown,
  path: string,
  ancestors: WeakSet<object>,
  inArray: boolean,
): Result<JsonValue | undefined, CanonicalJsonError> {
  if (value === undefined) {
    return inArray
      ? invalidValue(
          "undefined-array-entry",
          "Undefined array entries are not valid project JSON.",
          path,
        )
      : { ok: true, value: undefined };
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return { ok: true, value };
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? { ok: true, value }
      : invalidValue(
          "non-finite-number",
          "Project JSON numbers must be finite.",
          path,
        );
  }

  if (
    typeof value === "bigint" ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    return invalidValue(
      "unsupported-json-type",
      `Project JSON cannot contain ${typeof value} values.`,
      path,
    );
  }

  if (typeof value !== "object") {
    return invalidValue(
      "unsupported-json-type",
      "Unsupported JSON value.",
      path,
    );
  }

  if (ancestors.has(value)) {
    return invalidValue(
      "cyclic-json-value",
      "Project JSON cannot contain cyclic object graphs.",
      path,
    );
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const normalized: JsonValue[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const entry = normalize(
          value[index],
          `${path}[${index}]`,
          ancestors,
          true,
        );
        if (!entry.ok) return entry;
        normalized.push(entry.value as JsonValue);
      }
      return { ok: true, value: normalized };
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return invalidValue(
        "non-plain-object",
        "Project JSON objects must be plain objects.",
        path,
      );
    }

    const normalized: Record<string, JsonValue> = {};
    const source = value as Record<string, unknown>;
    for (const key of Object.keys(source).sort()) {
      const entry = normalize(source[key], `${path}.${key}`, ancestors, false);
      if (!entry.ok) return entry;
      if (entry.value !== undefined) {
        normalized[key] = entry.value;
      }
    }
    return { ok: true, value: normalized };
  } finally {
    ancestors.delete(value);
  }
}

export function canonicalStringify(
  value: unknown,
): Result<string, CanonicalJsonError> {
  const normalized = normalize(value, "$", new WeakSet(), false);
  if (!normalized.ok) return normalized;
  if (normalized.value === undefined) {
    return invalidValue(
      "undefined-root",
      "The project JSON root cannot be undefined.",
      "$",
    );
  }
  return { ok: true, value: JSON.stringify(normalized.value, null, 2) };
}

export function canonicalParseJson(
  text: string,
): Result<JsonValue, CanonicalJsonError> {
  try {
    const parsed: unknown = JSON.parse(text);
    const normalized = normalize(parsed, "$", new WeakSet(), false);
    if (!normalized.ok) return normalized;
    if (normalized.value === undefined) {
      return {
        ok: false,
        error: {
          kind: "invalid-json-text",
          code: "undefined-root",
          message: "The project JSON root cannot be undefined.",
          path: "$",
        },
      };
    }
    return { ok: true, value: normalized.value };
  } catch (error) {
    return {
      ok: false,
      error: {
        kind: "invalid-json-text",
        code: "json-syntax-error",
        message: error instanceof Error ? error.message : "Invalid JSON text.",
        path: "$",
      },
    };
  }
}
