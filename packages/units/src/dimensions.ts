declare const unitIdBrand: unique symbol;
export type UnitId = string & { readonly [unitIdBrand]: "UnitId" };

export interface Dimension {
  readonly mass: number;
  readonly length: number;
  readonly time: number;
  readonly electricCurrent: number;
  readonly thermodynamicTemperature: number;
  readonly amountOfSubstance: number;
  readonly luminousIntensity: number;
}

export type SemanticDimensionlessKind =
  | "generic"
  | "angle"
  | "solid-angle"
  | "ratio"
  | "refractive-index"
  | "strain"
  | "probability"
  | "count"
  | `plugin:${string}`;

function frozenDimension(values: readonly number[]): Dimension {
  if (
    values.length !== 7 ||
    values.some((value) => !Number.isSafeInteger(value))
  ) {
    throw new RangeError("Dimension exponents must be seven safe integers.");
  }
  return Object.freeze({
    mass: values[0]!,
    length: values[1]!,
    time: values[2]!,
    electricCurrent: values[3]!,
    thermodynamicTemperature: values[4]!,
    amountOfSubstance: values[5]!,
    luminousIntensity: values[6]!,
  });
}

export const DIMENSIONLESS = frozenDimension([0, 0, 0, 0, 0, 0, 0]);
export const MASS = frozenDimension([1, 0, 0, 0, 0, 0, 0]);
export const LENGTH = frozenDimension([0, 1, 0, 0, 0, 0, 0]);
export const TIME = frozenDimension([0, 0, 1, 0, 0, 0, 0]);
export const ELECTRIC_CURRENT = frozenDimension([0, 0, 0, 1, 0, 0, 0]);
export const THERMODYNAMIC_TEMPERATURE = frozenDimension([0, 0, 0, 0, 1, 0, 0]);
export const AMOUNT_OF_SUBSTANCE = frozenDimension([0, 0, 0, 0, 0, 1, 0]);
export const LUMINOUS_INTENSITY = frozenDimension([0, 0, 0, 0, 0, 0, 1]);

export function dimension(values: Partial<Dimension> = {}): Dimension {
  return frozenDimension([
    values.mass ?? 0,
    values.length ?? 0,
    values.time ?? 0,
    values.electricCurrent ?? 0,
    values.thermodynamicTemperature ?? 0,
    values.amountOfSubstance ?? 0,
    values.luminousIntensity ?? 0,
  ]);
}

export function dimensionExponents(value: Dimension): readonly number[] {
  return Object.freeze([
    value.mass,
    value.length,
    value.time,
    value.electricCurrent,
    value.thermodynamicTemperature,
    value.amountOfSubstance,
    value.luminousIntensity,
  ]);
}

export function equalDimensions(a: Dimension, b: Dimension): boolean {
  return dimensionExponents(a).every(
    (value, index) => value === dimensionExponents(b)[index],
  );
}

export function isDimensionless(value: Dimension): boolean {
  return equalDimensions(value, DIMENSIONLESS);
}

export function multiplyDimensions(a: Dimension, b: Dimension): Dimension {
  return frozenDimension(
    dimensionExponents(a).map(
      (value, index) => value + dimensionExponents(b)[index]!,
    ),
  );
}

export function divideDimensions(a: Dimension, b: Dimension): Dimension {
  return frozenDimension(
    dimensionExponents(a).map(
      (value, index) => value - dimensionExponents(b)[index]!,
    ),
  );
}

export function powerDimension(value: Dimension, exponent: number): Dimension {
  if (!Number.isSafeInteger(exponent))
    throw new RangeError("Dimension powers must be safe integers.");
  return frozenDimension(
    dimensionExponents(value).map((entry) => entry * exponent),
  );
}

export type DimensionRootResult =
  | { readonly ok: true; readonly value: Dimension }
  | {
      readonly ok: false;
      readonly error: {
        readonly kind: "inexact-dimension-root";
        readonly degree: number;
      };
    };

export function rootDimension(
  value: Dimension,
  degree: number,
): DimensionRootResult {
  if (!Number.isSafeInteger(degree) || degree < 1)
    throw new RangeError("Root degree must be a positive safe integer.");
  const exponents = dimensionExponents(value);
  if (exponents.some((entry) => entry % degree !== 0)) {
    return { ok: false, error: { kind: "inexact-dimension-root", degree } };
  }
  return {
    ok: true,
    value: frozenDimension(exponents.map((entry) => entry / degree)),
  };
}

const UNIT_ID_PATTERN = /^[a-z0-9][a-z0-9.-]*:[a-z0-9][a-z0-9._/-]*$/;

export function unitId(value: string): UnitId {
  if (!UNIT_ID_PATTERN.test(value))
    throw new TypeError(`Invalid unit ID: ${value}`);
  return value as UnitId;
}

export function dimensionSignature(value: Dimension): string {
  return dimensionExponents(value)
    .map((entry) => (entry < 0 ? `n${-entry}` : `p${entry}`))
    .join("-");
}
