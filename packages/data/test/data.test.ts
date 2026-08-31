import { describe, expect, it } from "vitest";
import {
  DeterministicIdFactory,
  registeredTypeId,
  type ObservableId,
} from "@physica/core-model";
import {
  createCartesianDataset,
  dataSeriesKey,
  deriveAmplitudeSpectrumDataset,
  deriveHistogramDataset,
  parseCartesianDatasetDefinition,
  sampleAcquisitionWindow,
  toCartesianDatasetDefinition,
} from "../src/index";

const ids = new DeterministicIdFactory(1_700_000);

function dataset() {
  return createCartesianDataset({
    id: ids.datasetId(),
    name: "Displacement data",
    series: [
      {
        key: dataSeriesKey("measured"),
        name: "Measured",
        x: { label: "Time", symbol: "t", unitExpression: "s" },
        y: { label: "Displacement", symbol: "s", unitExpression: "m" },
        samples: [
          { xCanonical: 0, yCanonical: 0, yUncertaintyCanonical: 0.1 },
          { xCanonical: 1, yCanonical: 2 },
          { xCanonical: 1, yCanonical: 2.1 },
        ],
      },
    ],
    provenance: {
      sourceKind: "measured",
      sourceDescription: "Photogate export",
    },
  });
}

describe("Cartesian dataset V1", () => {
  it("round-trips finite unit-aware series with provenance", () => {
    const model = dataset();
    expect(model.ok).toBe(true);
    if (!model.ok) return;
    const envelope = toCartesianDatasetDefinition(model.value);
    expect(envelope.ok).toBe(true);
    if (!envelope.ok) return;
    const parsed = parseCartesianDatasetDefinition(
      JSON.parse(JSON.stringify(envelope.value)),
    );
    expect(parsed).toEqual(model);
    expect(
      Object.isFrozen(parsed.ok ? parsed.value.series[0]!.samples : null),
    ).toBe(true);
  });

  it("rejects unordered and incompatible author data", () => {
    const model = dataset();
    expect(model.ok).toBe(true);
    if (!model.ok) return;
    expect(
      createCartesianDataset({
        ...model.value,
        id: ids.datasetId(),
        series: [
          {
            ...model.value.series[0]!,
            samples: [
              { xCanonical: 2, yCanonical: 0 },
              { xCanonical: 1, yCanonical: 0 },
            ],
          },
        ],
      }),
    ).toMatchObject({ ok: false, error: { kind: "invalid-dataset" } });
    expect(
      createCartesianDataset({
        ...model.value,
        id: ids.datasetId(),
        series: [
          {
            ...model.value.series[0]!,
            x: {
              ...model.value.series[0]!.x,
              unitExpression: "missing",
            },
          },
        ],
      }),
    ).toMatchObject({ ok: false, error: { kind: "invalid-unit" } });
    expect(
      createCartesianDataset({
        ...model.value,
        id: ids.datasetId(),
        series: [
          {
            ...model.value.series[0]!,
            samples: [
              { xCanonical: 0, yCanonical: 0, yUncertaintyCanonical: -1 },
            ],
          },
        ],
      }),
    ).toMatchObject({ ok: false, error: { kind: "invalid-dataset" } });
  });

  it("preserves unknown finite provenance and rejects unsupported envelopes", () => {
    const model = dataset();
    expect(model.ok).toBe(true);
    if (!model.ok) return;
    const envelope = toCartesianDatasetDefinition(model.value);
    expect(envelope.ok).toBe(true);
    if (!envelope.ok) return;
    const extended = {
      ...envelope.value,
      provenance: {
        ...envelope.value.provenance,
        calibration: { instrument: "gate-a", revision: 2 },
      },
    };
    const parsed = parseCartesianDatasetDefinition(extended);
    expect(parsed.ok && parsed.value.provenance.additionalFields).toEqual({
      calibration: { instrument: "gate-a", revision: 2 },
    });
    if (!parsed.ok) return;
    expect(toCartesianDatasetDefinition(parsed.value)).toMatchObject({
      ok: true,
      value: {
        provenance: {
          calibration: { instrument: "gate-a", revision: 2 },
        },
      },
    });
    expect(
      parseCartesianDatasetDefinition({
        ...envelope.value,
        datasetTypeId: registeredTypeId("physica:data/future-v2"),
      }),
    ).toMatchObject({
      ok: false,
      error: { kind: "unsupported-dataset-envelope" },
    });
    expect(
      parseCartesianDatasetDefinition({
        ...envelope.value,
        storage: { kind: "inline-json", value: { series: "invalid" } },
      }),
    ).toMatchObject({
      ok: false,
      error: { kind: "invalid-dataset-envelope" },
    });
  });
});

