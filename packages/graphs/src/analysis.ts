import type { CartesianDataSeriesV1, CartesianDatasetV1 } from "@physica/data";
import {
  DEFAULT_NUMERICS_POLICY,
  approximatelyZero,
} from "@physica/mathematics";
import type { ParsedUnit } from "@physica/units";
import { formatGraphNumber } from "./scales";
import type {
  CartesianGraphV1,
  GraphAnalysisOverlayV1,
  GraphDataCoordinate,
  GraphLayoutCoordinate,
  GraphResult,
  ResolvedGraphAnalysis,
  ResolvedGraphSegment,
} from "./types";

interface AnalysisContext {
  readonly graph: CartesianGraphV1;
  readonly datasets: readonly CartesianDatasetV1[];
  readonly xDomain: readonly [number, number];
  readonly yDomain: readonly [number, number];
  readonly xUnit: ParsedUnit;
  readonly yUnit: ParsedUnit;
  readonly map: (x: number, y: number) => GraphLayoutCoordinate;
}

const source = (
  xCanonical: number,
  yCanonical: number,
): GraphDataCoordinate => ({
  space: "graph-data",
  xCanonical,
  yCanonical,
});

function segment(
  from: GraphDataCoordinate,
  to: GraphDataCoordinate,
  map: AnalysisContext["map"],
): ResolvedGraphSegment {
  return {
    sourceFrom: from,
    sourceTo: to,
    from: map(from.xCanonical, from.yCanonical),
    to: map(to.xCanonical, to.yCanonical),
  };
}

function findSeries(
  context: AnalysisContext,
  analysis: GraphAnalysisOverlayV1,
): GraphResult<CartesianDataSeriesV1> {
  const dataset = context.datasets.find(
    (item) => item.id === analysis.datasetId,
  );
  if (!dataset)
    return {
      ok: false,
      error: { kind: "missing-dataset", datasetId: analysis.datasetId },
    };
  const series = dataset.series.find((item) => item.key === analysis.seriesKey);
  return series
    ? { ok: true, value: series }
    : {
        ok: false,
        error: {
          kind: "missing-series",
          datasetId: dataset.id,
          seriesKey: analysis.seriesKey,
        },
      };
}

function evaluate(
  series: CartesianDataSeriesV1,
  x: number,
): number | undefined {
  const exact = series.samples
    .filter((sample) => sample.xCanonical === x)
    .at(-1);
  if (exact) return exact.yCanonical;
  let left: CartesianDataSeriesV1["samples"][number] | undefined;
  let right: CartesianDataSeriesV1["samples"][number] | undefined;
  for (const sample of series.samples) {
    if (sample.xCanonical < x) left = sample;
    if (sample.xCanonical > x) {
      right = sample;
      break;
    }
  }
  if (!left || !right) return undefined;
  const ratio = (x - left.xCanonical) / (right.xCanonical - left.xCanonical);
  return left.yCanonical + ratio * (right.yCanonical - left.yCanonical);
}

function tangentSlope(
  series: CartesianDataSeriesV1,
  x: number,
): { readonly y: number; readonly slope: number } | undefined {
  const y = evaluate(series, x);
  if (y === undefined) return undefined;
  const exact = series.samples.some((sample) => sample.xCanonical === x);
  let left: CartesianDataSeriesV1["samples"][number] | undefined;
  let right: CartesianDataSeriesV1["samples"][number] | undefined;
  for (const sample of series.samples) {
    if (sample.xCanonical < x) left = sample;
    if (sample.xCanonical > x) {
      right = sample;
      break;
    }
  }
  if (!exact && left && right)
    return {
      y,
      slope:
        (right.yCanonical - left.yCanonical) /
        (right.xCanonical - left.xCanonical),
    };
  if (left && right)
    return {
      y,
      slope:
        (right.yCanonical - left.yCanonical) /
        (right.xCanonical - left.xCanonical),
    };
  if (right)
    return { y, slope: (right.yCanonical - y) / (right.xCanonical - x) };
  if (left) return { y, slope: (y - left.yCanonical) / (x - left.xCanonical) };
  return undefined;
}

