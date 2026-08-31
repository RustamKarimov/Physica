import { DeterministicIdFactory, type ObservableId } from "@physica/core-model";
import {
  createCartesianDataset,
  dataSeriesKey,
  sampleAcquisitionWindow,
  type CartesianDatasetV1,
  type DataResult,
} from "@physica/data";
import {
  createCartesianGraph,
  resolveCartesianGraph,
  type CartesianGraphV1,
  type GraphResult,
  type ResolvedCartesianGraph,
} from "@physica/graphs";

function unwrapData<T>(result: DataResult<T>): T {
  if (!result.ok) throw new Error(`Graph demo data: ${result.error.kind}`);
  return result.value;
}

function unwrapGraph<T>(result: GraphResult<T>): T {
  if (!result.ok) throw new Error(`Graph demo layout: ${result.error.kind}`);
  return result.value;
}

const viewport = {
  space: "screen-layout" as const,
  x: 0,
  y: 0,
  width: 920,
  height: 500,
  padding: { left: 82, right: 28, top: 34, bottom: 68 },
};

function createBasicFixture(): {
  readonly dataset: CartesianDatasetV1;
  readonly graph: CartesianGraphV1;
} {
  const ids = new DeterministicIdFactory(1_920_000);
  const measured = dataSeriesKey("displacement.measured");
  const model = dataSeriesKey("displacement.model");
  const dataset = unwrapData(
    createCartesianDataset({
      id: ids.datasetId(),
      name: "Trolley displacement",
      series: [
        {
          key: measured,
          name: "Measured",
          x: { label: "Time", symbol: "t", unitExpression: "s" },
          y: { label: "Displacement", symbol: "s", unitExpression: "m" },
          samples: [0, 1, 2, 3, 4, 5].map((x, index) => ({
            xCanonical: x,
            yCanonical: [0, 1.8, 4.2, 7.1, 10.3, 14][index]!,
          })),
        },
        {
          key: model,
          name: "Constant-acceleration model",
          x: { label: "Time", symbol: "t", unitExpression: "s" },
          y: { label: "Displacement", symbol: "s", unitExpression: "m" },
          samples: [0, 1, 2, 3, 4, 5].map((x) => ({
            xCanonical: x,
            yCanonical: 1.5 * x + 0.25 * x * x,
          })),
        },
      ],
      provenance: {
        sourceKind: "measured",
        sourceDescription: "Photogate observations and fitted model",
      },
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
          seriesKey: measured,
          style: { strokeHex: "#27d3c2", lineWidth: 3 },
        },
        {
          datasetId: dataset.id,
          seriesKey: model,
          style: { strokeHex: "#ffb454", lineWidth: 3, dash: [9, 6] },
        },
      ],
      points: [
        {
          id: "observed-four",
          datasetId: dataset.id,
          seriesKey: measured,
          sampleIndex: 4,
          label: "observed 10.3 m",
          radius: 5,
        },
      ],
      annotations: [
        {
          id: "gradient",
          text: "increasing gradient",
          xCanonical: 3.1,
          yCanonical: 12.3,
        },
      ],
      cursor: { enabled: false, mode: "nearest" },
    }),
  );
  return { dataset, graph };
}

function createLiveFixture(): {
  readonly dataset: CartesianDatasetV1;
  readonly graph: CartesianGraphV1;
} {
  const ids = new DeterministicIdFactory(1_930_000);
  const key = dataSeriesKey("velocity.live");
  const clockId = ids.clockId();
  const observableId = "mechanics:trolley.velocity" as ObservableId;
  const acquisition = unwrapData(
    sampleAcquisitionWindow(
      {
        sourceObservableId: observableId,
        clockId,
        targetSeriesKey: key,
        startTimeSeconds: 0,
        sampleIntervalSeconds: 0.5,
      },
      -1,
      5,
      (timeSeconds) => 1 + 2 * timeSeconds,
    ),
  );
  const dataset = unwrapData(
    createCartesianDataset({
      id: ids.datasetId(),
      name: "Live trolley velocity",
      series: [
        {
          key,
          name: "Velocity",
          x: { label: "Time", symbol: "t", unitExpression: "s" },
          y: { label: "Velocity", symbol: "v", unitExpression: "m/s" },
          samples: acquisition.samples,
        },
      ],
      provenance: {
        sourceKind: "simulated",
        sourceDescription: "Deterministic trolley velocity observable",
        clockId,
        observableId,
        samplingMethod: "fixed interval 0.5 s",
      },
    }),
  );
  const graph = unwrapGraph(
    createCartesianGraph({
      id: ids.graphId(),
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
          seriesKey: key,
          style: { strokeHex: "#79a7ff", lineWidth: 3 },
        },
      ],
      points: [],
      annotations: [
        {
          id: "acceleration",
          text: "constant acceleration = 2 m/s²",
          xCanonical: 3.1,
          yCanonical: 10.4,
        },
      ],
      cursor: { enabled: true, mode: "linear-interpolation" },
    }),
  );
  return { dataset, graph };
}

const basicFixture = createBasicFixture();
const liveFixture = createLiveFixture();

export function resolveBasicGraphDemo(): ResolvedCartesianGraph {
  return unwrapGraph(
    resolveCartesianGraph({
      graph: basicFixture.graph,
      datasets: [basicFixture.dataset],
      viewport,
    }),
  );
}

export function resolveLiveGraphDemo(
  cursorTimeSeconds: number,
): ResolvedCartesianGraph {
  return unwrapGraph(
    resolveCartesianGraph({
      graph: liveFixture.graph,
      datasets: [liveFixture.dataset],
      viewport,
      cursorXCanonical: cursorTimeSeconds,
    }),
  );
}

export const graphDemoEvidence = Object.freeze({
  liveSampleCount: liveFixture.dataset.series[0]!.samples.length,
  liveSamplingMethod: liveFixture.dataset.provenance.samplingMethod,
  basicSeriesCount: basicFixture.dataset.series.length,
  basicDatasetFrozen: Object.isFrozen(basicFixture.dataset),
});
