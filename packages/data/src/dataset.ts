import {
  isUuidV4,
  registeredTypeId,
  type ClockId,
  type DatasetDefinition,
  type JsonObject,
  type ObservableId,
} from "@physica/core-model";
import {
  createDefaultUnitRegistry,
  type DefaultUnitRegistry,
} from "@physica/units";
import { asRecord, cloneJson, finiteJsonObject, freezeDeep } from "./internal";
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

function invalidEnvelope(path: string, message: string): DataResult<never> {
  return {
    ok: false,
    error: { kind: "invalid-dataset-envelope", path, message },
  };
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
  if (axis.label.trim() === "" || axis.symbol.trim() === "") {
    return invalid(path, "Axis label and symbol must not be empty.");
  }
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
  if (!SOURCE_KINDS.has(value.sourceKind)) {
    return invalid(
      "$.provenance.sourceKind",
      "Unknown provenance source kind.",
    );
  }
  if (value.sourceDescription.trim() === "") {
    return invalid(
      "$.provenance.sourceDescription",
      "Source description must not be empty.",
    );
  }
  if (value.clockId !== undefined && !isUuidV4(value.clockId)) {
    return invalid("$.provenance.clockId", "Clock ID must be UUID-v4.");
  }
  if (value.observableId !== undefined && value.observableId.trim() === "") {
    return invalid(
      "$.provenance.observableId",
      "Observable ID must not be empty.",
    );
  }
  for (const field of ["samplingMethod", "modelId", "modelVersion"] as const) {
    if (value[field] !== undefined && value[field]!.trim() === "") {
      return invalid(`$.provenance.${field}`, `${field} must not be empty.`);
    }
  }
  if (value.transformations?.some((item) => item.trim() === "")) {
    return invalid(
      "$.provenance.transformations",
      "Transformations must be non-empty text.",
    );
  }
  if (value.metadata !== undefined && !finiteJsonObject(value.metadata)) {
    return invalid(
      "$.provenance.metadata",
      "Provenance metadata must be finite JSON.",
    );
  }
  if (
    value.additionalFields !== undefined &&
    !finiteJsonObject(value.additionalFields)
  ) {
    return invalid(
      "$.provenance.additionalFields",
      "Additional provenance fields must be finite JSON.",
    );
  }
  if (
    value.additionalFields !== undefined &&
    Object.keys(value.additionalFields).some((key) =>
      PROVENANCE_FIELDS.has(key),
    )
  ) {
    return invalid(
      "$.provenance.additionalFields",
      "Additional provenance fields must not shadow owned fields.",
    );
  }
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
  if (!Array.isArray(input.series) || input.series.length === 0) {
    return invalid("$.series", "At least one data series is required.");
  }
  const provenance = validateProvenance(input.provenance);
  if (!provenance.ok) return provenance;
  if (input.metadata !== undefined && !finiteJsonObject(input.metadata)) {
    return invalid("$.metadata", "Dataset metadata must be finite JSON.");
  }
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
    if (candidate.samples.length === 0) {
      return invalid(
        path + ".samples",
        "A series requires at least one sample.",
      );
    }
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
      ) {
        return invalid(
          `${path}.samples[${sampleIndex}]`,
          "Sample values must be finite.",
        );
      }
      if (sample.xCanonical < previousX) {
        return invalid(path + ".samples", "Samples must be ordered by x.");
      }
      previousX = sample.xCanonical;
      samples.push({ ...sample });
    }
    if (
      candidate.metadata !== undefined &&
      !finiteJsonObject(candidate.metadata)
    ) {
      return invalid(
        path + ".metadata",
        "Series metadata must be finite JSON.",
      );
    }
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

function provenanceToJson(value: DataProvenanceV1): JsonObject {
  const owned = {
    sourceKind: value.sourceKind,
    sourceDescription: value.sourceDescription,
    ...(value.clockId ? { clockId: value.clockId } : {}),
    ...(value.observableId ? { observableId: value.observableId } : {}),
    ...(value.samplingMethod ? { samplingMethod: value.samplingMethod } : {}),
    ...(value.modelId ? { modelId: value.modelId } : {}),
    ...(value.modelVersion ? { modelVersion: value.modelVersion } : {}),
    ...(value.transformations
      ? { transformations: value.transformations }
      : {}),
    ...(value.metadata ? { metadata: value.metadata } : {}),
  };
  return cloneJson({
    ...(value.additionalFields ?? {}),
    ...owned,
  } as JsonObject) as JsonObject;
}

export function toCartesianDatasetDefinition(
  dataset: CartesianDatasetV1,
): DataResult<DatasetDefinition> {
  const valid = createCartesianDataset(dataset);
  if (!valid.ok) return valid;
  return {
    ok: true,
    value: freezeDeep({
      id: dataset.id,
      name: dataset.name,
      datasetTypeId: CARTESIAN_DATASET_TYPE_ID,
      datasetSchemaVersion: CARTESIAN_DATASET_SCHEMA_VERSION,
      storage: {
        kind: "inline-json" as const,
        value: cloneJson({
          series: dataset.series as unknown as JsonObject["series"],
          ...(dataset.metadata ? { metadata: dataset.metadata } : {}),
        }),
      },
      provenance: provenanceToJson(dataset.provenance),
    }),
  };
}

function parseAxis(
  value: unknown,
  path: string,
): DataResult<DataAxisMetadataV1> {
  const record = asRecord(value);
  return record &&
    typeof record.label === "string" &&
    typeof record.symbol === "string" &&
    typeof record.unitExpression === "string"
    ? {
        ok: true,
        value: {
          label: record.label,
          symbol: record.symbol,
          unitExpression: record.unitExpression,
        },
      }
    : invalidEnvelope(path, "Axis metadata is malformed.");
}