const display = (canonical: number, unit: ParsedUnit) =>
  (canonical - unit.offset) / unit.scale;

function tangent(
  definition: Extract<GraphAnalysisOverlayV1, { kind: "tangent" }>,
  series: CartesianDataSeriesV1,
  context: AnalysisContext,
): GraphResult<ResolvedGraphAnalysis> {
  const value = tangentSlope(series, definition.xCanonical);
  if (!value)
    return {
      ok: false,
      error: {
        kind: "insufficient-analysis-data",
        analysisId: definition.id,
        message: "Tangent requires a point and a distinct-x neighbour.",
      },
    };
  const anchor = source(definition.xCanonical, value.y);
  const lineFrom = source(
    context.xDomain[0],
    value.y + value.slope * (context.xDomain[0] - definition.xCanonical),
  );
  const lineTo = source(
    context.xDomain[1],
    value.y + value.slope * (context.xDomain[1] - definition.xCanonical),
  );
  const slopeDisplay =
    (value.slope * context.xUnit.scale) / context.yUnit.scale;
  let triangle: Extract<ResolvedGraphAnalysis, { kind: "tangent" }>["triangle"];
  if (definition.triangleRunCanonical !== undefined) {
    const run = definition.triangleRunCanonical;
    const rise = value.slope * run;
    const triangleSource = [
      anchor,
      source(anchor.xCanonical + run, anchor.yCanonical),
      source(anchor.xCanonical + run, anchor.yCanonical + rise),
    ];
    triangle = {
      runCanonical: run,
      riseCanonical: rise,
      source: triangleSource,
      points: triangleSource.map((point) =>
        context.map(point.xCanonical, point.yCanonical),
      ),
    };
  }
  return {
    ok: true,
    value: {
      id: definition.id,
      kind: "tangent",
      slopeCanonical: value.slope,
      anchor,
      line: segment(lineFrom, lineTo, context.map),
      strokeHex: definition.strokeHex,
      lineWidth: definition.lineWidth,
      ...(triangle ? { triangle } : {}),
      summary: `Tangent at ${formatGraphNumber(display(definition.xCanonical, context.xUnit))}: gradient ${formatGraphNumber(slopeDisplay)} ${context.yUnit.expression}/${context.xUnit.expression}.`,
    },
  };
}

function clippedCurve(
  series: CartesianDataSeriesV1,
  minimum: number,
  maximum: number,
): readonly GraphDataCoordinate[] | undefined {
  const first = evaluate(series, minimum);
  const last = evaluate(series, maximum);
  if (first === undefined || last === undefined) return undefined;
  return [
    source(minimum, first),
    ...series.samples
      .filter(
        (sample) => sample.xCanonical > minimum && sample.xCanonical < maximum,
      )
      .map((sample) => source(sample.xCanonical, sample.yCanonical)),
    source(maximum, last),
  ];
}

