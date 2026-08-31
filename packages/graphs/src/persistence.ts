import {
  registeredTypeId,
  type GraphDefinition,
  type JsonObject,
} from "@physica/core-model";
import { type DataSeriesKey } from "@physica/data";
import {
  createDefaultUnitRegistry,
  type DefaultUnitRegistry,
} from "@physica/units";
import { asRecord, cloneJson, finiteJsonObject, freezeDeep } from "./internal";
import { createCartesianGraph } from "./model";
import type {
  CartesianGraphV1,
  GraphAnnotationV1,
  GraphAxisV1,
  GraphCurveStyleV1,
  GraphDomainPolicy,
  GraphPointMarkerV1,
  GraphResult,
  GraphSeriesBindingV1,
} from "./types";

export const CARTESIAN_GRAPH_TYPE_ID = registeredTypeId(
  "physica:graph/cartesian-v1",
);
export const CARTESIAN_GRAPH_SCHEMA_VERSION = 1;
function bad(path: string, message: string): GraphResult<never> {
  return {
    ok: false,
    error: { kind: "invalid-graph-envelope", path, message },
  };
}

export function toCartesianGraphDefinition(
  graph: CartesianGraphV1,
  enabled = true,
): GraphResult<GraphDefinition> {
  const valid = createCartesianGraph(graph);
  if (!valid.ok) return valid;
  const configuration = {
    name: valid.value.name,
    xAxis: valid.value.xAxis,
    yAxis: valid.value.yAxis,
    series: valid.value.series,
    points: valid.value.points,
    annotations: valid.value.annotations,
    cursor: valid.value.cursor,
    ...(valid.value.metadata ? { metadata: valid.value.metadata } : {}),
  };
  return {
    ok: true,
    value: freezeDeep({
      id: graph.id,
      typeId: CARTESIAN_GRAPH_TYPE_ID,
      schemaVersion: CARTESIAN_GRAPH_SCHEMA_VERSION,
      configuration: cloneJson(
        configuration as unknown as JsonObject,
      ) as JsonObject,
      enabled,
    }),
  };
}

function domain(value: unknown, path: string): GraphResult<GraphDomainPolicy> {
  const record = asRecord(value);
  if (!record || (record.kind !== "auto" && record.kind !== "manual"))
    return bad(path, "Domain is malformed.");
  if (record.kind === "auto") return { ok: true, value: { kind: "auto" } };
  return typeof record.minCanonical === "number" &&
    typeof record.maxCanonical === "number"
    ? {
        ok: true,
        value: {
          kind: "manual",
          minCanonical: record.minCanonical,
          maxCanonical: record.maxCanonical,
        },
      }
    : bad(path, "Manual domain is malformed.");
}
function axis(value: unknown, path: string): GraphResult<GraphAxisV1> {
  const record = asRecord(value);
  if (
    !record ||
    typeof record.label !== "string" ||
    typeof record.unitExpression !== "string" ||
    typeof record.scale !== "string" ||
    typeof record.tickTarget !== "number"
  )
    return bad(path, "Axis is malformed.");
  const parsed = domain(record.domain, path + ".domain");
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    value: {
      label: record.label,
      unitExpression: record.unitExpression,
      scale: record.scale as GraphAxisV1["scale"],
      domain: parsed.value,
      tickTarget: record.tickTarget,
    },
  };
}
function style(value: unknown, path: string): GraphResult<GraphCurveStyleV1> {
  const record = asRecord(value);
  if (
    !record ||
    typeof record.strokeHex !== "string" ||
    typeof record.lineWidth !== "number" ||
    (record.dash !== undefined &&
      (!Array.isArray(record.dash) ||
        record.dash.some((item) => typeof item !== "number")))
  )
    return bad(path, "Style is malformed.");
  return {
    ok: true,
    value: {
      strokeHex: record.strokeHex,
      lineWidth: record.lineWidth,
      ...(record.dash ? { dash: record.dash as number[] } : {}),
    },
  };
}

