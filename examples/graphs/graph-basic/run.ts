import { DeterministicIdFactory } from "@physica/core-model";
import {
  createCartesianDataset,
  dataSeriesKey,
  parseCartesianDatasetDefinition,
  toCartesianDatasetDefinition,
  type DataResult,
} from "@physica/data";
import {
  createCartesianGraph,
  parseCartesianGraphDefinition,
  resolveCartesianGraph,
  toCartesianGraphDefinition,
  type GraphResult,
} from "@physica/graphs";

function unwrapData<T>(result: DataResult<T>): T {
  if (!result.ok) throw new Error(result.error.kind);
  return result.value;
}

function unwrapGraph<T>(result: GraphResult<T>): T {
  if (!result.ok) throw new Error(result.error.kind);
  return result.value;
}

const compactPoint = (point: { readonly x: number; readonly y: number }) => ({
  x: Number(point.x.toFixed(2)),
  y: Number(point.y.toFixed(2)),
});

export function runGraphBasic() {
  const ids = new DeterministicIdFactory(1_900_000);
  const measuredKey = dataSeriesKey("displacement.measured");
  const modelKey = dataSeriesKey("displacement.model");
  const dataset = unwrapData(
    createCartesianDataset({
      id: ids.datasetId(),
      name: "Trolley displacement",
      series: [
        {
          key: measuredKey,
          name: "Measured",
          x: { label: "Time", symbol: "t", unitExpression: "s" },
          y: { label: "Displacement", symbol: "s", unitExpression: "m" },
          samples: [
            { xCanonical: 0, yCanonical: 0 },
            { xCanonical: 1, yCanonical: 1.8 },
            { xCanonical: 2, yCanonical: 4.2 },
            { xCanonical: 3, yCanonical: 7.1 },
            { xCanonical: 4, yCanonical: 10.3 },
            { xCanonical: 5, yCanonical: 14 },
          ],
        },
        {
          key: modelKey,
          name: "Constant-acceleration model",
          x: { label: "Time", symbol: "t", unitExpression: "s" },
          y: { label: "Displacement", symbol: "s", unitExpression: "m" },
          samples: [
            { xCanonical: 0, yCanonical: 0 },
            { xCanonical: 1, yCanonical: 1.75 },
            { xCanonical: 2, yCanonical: 4 },
            { xCanonical: 3, yCanonical: 6.75 },
            { xCanonical: 4, yCanonical: 10 },
            { xCanonical: 5, yCanonical: 13.75 },
          ],
        },
      ],
      provenance: {
        sourceKind: "measured",
        sourceDescription:
          "Photogate observations with a derived comparison model",
        transformations: ["SI canonicalisation", "constant-acceleration fit"],
      },
      metadata: { gallery: "graph-basic" },
    }),
  );
  const graph = unwrapGraph(
    createCartesianGraph({
      id: ids.graphId(),
      name: "Trolley displacement–time",
      xAxis: {
        label: "Time",
        unitExpression: "s",
        scale: "linear",
        domain: { kind: "manual", minCanonical: 0, maxCanonical: 5 },
        tickTarget: 6,
      },
      yAxis: {
        label: "Displacement",
        unitExpression: "m",
        scale: "linear",
        domain: { kind: "manual", minCanonical: 0, maxCanonical: 15 },
        tickTarget: 6,
      },
      series: [
        {
          datasetId: dataset.id,
          seriesKey: measuredKey,
          style: { strokeHex: "#27d3c2", lineWidth: 3 },
        },
        {
          datasetId: dataset.id,
          seriesKey: modelKey,
          style: { strokeHex: "#ffb454", lineWidth: 3, dash: [9, 6] },
        },
      ],
      points: [
        {
          id: "observation-four",
          datasetId: dataset.id,
          seriesKey: measuredKey,
          sampleIndex: 4,
          label: "observed 10.3 m",
          radius: 5,
        },
      ],
      annotations: [
        {
          id: "acceleration-note",
          text: "increasing gradient",
          xCanonical: 3.2,
          yCanonical: 12.2,
        },
      ],
      cursor: { enabled: false, mode: "nearest" },
      metadata: { gallery: "graph-basic" },
    }),
  );
  const resolved = unwrapGraph(
    resolveCartesianGraph({
      graph,
      datasets: [dataset],
      viewport: {
        space: "screen-layout",
        x: 0,
        y: 0,
        width: 960,
        height: 540,
        padding: { left: 86, right: 30, top: 34, bottom: 72 },
      },
    }),
  );
  const datasetDefinition = unwrapData(toCartesianDatasetDefinition(dataset));
  const graphDefinition = unwrapGraph(toCartesianGraphDefinition(graph));
  const restoredDataset = unwrapData(
    parseCartesianDatasetDefinition(
      JSON.parse(JSON.stringify(datasetDefinition)),
    ),
  );
  const restoredGraph = unwrapGraph(
    parseCartesianGraphDefinition(JSON.parse(JSON.stringify(graphDefinition))),
  );

  return {
    id: "graph-basic",
    axes: {
      x: resolved.xAxisLabel,
      y: resolved.yAxisLabel,
      xDomain: resolved.xDomain,
      yDomain: resolved.yDomain,
      xTicks: resolved.xTicks.map((tick) => tick.label),
      yTicks: resolved.yTicks.map((tick) => tick.label),
    },
    curves: resolved.curves.map((curve) => ({
      name: curve.name,
      samples: curve.source.length,
      line: curve.style.dash ? "dashed" : "solid",
      first: compactPoint(curve.points[0]!),
      last: compactPoint(curve.points.at(-1)!),
    })),
    marker: {
      label: resolved.points[0]!.label,
      source: resolved.points[0]!.source,
      point: compactPoint(resolved.points[0]!.point),
    },
    annotation: resolved.annotations[0]!.text,
    persistence: {
      datasetTypeId: datasetDefinition.datasetTypeId,
      graphTypeId: graphDefinition.typeId,
      datasetRoundTrip:
        JSON.stringify(restoredDataset) === JSON.stringify(dataset),
      graphRoundTrip: JSON.stringify(restoredGraph) === JSON.stringify(graph),
    },
    immutable: Object.isFrozen(resolved.curves[0]!.points),
    accessibilitySummary: resolved.accessibilitySummary,
  };
}
