import {
  DEFAULT_NUMERICS_POLICY,
  approximatelyEqual,
  type NumericsPolicy,
} from "@physica/mathematics";
import {
  divideDimensions,
  equalDimensions,
  isDimensionless,
  multiplyDimensions,
  powerDimension,
  rootDimension,
  type Dimension,
  type SemanticDimensionlessKind,
} from "./dimensions";
import {
  type DefaultUnitRegistry,
  type ParsedUnit,
  type UnitError,
} from "./registry";

export type PrecisionPolicy =
  | { readonly kind: "automatic" }
  | { readonly kind: "decimal-places"; readonly places: number }
  | { readonly kind: "significant-figures"; readonly figures: number };

export type Uncertainty =
  | {
      readonly kind: "absolute";
      readonly canonicalValue: number;
      readonly confidenceLevel?: number;
    }
  | {
      readonly kind: "relative";
      readonly fraction: number;
      readonly confidenceLevel?: number;
    };

export interface Quantity {
  readonly canonicalValue: number;
  readonly dimension: Dimension;
  readonly displayUnit: ParsedUnit;
  readonly uncertainty?: Uncertainty;
  readonly precisionPolicy: PrecisionPolicy;
  readonly semanticKind: SemanticDimensionlessKind | null;
}

export type QuantityError =
  | { readonly kind: "unit-error"; readonly error: UnitError }
  | {
      readonly kind: "incompatible-quantity";
      readonly operation: string;
      readonly message: string;
    }
  | { readonly kind: "invalid-uncertainty"; readonly message: string }
  | { readonly kind: "invalid-precision"; readonly message: string }
  | { readonly kind: "non-finite-result"; readonly operation: string }
  | { readonly kind: "inexact-quantity-root"; readonly degree: number };

export type QuantityResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: QuantityError };

export const AUTOMATIC_PRECISION: PrecisionPolicy = Object.freeze({
  kind: "automatic",
});

function validatePrecision(
  policy: PrecisionPolicy,
): QuantityResult<PrecisionPolicy> {
  if (policy.kind === "automatic")
    return { ok: true, value: AUTOMATIC_PRECISION };
  const value =
    policy.kind === "decimal-places" ? policy.places : policy.figures;
  if (
    !Number.isSafeInteger(value) ||
    value < (policy.kind === "decimal-places" ? 0 : 1) ||
    value > 100
  ) {
    return {
      ok: false,
      error: {
        kind: "invalid-precision",
        message: "Precision must be a bounded safe integer.",
      },
    };
  }
  return { ok: true, value: Object.freeze({ ...policy }) };
}

function validateUncertainty(
  value: Uncertainty | undefined,
): QuantityResult<Uncertainty | undefined> {
  if (value === undefined) return { ok: true, value: undefined };
  const magnitude =
    value.kind === "absolute" ? value.canonicalValue : value.fraction;
  if (!Number.isFinite(magnitude) || magnitude < 0)
    return {
      ok: false,
      error: {
        kind: "invalid-uncertainty",
        message: "Uncertainty must be finite and non-negative.",
      },
    };
  if (
    value.confidenceLevel !== undefined &&
    (!Number.isFinite(value.confidenceLevel) ||
      value.confidenceLevel <= 0 ||
      value.confidenceLevel > 1)
  )
    return {
      ok: false,
      error: {
        kind: "invalid-uncertainty",
        message: "Confidence level must be in (0, 1].",
      },
    };
  return { ok: true, value: Object.freeze({ ...value }) };
}

