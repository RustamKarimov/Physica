import {
  add3,
  magnitude3,
  scale3,
  validField,
  vec3,
  type FieldResult,
  type Vec3,
} from "./types";

export interface FieldSample {
  readonly position: Vec3;
  readonly vector: Vec3;
  readonly magnitude: number;
  readonly scalar?: number;
}

export interface FieldLine {
  readonly seed: Vec3;
  readonly points: readonly Vec3[];
  readonly direction: 1 | -1;
}

export type VectorFieldEvaluator = (position: Vec3) => FieldResult<Vec3>;
export type ScalarFieldEvaluator = (position: Vec3) => FieldResult<number>;

export function sampleVectorField(
  evaluator: VectorFieldEvaluator,
  positions: readonly Vec3[],
): FieldResult<readonly FieldSample[]> {
  const samples: FieldSample[] = [];
  for (const position of positions) {
    const result = evaluator(position);
    if (!result.ok) return result;
    samples.push({
      position,
      vector: result.value,
      magnitude: magnitude3(result.value),
    });
  }
  return validField(samples);
}

export function traceFieldLine(
  evaluator: VectorFieldEvaluator,
  seed: Vec3,
  options: {
    readonly stepMetres: number;
    readonly maxSteps: number;
    readonly direction?: 1 | -1;
    readonly maximumRadiusMetres?: number;
  },
): FieldResult<FieldLine> {
  const direction = options.direction ?? 1;
  if (
    !Number.isFinite(options.stepMetres) ||
    options.stepMetres <= 0 ||
    !Number.isSafeInteger(options.maxSteps) ||
    options.maxSteps < 1
  )
    return {
      ok: false,
      issues: [
        {
          severity: "error",
          code: "fields.invalid-trace-policy",
          message: "Field-line step and maximum step count must be positive.",
        },
      ],
    };
  const points: Vec3[] = [seed];
  let current = seed;
  for (let index = 0; index < options.maxSteps; index += 1) {
    const result = evaluator(current);
    if (!result.ok) break;
    const magnitude = magnitude3(result.value);
    if (magnitude === 0) break;
    current = add3(
      current,
      scale3(result.value, (direction * options.stepMetres) / magnitude),
    );
    if (
      options.maximumRadiusMetres !== undefined &&
      magnitude3(current) > options.maximumRadiusMetres
    )
      break;
    points.push(current);
  }
  return validField({ seed, points, direction });
}

export function sampleEquipotentialPlane(
  evaluator: ScalarFieldEvaluator,
  range: { readonly min: number; readonly max: number; readonly count: number },
  z = 0,
): FieldResult<readonly FieldSample[]> {
  if (
    !Number.isFinite(range.min) ||
    !Number.isFinite(range.max) ||
    range.max <= range.min ||
    !Number.isSafeInteger(range.count) ||
    range.count < 2 ||
    range.count > 101
  )
    return {
      ok: false,
      issues: [
        {
          severity: "error",
          code: "fields.invalid-sample-grid",
          message:
            "Equipotential grid requires finite bounds and 2 to 101 samples.",
        },
      ],
    };
  const samples: FieldSample[] = [];
  const step = (range.max - range.min) / (range.count - 1);
  for (let row = 0; row < range.count; row += 1)
    for (let column = 0; column < range.count; column += 1) {
      const position = vec3(
        range.min + column * step,
        range.min + row * step,
        z,
      );
      const scalar = evaluator(position);
      if (!scalar.ok) continue;
      samples.push({
        position,
        vector: vec3(0, 0, 0),
        magnitude: 0,
        scalar: scalar.value,
      });
    }
  return validField(samples);
}
