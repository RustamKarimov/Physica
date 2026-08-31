import {
  isUuidV4,
  registeredTypeId,
  type EquationDefinition,
  type JsonObject,
  type JsonPrimitive,
} from "@physica/core-model";
import { validateSemanticEquationTree } from "./identity";
import {
  asRecord,
  checkedJson,
  checkedJsonObject,
  cloneJson,
  freezeDeep,
} from "./internal";
import { EQUATION_CANONICALIZER, validateEquationModel } from "./model";
import type {
  EquationDiagnostic,
  EquationModelV1,
  EquationResult,
  SemanticEquationNode,
  SemanticEquationNodeId,
} from "./types";

export const EQUATION_MODEL_TYPE_ID = registeredTypeId(
  "physica:equation/model-v1",
);
export const EQUATION_MODEL_SCHEMA_VERSION = 1;

function semanticNodeToJson(node: SemanticEquationNode): JsonObject {
  if (node.kind === "atom") {
    return {
      id: node.id,
      kind: node.kind,
      value: node.value,
      fingerprint: node.fingerprint,
    };
  }
  if (node.kind === "list") {
    return {
      id: node.id,
      kind: node.kind,
      items: node.items.map(semanticNodeToJson),
      fingerprint: node.fingerprint,
    };
  }
  return {
    id: node.id,
    kind: node.kind,
    entries: node.entries.map((entry) => ({
      key: entry.key,
      value: semanticNodeToJson(entry.value),
    })),
    fingerprint: node.fingerprint,
  };
}

function invalidEnvelope(path: string, message: string): EquationResult<never> {
  return {
    ok: false,
    error: { kind: "invalid-equation-envelope", path, message },
  };
}

function parseSemanticNode(
  value: unknown,
  path: string,
): EquationResult<SemanticEquationNode> {
  const record = asRecord(value);
  if (!record) return invalidEnvelope(path, "Expected a semantic node object.");
  if (
    typeof record.id !== "string" ||
    typeof record.kind !== "string" ||
    typeof record.fingerprint !== "string"
  ) {
    return invalidEnvelope(path, "Semantic node header is malformed.");
  }
  if (!isUuidV4(record.id)) {
    return {
      ok: false,
      error: {
        kind: "invalid-semantic-id",
        path: path + ".id",
        value: record.id,
      },
    };
  }
  const base = {
    id: record.id as SemanticEquationNodeId,
    fingerprint: record.fingerprint,
  };
  if (record.kind === "atom") {
    const atom = record.value;
    if (
      atom !== null &&
      typeof atom !== "string" &&
      typeof atom !== "boolean" &&
      (typeof atom !== "number" || !Number.isFinite(atom))
    ) {
      return invalidEnvelope(path + ".value", "Invalid semantic atom.");
    }
    return {
      ok: true,
      value: { ...base, kind: "atom", value: atom as JsonPrimitive },
    };
  }
  if (record.kind === "list") {
    if (!Array.isArray(record.items)) {
      return invalidEnvelope(path + ".items", "Expected a semantic item list.");
    }
    const items: SemanticEquationNode[] = [];
    for (let index = 0; index < record.items.length; index += 1) {
      const parsed = parseSemanticNode(
        record.items[index],
        path + ".items[" + index + "]",
      );
      if (!parsed.ok) return parsed;
      items.push(parsed.value);
    }
    return { ok: true, value: { ...base, kind: "list", items } };
  }
  if (record.kind === "record") {
    if (!Array.isArray(record.entries)) {
      return invalidEnvelope(
        path + ".entries",
        "Expected semantic record entries.",
      );
    }
    const entries: { key: string; value: SemanticEquationNode }[] = [];
    for (let index = 0; index < record.entries.length; index += 1) {
      const entry = asRecord(record.entries[index]);
      if (!entry || typeof entry.key !== "string") {
        return invalidEnvelope(
          path + ".entries[" + index + "]",
          "Malformed semantic record entry.",
        );
      }
      const parsed = parseSemanticNode(
        entry.value,
        path + ".entries[" + index + "].value",
      );
      if (!parsed.ok) return parsed;
      entries.push({ key: entry.key, value: parsed.value });
    }
    return { ok: true, value: { ...base, kind: "record", entries } };
  }
  return invalidEnvelope(path + ".kind", "Unknown semantic node kind.");
}

function diagnosticsToJson(
  diagnostics: readonly EquationDiagnostic[],
): readonly JsonObject[] {
  return diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    start: diagnostic.start,
    end: diagnostic.end,
    ...(diagnostic.detail ? { detail: cloneJson(diagnostic.detail) } : {}),
  }));
}