function frozenQuantity(input: Quantity): QuantityResult<Quantity> {
  if (!Number.isFinite(input.canonicalValue))
    return {
      ok: false,
      error: { kind: "non-finite-result", operation: "quantity" },
    };
  const precision = validatePrecision(input.precisionPolicy);
  if (!precision.ok) return precision;
  const uncertainty = validateUncertainty(input.uncertainty);
  if (!uncertainty.ok) return uncertainty;
  if (isDimensionless(input.dimension) !== (input.semanticKind !== null))
    return {
      ok: false,
      error: {
        kind: "incompatible-quantity",
        operation: "quantity",
        message:
          "Semantic kind must exist exactly for dimensionless quantities.",
      },
    };
  return {
    ok: true,
    value: Object.freeze({
      ...input,
      dimension: Object.freeze({ ...input.dimension }),
      displayUnit: Object.freeze({
        ...input.displayUnit,
        dimension: Object.freeze({ ...input.displayUnit.dimension }),
      }),
      precisionPolicy: precision.value,
      ...(uncertainty.value === undefined
        ? {}
        : { uncertainty: uncertainty.value }),
    }),
  };
}

export interface CreateQuantityOptions {
  readonly uncertainty?:
    | {
        readonly kind: "absolute-display";
        readonly value: number;
        readonly confidenceLevel?: number;
      }
    | {
        readonly kind: "absolute-canonical";
        readonly value: number;
        readonly confidenceLevel?: number;
      }
    | {
        readonly kind: "relative";
        readonly fraction: number;
        readonly confidenceLevel?: number;
      };
  readonly precisionPolicy?: PrecisionPolicy;
}

export function createQuantity(
  displayValue: number,
  unitExpression: string,
  registry: DefaultUnitRegistry,
  options: CreateQuantityOptions = {},
): QuantityResult<Quantity> {
  if (!Number.isFinite(displayValue)) {
    return {
      ok: false,
      error: { kind: "non-finite-result", operation: "createQuantity" },
    };
  }
  const parsed = registry.parse(unitExpression);
  if (!parsed.ok)
    return { ok: false, error: { kind: "unit-error", error: parsed.error } };
  const canonicalValue =
    displayValue * parsed.value.scale + parsed.value.offset;
  let uncertainty: Uncertainty | undefined;
  if (options.uncertainty?.kind === "relative") {
    uncertainty = {
      kind: "relative",
      fraction: options.uncertainty.fraction,
      ...(options.uncertainty.confidenceLevel === undefined
        ? {}
        : { confidenceLevel: options.uncertainty.confidenceLevel }),
    };
  } else if (options.uncertainty) {
    uncertainty = {
      kind: "absolute",
      canonicalValue:
        options.uncertainty.kind === "absolute-display"
          ? Math.abs(options.uncertainty.value * parsed.value.scale)
          : Math.abs(options.uncertainty.value),
      ...(options.uncertainty.confidenceLevel === undefined
        ? {}
        : { confidenceLevel: options.uncertainty.confidenceLevel }),
    };
  }
  return frozenQuantity({
    canonicalValue,
    dimension: parsed.value.dimension,
    displayUnit: parsed.value,
    ...(uncertainty === undefined ? {} : { uncertainty }),
    precisionPolicy: options.precisionPolicy ?? AUTOMATIC_PRECISION,
    semanticKind: parsed.value.semanticKind,
  });
}

export function quantityDisplayValue(value: Quantity): number {
  return (
    (value.canonicalValue - value.displayUnit.offset) / value.displayUnit.scale
  );
}

export function formatQuantityDisplayValue(value: Quantity): string {
  const rawDisplayValue = quantityDisplayValue(value);
  const displayValue = Object.is(rawDisplayValue, -0) ? 0 : rawDisplayValue;
  if (value.precisionPolicy.kind === "decimal-places") {
    return displayValue.toFixed(value.precisionPolicy.places);
  }
  if (value.precisionPolicy.kind === "significant-figures") {
    return displayValue.toPrecision(value.precisionPolicy.figures);
  }
  return displayValue.toString();
}

export function withDisplayUnit(
  value: Quantity,
  unitExpression: string,
  registry: DefaultUnitRegistry,
): QuantityResult<Quantity> {
  const parsed = registry.parse(unitExpression);
  if (!parsed.ok)
    return { ok: false, error: { kind: "unit-error", error: parsed.error } };
  if (
    !equalDimensions(value.dimension, parsed.value.dimension) ||
    value.semanticKind !== parsed.value.semanticKind
  )
    return {
      ok: false,
      error: {
        kind: "incompatible-quantity",
        operation: "withDisplayUnit",
        message: "Display unit is incompatible with the quantity.",
      },
    };
  return frozenQuantity({ ...value, displayUnit: parsed.value });
}

