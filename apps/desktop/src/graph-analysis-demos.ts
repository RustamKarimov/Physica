import { DeterministicIdFactory } from "@physica/core-model";
import {
  createCartesianDataset,
  dataSeriesKey,
  deriveAmplitudeSpectrumDataset,
  deriveHistogramDataset,
  type DataResult,
} from "@physica/data";
import {
  createCartesianGraph,
  resolveCartesianGraph,
  type GraphResult,
  type ResolvedCartesianGraph,
} from "@physica/graphs";

export interface GraphAnalysisDemo {
  readonly id: "gradient" | "area" | "histogram" | "spectrum";
  readonly title: string;
  readonly eyebrow: string;
  readonly plan: ResolvedCartesianGraph;
  readonly readouts: readonly {
    readonly label: string;
    readonly value: string;
  }[];
}

const viewport = {
  space: "screen-layout" as const,
  x: 0,
  y: 0,
  width: 920,
  height: 500,
  padding: { left: 82, right: 28, top: 34, bottom: 68 },
};
const unwrapData = <T>(result: DataResult<T>): T => {
  if (!result.ok) throw new Error(result.error.kind);
  return result.value;
};
const unwrapGraph = <T>(result: GraphResult<T>): T => {
  if (!result.ok) throw new Error(result.error.kind);
  return result.value;
};

function gradientDemo(ids: DeterministicIdFactory): GraphAnalysisDemo {
  const key = dataSeriesKey("height");
  const dataset = unwrapData(
    createCartesianDataset({
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
      provenance: {
        sourceKind: "measured",
        sourceDescription: "Video tracker",
      },
    }),
  );
  const graph = unwrapGraph(
    createCartesianGraph({
      id: ids.graphId(),
      name: "Gradient and maximum",
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
          datasetId: dataset.id,
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
          datasetId: dataset.id,
          seriesKey: key,
          xCanonical: 1,
          strokeHex: "#ffcf70",
          lineWidth: 2,
          triangleRunCanonical: 1,
        },
        {
          id: "maximum",
          kind: "maximum",
          datasetId: dataset.id,
          seriesKey: key,
          label: "maximum height",
          markerHex: "#ff8c70",
        },
      ],
    }),
  );
  const plan = unwrapGraph(
    resolveCartesianGraph({ graph, datasets: [dataset], viewport }),
  );
  return {
    id: "gradient",
    title: "Read gradient from the curve",
    eyebrow: "TANGENT · TRIANGLE · MAXIMUM",
    plan,
    readouts: [
      { label: "GRADIENT", value: "4 m/s" },
      { label: "TRIANGLE", value: "Δh 4 m / Δt 1 s" },
      { label: "MAXIMUM", value: "8 m at 2 s" },
    ],
  };
}

function areaDemo(ids: DeterministicIdFactory): GraphAnalysisDemo {
  const key = dataSeriesKey("velocity.measured");
  const dataset = unwrapData(
    createCartesianDataset({
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
      provenance: {
        sourceKind: "measured",
        sourceDescription: "Motion sensor",
      },
    }),
  );
  const graph = unwrapGraph(
    createCartesianGraph({
      id: ids.graphId(),
      name: "Area, fit and uncertainty",
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
          datasetId: dataset.id,
          seriesKey: key,
          style: { strokeHex: "#79a7ff", lineWidth: 3 },
        },
      ],
      points: [],
      annotations: [],
      cursor: { enabled: false, mode: "nearest" },
      analysisOverlays: [
        {
          id: "area",
          kind: "area",
          datasetId: dataset.id,
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
          datasetId: dataset.id,
          seriesKey: key,
          strokeHex: "#ffcf70",
          lineWidth: 2,
        },
        {
          id: "uncertainty",
          kind: "error-bars",
          datasetId: dataset.id,
          seriesKey: key,
          strokeHex: "#e9f7f5",
          lineWidth: 1,
          capSize: 6,
        },
      ],
    }),
  );
  const plan = unwrapGraph(
    resolveCartesianGraph({ graph, datasets: [dataset], viewport }),
  );
  return {
    id: "area",
    title: "Measure area with uncertainty visible",
    eyebrow: "AREA · FIT · ERROR BARS",
    plan,
    readouts: [
      { label: "SIGNED AREA", value: "20 m" },
      { label: "LINEAR FIT", value: "v = 1 + 2t" },
      { label: "FIT QUALITY", value: "R² = 1 · unweighted" },
    ],
  };
}

