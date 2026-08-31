import {
  isUuidV4,
  registeredTypeId,
  type JsonObject,
} from "@physica/core-model";
import {
  createDefaultUnitRegistry,
  type DefaultUnitRegistry,
} from "@physica/units";
import { cloneJson, finiteJsonObject, freezeDeep } from "./internal";
import type {
  CartesianDataSeriesV1,
  CartesianDatasetV1,
  CreateCartesianDatasetInput,
  DataAxisMetadataV1,
  DataProvenanceSourceKind,
  DataProvenanceV1,
  DataResult,
  DataSeriesKey,
} from "./types";

export const CARTESIAN_DATASET_TYPE_ID = registeredTypeId(
  "physica:data/cartesian-v1",
);
export const CARTESIAN_DATASET_SCHEMA_VERSION = 1;
const SERIES_KEY_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const SOURCE_KINDS = new Set<DataProvenanceSourceKind>([
  "imported",
  "simulated",
  "measured",
  "derived",
]);
const PROVENANCE_FIELDS = new Set([
  "sourceKind",
  "sourceDescription",
  "clockId",
  "observableId",
  "samplingMethod",
  "modelId",
  "modelVersion",
  "transformations",
  "metadata",
]);

function invalid(path: string, message: string): DataResult<never> {
  return { ok: false, error: { kind: "invalid-dataset", path, message } };
}

export function parseDataSeriesKey(value: string): DataResult<DataSeriesKey> {
  return SERIES_KEY_PATTERN.test(value)
    ? { ok: true, value: value as DataSeriesKey }
    : { ok: false, error: { kind: "invalid-series-key", value } };
}

export function dataSeriesKey(value: string): DataSeriesKey {
  const parsed = parseDataSeriesKey(value);
  if (!parsed.ok) throw new TypeError(`Invalid data series key: ${value}`);
  return parsed.value;
}

function validateAxis(
  axis: DataAxisMetadataV1,
  path: string,
  registry: DefaultUnitRegistry,
): DataResult<DataAxisMetadataV1> {
  if (axis.label.trim() === "" || axis.symbol.trim() === "")
    return invalid(path, "Axis label and symbol must not be empty.");
  const unit = registry.parse(axis.unitExpression);
  if (!unit.ok) {
    return {
      ok: false,
      error: {
        kind: "invalid-unit",
        path: path + ".unitExpression",
        message: unit.error.kind,
      },
    };
  }
  return {
    ok: true,
    value: { ...axis, unitExpression: unit.value.expression },
  };
}

function validateProvenance(
  value: DataProvenanceV1,
): DataResult<DataProvenanceV1> {
  if (!SOURCE_KINDS.has(value.sourceKind))
    return invalid(
      "$.provenance.sourceKind",
      "Unknown provenance source kind.",
    );
  if (value.sourceDescription.trim() === "")
    return invalid(
      "$.provenance.sourceDescription",
      "Source description must not be empty.",
    );
  if (value.clockId !== undefined && !isUuidV4(value.clockId))
    return invalid("$.provenance.clockId", "Clock ID must be UUID-v4.");
  if (value.observableId !== undefined && value.observableId.trim() === "")
    return invalid(
      "$.provenance.observableId",
      "Observable ID must not be empty.",
    );
  for (const field of ["samplingMethod", "modelId", "modelVersion"] as const) {
    if (value[field] !== undefined && value[field]!.trim() === "")
      return invalid(`$.provenance.${field}`, `${field} must not be empty.`);
  }
  if (value.transformations?.some((item) => item.trim() === ""))
    return invalid(
      "$.provenance.transformations",
      "Transformations must be non-empty text.",
    );
  if (value.metadata !== undefined && !finiteJsonObject(value.metadata))
    return invalid(
      "$.provenance.metadata",
      "Provenance metadata must be finite JSON.",
    );
  if (
    value.additionalFields !== undefined &&
    !finiteJsonObject(value.additionalFields)
  )
    return invalid(
      "$.provenance.additionalFields",
      "Additional provenance fields must be finite JSON.",
    );
  if (
    value.additionalFields !== undefined &&
    Object.keys(value.additionalFields).some((key) =>
      PROVENANCE_FIELDS.has(key),
    )
  )
    return invalid(
      "$.provenance.additionalFields",
      "Additional provenance fields must not shadow owned fields.",
    );
  return { ok: true, value };
}

