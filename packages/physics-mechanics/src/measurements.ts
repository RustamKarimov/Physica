import {
  dimensionSignature,
  equalDimensions,
  type Dimension,
} from "@physica/units";
import {
  invalid,
  mechanicsIssue,
  valid,
  validateFinite,
  type MechanicsResult,
  type Vector2,
} from "./types";

export interface RepeatedMeasurementSummary {
  readonly count: number;
  readonly mean: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly absoluteUncertainty: number;
  readonly percentageUncertainty: number | null;
}

export function summarizeRepeatedMeasurements(
  samples: readonly number[],
): MechanicsResult<RepeatedMeasurementSummary> {
  if (samples.length < 2)
    return invalid(
      mechanicsIssue(
        "measurement.too-few-samples",
        "At least two repeated measurements are required.",
        "samples",
      ),
    );
  const issues = validateFinite(
    Object.fromEntries(
      samples.map((value, index) => [`samples.${index}`, value]),
    ),
  );
  if (issues.length > 0) return invalid(...issues);
  const minimum = Math.min(...samples);
  const maximum = Math.max(...samples);
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const absoluteUncertainty = (maximum - minimum) / 2;
  return valid({
    count: samples.length,
    mean,
    minimum,
    maximum,
    absoluteUncertainty,
    percentageUncertainty:
      mean === 0 ? null : (absoluteUncertainty / Math.abs(mean)) * 100,
  });
}

export function formatSignificantFigures(
  value: number,
  figures: number,
): MechanicsResult<string> {
  if (!Number.isFinite(value))
    return invalid(
      mechanicsIssue(
        "measurement.non-finite",
        "Value must be finite.",
        "value",
      ),
    );
  if (!Number.isSafeInteger(figures) || figures < 1 || figures > 15)
    return invalid(
      mechanicsIssue(
        "measurement.invalid-significant-figures",
        "Significant figures must be an integer from 1 to 15.",
        "figures",
      ),
    );
  return valid(value.toPrecision(figures));
}

export function vectorFromMagnitudeAngle(
  vectorMagnitude: number,
  angleRadians: number,
): MechanicsResult<Vector2> {
  const issues = validateFinite({ vectorMagnitude, angleRadians });
  if (vectorMagnitude < 0)
    issues.push(
      mechanicsIssue(
        "vector.negative-magnitude",
        "Vector magnitude cannot be negative.",
        "vectorMagnitude",
      ),
    );
  if (issues.length > 0) return invalid(...issues);
  return valid({
    x: vectorMagnitude * Math.cos(angleRadians),
    y: vectorMagnitude * Math.sin(angleRadians),
  });
}

export interface DimensionalEquationCheck {
  readonly homogeneous: boolean;
  readonly leftSignature: string;
  readonly rightSignature: string;
}

export function checkDimensionalEquation(
  left: Dimension,
  right: Dimension,
): DimensionalEquationCheck {
  return Object.freeze({
    homogeneous: equalDimensions(left, right),
    leftSignature: dimensionSignature(left),
    rightSignature: dimensionSignature(right),
  });
}
