import { ComputeEngine, type Expression } from "@cortex-js/compute-engine";
import type { JsonObject, JsonValue } from "@physica/core-model";
import { checkedJsonObject, freezeDeep } from "./internal";
import { EQUATION_CANONICALIZER, validateEquationModel } from "./model";
import type {
  EquationModelV1,
  EquationResult,
  EquationVerification,
  EquationVerificationRequest,
} from "./types";

const computeEngine = new ComputeEngine();
const symbolName = /^[A-Za-z][A-Za-z0-9_]*$/;

function invalid(
  path: string,
  message: string,
): EquationResult<EquationVerification> {
  return {
    ok: false,
    error: { kind: "invalid-verification", path, message },
  };
}

function boxed(value: JsonValue): Expression {
  return computeEngine.box(value as never);
}

function equalityOperands(
  expression: Expression,
): readonly [Expression, Expression] | undefined {
  const json = expression.json;
  if (!Array.isArray(json) || json.length !== 3 || json[0] !== "Equal") {
    return undefined;
  }
  return [
    computeEngine.box(json[1] as never),
    computeEngine.box(json[2] as never),
  ];
}

function compare(
  source: Expression,
  target: Expression,
): {
  readonly operation: "expression-equality" | "residual-equality";
  readonly established: boolean;
} {
  const sourceOperands = equalityOperands(source);
  const targetOperands = equalityOperands(target);
  if (sourceOperands || targetOperands) {
    if (!sourceOperands || !targetOperands) {
      return { operation: "residual-equality", established: false };
    }
    const sourceResidual = sourceOperands[0].sub(sourceOperands[1]).simplify();
    const targetResidual = targetOperands[0].sub(targetOperands[1]).simplify();
    return {
      operation: "residual-equality",
      established: sourceResidual.isEqual(targetResidual) === true,
    };
  }
  return {
    operation: "expression-equality",
    established: source.simplify().isEqual(target.simplify()) === true,
  };
}

function automaticVerification(
  source: Expression,
  target: Expression,
): EquationVerification {
  const comparison = compare(source, target);
  return {
    status: comparison.established
      ? "VERIFIED_EQUIVALENT"
      : "UNVERIFIED_PRESENTATION",
    method: {
      kind: "compute-engine",
      operation: comparison.operation,
      outcome: comparison.established ? "verified" : "not-established",
      engine: EQUATION_CANONICALIZER,
    },
    explanation: comparison.established
      ? comparison.operation === "residual-equality"
        ? "Compute Engine verified equal simplified equation residuals."
        : "Compute Engine verified mathematical expression equality."
      : "The pinned symbolic engine did not establish this transformation; presentation matching does not imply equivalence.",
  };
}

function checkedSubstitutions(value: JsonObject): EquationResult<JsonObject> {
  const checked = checkedJsonObject(value, {
    kind: "invalid-substitution",
    path: "$.verification.substitutions",
    message: "Substitutions must be finite JSON object data.",
  });
  if (!checked.ok) return checked;
  const entries = Object.entries(checked.value);
  if (entries.length === 0) {
    return {
      ok: false,
      error: {
        kind: "invalid-substitution",
        path: "$.verification.substitutions",
        message: "At least one substitution is required.",
      },
    };
  }
  for (const [key, substitution] of entries) {
    if (!symbolName.test(key)) {
      return {
        ok: false,
        error: {
          kind: "invalid-substitution",
          path: "$.verification.substitutions." + key,
          message: "Substitution keys must be simple symbolic identifiers.",
        },
      };
    }
    try {
      if (!boxed(substitution).isValid) {
        return {
          ok: false,
          error: {
            kind: "invalid-substitution",
            path: "$.verification.substitutions." + key,
            message: "Substitution value is not a valid semantic expression.",
          },
        };
      }
    } catch {
      return {
        ok: false,
        error: {
          kind: "invalid-substitution",
          path: "$.verification.substitutions." + key,
          message: "Substitution value could not be boxed safely.",
        },
      };
    }
  }
  return checked;
}

export function verifyEquationTransition(
  source: EquationModelV1,
  target: EquationModelV1,
  request: EquationVerificationRequest,
): EquationResult<EquationVerification> {
  const sourceValid = validateEquationModel(source);
  if (!sourceValid.ok) return sourceValid;
  const targetValid = validateEquationModel(target);
  if (!targetValid.ok) return targetValid;

  if (request.kind === "teacher-declared") {
    if (request.statement.trim().length === 0) {
      return invalid(
        "$.verification.statement",
        "A teacher declaration must include a non-empty statement.",
      );
    }
    return {
      ok: true,
      value: freezeDeep({
        status: "TEACHER_DECLARED",
        method: {
          kind: "teacher-declaration",
          statement: request.statement,
        },
        explanation:
          "The author declared this relationship; Physica has not supplied a symbolic proof.",
      }),
    };
  }

  if (request.kind === "presentation-only") {
    if (request.reason.trim().length === 0) {
      return invalid(
        "$.verification.reason",
        "An unverified presentation must include a reason.",
      );
    }
    return {
      ok: true,
      value: freezeDeep({
        status: "UNVERIFIED_PRESENTATION",
        method: { kind: "presentation-only", reason: request.reason },
        explanation: request.reason,
      }),
    };
  }

  try {
    const sourceExpression = boxed(source.canonicalMathJson);
    const targetExpression = boxed(target.canonicalMathJson);
    if (request.kind === "automatic-equivalence") {
      return {
        ok: true,
        value: freezeDeep(
          automaticVerification(sourceExpression, targetExpression),
        ),
      };
    }

    const substitutions = checkedSubstitutions(request.substitutions);
    if (!substitutions.ok) return substitutions;
    const substituted = sourceExpression
      .subs(substitutions.value as never)
      .simplify();
    const established = compare(substituted, targetExpression).established;
    return {
      ok: true,
      value: freezeDeep({
        status: established
          ? "VERIFIED_SUBSTITUTION"
          : "UNVERIFIED_PRESENTATION",
        method: {
          kind: "compute-engine-substitution",
          substitutions: substitutions.value,
          outcome: established ? "verified" : "not-established",
          engine: EQUATION_CANONICALIZER,
        },
        explanation: established
          ? "Compute Engine verified the declared substitution against the target expression."
          : "The declared substitution did not establish the target; presentation matching does not imply equivalence.",
      }),
    };
  } catch {
    return {
      ok: true,
      value: freezeDeep({
        status: "UNVERIFIED_PRESENTATION",
        method: {
          kind: "compute-engine",
          operation: "expression-equality",
          outcome: "not-established",
          engine: EQUATION_CANONICALIZER,
        },
        explanation:
          "The pinned symbolic engine could not safely evaluate this transformation; it remains presentation-only.",
      }),
    };
  }
}
