import type {
  ClockId,
  DatasetDefinition,
  JsonObject,
  ObservableId,
} from "@physica/core-model";
import {
  createDefaultUnitRegistry,
  type DefaultUnitRegistry,
} from "@physica/units";
import {
  CARTESIAN_DATASET_SCHEMA_VERSION,
  CARTESIAN_DATASET_TYPE_ID,
  createCartesianDataset,
} from "./dataset";
import { asRecord, cloneJson, finiteJsonObject, freezeDeep } from "./internal";
import type {
  CartesianDataSeriesV1,
  CartesianDatasetV1,
  DataAxisMetadataV1,
  DataProvenanceSourceKind,
  DataProvenanceV1,
  DataResult,
  DataSeriesKey,
} from "./types";

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

function invalidEnvelope(path: string, message: string): DataResult<never> {
  return {
    ok: false,
    error: { kind: "invalid-dataset-envelope", path, message },
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
  )
    return invalidEnvelope("$.provenance", "Dataset provenance is malformed.");
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
  )
    return invalidEnvelope(
      "$.provenance.transformations",
      "Transformations must be text.",
    );
  const additionalFields = Object.fromEntries(
    Object.entries(record).filter(([key]) => !PROVENANCE_FIELDS.has(key)),
  );
  if (!finiteJsonObject(additionalFields))
    return invalidEnvelope(
      "$.provenance",
      "Additional provenance fields must be finite JSON.",
    );
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
        ? { additionalFields: additionalFields as JsonObject }
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
        typeof sample.yCanonical !== "number" ||
        (sample.xUncertaintyCanonical !== undefined &&
          typeof sample.xUncertaintyCanonical !== "number") ||
        (sample.yUncertaintyCanonical !== undefined &&
          typeof sample.yUncertaintyCanonical !== "number")
      )
        return invalidEnvelope(
          `${path}.samples[${sampleIndex}]`,
          "Sample is malformed.",
        );
      samples.push({
        xCanonical: sample.xCanonical,
        yCanonical: sample.yCanonical,
        ...(typeof sample.xUncertaintyCanonical === "number"
          ? { xUncertaintyCanonical: sample.xUncertaintyCanonical }
          : {}),
        ...(typeof sample.yUncertaintyCanonical === "number"
          ? { yUncertaintyCanonical: sample.yUncertaintyCanonical }
          : {}),
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
