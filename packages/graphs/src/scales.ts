import type { ParsedUnit } from "@physica/units";
import type {
  GraphAxisV1,
  GraphLayoutCoordinate,
  GraphResult,
  ResolvedGraphTick,
} from "./types";

export function formatGraphNumber(value: number): string {
  const rounded = Number(value.toPrecision(6));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}
export function displayValue(canonical: number, unit: ParsedUnit): number {
  return (canonical - unit.offset) / unit.scale;
}

export function resolveDomain(
  axis: GraphAxisV1,
  values: readonly number[],
  name: "x" | "y",
): GraphResult<readonly [number, number]> {
  for (const value of values)
    if (axis.scale === "log10" && value <= 0)
      return {
        ok: false,
        error: { kind: "invalid-log-domain", axis: name, value },
      };
  if (axis.domain.kind === "manual")
    return {
      ok: true,
      value: [axis.domain.minCanonical, axis.domain.maxCanonical],
    };
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (axis.scale === "log10") {
    min = 10 ** Math.floor(Math.log10(min));
    max = 10 ** Math.ceil(Math.log10(max));
    if (min === max) {
      min /= 10;
      max *= 10;
    }
  } else if (min === max) {
    const delta = Math.max(Math.abs(min) * 0.05, 1);
    min -= delta;
    max += delta;
  } else {
    const padding = (max - min) * 0.05;
    min -= padding;
    max += padding;
  }
  return { ok: true, value: [min, max] };
}

export function scaleRatio(
  value: number,
  limits: readonly [number, number],
  scale: GraphAxisV1["scale"],
): number {
  const transform = (entry: number) =>
    scale === "log10" ? Math.log10(entry) : entry;
  return (
    (transform(value) - transform(limits[0])) /
    (transform(limits[1]) - transform(limits[0]))
  );
}

function niceStep(span: number, target: number): number {
  const rough = span / Math.max(1, target - 1);
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  return (
    (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power
  );
}
export function resolveTicks(
  axis: GraphAxisV1,
  limits: readonly [number, number],
  unit: ParsedUnit,
  position: (ratio: number) => GraphLayoutCoordinate,
): readonly ResolvedGraphTick[] {
  const values: number[] = [];
  if (axis.scale === "log10") {
    for (
      let exponent = Math.ceil(Math.log10(limits[0]));
      exponent <= Math.floor(Math.log10(limits[1]));
      exponent += 1
    )
      values.push(10 ** exponent);
  } else {
    const step = niceStep(limits[1] - limits[0], axis.tickTarget);
    for (
      let value = Math.ceil(limits[0] / step) * step;
      value <= limits[1] + step * 1e-10;
      value += step
    )
      values.push(Number(value.toPrecision(14)));
  }
  return values.map((canonicalValue) => {
    const shown = displayValue(canonicalValue, unit);
    return {
      canonicalValue,
      displayValue: shown,
      label: formatGraphNumber(shown),
      position: position(scaleRatio(canonicalValue, limits, axis.scale)),
    };
  });
}
