import {
  DEFAULT_NUMERICS_POLICY,
  approximatelyEqual,
  validateNumericsPolicy,
  type NumericsPolicy,
} from "@physica/mathematics";
import { createDefaultUnitRegistry, equalDimensions } from "@physica/units";
import { createCartesianDataset } from "./dataset";
import { freezeDeep } from "./internal";
import type {
  CartesianDataSeriesV1,
  DataResult,
  HistogramDerivationInput,
  HistogramDerivationResult,
  SpectrumDerivationInput,
  SpectrumDerivationResult,
} from "./types";

const MAX_SPECTRUM_SAMPLES = 4096;

function invalid(path: string, message: string): DataResult<never> {
  return { ok: false, error: { kind: "invalid-derivation", path, message } };
}

function findSeries(
  input: HistogramDerivationInput | SpectrumDerivationInput,
): DataResult<CartesianDataSeriesV1> {
  const dataset = createCartesianDataset(input.sourceDataset);
  if (!dataset.ok) return dataset;
  const series = dataset.value.series.find(
    (candidate) => candidate.key === input.sourceSeriesKey,
  );
  return series
    ? { ok: true, value: series }
    : {
        ok: false,
        error: {
          kind: "missing-derivation-series",
          seriesKey: input.sourceSeriesKey,
        },
      };
}

export function deriveHistogramDataset(
  input: HistogramDerivationInput,
): DataResult<HistogramDerivationResult> {
  const source = findSeries(input);
  if (!source.ok) return source;
  if (
    !Number.isSafeInteger(input.binCount) ||
    input.binCount < 1 ||
    input.binCount > 200
  )
    return invalid("$.binCount", "Bin count must be an integer from 1 to 200.");
  let minimum = Math.min(
    ...source.value.samples.map((sample) => sample.yCanonical),
  );
  let maximum = Math.max(
    ...source.value.samples.map((sample) => sample.yCanonical),
  );
  if (input.rangeCanonical !== undefined) {
    [minimum, maximum] = input.rangeCanonical;
    if (
      !Number.isFinite(minimum) ||
      !Number.isFinite(maximum) ||
      minimum >= maximum
    )
      return invalid(
        "$.rangeCanonical",
        "Histogram range must be finite and increasing.",
      );
  } else if (minimum === maximum) {
    const delta = Math.max(Math.abs(minimum) * 0.05, 1);
    minimum -= delta;
    maximum += delta;
  }
  const width = (maximum - minimum) / input.binCount;
  const counts = Array.from({ length: input.binCount }, () => 0);
  let excludedBelow = 0;
  let excludedAbove = 0;
  for (const sample of source.value.samples) {
    if (sample.yCanonical < minimum) {
      excludedBelow += 1;
      continue;
    }
    if (sample.yCanonical > maximum) {
      excludedAbove += 1;
      continue;
    }
    const bin =
      sample.yCanonical === maximum
        ? input.binCount - 1
        : Math.floor((sample.yCanonical - minimum) / width);
    counts[bin]! += 1;
  }
  const edges = Array.from(
    { length: input.binCount + 1 },
    (_, index) => minimum + index * width,
  );
  const dataset = createCartesianDataset({
    id: input.outputId,
    name: input.outputName,
    series: [
      {
        key: input.outputSeriesKey,
        name: `${source.value.name} histogram`,
        x: { ...source.value.y },
        y: { label: "Count", symbol: "n", unitExpression: "" },
        samples: counts.map((count, index) => ({
          xCanonical: minimum + (index + 0.5) * width,
          yCanonical: count,
        })),
        metadata: {
          renderHint: "histogram",
          binWidthCanonical: width,
          minimumCanonical: minimum,
          maximumCanonical: maximum,
        },
      },
    ],
    provenance: {
      sourceKind: "derived",
      sourceDescription: `Histogram of ${input.sourceDataset.name} / ${source.value.name}`,
      transformations: [
        `histogram-v1 bins=${input.binCount} range=[${minimum},${maximum}]`,
      ],
      additionalFields: {
        sourceDatasetId: input.sourceDataset.id,
        sourceSeriesKey: input.sourceSeriesKey,
      },
    },
  });
  if (!dataset.ok) return dataset;
  return {
    ok: true,
    value: freezeDeep({
      dataset: dataset.value,
      binEdgesCanonical: edges,
      excludedBelow,
      excludedAbove,
    }),
  };
}