export function parseCartesianGraphDefinition(
  definition: GraphDefinition,
  registry: DefaultUnitRegistry = createDefaultUnitRegistry(),
): GraphResult<CartesianGraphV1> {
  if (
    definition.typeId !== CARTESIAN_GRAPH_TYPE_ID ||
    definition.schemaVersion !== CARTESIAN_GRAPH_SCHEMA_VERSION
  )
    return {
      ok: false,
      error: {
        kind: "unsupported-graph-envelope",
        typeId: definition.typeId,
        schemaVersion: definition.schemaVersion,
      },
    };
  const record = asRecord(definition.configuration);
  if (
    !record ||
    typeof record.name !== "string" ||
    !Array.isArray(record.series) ||
    !Array.isArray(record.points) ||
    !Array.isArray(record.annotations)
  )
    return bad("$.configuration", "Graph configuration is malformed.");
  const xAxis = axis(record.xAxis, "$.configuration.xAxis");
  if (!xAxis.ok) return xAxis;
  const yAxis = axis(record.yAxis, "$.configuration.yAxis");
  if (!yAxis.ok) return yAxis;
  const cursor = asRecord(record.cursor);
  if (
    !cursor ||
    typeof cursor.enabled !== "boolean" ||
    typeof cursor.mode !== "string"
  )
    return bad("$.configuration.cursor", "Cursor is malformed.");
  const series: GraphSeriesBindingV1[] = [];
  for (let index = 0; index < record.series.length; index += 1) {
    const item = asRecord(record.series[index]);
    if (
      !item ||
      typeof item.datasetId !== "string" ||
      typeof item.seriesKey !== "string"
    )
      return bad(`$.configuration.series[${index}]`, "Binding is malformed.");
    const parsedStyle = style(
      item.style,
      `$.configuration.series[${index}].style`,
    );
    if (!parsedStyle.ok) return parsedStyle;
    series.push({
      datasetId: item.datasetId as GraphSeriesBindingV1["datasetId"],
      seriesKey: item.seriesKey as DataSeriesKey,
      style: parsedStyle.value,
    });
  }
  const points: GraphPointMarkerV1[] = [];
  for (let index = 0; index < record.points.length; index += 1) {
    const item = asRecord(record.points[index]);
    if (
      !item ||
      typeof item.id !== "string" ||
      typeof item.datasetId !== "string" ||
      typeof item.seriesKey !== "string" ||
      typeof item.sampleIndex !== "number" ||
      typeof item.label !== "string" ||
      typeof item.radius !== "number"
    )
      return bad(`$.configuration.points[${index}]`, "Marker is malformed.");
    points.push({
      id: item.id,
      datasetId: item.datasetId as GraphPointMarkerV1["datasetId"],
      seriesKey: item.seriesKey as DataSeriesKey,
      sampleIndex: item.sampleIndex,
      label: item.label,
      radius: item.radius,
    });
  }
  const annotations: GraphAnnotationV1[] = [];
  for (let index = 0; index < record.annotations.length; index += 1) {
    const item = asRecord(record.annotations[index]);
    if (
      !item ||
      typeof item.id !== "string" ||
      typeof item.text !== "string" ||
      typeof item.xCanonical !== "number" ||
      typeof item.yCanonical !== "number"
    )
      return bad(
        `$.configuration.annotations[${index}]`,
        "Annotation is malformed.",
      );
    annotations.push({
      id: item.id,
      text: item.text,
      xCanonical: item.xCanonical,
      yCanonical: item.yCanonical,
    });
  }
  const metadata =
    record.metadata === undefined
      ? undefined
      : finiteJsonObject(record.metadata);
  if (record.metadata !== undefined && !metadata)
    return bad("$.configuration.metadata", "Metadata must be finite JSON.");
  return createCartesianGraph(
    {
      id: definition.id,
      name: record.name,
      xAxis: xAxis.value,
      yAxis: yAxis.value,
      series,
      points,
      annotations,
      cursor: {
        enabled: cursor.enabled,
        mode: cursor.mode as CartesianGraphV1["cursor"]["mode"],
      },
      ...(metadata ? { metadata } : {}),
    },
    registry,
  );
}