function parseProvenance(value: unknown): DataResult<DataProvenanceV1> {
  const record = asRecord(value);
  if (
    !record ||
    typeof record.sourceKind !== "string" ||
    typeof record.sourceDescription !== "string"
  ) {
    return invalidEnvelope("$.provenance", "Dataset provenance is malformed.");
  }
  const metadata =
    record.metadata === undefined
      ? undefined
      : finiteJsonObject(record.metadata);
  if (record.metadata !== undefined && !metadata)
    return invalidEnvelope(
      "$.provenance.metadata",
      "Provenance metadata must be finite JSON.",
    );
  if (
    record.transformations !== undefined &&
    (!Array.isArray(record.transformations) ||
      record.transformations.some((item) => typeof item !== "string"))
  ) {
    return invalidEnvelope(
      "$.provenance.transformations",
      "Transformations must be text.",
    );
  }
  const additionalFields = Object.fromEntries(
    Object.entries(record).filter(([key]) => !PROVENANCE_FIELDS.has(key)),
  );
  if (!finiteJsonObject(additionalFields))
    return invalidEnvelope(
      "$.provenance",
      "Additional provenance fields must be finite JSON.",
    );
  const preservedAdditionalFields = additionalFields as JsonObject;
  return {
    ok: true,
    value: {
      sourceKind: record.sourceKind as DataProvenanceSourceKind,
      sourceDescription: record.sourceDescription,
      ...(typeof record.clockId === "string"
        ? { clockId: record.clockId as ClockId }
        : {}),
      ...(typeof record.observableId === "string"
        ? { observableId: record.observableId as ObservableId }
        : {}),
      ...(typeof record.samplingMethod === "string"
        ? { samplingMethod: record.samplingMethod }
        : {}),
      ...(typeof record.modelId === "string"
        ? { modelId: record.modelId }
        : {}),
      ...(typeof record.modelVersion === "string"
        ? { modelVersion: record.modelVersion }
        : {}),
      ...(record.transformations
        ? { transformations: record.transformations as string[] }
        : {}),
      ...(metadata ? { metadata } : {}),
      ...(Object.keys(additionalFields).length > 0
        ? { additionalFields: preservedAdditionalFields }
        : {}),
    },
  };
}

export function parseCartesianDatasetDefinition(
  definition: DatasetDefinition,
  registry: DefaultUnitRegistry = createDefaultUnitRegistry(),
): DataResult<CartesianDatasetV1> {
  if (
    definition.datasetTypeId !== CARTESIAN_DATASET_TYPE_ID ||
    definition.datasetSchemaVersion !== CARTESIAN_DATASET_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      error: {
        kind: "unsupported-dataset-envelope",
        typeId: definition.datasetTypeId,
        schemaVersion: definition.datasetSchemaVersion,
      },
    };
  }
  if (definition.storage.kind !== "inline-json")
    return invalidEnvelope(
      "$.storage",
      "Cartesian datasets require inline JSON storage.",
    );
  const payload = asRecord(definition.storage.value);
  if (!payload || !Array.isArray(payload.series))
    return invalidEnvelope(
      "$.storage.value.series",
      "Series must be an array.",
    );
  const provenance = parseProvenance(definition.provenance);
  if (!provenance.ok) return provenance;
  const series: CartesianDataSeriesV1[] = [];
  for (let index = 0; index < payload.series.length; index += 1) {
    const record = asRecord(payload.series[index]);
    const path = `$.storage.value.series[${index}]`;
    if (
      !record ||
      typeof record.key !== "string" ||
      typeof record.name !== "string" ||
      !Array.isArray(record.samples)
    )
      return invalidEnvelope(path, "Series is malformed.");
    const x = parseAxis(record.x, path + ".x");
    if (!x.ok) return x;
    const y = parseAxis(record.y, path + ".y");
    if (!y.ok) return y;
    const samples = [];
    for (
      let sampleIndex = 0;
      sampleIndex < record.samples.length;
      sampleIndex += 1
    ) {
      const sample = asRecord(record.samples[sampleIndex]);
      if (
        !sample ||
        typeof sample.xCanonical !== "number" ||
        typeof sample.yCanonical !== "number"
      )
        return invalidEnvelope(
          `${path}.samples[${sampleIndex}]`,
          "Sample is malformed.",
        );
      samples.push({
        xCanonical: sample.xCanonical,
        yCanonical: sample.yCanonical,
      });
    }
    const metadata =
      record.metadata === undefined
        ? undefined
        : finiteJsonObject(record.metadata);
    if (record.metadata !== undefined && !metadata)
      return invalidEnvelope(
        path + ".metadata",
        "Series metadata must be finite JSON.",
      );
    series.push({
      key: record.key as DataSeriesKey,
      name: record.name,
      x: x.value,
      y: y.value,
      samples,
      ...(metadata ? { metadata } : {}),
    });
  }
  const metadata =
    payload.metadata === undefined
      ? undefined
      : finiteJsonObject(payload.metadata);
  if (payload.metadata !== undefined && !metadata)
    return invalidEnvelope(
      "$.storage.value.metadata",
      "Dataset metadata must be finite JSON.",
    );
  return createCartesianDataset(
    {
      id: definition.id,
      name: definition.name,
      series,
      provenance: provenance.value,
      ...(metadata ? { metadata } : {}),
    },
    registry,
  );
}
