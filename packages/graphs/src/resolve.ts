import {
  type CartesianDataSeriesV1,
  type CartesianDatasetV1,
} from "@physica/data";
import {
  createDefaultUnitRegistry,
  equalDimensions,
  type DefaultUnitRegistry,
} from "@physica/units";
import { freezeDeep } from "./internal";
import { resolveGraphAnalyses } from "./analysis";
import { createCartesianGraph } from "./model";
import {
  displayValue,
  formatGraphNumber,
  resolveDomain,
  resolveTicks,
  scaleRatio,
} from "./scales";
import type {
  CartesianGraphV1,
  GraphDataCoordinate,
  GraphLayoutCoordinate,
  GraphResult,
  ResolveCartesianGraphInput,
  ResolvedCartesianGraph,
} from "./types";

const layout = (x: number, y: number): GraphLayoutCoordinate => ({
  space: "screen-layout",
  x,
  y,
});
const source = (
  xCanonical: number,
  yCanonical: number,
): GraphDataCoordinate => ({ space: "graph-data", xCanonical, yCanonical });

function findSeries(
  datasets: readonly CartesianDatasetV1[],
  datasetId: string,
  seriesKey: string,
): GraphResult<CartesianDataSeriesV1> {
  const dataset = datasets.find((item) => item.id === datasetId);
  if (!dataset)
    return {
      ok: false,
      error: {
        kind: "missing-dataset",
        datasetId: datasetId as CartesianDatasetV1["id"],
      },
    };
  const series = dataset.series.find((item) => item.key === seriesKey);
  return series
    ? { ok: true, value: series }
    : {
        ok: false,
        error: {
          kind: "missing-series",
          datasetId: dataset.id,
          seriesKey: seriesKey as CartesianDataSeriesV1["key"],
        },
      };
}

function cursorY(
  series: CartesianDataSeriesV1,
  x: number,
  mode: CartesianGraphV1["cursor"]["mode"],
): number | undefined {
  const exact = series.samples
    .filter((sample) => sample.xCanonical === x)
    .at(-1);
  if (exact) return exact.yCanonical;
  if (mode === "nearest") {
    let best = series.samples[0];
    let distance = Infinity;
    for (const sample of series.samples) {
      const next = Math.abs(sample.xCanonical - x);
      if (next < distance) {
        best = sample;
        distance = next;
      }
    }
    return best?.yCanonical;
  }
  const right = series.samples.findIndex((sample) => sample.xCanonical > x);
  if (right <= 0) return undefined;
  const a = series.samples[right - 1]!;
  const b = series.samples[right]!;
  const ratio = (x - a.xCanonical) / (b.xCanonical - a.xCanonical);
  return a.yCanonical + ratio * (b.yCanonical - a.yCanonical);
}