function distributionDemos(
  ids: DeterministicIdFactory,
): readonly GraphAnalysisDemo[] {
  const observationsKey = dataSeriesKey("observations");
  const signalKey = dataSeriesKey("signal");
  const source = unwrapData(
    createCartesianDataset({
      id: ids.datasetId(),
      name: "Lab acquisition",
      series: [
        {
          key: observationsKey,
          name: "Observed length",
          x: { label: "Index", symbol: "i", unitExpression: "" },
          y: { label: "Length", symbol: "l", unitExpression: "m" },
          samples: [0, 0, 1, 1, 1, 2, 3, 4].map((yCanonical, xCanonical) => ({
            xCanonical,
            yCanonical,
          })),
        },
        {
          key: signalKey,
          name: "Probe voltage",
          x: { label: "Time", symbol: "t", unitExpression: "s" },
          y: { label: "Amplitude", symbol: "V", unitExpression: "V" },
          samples: Array.from({ length: 16 }, (_, index) => ({
            xCanonical: index / 16,
            yCanonical: Math.sin((2 * Math.PI * 2 * index) / 16),
          })),
        },
      ],
      provenance: {
        sourceKind: "measured",
        sourceDescription: "Ruler and voltage probe",
      },
    }),
  );
  const histogramKey = dataSeriesKey("histogram.count");
  const histogram = unwrapData(
    deriveHistogramDataset({
      sourceDataset: source,
      sourceSeriesKey: observationsKey,
      outputId: ids.datasetId(),
      outputName: "Histogram",
      outputSeriesKey: histogramKey,
      binCount: 4,
      rangeCanonical: [0, 4],
    }),
  );
  const histogramGraph = unwrapGraph(
    createCartesianGraph({
      id: ids.graphId(),
      name: "Observation histogram",
      xAxis: {
        label: "Length",
        unitExpression: "m",
        scale: "linear",
        domain: { kind: "manual", minCanonical: 0, maxCanonical: 4 },
        tickTarget: 5,
      },
      yAxis: {
        label: "Count",
        unitExpression: "",
        scale: "linear",
        domain: { kind: "manual", minCanonical: 0, maxCanonical: 4 },
        tickTarget: 5,
      },
      series: [
        {
          datasetId: histogram.dataset.id,
          seriesKey: histogramKey,
          style: {
            strokeHex: "#27d3c2",
            fillHex: "#27d3c2",
            lineWidth: 1,
            renderMode: "bars",
            barWidthCanonical: 1,
          },
        },
      ],
      points: [],
      annotations: [],
      cursor: { enabled: false, mode: "nearest" },
    }),
  );
  const spectrumKey = dataSeriesKey("spectrum.amplitude");
  const spectrum = unwrapData(
    deriveAmplitudeSpectrumDataset({
      sourceDataset: source,
      sourceSeriesKey: signalKey,
      outputId: ids.datasetId(),
      outputName: "Spectrum",
      outputSeriesKey: spectrumKey,
    }),
  );
  const spectrumGraph = unwrapGraph(
    createCartesianGraph({
      id: ids.graphId(),
      name: "One-sided amplitude spectrum",
      xAxis: {
        label: "Frequency",
        unitExpression: "Hz",
        scale: "linear",
        domain: { kind: "manual", minCanonical: 0, maxCanonical: 8 },
        tickTarget: 5,
      },
      yAxis: {
        label: "Amplitude",
        unitExpression: "V",
        scale: "linear",
        domain: { kind: "manual", minCanonical: 0, maxCanonical: 1.2 },
        tickTarget: 4,
      },
      series: [
        {
          datasetId: spectrum.dataset.id,
          seriesKey: spectrumKey,
          style: { strokeHex: "#ffcf70", lineWidth: 3 },
        },
      ],
      points: [],
      annotations: [
        { id: "peak", text: "2 Hz peak", xCanonical: 2, yCanonical: 1 },
      ],
      cursor: { enabled: false, mode: "nearest" },
    }),
  );
  return [
    {
      id: "histogram",
      title: "Count a distribution",
      eyebrow: "4 BINS · FINAL EDGE INCLUDED",
      plan: unwrapGraph(
        resolveCartesianGraph({
          graph: histogramGraph,
          datasets: [histogram.dataset],
          viewport,
        }),
      ),
      readouts: [
        { label: "COUNTS", value: "2 · 3 · 1 · 2" },
        { label: "EXCLUDED", value: "0 samples" },
        { label: "PROVENANCE", value: "derived / immutable" },
      ],
    },
    {
      id: "spectrum",
      title: "Resolve frequency content",
      eyebrow: "DIRECT DFT · ONE-SIDED AMPLITUDE",
      plan: unwrapGraph(
        resolveCartesianGraph({
          graph: spectrumGraph,
          datasets: [spectrum.dataset],
          viewport,
        }),
      ),
      readouts: [
        { label: "PEAK", value: "2 Hz" },
        { label: "AMPLITUDE", value: "1 V" },
        { label: "SAMPLING", value: "16 Hz · 16 samples" },
      ],
    },
  ];
}

const ids = new DeterministicIdFactory(2_030_000);
export const graphAnalysisDemos: readonly GraphAnalysisDemo[] = Object.freeze([
  gradientDemo(ids),
  areaDemo(ids),
  ...distributionDemos(ids),
]);