function area(
  definition: Extract<GraphAnalysisOverlayV1, { kind: "area" }>,
  series: CartesianDataSeriesV1,
  context: AnalysisContext,
): GraphResult<ResolvedGraphAnalysis> {
  const minimum = Math.max(
    definition.xMinCanonical,
    series.samples[0]!.xCanonical,
  );
  const maximum = Math.min(
    definition.xMaxCanonical,
    series.samples.at(-1)!.xCanonical,
  );
  if (minimum >= maximum)
    return {
      ok: false,
      error: {
        kind: "invalid-analysis",
        analysisId: definition.id,
        message: "Area interval does not overlap the series.",
      },
    };
  const curve = clippedCurve(series, minimum, maximum);
  if (!curve)
    return {
      ok: false,
      error: {
        kind: "insufficient-analysis-data",
        analysisId: definition.id,
        message: "Area bounds cannot be interpolated.",
      },
    };
  let signedAreaCanonical = 0;
  for (let index = 1; index < curve.length; index += 1) {
    const left = curve[index - 1]!;
    const right = curve[index]!;
    signedAreaCanonical +=
      (right.xCanonical - left.xCanonical) *
      ((left.yCanonical -
        definition.baselineCanonical +
        right.yCanonical -
        definition.baselineCanonical) /
        2);
  }
  const polygon = [
    source(minimum, definition.baselineCanonical),
    ...curve,
    source(maximum, definition.baselineCanonical),
  ];
  const displayArea =
    signedAreaCanonical / (context.xUnit.scale * context.yUnit.scale);
  const displayUnitExpression = `${context.yUnit.expression}·${context.xUnit.expression}`;
  return {
    ok: true,
    value: {
      id: definition.id,
      kind: "area",
      signedAreaCanonical,
      displayArea,
      displayUnitExpression,
      source: polygon,
      points: polygon.map((point) =>
        context.map(point.xCanonical, point.yCanonical),
      ),
      fillHex: definition.fillHex,
      opacity: definition.opacity,
      summary: `Signed area ${formatGraphNumber(displayArea)} ${displayUnitExpression}.`,
    },
  };
}

function maximum(
  definition: Extract<GraphAnalysisOverlayV1, { kind: "maximum" }>,
  series: CartesianDataSeriesV1,
  context: AnalysisContext,
): GraphResult<ResolvedGraphAnalysis> {
  const minimum = Math.max(
    definition.xMinCanonical ?? series.samples[0]!.xCanonical,
    series.samples[0]!.xCanonical,
  );
  const maximumX = Math.min(
    definition.xMaxCanonical ?? series.samples.at(-1)!.xCanonical,
    series.samples.at(-1)!.xCanonical,
  );
  const candidates = clippedCurve(series, minimum, maximumX);
  if (!candidates || candidates.length === 0)
    return {
      ok: false,
      error: {
        kind: "insufficient-analysis-data",
        analysisId: definition.id,
        message: "Maximum interval contains no data.",
      },
    };
  let selected = candidates[0]!;
  for (const candidate of candidates)
    if (
      candidate.yCanonical > selected.yCanonical ||
      (candidate.yCanonical === selected.yCanonical &&
        candidate.xCanonical < selected.xCanonical)
    )
      selected = candidate;
  return {
    ok: true,
    value: {
      id: definition.id,
      kind: "maximum",
      label: definition.label,
      markerHex: definition.markerHex,
      source: selected,
      point: context.map(selected.xCanonical, selected.yCanonical),
      summary: `${definition.label}: ${formatGraphNumber(display(selected.yCanonical, context.yUnit))} ${context.yUnit.expression} at ${formatGraphNumber(display(selected.xCanonical, context.xUnit))} ${context.xUnit.expression}.`,
    },
  };
}