function parseDiagnostics(
  value: unknown,
): EquationResult<readonly EquationDiagnostic[]> {
  if (!Array.isArray(value)) {
    return invalidEnvelope("$.configuration.diagnostics", "Expected a list.");
  }
  const diagnostics: EquationDiagnostic[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const record = asRecord(value[index]);
    if (
      !record ||
      typeof record.code !== "string" ||
      !Number.isSafeInteger(record.start) ||
      !Number.isSafeInteger(record.end)
    ) {
      return invalidEnvelope(
        "$.configuration.diagnostics[" + index + "]",
        "Malformed equation diagnostic.",
      );
    }
    const start = record.start as number;
    const end = record.end as number;
    let detail: JsonObject | undefined;
    if (record.detail !== undefined) {
      const checked = checkedJsonObject(record.detail, {
        kind: "invalid-equation-envelope",
        path: "$.configuration.diagnostics[" + index + "].detail",
        message: "Diagnostic detail must be a JSON object.",
      });
      if (!checked.ok) return checked;
      detail = checked.value;
    }
    diagnostics.push({
      code: record.code,
      start,
      end,
      ...(detail ? { detail } : {}),
    });
  }
  return { ok: true, value: diagnostics };
}

export function toEquationDefinition(
  model: EquationModelV1,
  enabled = true,
): EquationResult<EquationDefinition> {
  const valid = validateEquationModel(model);
  if (!valid.ok) return valid;
  const configuration: JsonObject = {
    name: model.name,
    source: { kind: "latex", value: model.source.value },
    canonicalizer: {
      id: model.canonicalizer.id,
      version: model.canonicalizer.version,
    },
    canonicalMathJson: cloneJson(model.canonicalMathJson),
    semanticRoot: semanticNodeToJson(model.semanticRoot),
    diagnostics: diagnosticsToJson(model.diagnostics),
    ...(model.metadata ? { metadata: cloneJson(model.metadata) } : {}),
  };
  return {
    ok: true,
    value: freezeDeep({
      id: model.id,
      typeId: EQUATION_MODEL_TYPE_ID,
      schemaVersion: EQUATION_MODEL_SCHEMA_VERSION,
      configuration,
      enabled,
    }),
  };
}

export function parseEquationDefinition(
  definition: EquationDefinition,
): EquationResult<EquationModelV1> {
  if (
    definition.typeId !== EQUATION_MODEL_TYPE_ID ||
    definition.schemaVersion !== EQUATION_MODEL_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      error: {
        kind: "unsupported-equation-envelope",
        typeId: definition.typeId,
        schemaVersion: definition.schemaVersion,
      },
    };
  }
  const configuration = asRecord(definition.configuration);
  const source = asRecord(configuration?.source);
  const canonicalizer = asRecord(configuration?.canonicalizer);
  if (
    !configuration ||
    typeof configuration.name !== "string" ||
    !source ||
    source.kind !== "latex" ||
    typeof source.value !== "string" ||
    !canonicalizer ||
    canonicalizer.id !== EQUATION_CANONICALIZER.id ||
    canonicalizer.version !== EQUATION_CANONICALIZER.version
  ) {
    return invalidEnvelope(
      "$.configuration",
      "Equation configuration header is malformed or unsupported.",
    );
  }
  const canonical = checkedJson(configuration.canonicalMathJson, {
    kind: "invalid-equation-envelope",
    path: "$.configuration.canonicalMathJson",
    message: "Canonical MathJSON is not finite JSON data.",
  });
  if (!canonical.ok) return canonical;
  const semantic = parseSemanticNode(
    configuration.semanticRoot,
    "$.configuration.semanticRoot",
  );
  if (!semantic.ok) return semantic;
  const tree = validateSemanticEquationTree(semantic.value, canonical.value);
  if (!tree.ok) return tree;
  const diagnostics = parseDiagnostics(configuration.diagnostics);
  if (!diagnostics.ok) return diagnostics;

  let metadata: JsonObject | undefined;
  if (configuration.metadata !== undefined) {
    const checked = checkedJsonObject(configuration.metadata, {
      kind: "invalid-metadata",
      message: "Equation metadata must be finite JSON object data.",
    });
    if (!checked.ok) return checked;
    metadata = checked.value;
  }
  const model: EquationModelV1 = {
    id: definition.id,
    name: configuration.name,
    source: { kind: "latex", value: source.value },
    canonicalizer: EQUATION_CANONICALIZER,
    canonicalMathJson: canonical.value,
    semanticRoot: semantic.value,
    diagnostics: diagnostics.value,
    ...(metadata ? { metadata } : {}),
  };
  const valid = validateEquationModel(model);
  return valid.ok ? { ok: true, value: freezeDeep(model) } : valid;
}
