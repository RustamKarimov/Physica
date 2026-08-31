import { DeterministicIdFactory } from "@physica/core-model";
import { createCartesianDataset, dataSeriesKey } from "@physica/data";
import { createCartesianGraph, resolveCartesianGraph } from "@physica/graphs";

export function runGraphGradient() {
  const ids = new DeterministicIdFactory(2_000_000);
  const key = dataSeriesKey("height");
  const dataset = createCartesianDataset({
    id: ids.datasetId(),
    name: "Sampled height",
    series: [
      {
        key,
        name: "Height",
        x: { label: "Time", symbol: "t", unitExpression: "s" },
        y: { label: "Height", symbol: "h", unitExpression: "m" },
        samples: [0, 1, 2, 3, 4].map((xCanonical, index) => ({
          xCanonical,
          yCanonical: [0, 6, 8, 6, 0][index]!,
        })),
      },
    ],
    provenance: { sourceKind: "measured", sourceDescription: "Video tracker" },
  });
  if (!dataset.ok) throw new Error(dataset.error.kind);
  const graph = createCartesianGraph({
    id: ids.graphId(),
    name: "Height analysis",
    xAxis: {
      label: "Time",
      unitExpression: "s",
      scale: "linear",
      domain: { kind: "manual", minCanonical: 0, maxCanonical: 4 },
      tickTarget: 5,
    },
    yAxis: {
      label: "Height",
      unitExpression: "m",
      scale: "linear",
      domain: { kind: "manual", minCanonical: 0, maxCanonical: 10 },
      tickTarget: 6,
    },
    series: [
      {
        datasetId: dataset.value.id,
        seriesKey: key,
        style: { strokeHex: "#27d3c2", lineWidth: 3 },
      },
    ],
    points: [],
    annotations: [],
    cursor: { enabled: false, mode: "nearest" },
    analysisOverlays: [
      {
        id: "gradient",
        kind: "tangent",
        datasetId: dataset.value.id,
        seriesKey: key,
        xCanonical: 1,
        strokeHex: "#ffcf70",
        lineWidth: 2,
        triangleRunCanonical: 1,
      },
      {
        id: "maximum",
        kind: "maximum",
        datasetId: dataset.value.id,
        seriesKey: key,
        label: "maximum height",
        markerHex: "#ff8c70",
      },
    ],
  });
  if (!graph.ok) throw new Error(graph.error.kind);
  const resolved = resolveCartesianGraph({
    graph: graph.value,
    datasets: [dataset.value],
    viewport: {
      space: "screen-layout",
      x: 0,
      y: 0,
      width: 800,
      height: 440,
      padding: { left: 70, right: 25, top: 25, bottom: 60 },
    },
  });
  if (!resolved.ok) throw new Error(resolved.error.kind);
  const tangent = resolved.value.analyses.find(
    (item) => item.kind === "tangent",
  );
  const maximum = resolved.value.analyses.find(
    (item) => item.kind === "maximum",
  );
  if (tangent?.kind !== "tangent" || maximum?.kind !== "maximum")
    throw new Error("missing-analysis");
  return {
    id: "graph-gradient",
    model: "piecewise-linear",
    tangent: {
      xCanonical: tangent.anchor.xCanonical,
      yCanonical: tangent.anchor.yCanonical,
      slopeCanonical: tangent.slopeCanonical,
      runCanonical: tangent.triangle?.runCanonical,
      riseCanonical: tangent.triangle?.riseCanonical,
    },
    maximum: {
      xCanonical: maximum.source.xCanonical,
      yCanonical: maximum.source.yCanonical,
      label: maximum.label,
    },
    summaries: resolved.value.analyses.map((item) => item.summary),
    frozen: Object.isFrozen(resolved.value.analyses),
  };
}