export function resolveCartesianGraph(
  input: ResolveCartesianGraphInput,
  registry: DefaultUnitRegistry = createDefaultUnitRegistry(),
): GraphResult<ResolvedCartesianGraph> {
  const graph = createCartesianGraph(input.graph, registry);
  if (!graph.ok) return graph;
  const viewport = input.viewport;
  const finite = [
    viewport.x,
    viewport.y,
    viewport.width,
    viewport.height,
    viewport.padding.left,
    viewport.padding.right,
    viewport.padding.top,
    viewport.padding.bottom,
  ].every(Number.isFinite);
  if (
    viewport.space !== "screen-layout" ||
    !finite ||
    viewport.width <= 0 ||
    viewport.height <= 0
  )
    return {
      ok: false,
      error: {
        kind: "invalid-graph",
        path: "$.viewport",
        message: "Viewport must be finite and positive.",
      },
    };
  const plotRect = {
    x: viewport.x + viewport.padding.left,
    y: viewport.y + viewport.padding.top,
    width: viewport.width - viewport.padding.left - viewport.padding.right,
    height: viewport.height - viewport.padding.top - viewport.padding.bottom,
  };
  if (plotRect.width <= 0 || plotRect.height <= 0)
    return {
      ok: false,
      error: {
        kind: "invalid-graph",
        path: "$.viewport.padding",
        message: "Padding leaves no plot area.",
      },
    };
  const xUnit = registry.parse(graph.value.xAxis.unitExpression);
  const yUnit = registry.parse(graph.value.yAxis.unitExpression);
  if (!xUnit.ok || !yUnit.ok)
    return {
      ok: false,
      error: {
        kind: "invalid-unit",
        path: "$.axis",
        message: "Axis unit parsing failed.",
      },
    };
  const resolved: {
    binding: CartesianGraphV1["series"][number];
    series: CartesianDataSeriesV1;
  }[] = [];
  for (const binding of graph.value.series) {
    const found = findSeries(
      input.datasets,
      binding.datasetId,
      binding.seriesKey,
    );
    if (!found.ok) return found;
    const dataX = registry.parse(found.value.x.unitExpression);
    const dataY = registry.parse(found.value.y.unitExpression);
    if (
      !dataX.ok ||
      !equalDimensions(dataX.value.dimension, xUnit.value.dimension) ||
      dataX.value.semanticKind !== xUnit.value.semanticKind
    )
      return {
        ok: false,
        error: {
          kind: "incompatible-axis-unit",
          axis: "x",
          seriesKey: binding.seriesKey,
        },
      };
    if (
      !dataY.ok ||
      !equalDimensions(dataY.value.dimension, yUnit.value.dimension) ||
      dataY.value.semanticKind !== yUnit.value.semanticKind
    )
      return {
        ok: false,
        error: {
          kind: "incompatible-axis-unit",
          axis: "y",
          seriesKey: binding.seriesKey,
        },
      };
    resolved.push({ binding, series: found.value });
  }
  const samples = resolved.flatMap((item) => item.series.samples);
  if (
    graph.value.yAxis.scale === "log10" &&
    resolved.some((item) => item.binding.style.renderMode === "bars")
  )
    return {
      ok: false,
      error: {
        kind: "invalid-graph",
        path: "$.series.style.renderMode",
        message: "Histogram bars require a linear y axis.",
      },
    };
  const xDomain = resolveDomain(
    graph.value.xAxis,
    [
      ...samples.map((item) => item.xCanonical),
      ...graph.value.annotations.map((item) => item.xCanonical),
    ],
    "x",
  );
  if (!xDomain.ok) return xDomain;
  const yDomain = resolveDomain(
    graph.value.yAxis,
    [
      ...samples.map((item) => item.yCanonical),
      ...graph.value.annotations.map((item) => item.yCanonical),
    ],
    "y",
  );
  if (!yDomain.ok) return yDomain;
  const map = (x: number, y: number) =>
    layout(
      plotRect.x +
        scaleRatio(x, xDomain.value, graph.value.xAxis.scale) * plotRect.width,
      plotRect.y +
        (1 - scaleRatio(y, yDomain.value, graph.value.yAxis.scale)) *
          plotRect.height,
    );
  const curves = resolved.map(({ binding, series }) => {
    const bars =
      binding.style.renderMode === "bars" &&
      binding.style.barWidthCanonical !== undefined
        ? series.samples.map((item) => {
            const half = binding.style.barWidthCanonical! / 2;
            const cornerA = map(item.xCanonical - half, 0);
            const cornerB = map(item.xCanonical + half, item.yCanonical);
            return {
              source: {
                xMinCanonical: item.xCanonical - half,
                xMaxCanonical: item.xCanonical + half,
                yCanonical: item.yCanonical,
                baselineCanonical: 0,
              },
              rect: {
                x: Math.min(cornerA.x, cornerB.x),
                y: Math.min(cornerA.y, cornerB.y),
                width: Math.abs(cornerB.x - cornerA.x),
                height: Math.abs(cornerB.y - cornerA.y),
              },
            };
          })
        : undefined;
    return {
      datasetId: binding.datasetId,
      seriesKey: binding.seriesKey,
      name: series.name,
      style: binding.style,
      source: series.samples.map((item) =>
        source(item.xCanonical, item.yCanonical),
      ),
      points: series.samples.map((item) =>
        map(item.xCanonical, item.yCanonical),
      ),
      ...(bars ? { bars } : {}),
    };
  });
  const points = [];
  for (const marker of graph.value.points) {
    const found = findSeries(
      input.datasets,
      marker.datasetId,
      marker.seriesKey,
    );
    if (!found.ok) return found;
    const sample = found.value.samples[marker.sampleIndex];
    if (!sample)
      return {
        ok: false,
        error: {
          kind: "invalid-marker",
          markerId: marker.id,
          message: "Sample index is outside the series.",
        },
      };
    points.push({
      id: marker.id,
      label: marker.label,
      radius: marker.radius,
      source: source(sample.xCanonical, sample.yCanonical),
      point: map(sample.xCanonical, sample.yCanonical),
    });
  }
  const annotations = graph.value.annotations.map((item) => ({
    id: item.id,
    text: item.text,
    source: source(item.xCanonical, item.yCanonical),
    point: map(item.xCanonical, item.yCanonical),
  }));
  const analyses = resolveGraphAnalyses({
    graph: graph.value,
    datasets: input.datasets,
    xDomain: xDomain.value,
    yDomain: yDomain.value,
    xUnit: xUnit.value,
    yUnit: yUnit.value,
    map,
  });
  if (!analyses.ok) return analyses;
  let cursor: ResolvedCartesianGraph["cursor"];
  const cursorX = input.cursorXCanonical;
  if (
    graph.value.cursor.enabled &&
    cursorX !== undefined &&
    Number.isFinite(cursorX) &&
    cursorX >= xDomain.value[0] &&
    cursorX <= xDomain.value[1]
  ) {
    const readouts = resolved.flatMap(({ binding, series }) => {
      const y = cursorY(series, cursorX, graph.value.cursor.mode);
      return y === undefined
        ? []
        : [
            {
              datasetId: binding.datasetId,
              seriesKey: binding.seriesKey,
              seriesName: series.name,
              xCanonical: cursorX,
              yCanonical: y,
              xDisplay: formatGraphNumber(displayValue(cursorX, xUnit.value)),
              yDisplay: formatGraphNumber(displayValue(y, yUnit.value)),
              point: map(cursorX, y),
            },
          ];
    });
    cursor = {
      xCanonical: cursorX,
      xDisplay: formatGraphNumber(displayValue(cursorX, xUnit.value)),
      x: map(cursorX, yDomain.value[0]).x,
      readouts,
    };
  }
  const xAxisLabel = `${graph.value.xAxis.label}${xUnit.value.expression ? ` (${xUnit.value.expression})` : ""}`;
  const yAxisLabel = `${graph.value.yAxis.label}${yUnit.value.expression ? ` (${yUnit.value.expression})` : ""}`;
  const result: ResolvedCartesianGraph = {
    name: graph.value.name,
    viewport: { ...viewport, padding: { ...viewport.padding } },
    plotRect,
    xDomain: xDomain.value,
    yDomain: yDomain.value,
    xAxisLabel,
    yAxisLabel,
    xTicks: resolveTicks(
      graph.value.xAxis,
      xDomain.value,
      xUnit.value,
      (ratio) =>
        layout(
          plotRect.x + ratio * plotRect.width,
          plotRect.y + plotRect.height,
        ),
    ),
    yTicks: resolveTicks(
      graph.value.yAxis,
      yDomain.value,
      yUnit.value,
      (ratio) => layout(plotRect.x, plotRect.y + (1 - ratio) * plotRect.height),
    ),
    curves,
    points,
    annotations,
    analyses: analyses.value,
    ...(cursor ? { cursor } : {}),
    accessibilitySummary: `${graph.value.name}. ${curves.length} series${analyses.value.length > 0 ? ` and ${analyses.value.length} analyses` : ""}. X axis ${xAxisLabel}; Y axis ${yAxisLabel}.`,
  };
  return { ok: true, value: freezeDeep(result) };
}
