import { fail, ok, type MathResult } from "./errors";
import { requireFinite } from "./numerics";

export interface Interval {
  readonly minimum: number;
  readonly maximum: number;
  readonly minimumInclusive: boolean;
  readonly maximumInclusive: boolean;
}

export interface Sample<TValue> {
  readonly argument: number;
  readonly value: TValue;
}

export interface SampledSeries<TValue> {
  readonly samples: readonly Sample<TValue>[];
}

export function interval(
  minimum: number,
  maximum: number,
  minimumInclusive = true,
  maximumInclusive = true,
): MathResult<Interval> {
  requireFinite(minimum, "minimum");
  requireFinite(maximum, "maximum");
  if (
    minimum > maximum ||
    (minimum === maximum && (!minimumInclusive || !maximumInclusive))
  ) {
    return fail({ kind: "invalid-interval", minimum, maximum });
  }
  return ok(
    Object.freeze({ minimum, maximum, minimumInclusive, maximumInclusive }),
  );
}

export function intervalContains(value: Interval, candidate: number): boolean {
  if (!Number.isFinite(candidate)) return false;
  const aboveMinimum = value.minimumInclusive
    ? candidate >= value.minimum
    : candidate > value.minimum;
  const belowMaximum = value.maximumInclusive
    ? candidate <= value.maximum
    : candidate < value.maximum;
  return aboveMinimum && belowMaximum;
}

export function sampledSeries<TValue>(
  samples: readonly Sample<TValue>[],
): MathResult<SampledSeries<TValue>> {
  let previous = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < samples.length; index += 1) {
    const argument = samples[index]!.argument;
    if (!Number.isFinite(argument) || argument <= previous) {
      return fail({ kind: "invalid-series", index });
    }
    previous = argument;
  }
  return ok(
    Object.freeze({
      samples: Object.freeze(
        samples.map((sample) => Object.freeze({ ...sample })),
      ),
    }),
  );
}