function absoluteUncertainty(value: Quantity): number {
  if (!value.uncertainty) return 0;
  return value.uncertainty.kind === "absolute"
    ? value.uncertainty.canonicalValue
    : Math.abs(value.canonicalValue) * value.uncertainty.fraction;
}

function relativeUncertainty(value: Quantity): number {
  if (!value.uncertainty) return 0;
  if (value.uncertainty.kind === "relative") return value.uncertainty.fraction;
  return value.canonicalValue === 0
    ? 0
    : value.uncertainty.canonicalValue / Math.abs(value.canonicalValue);
}

function coherentParsedUnit(
  dimension: Dimension,
  semanticKind: SemanticDimensionlessKind | null,
  registry: DefaultUnitRegistry,
): ParsedUnit {
  const definition = registry.coherentUnit(dimension, semanticKind);
  return Object.freeze({
    expression: definition.symbol,
    dimension: definition.dimension,
    scale: 1,
    offset: 0,
    semanticKind,
    standaloneUnitId: definition.id,
  });
}

function compatible(a: Quantity, b: Quantity): boolean {
  return (
    equalDimensions(a.dimension, b.dimension) &&
    a.semanticKind === b.semanticKind
  );
}

function addOrSubtractQuantity(
  a: Quantity,
  b: Quantity,
  sign: 1 | -1,
  operation: string,
): QuantityResult<Quantity> {
  if (!compatible(a, b))
    return {
      ok: false,
      error: {
        kind: "incompatible-quantity",
        operation,
        message: "Dimensions and semantic kinds must match.",
      },
    };
  const uncertainty =
    a.uncertainty || b.uncertainty
      ? {
          kind: "absolute" as const,
          canonicalValue: Math.hypot(
            absoluteUncertainty(a),
            absoluteUncertainty(b),
          ),
        }
      : undefined;
  return frozenQuantity({
    canonicalValue: a.canonicalValue + sign * b.canonicalValue,
    dimension: a.dimension,
    displayUnit: a.displayUnit,
    ...(uncertainty ? { uncertainty } : {}),
    precisionPolicy: a.precisionPolicy,
    semanticKind: a.semanticKind,
  });
}

export function addQuantity(
  a: Quantity,
  b: Quantity,
): QuantityResult<Quantity> {
  return addOrSubtractQuantity(a, b, 1, "addQuantity");
}
export function subtractQuantity(
  a: Quantity,
  b: Quantity,
): QuantityResult<Quantity> {
  return addOrSubtractQuantity(a, b, -1, "subtractQuantity");
}

function resultSemanticKind(
  dimension: Dimension,
  a: Quantity,
  b: Quantity,
): SemanticDimensionlessKind | null {
  if (!isDimensionless(dimension)) return null;
  if (a.semanticKind === null && b.semanticKind === null) return "generic";
  if (a.semanticKind === "generic") return b.semanticKind ?? "generic";
  if (b.semanticKind === "generic") return a.semanticKind ?? "generic";
  if (a.semanticKind === null) return b.semanticKind ?? "generic";
  if (b.semanticKind === null) return a.semanticKind;
  return "generic";
}

function multiplyOrDivideQuantity(
  a: Quantity,
  b: Quantity,
  divide: boolean,
  registry: DefaultUnitRegistry,
): QuantityResult<Quantity> {
  if (divide && b.canonicalValue === 0)
    return {
      ok: false,
      error: {
        kind: "incompatible-quantity",
        operation: "divideQuantity",
        message: "Cannot divide by zero.",
      },
    };
  const resultDimension = divide
    ? divideDimensions(a.dimension, b.dimension)
    : multiplyDimensions(a.dimension, b.dimension);
  const semanticKind = resultSemanticKind(resultDimension, a, b);
  const canonicalValue = divide
    ? a.canonicalValue / b.canonicalValue
    : a.canonicalValue * b.canonicalValue;
  const uncertainty =
    a.uncertainty || b.uncertainty
      ? {
          kind: "relative" as const,
          fraction: Math.hypot(relativeUncertainty(a), relativeUncertainty(b)),
        }
      : undefined;
  return frozenQuantity({
    canonicalValue,
    dimension: resultDimension,
    displayUnit: coherentParsedUnit(resultDimension, semanticKind, registry),
    ...(uncertainty ? { uncertainty } : {}),
    precisionPolicy: AUTOMATIC_PRECISION,
    semanticKind,
  });
}

