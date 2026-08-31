import { ComputeEngine } from "@cortex-js/compute-engine";
import {
  isUuidV4,
  isJsonValue,
  type JsonObject,
  type JsonValue,
} from "@physica/core-model";
import {
  buildSemanticEquationTree,
  validateSemanticEquationTree,
} from "./identity";
import { checkedJson, checkedJsonObject, freezeDeep } from "./internal";
import type {
  CreateEquationModelInput,
  EditEquationModelInput,
  EquationDiagnostic,
  EquationModelV1,
  EquationResult,
} from "./types";

export const EQUATION_CANONICALIZER = Object.freeze({
  id: "cortex-js/compute-engine" as const,
  version: "0.120.0" as const,
});

const computeEngine = new ComputeEngine();

function parseCanonicalLatex(latex: string): EquationResult<{
  readonly canonicalMathJson: JsonValue;
  readonly diagnostics: readonly EquationDiagnostic[];
}> {
  if (latex.trim().length === 0) {
    return {
      ok: false,
      error: {
        kind: "invalid-source",
        message: "Equation LaTeX must not be empty.",
      },
    };
  }

  try {
    const expression = computeEngine.parse(latex, {
      diagnostics: true,
      speculative: true,
    });
    if (!expression.isValid) {
      return {
        ok: false,
        error: {
          kind: "parse-failed",
          message: "The LaTeX source is not a valid semantic expression.",
          diagnostics: expression.errors.map((error) => error.latex),
        },
      };
    }
    const canonical = checkedJson(expression.json, {
      kind: "invalid-canonical-json",
      message: "The canonical expression is not finite JSON data.",
    });
    if (!canonical.ok) return canonical;

    const diagnostics = (expression.parseDiagnostics ?? []).map(
      (diagnostic): EquationDiagnostic => {
        const base = {
          code: diagnostic.code,
          start: diagnostic.start,
          end: diagnostic.end,
        };
        if (!diagnostic.detail || !isJsonValue(diagnostic.detail)) return base;
        if (
          Array.isArray(diagnostic.detail) ||
          diagnostic.detail === null ||
          typeof diagnostic.detail !== "object"
        ) {
          return base;
        }
        const detail = checkedJsonObject(diagnostic.detail, {
          kind: "invalid-canonical-json",
          message: "A parser diagnostic contained non-JSON detail.",
        });
        return detail.ok ? { ...base, detail: detail.value } : base;
      },
    );
    return {
      ok: true,
      value: {
        canonicalMathJson: canonical.value,
        diagnostics: freezeDeep(diagnostics),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        kind: "parse-failed",
        message:
          error instanceof Error ? error.message : "Equation parsing failed.",
        diagnostics: [],
      },
    };
  }
}

function checkedName(name: string): EquationResult<string> {
  if (name.trim().length === 0) {
    return {
      ok: false,
      error: {
        kind: "invalid-name",
        message: "Equation name must not be empty.",
      },
    };
  }
  return { ok: true, value: name };
}

function checkedMetadata(
  metadata: JsonObject | undefined,
): EquationResult<JsonObject | undefined> {
  if (metadata === undefined) return { ok: true, value: undefined };
  const result = checkedJsonObject(metadata, {
    kind: "invalid-metadata",
    message: "Equation metadata must be finite JSON object data.",
  });
  return result;
}

export function createEquationModel(
  input: CreateEquationModelInput,
): EquationResult<EquationModelV1> {
  const name = checkedName(input.name);
  if (!name.ok) return name;
  const metadata = checkedMetadata(input.metadata);
  if (!metadata.ok) return metadata;
  const parsed = parseCanonicalLatex(input.latex);
  if (!parsed.ok) return parsed;
  const semanticRoot = buildSemanticEquationTree(
    parsed.value.canonicalMathJson,
    input.idFactory,
  );
  const validTree = validateSemanticEquationTree(
    semanticRoot,
    parsed.value.canonicalMathJson,
  );
  if (!validTree.ok) return validTree;
  const model: EquationModelV1 = {
    id: input.id,
    name: name.value,
    source: { kind: "latex", value: input.latex },
    canonicalizer: EQUATION_CANONICALIZER,
    canonicalMathJson: parsed.value.canonicalMathJson,
    semanticRoot,
    diagnostics: parsed.value.diagnostics,
    ...(metadata.value ? { metadata: metadata.value } : {}),
  };
  return { ok: true, value: freezeDeep(model) };
}

