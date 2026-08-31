import { DeterministicIdFactory, type ObservableId } from "@physica/core-model";
import {
  createCartesianDataset,
  dataSeriesKey,
  sampleAcquisitionWindow,
  type DataResult,
} from "@physica/data";
import {
  createCartesianGraph,
  resolveCartesianGraph,
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

export function runGraphLiveCursor() {
  const coarseIds = new DeterministicIdFactory(1_910_000);
  const seriesKey = dataSeriesKey("velocity.live");
  const binding = {
    sourceObservableId: "mechanics:trolley.velocity" as ObservableId,
    clockId: coarseIds.clockId(),
    targetSeriesKey: seriesKey,
    startTimeSeconds: 0,
    sampleIntervalSeconds: 0.5,
  };
  const evaluateVelocity = (timeSeconds: number) => 1 + 2 * timeSeconds;
  const coarse = unwrapData(
    sampleAcquisitionWindow(binding, -1, 5, evaluateVelocity),
  );
  const fineSamples = [];
  let lastIndex = -1;
  for (const targetTime of [1, 2.5, 3, 5]) {
    const window = unwrapData(
      sampleAcquisitionWindow(binding, lastIndex, targetTime, evaluateVelocity),
    );
    fineSamples.push(...window.samples);
    lastIndex = window.lastSampleIndex;
  }
  const dataset = unwrapData(
    createCartesianDataset({
      id: coarseIds.datasetId(),
      name: "Live trolley velocity",
      series: [
        {
          key: seriesKey,
          name: "Velocity",
          x: { label: "Time", symbol: "t", unitExpression: "s" },
          y: { label: "Velocity", symbol: "v", unitExpression: "m/s" },
          samples: coarse.samples,
        },
      ],
      provenance: {
        sourceKind: "simulated",
        sourceDescription: "Deterministic trolley velocity observable",
        clockId: binding.clockId,
        observableId: binding.sourceObservableId,
        samplingMethod: "fixed interval 0.5 s",
      },
      metadata: { gallery: "graph-live-cursor" },
    }),
  );
  const graph = unwrapGraph(
    createCartesianGraph({
      id: coarseIds.graphId(),
      name: "Live velocity–time",
      xAxis: {
        label: "Time",
        unitExpression: "s",
        scale: "linear",
        domain: { kind: "manual", minCanonical: 0, maxCanonical: 5 },
        tickTarget: 6,
      },
      yAxis: {
        label: "Velocity",
        unitExpression: "m/s",
        scale: "linear",
        domain: { kind: "manual", minCanonical: 0, maxCanonical: 12 },
        tickTarget: 7,
      },
      series: [
        {
          datasetId: dataset.id,
          seriesKey,
          style: { strokeHex: "#79a7ff", lineWidth: 3 },
        },
      ],
      points: [],
      annotations: [
        {
          id: "gradient",
          text: "constant acceleration = 2 m/s²",
          xCanonical: 3.2,
          yCanonical: 9.5,
        },
      ],
      cursor: { enabled: true, mode: "linear-interpolation" },
      metadata: { gallery: "graph-live-cursor" },
    }),
  );
  const cursorTime = 2.25;
  const before = JSON.stringify(dataset);
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
      cursorXCanonical: cursorTime,
    }),
  );
  const readout = resolved.cursor!.readouts[0]!;

  return {
    id: "graph-live-cursor",
    acquisition: {
      clockId: binding.clockId,
      observableId: binding.sourceObservableId,
      intervalSeconds: binding.sampleIntervalSeconds,
      sampleCount: coarse.samples.length,
      sampleTimes: coarse.samples.map((sample) => sample.xCanonical),
      windowIndependent:
        JSON.stringify(fineSamples) === JSON.stringify(coarse.samples),
    },
    cursor: {
      mode: graph.cursor.mode,
      xCanonical: resolved.cursor!.xCanonical,
      xDisplay: resolved.cursor!.xDisplay + " s",
      yCanonical: readout.yCanonical,
      yDisplay: readout.yDisplay + " m/s",
      screen: {
        x: Number(readout.point.x.toFixed(2)),
        y: Number(readout.point.y.toFixed(2)),
      },
    },
    presentationOnly: JSON.stringify(dataset) === before,
    accessibilitySummary: resolved.accessibilitySummary,
  };
}