export function multiplyQuantity(
  a: Quantity,
  b: Quantity,
  registry: DefaultUnitRegistry,
): QuantityResult<Quantity> {
  return multiplyOrDivideQuantity(a, b, false, registry);
}
export function divideQuantity(
  a: Quantity,
  b: Quantity,
  registry: DefaultUnitRegistry,
): QuantityResult<Quantity> {
  return multiplyOrDivideQuantity(a, b, true, registry);
}

export function scaleQuantity(
  value: Quantity,
  scalar: number,
): QuantityResult<Quantity> {
  if (!Number.isFinite(scalar)) {
    return {
      ok: false,
      error: { kind: "non-finite-result", operation: "scaleQuantity" },
    };
  }
  const uncertainty =
    value.uncertainty?.kind === "absolute"
      ? {
          ...value.uncertainty,
          canonicalValue: value.uncertainty.canonicalValue * Math.abs(scalar),
        }
      : value.uncertainty;
  return frozenQuantity({
    ...value,
    canonicalValue: value.canonicalValue * scalar,
    ...(uncertainty === undefined ? {} : { uncertainty }),
  });
}

export function powerQuantity(
  value: Quantity,
  exponent: number,
  registry: DefaultUnitRegistry,
): QuantityResult<Quantity> {
  if (!Number.isSafeInteger(exponent))
    throw new RangeError("Quantity powers must be safe integers.");
  const resultDimension = powerDimension(value.dimension, exponent);
  const semanticKind = isDimensionless(resultDimension)
    ? exponent === 1
      ? value.semanticKind
      : "generic"
    : null;
  const uncertainty = value.uncertainty
    ? {
        kind: "relative" as const,
        fraction: Math.abs(exponent) * relativeUncertainty(value),
      }
    : undefined;
  return frozenQuantity({
    canonicalValue: value.canonicalValue ** exponent,
    dimension: resultDimension,
    displayUnit: coherentParsedUnit(resultDimension, semanticKind, registry),
    ...(uncertainty ? { uncertainty } : {}),
    precisionPolicy: AUTOMATIC_PRECISION,
    semanticKind,
  });
}

export function rootQuantity(
  value: Quantity,
  degree: number,
  registry: DefaultUnitRegistry,
): QuantityResult<Quantity> {
  const rooted = rootDimension(value.dimension, degree);
  if (!rooted.ok)
    return { ok: false, error: { kind: "inexact-quantity-root", degree } };
  if (value.canonicalValue < 0 && degree % 2 === 0)
    return {
      ok: false,
      error: {
        kind: "incompatible-quantity",
        operation: "rootQuantity",
        message: "Even root of a negative value is not real.",
      },
    };
  const result =
    Math.sign(value.canonicalValue) *
    Math.abs(value.canonicalValue) ** (1 / degree);
  const semanticKind = isDimensionless(rooted.value) ? "generic" : null;
  const uncertainty = value.uncertainty
    ? {
        kind: "relative" as const,
        fraction: relativeUncertainty(value) / degree,
      }
    : undefined;
  return frozenQuantity({
    canonicalValue: result,
    dimension: rooted.value,
    displayUnit: coherentParsedUnit(rooted.value, semanticKind, registry),
    ...(uncertainty ? { uncertainty } : {}),
    precisionPolicy: AUTOMATIC_PRECISION,
    semanticKind,
  });
}

export function approximatelyEqualQuantity(
  a: Quantity,
  b: Quantity,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): boolean {
  return (
    compatible(a, b) &&
    approximatelyEqual(a.canonicalValue, b.canonicalValue, policy)
  );
}