export function editEquationModel(
  input: EditEquationModelInput,
): EquationResult<EquationModelV1> {
  const validPrevious = validateEquationModel(input.previous);
  if (!validPrevious.ok) return validPrevious;
  const metadata = checkedMetadata(input.previous.metadata);
  if (!metadata.ok) return metadata;
  const parsed = parseCanonicalLatex(input.latex);
  if (!parsed.ok) return parsed;
  const semanticRoot = buildSemanticEquationTree(
    parsed.value.canonicalMathJson,
    input.idFactory,
    input.previous.semanticRoot,
  );
  const validTree = validateSemanticEquationTree(
    semanticRoot,
    parsed.value.canonicalMathJson,
  );
  if (!validTree.ok) return validTree;
  const model: EquationModelV1 = {
    id: input.previous.id,
    name: input.previous.name,
    source: { kind: "latex", value: input.latex },
    canonicalizer: EQUATION_CANONICALIZER,
    canonicalMathJson: parsed.value.canonicalMathJson,
    semanticRoot,
    diagnostics: parsed.value.diagnostics,
    ...(metadata.value === undefined ? {} : { metadata: metadata.value }),
  };
  return { ok: true, value: freezeDeep(model) };
}

export function validateEquationModel(
  model: EquationModelV1,
): EquationResult<EquationModelV1> {
  if (!isUuidV4(model.id)) {
    return {
      ok: false,
      error: {
        kind: "invalid-equation-envelope",
        path: "$.id",
        message: "Equation ID must be a UUID-v4 value.",
      },
    };
  }
  const name = checkedName(model.name);
  if (!name.ok) return name;
  if (
    model.source.kind !== "latex" ||
    typeof model.source.value !== "string" ||
    model.source.value.trim().length === 0
  ) {
    return {
      ok: false,
      error: {
        kind: "invalid-source",
        message: "Equation source must contain non-empty LaTeX.",
      },
    };
  }
  if (
    model.canonicalizer.id !== EQUATION_CANONICALIZER.id ||
    model.canonicalizer.version !== EQUATION_CANONICALIZER.version
  ) {
    return {
      ok: false,
      error: {
        kind: "invalid-canonical-json",
        message: "Unsupported equation canonicalizer stamp.",
      },
    };
  }
  const canonical = checkedJson(model.canonicalMathJson, {
    kind: "invalid-canonical-json",
    message: "Canonical MathJSON must contain finite JSON data.",
  });
  if (!canonical.ok) return canonical;
  const tree = validateSemanticEquationTree(
    model.semanticRoot,
    canonical.value,
  );
  if (!tree.ok) return tree;
  const metadata = checkedMetadata(model.metadata);
  if (!metadata.ok) return metadata;
  if (
    !Array.isArray(model.diagnostics) ||
    model.diagnostics.some(
      (diagnostic) =>
        typeof diagnostic.code !== "string" ||
        !Number.isSafeInteger(diagnostic.start) ||
        !Number.isSafeInteger(diagnostic.end) ||
        diagnostic.start < 0 ||
        diagnostic.end < diagnostic.start ||
        (diagnostic.detail !== undefined &&
          (!isJsonValue(diagnostic.detail) ||
            diagnostic.detail === null ||
            Array.isArray(diagnostic.detail))),
    )
  ) {
    return {
      ok: false,
      error: {
        kind: "invalid-semantic-node",
        path: "$.diagnostics",
        message: "Equation diagnostics are malformed.",
      },
    };
  }
  return { ok: true, value: model };
}
