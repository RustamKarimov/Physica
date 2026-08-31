import { DeterministicIdFactory } from "@physica/core-model";
import { createCartesianDataset, dataSeriesKey } from "@physica/data";
import { createCartesianGraph, resolveCartesianGraph } from "@physica/graphs";
export function runGraphArea() {
  const ids = new DeterministicIdFactory(2_010_000);
  const key = dataSeriesKey("velocity.measured");
  const dataset = createCartesianDataset({
    id: ids.datasetId(),
    name: "Measured velocity",
    series: [
      {
        key,
        name: "Velocity",
        x: { label: "Time", symbol: "t", unitExpression: "s" },
        y: { label: "Velocity", symbol: "v", unitExpression: "m/s" },
        samples: [0, 1, 2, 3, 4].map((xCanonical) => ({
          xCanonical,
          yCanonical: 1 + 2 * xCanonical,
          xUncertaintyCanonical: 0.05,
          yUncertaintyCanonical: 0.2,
        })),
      },
    ],
    provenance: { sourceKind: "measured", sourceDescription: "Motion sensor" },
  });
  if (!dataset.ok) throw new Error(dataset.error.kind);
  const graph = createCartesianGraph({
    id: ids.graphId(),
    name: "Velocity evidence",
    xAxis: {
      label: "Time",
      unitExpression: "s",
      scale: "linear",
      domain: { kind: "manual", minCanonical: 0, maxCanonical: 4 },
      tickTarget: 5,
    },
    yAxis: {
      label: "Velocity",
      unitExpression: "m/s",
      scale: "linear",
      domain: { kind: "manual", minCanonical: 0, maxCanonical: 10 },
      tickTarget: 6,
    },
    series: [
      {
        datasetId: dataset.value.id,
        seriesKey: key,
        style: { strokeHex: "#79a7ff", lineWidth: 3 },
      },
    ],
    points: [],
    annotations: [],
    cursor: { enabled: false, mode: "nearest" },
    analysisOverlays: [
      {
        id: "displacement",
        kind: "area",
        datasetId: dataset.value.id,
        seriesKey: key,
        xMinCanonical: 0,
        xMaxCanonical: 4,
        baselineCanonical: 0,
        fillHex: "#27d3c2",
        opacity: 0.24,
      },
      {
        id: "fit",
        kind: "linear-fit",
        datasetId: dataset.value.id,
        seriesKey: key,
        strokeHex: "#ffcf70",
        lineWidth: 2,
      },
      {
        id: "uncertainty",
        kind: "error-bars",
        datasetId: dataset.value.id,
        seriesKey: key,
        strokeHex: "#e9f7f5",
        lineWidth: 1,
        capSize: 5,
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
  const area = resolved.value.analyses.find((item) => item.kind === "area");
  const fit = resolved.value.analyses.find(
    (item) => item.kind === "linear-fit",
  );
  const bars = resolved.value.analyses.find(
    (item) => item.kind === "error-bars",
  );
  if (
    area?.kind !== "area" ||
    fit?.kind !== "linear-fit" ||
    bars?.kind !== "error-bars"
  )
    throw new Error("missing-analysis");
  return {
    id: "graph-area",
    area: {
      signedCanonical: area.signedAreaCanonical,
      display: area.displayArea,
      unit: area.displayUnitExpression,
    },
    fit: {
      slopeCanonical: fit.slopeCanonical,
      interceptCanonical: fit.interceptCanonical,
      rSquared: fit.rSquared,
      weighting: "unweighted",
    },
    uncertainty: {
      sampleCount: bars.sampleCount,
      segmentCount: bars.segments.length,
      xCanonical: 0.05,
      yCanonical: 0.2,
    },
    summaries: resolved.value.analyses.map((item) => item.summary),
    immutable:
      Object.isFrozen(dataset.value) && Object.isFrozen(resolved.value),
  };
}