export function createCartesianDataset(
  input: CreateCartesianDatasetInput,
  registry: DefaultUnitRegistry = createDefaultUnitRegistry(),
): DataResult<CartesianDatasetV1> {
  if (!isUuidV4(input.id))
    return invalid("$.id", "Dataset ID must be UUID-v4.");
  if (input.name.trim() === "")
    return invalid("$.name", "Dataset name must not be empty.");
  if (!Array.isArray(input.series) || input.series.length === 0)
    return invalid("$.series", "At least one data series is required.");
  const provenance = validateProvenance(input.provenance);
  if (!provenance.ok) return provenance;
  if (input.metadata !== undefined && !finiteJsonObject(input.metadata))
    return invalid("$.metadata", "Dataset metadata must be finite JSON.");

  const keys = new Set<string>();
  const series: CartesianDataSeriesV1[] = [];
  for (let index = 0; index < input.series.length; index += 1) {
    const candidate = input.series[index]!;
    const path = `$.series[${index}]`;
    const key = parseDataSeriesKey(candidate.key);
    if (!key.ok) return key;
    if (keys.has(key.value))
      return invalid(path + ".key", "Series keys must be unique.");
    keys.add(key.value);
    if (candidate.name.trim() === "")
      return invalid(path + ".name", "Series name must not be empty.");
    const x = validateAxis(candidate.x, path + ".x", registry);
    if (!x.ok) return x;
    const y = validateAxis(candidate.y, path + ".y", registry);
    if (!y.ok) return y;
    if (candidate.samples.length === 0)
      return invalid(
        path + ".samples",
        "A series requires at least one sample.",
      );

    let previousX = -Infinity;
    const samples = [];
    for (
      let sampleIndex = 0;
      sampleIndex < candidate.samples.length;
      sampleIndex += 1
    ) {
      const sample = candidate.samples[sampleIndex]!;
      if (
        !Number.isFinite(sample.xCanonical) ||
        !Number.isFinite(sample.yCanonical)
      )
        return invalid(
          `${path}.samples[${sampleIndex}]`,
          "Sample values must be finite.",
        );
      if (
        (sample.xUncertaintyCanonical !== undefined &&
          (!Number.isFinite(sample.xUncertaintyCanonical) ||
            sample.xUncertaintyCanonical < 0)) ||
        (sample.yUncertaintyCanonical !== undefined &&
          (!Number.isFinite(sample.yUncertaintyCanonical) ||
            sample.yUncertaintyCanonical < 0))
      )
        return invalid(
          `${path}.samples[${sampleIndex}]`,
          "Sample uncertainties must be finite and non-negative.",
        );
      if (sample.xCanonical < previousX)
        return invalid(path + ".samples", "Samples must be ordered by x.");
      previousX = sample.xCanonical;
      samples.push({ ...sample });
    }
    if (
      candidate.metadata !== undefined &&
      !finiteJsonObject(candidate.metadata)
    )
      return invalid(
        path + ".metadata",
        "Series metadata must be finite JSON.",
      );
    series.push({
      key: key.value,
      name: candidate.name,
      x: x.value,
      y: y.value,
      samples,
      ...(candidate.metadata
        ? { metadata: cloneJson(candidate.metadata) as JsonObject }
        : {}),
    });
  }
  return {
    ok: true,
    value: freezeDeep({
      id: input.id,
      name: input.name,
      series,
      provenance: {
        ...provenance.value,
        ...(provenance.value.transformations
          ? { transformations: [...provenance.value.transformations] }
          : {}),
        ...(provenance.value.metadata
          ? { metadata: cloneJson(provenance.value.metadata) as JsonObject }
          : {}),
        ...(provenance.value.additionalFields
          ? {
              additionalFields: cloneJson(
                provenance.value.additionalFields,
              ) as JsonObject,
            }
          : {}),
      },
      ...(input.metadata
        ? { metadata: cloneJson(input.metadata) as JsonObject }
        : {}),
    }),
  };
}