describe("deterministic dataset derivations", () => {
  it("bins final-boundary values and reports explicit-range exclusions", () => {
    const source = createCartesianDataset({
      id: ids.datasetId(),
      name: "Observations",
      series: [
        {
          key: dataSeriesKey("observations"),
          name: "Lengths",
          x: { label: "Index", symbol: "i", unitExpression: "" },
          y: { label: "Length", symbol: "l", unitExpression: "m" },
          samples: [-1, 0, 1, 2, 3, 4, 5].map((yCanonical, index) => ({
            xCanonical: index,
            yCanonical,
          })),
        },
      ],
      provenance: { sourceKind: "measured", sourceDescription: "Ruler" },
    });
    expect(source.ok).toBe(true);
    if (!source.ok) return;
    const result = deriveHistogramDataset({
      sourceDataset: source.value,
      sourceSeriesKey: dataSeriesKey("observations"),
      outputId: ids.datasetId(),
      outputName: "Length histogram",
      outputSeriesKey: dataSeriesKey("histogram.count"),
      binCount: 2,
      rangeCanonical: [0, 4],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.binEdgesCanonical).toEqual([0, 2, 4]);
    expect(
      result.value.dataset.series[0]!.samples.map(
        (sample) => sample.yCanonical,
      ),
    ).toEqual([2, 3]);
    expect(result.value).toMatchObject({ excludedBelow: 1, excludedAbove: 1 });
    expect(result.value.dataset.provenance).toMatchObject({
      sourceKind: "derived",
      additionalFields: { sourceSeriesKey: "observations" },
    });
    expect(Object.isFrozen(result.value.dataset)).toBe(true);
  });

  it("finds the exact one-hertz amplitude of a uniformly sampled sine", () => {
    const sourceKey = dataSeriesKey("signal");
    const source = createCartesianDataset({
      id: ids.datasetId(),
      name: "Signal",
      series: [
        {
          key: sourceKey,
          name: "Voltage",
          x: { label: "Time", symbol: "t", unitExpression: "s" },
          y: { label: "Voltage", symbol: "V", unitExpression: "V" },
          samples: Array.from({ length: 8 }, (_, index) => ({
            xCanonical: index / 8,
            yCanonical: Math.sin((2 * Math.PI * index) / 8),
          })),
        },
      ],
      provenance: { sourceKind: "measured", sourceDescription: "Probe" },
    });
    expect(source.ok).toBe(true);
    if (!source.ok) return;
    const spectrum = deriveAmplitudeSpectrumDataset({
      sourceDataset: source.value,
      sourceSeriesKey: sourceKey,
      outputId: ids.datasetId(),
      outputName: "Amplitude spectrum",
      outputSeriesKey: dataSeriesKey("spectrum.amplitude"),
    });
    expect(spectrum.ok).toBe(true);
    if (!spectrum.ok) return;
    expect(spectrum.value.sampleIntervalCanonical).toBe(0.125);
    expect(spectrum.value.frequencyCount).toBe(5);
    const peak = spectrum.value.dataset.series[0]!.samples[1]!;
    expect(peak.xCanonical).toBe(1);
    expect(peak.yCanonical).toBeCloseTo(1, 12);
    expect(spectrum.value.dataset.series[0]!.x.unitExpression).toBe("Hz");
    expect(spectrum.value.dataset.series[0]!.y.unitExpression).toBe("V");
  });

  it("rejects nonuniform spectrum sampling and non-time x units", () => {
    const key = dataSeriesKey("bad-signal");
    const source = createCartesianDataset({
      id: ids.datasetId(),
      name: "Bad signal",
      series: [
        {
          key,
          name: "Signal",
          x: { label: "Position", symbol: "x", unitExpression: "m" },
          y: { label: "Signal", symbol: "s", unitExpression: "V" },
          samples: [
            { xCanonical: 0, yCanonical: 0 },
            { xCanonical: 1, yCanonical: 1 },
          ],
        },
      ],
      provenance: { sourceKind: "measured", sourceDescription: "Probe" },
    });
    expect(source.ok).toBe(true);
    if (!source.ok) return;
    expect(
      deriveAmplitudeSpectrumDataset({
        sourceDataset: source.value,
        sourceSeriesKey: key,
        outputId: ids.datasetId(),
        outputName: "Invalid",
        outputSeriesKey: dataSeriesKey("invalid-spectrum"),
      }),
    ).toMatchObject({
      ok: false,
      error: { kind: "invalid-spectrum-time-unit" },
    });
    const timeSource = createCartesianDataset({
      ...source.value,
      id: ids.datasetId(),
      series: [
        {
          ...source.value.series[0]!,
          x: { label: "Time", symbol: "t", unitExpression: "s" },
          samples: [
            { xCanonical: 0, yCanonical: 0 },
            { xCanonical: 1, yCanonical: 1 },
            { xCanonical: 2.2, yCanonical: 0 },
          ],
        },
      ],
    });
    expect(timeSource.ok).toBe(true);
    if (!timeSource.ok) return;
    expect(
      deriveAmplitudeSpectrumDataset({
        sourceDataset: timeSource.value,
        sourceSeriesKey: key,
        outputId: ids.datasetId(),
        outputName: "Invalid",
        outputSeriesKey: dataSeriesKey("invalid-spectrum"),
      }),
    ).toMatchObject({
      ok: false,
      error: { kind: "nonuniform-spectrum-sampling" },
    });
  });
});

describe("explicit-clock acquisition", () => {
  it("is independent of caller/render window size", () => {
    const binding = {
      sourceObservableId: "mechanics:velocity" as ObservableId,
      clockId: ids.clockId(),
      targetSeriesKey: dataSeriesKey("velocity"),
      startTimeSeconds: 0,
      sampleIntervalSeconds: 0.25,
    };
    const evaluate = (time: number) => 3 + 2 * time;
    const once = sampleAcquisitionWindow(binding, -1, 2, evaluate);
    expect(once.ok).toBe(true);
    let last = -1;
    const many = [];
    for (const target of [0.1, 0.7, 1.1, 1.6, 2]) {
      const window = sampleAcquisitionWindow(binding, last, target, evaluate);
      expect(window.ok).toBe(true);
      if (!window.ok) return;
      many.push(...window.value.samples);
      last = window.value.lastSampleIndex;
    }
    expect(many).toEqual(once.ok ? once.value.samples : []);
    expect(many.map((sample) => sample.xCanonical)).toEqual([
      0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2,
    ]);
  });

  it("rejects backward time and non-finite observable output", () => {
    const binding = {
      sourceObservableId: "mechanics:velocity" as ObservableId,
      clockId: ids.clockId(),
      targetSeriesKey: dataSeriesKey("velocity"),
      startTimeSeconds: 0,
      sampleIntervalSeconds: 1,
    };
    expect(sampleAcquisitionWindow(binding, 2, 1, () => 0)).toMatchObject({
      ok: false,
      error: { kind: "acquisition-backward-time" },
    });
    expect(
      sampleAcquisitionWindow(binding, -1, 0, () => Number.NaN),
    ).toMatchObject({
      ok: false,
      error: { kind: "observable-evaluation-failed" },
    });
  });
});