function fit(
  definition: Extract<GraphAnalysisOverlayV1, { kind: "linear-fit" }>,
  series: CartesianDataSeriesV1,
  context: AnalysisContext,
): GraphResult<ResolvedGraphAnalysis> {
  const samples = series.samples.filter(
    (sample) =>
      sample.xCanonical >= (definition.xMinCanonical ?? -Infinity) &&
      sample.xCanonical <= (definition.xMaxCanonical ?? Infinity),
  );
  if (samples.length < 2)
    return {
      ok: false,
      error: {
        kind: "insufficient-analysis-data",
        analysisId: definition.id,
        message: "Linear fit requires at least two samples.",
      },
    };
  const meanX =
    samples.reduce((sum, sample) => sum + sample.xCanonical, 0) /
    samples.length;
  const meanY =
    samples.reduce((sum, sample) => sum + sample.yCanonical, 0) /
    samples.length;
  let covariance = 0;
  let varianceX = 0;
  for (const sample of samples) {
    covariance += (sample.xCanonical - meanX) * (sample.yCanonical - meanY);
    varianceX += (sample.xCanonical - meanX) ** 2;
  }
  if (approximatelyZero(varianceX, DEFAULT_NUMERICS_POLICY))
    return {
      ok: false,
      error: { kind: "singular-linear-fit", analysisId: definition.id },
    };
  const slopeCanonical = covariance / varianceX;
  const interceptCanonical = meanY - slopeCanonical * meanX;
  let residual = 0;
  let total = 0;
  for (const sample of samples) {
    residual +=
      (sample.yCanonical -
        (interceptCanonical + slopeCanonical * sample.xCanonical)) **
      2;
    total += (sample.yCanonical - meanY) ** 2;
  }
  const rSquared = approximatelyZero(total, DEFAULT_NUMERICS_POLICY)
    ? approximatelyZero(residual, DEFAULT_NUMERICS_POLICY)
      ? 1
      : 0
    : 1 - residual / total;
  const x0 = samples[0]!.xCanonical;
  const x1 = samples.at(-1)!.xCanonical;
  const slopeDisplay =
    (slopeCanonical * context.xUnit.scale) / context.yUnit.scale;
  return {
    ok: true,
    value: {
      id: definition.id,
      kind: "linear-fit",
      slopeCanonical,
      interceptCanonical,
      rSquared,
      line: segment(
        source(x0, interceptCanonical + slopeCanonical * x0),
        source(x1, interceptCanonical + slopeCanonical * x1),
        context.map,
      ),
      strokeHex: definition.strokeHex,
      lineWidth: definition.lineWidth,
      summary: `Linear fit gradient ${formatGraphNumber(slopeDisplay)}, R² ${formatGraphNumber(rSquared)}.`,
    },
  };
}

function errorBars(
  definition: Extract<GraphAnalysisOverlayV1, { kind: "error-bars" }>,
  series: CartesianDataSeriesV1,
  context: AnalysisContext,
): GraphResult<ResolvedGraphAnalysis> {
  const segments: ResolvedGraphSegment[] = [];
  let sampleCount = 0;
  for (const sample of series.samples) {
    let included = false;
    if (sample.xUncertaintyCanonical !== undefined) {
      segments.push(
        segment(
          source(
            sample.xCanonical - sample.xUncertaintyCanonical,
            sample.yCanonical,
          ),
          source(
            sample.xCanonical + sample.xUncertaintyCanonical,
            sample.yCanonical,
          ),
          context.map,
        ),
      );
      included = true;
    }
    if (sample.yUncertaintyCanonical !== undefined) {
      segments.push(
        segment(
          source(
            sample.xCanonical,
            sample.yCanonical - sample.yUncertaintyCanonical,
          ),
          source(
            sample.xCanonical,
            sample.yCanonical + sample.yUncertaintyCanonical,
          ),
          context.map,
        ),
      );
      included = true;
    }
    if (included) sampleCount += 1;
  }
  return {
    ok: true,
    value: {
      id: definition.id,
      kind: "error-bars",
      segments,
      strokeHex: definition.strokeHex,
      lineWidth: definition.lineWidth,
      capSize: definition.capSize,
      sampleCount,
      summary:
        sampleCount === 0
          ? "Error bars: no supplied uncertainty."
          : `Error bars for ${sampleCount} samples with supplied uncertainty.`,
    },
  };
}

export function resolveGraphAnalyses(
  context: AnalysisContext,
): GraphResult<readonly ResolvedGraphAnalysis[]> {
  const resolved: ResolvedGraphAnalysis[] = [];
  for (const definition of context.graph.analysisOverlays ?? []) {
    const series = findSeries(context, definition);
    if (!series.ok) return series;
    const result =
      definition.kind === "tangent"
        ? tangent(definition, series.value, context)
        : definition.kind === "area"
          ? area(definition, series.value, context)
          : definition.kind === "maximum"
            ? maximum(definition, series.value, context)
            : definition.kind === "linear-fit"
              ? fit(definition, series.value, context)
              : errorBars(definition, series.value, context);
    if (!result.ok) return result;
    resolved.push(result.value);
  }
  return { ok: true, value: resolved };
}
