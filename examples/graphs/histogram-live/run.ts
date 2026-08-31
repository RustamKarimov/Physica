import { DeterministicIdFactory } from "@physica/core-model";
import {
  createCartesianDataset,
  dataSeriesKey,
  deriveAmplitudeSpectrumDataset,
  deriveHistogramDataset,
} from "@physica/data";
import { createCartesianGraph, resolveCartesianGraph } from "@physica/graphs";
export function runHistogramLive() {
  const ids = new DeterministicIdFactory(2_020_000);
  const observationsKey = dataSeriesKey("observations");
  const signalKey = dataSeriesKey("signal");
  const source = createCartesianDataset({
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
        y: { label: "Voltage", symbol: "V", unitExpression: "V" },
        samples: Array.from({ length: 16 }, (_, index) => ({
          xCanonical: index / 16,
          yCanonical: Math.sin((2 * Math.PI * 2 * index) / 16),
        })),
      },
    ],
    provenance: {
      sourceKind: "measured",
      sourceDescription: "Ruler and voltage probe",
      samplingMethod: "fixed 16 Hz signal",
    },
  });
  if (!source.ok) throw new Error(source.error.kind);
  const histogramKey = dataSeriesKey("histogram.count");
  const histogram = deriveHistogramDataset({
    sourceDataset: source.value,
    sourceSeriesKey: observationsKey,
    outputId: ids.datasetId(),
    outputName: "Observation histogram",
    outputSeriesKey: histogramKey,
    binCount: 4,
    rangeCanonical: [0, 4],
  });
  const spectrumKey = dataSeriesKey("spectrum.amplitude");
  const spectrum = deriveAmplitudeSpectrumDataset({
    sourceDataset: source.value,
    sourceSeriesKey: signalKey,
    outputId: ids.datasetId(),
    outputName: "Probe spectrum",
    outputSeriesKey: spectrumKey,
  });
  if (!histogram.ok || !spectrum.ok)
    throw new Error(
      !histogram.ok
        ? histogram.error.kind
        : spectrum.ok
          ? "unknown"
          : spectrum.error.kind,
    );
  const histogramGraph = createCartesianGraph({
    id: ids.graphId(),
    name: "Observation distribution",
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
        datasetId: histogram.value.dataset.id,
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
  });
  const spectrumGraph = createCartesianGraph({
    id: ids.graphId(),
    name: "Amplitude spectrum",
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
        datasetId: spectrum.value.dataset.id,
        seriesKey: spectrumKey,
        style: { strokeHex: "#ffcf70", lineWidth: 3 },
      },
    ],
    points: [],
    annotations: [],
    cursor: { enabled: false, mode: "nearest" },
  });
  if (!histogramGraph.ok || !spectrumGraph.ok) throw new Error("invalid-graph");
  const viewport = {
    space: "screen-layout" as const,
    x: 0,
    y: 0,
    width: 800,
    height: 440,
    padding: { left: 70, right: 25, top: 25, bottom: 60 },
  };
  const histogramPlan = resolveCartesianGraph({
    graph: histogramGraph.value,
    datasets: [histogram.value.dataset],
    viewport,
  });
  const spectrumPlan = resolveCartesianGraph({
    graph: spectrumGraph.value,
    datasets: [spectrum.value.dataset],
    viewport,
  });
  if (!histogramPlan.ok || !spectrumPlan.ok) throw new Error("resolve-failed");
  const spectrumSamples = spectrum.value.dataset.series[0]!.samples;
  const peak = spectrumSamples.reduce(
    (best, sample) => (sample.yCanonical > best.yCanonical ? sample : best),
    spectrumSamples[0]!,
  );
  return {
    id: "histogram-live",
    histogram: {
      counts: histogram.value.dataset.series[0]!.samples.map(
        (sample) => sample.yCanonical,
      ),
      edgesCanonical: histogram.value.binEdgesCanonical,
      bars: histogramPlan.value.curves[0]!.bars?.length,
      excluded: histogram.value.excludedBelow + histogram.value.excludedAbove,
    },
    spectrum: {
      sampleIntervalSeconds: spectrum.value.sampleIntervalCanonical,
      bins: spectrum.value.frequencyCount,
      peakFrequencyHz: peak.xCanonical,
      peakAmplitudeV: Number(peak.yCanonical.toFixed(12)),
      algorithm: spectrum.value.dataset.series[0]!.metadata?.algorithm,
    },
    provenance: {
      histogram: histogram.value.dataset.provenance.sourceKind,
      spectrum: spectrum.value.dataset.provenance.sourceKind,
    },
    sourceUnchanged:
      source.value.series[0]!.samples.length === 8 &&
      source.value.series[1]!.samples.length === 16,
  };
}