function numericsPolicy(
  input: SpectrumDerivationInput,
): DataResult<NumericsPolicy> {
  try {
    return {
      ok: true,
      value: validateNumericsPolicy(
        input.numericsPolicy ?? DEFAULT_NUMERICS_POLICY,
      ),
    };
  } catch (error) {
    return invalid(
      "$.numericsPolicy",
      error instanceof Error ? error.message : "Invalid numerics policy.",
    );
  }
}

export function deriveAmplitudeSpectrumDataset(
  input: SpectrumDerivationInput,
): DataResult<SpectrumDerivationResult> {
  const source = findSeries(input);
  if (!source.ok) return source;
  const count = source.value.samples.length;
  if (count < 2)
    return invalid("$.sourceSeries", "Spectrum requires at least two samples.");
  if (count > MAX_SPECTRUM_SAMPLES)
    return { ok: false, error: { kind: "derivation-sample-limit", count } };
  const registry = createDefaultUnitRegistry();
  const sourceX = registry.parse(source.value.x.unitExpression);
  const seconds = registry.parse("s");
  if (
    !sourceX.ok ||
    !seconds.ok ||
    !equalDimensions(sourceX.value.dimension, seconds.value.dimension) ||
    sourceX.value.semanticKind !== seconds.value.semanticKind
  )
    return {
      ok: false,
      error: {
        kind: "invalid-spectrum-time-unit",
        unitExpression: source.value.x.unitExpression,
      },
    };
  const policy = numericsPolicy(input);
  if (!policy.ok) return policy;
  const interval =
    source.value.samples[1]!.xCanonical - source.value.samples[0]!.xCanonical;
  if (!Number.isFinite(interval) || interval <= 0)
    return invalid(
      "$.sourceSeries.samples",
      "Sample times must strictly increase.",
    );
  for (let index = 2; index < count; index += 1) {
    const actual =
      source.value.samples[index]!.xCanonical -
      source.value.samples[index - 1]!.xCanonical;
    if (!approximatelyEqual(actual, interval, policy.value))
      return {
        ok: false,
        error: {
          kind: "nonuniform-spectrum-sampling",
          sampleIndex: index,
          expectedInterval: interval,
          actualInterval: actual,
        },
      };
  }
  const outputCount = Math.floor(count / 2) + 1;
  const samples = [];
  for (
    let frequencyIndex = 0;
    frequencyIndex < outputCount;
    frequencyIndex += 1
  ) {
    let real = 0;
    let imaginary = 0;
    for (let sampleIndex = 0; sampleIndex < count; sampleIndex += 1) {
      const angle = (-2 * Math.PI * frequencyIndex * sampleIndex) / count;
      const value = source.value.samples[sampleIndex]!.yCanonical;
      real += value * Math.cos(angle);
      imaginary += value * Math.sin(angle);
    }
    const hasDistinctNegativePartner =
      frequencyIndex > 0 && !(count % 2 === 0 && frequencyIndex === count / 2);
    const amplitude =
      (Math.hypot(real, imaginary) / count) *
      (hasDistinctNegativePartner ? 2 : 1);
    samples.push({
      xCanonical: frequencyIndex / (count * interval),
      yCanonical: amplitude,
    });
  }
  const dataset = createCartesianDataset({
    id: input.outputId,
    name: input.outputName,
    series: [
      {
        key: input.outputSeriesKey,
        name: `${source.value.name} amplitude spectrum`,
        x: { label: "Frequency", symbol: "f", unitExpression: "Hz" },
        y: { ...source.value.y },
        samples,
        metadata: {
          renderHint: "amplitude-spectrum",
          sampleIntervalCanonical: interval,
          sourceSampleCount: count,
          algorithm: "direct-real-dft-v1",
        },
      },
    ],
    provenance: {
      sourceKind: "derived",
      sourceDescription: `Amplitude spectrum of ${input.sourceDataset.name} / ${source.value.name}`,
      transformations: [
        `direct-real-dft-v1 count=${count} interval=${interval}`,
      ],
      additionalFields: {
        sourceDatasetId: input.sourceDataset.id,
        sourceSeriesKey: input.sourceSeriesKey,
      },
    },
  });
  if (!dataset.ok) return dataset;
  return {
    ok: true,
    value: freezeDeep({
      dataset: dataset.value,
      sampleIntervalCanonical: interval,
      frequencyCount: samples.length,
    }),
  };
}
