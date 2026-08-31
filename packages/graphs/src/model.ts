import { isUuidV4, type JsonObject } from "@physica/core-model";
import { parseDataSeriesKey } from "@physica/data";
import {
  createDefaultUnitRegistry,
  type DefaultUnitRegistry,
} from "@physica/units";
import { cloneJson, finiteJsonObject, freezeDeep } from "./internal";
import type {
  CartesianGraphV1,
  GraphAnnotationV1,
  GraphAnalysisOverlayV1,
  GraphAxisV1,
  GraphCurveStyleV1,
  GraphPointMarkerV1,
  GraphResult,
  GraphSeriesBindingV1,
} from "./types";

const LOCAL_ID = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
function invalid(path: string, message: string): GraphResult<never> {
  return { ok: false, error: { kind: "invalid-graph", path, message } };
}

function axis(
  value: GraphAxisV1,
  path: string,
  registry: DefaultUnitRegistry,
): GraphResult<GraphAxisV1> {
  if (value.label.trim() === "")
    return invalid(path + ".label", "Axis label must not be empty.");
  const unit = registry.parse(value.unitExpression);
  if (!unit.ok)
    return {
      ok: false,
      error: {
        kind: "invalid-unit",
        path: path + ".unitExpression",
        message: unit.error.kind,
      },
    };
  if (value.scale !== "linear" && value.scale !== "log10")
    return invalid(path + ".scale", "Scale must be linear or log10.");
  if (
    !Number.isSafeInteger(value.tickTarget) ||
    value.tickTarget < 2 ||
    value.tickTarget > 20
  )
    return invalid(path + ".tickTarget", "Tick target must be from 2 to 20.");
  if (value.domain.kind === "manual") {
    if (
      ![value.domain.minCanonical, value.domain.maxCanonical].every(
        Number.isFinite,
      ) ||
      value.domain.minCanonical >= value.domain.maxCanonical
    )
      return invalid(
        path + ".domain",
        "Manual domain requires finite min < max.",
      );
    if (value.scale === "log10" && value.domain.minCanonical <= 0)
      return {
        ok: false,
        error: {
          kind: "invalid-log-domain",
          axis: path.includes("xAxis") ? "x" : "y",
          value: value.domain.minCanonical,
        },
      };
  } else if (value.domain.kind !== "auto")
    return invalid(path + ".domain", "Domain policy is unsupported.");
  return {
    ok: true,
    value: {
      ...value,
      unitExpression: unit.value.expression,
      domain: { ...value.domain },
    },
  };
}

function style(
  value: GraphCurveStyleV1,
  path: string,
): GraphResult<GraphCurveStyleV1> {
  if (!HEX_COLOR.test(value.strokeHex))
    return invalid(path + ".strokeHex", "Color must be #RRGGBB.");
  if (
    !Number.isFinite(value.lineWidth) ||
    value.lineWidth <= 0 ||
    value.lineWidth > 20
  )
    return invalid(path + ".lineWidth", "Line width must be in (0, 20].");
  if (
    value.dash?.some(
      (item) => !Number.isFinite(item) || item <= 0 || item > 100,
    )
  )
    return invalid(path + ".dash", "Dash values must be in (0, 100].");
  if (
    value.renderMode !== undefined &&
    value.renderMode !== "line" &&
    value.renderMode !== "bars"
  )
    return invalid(path + ".renderMode", "Render mode is unsupported.");
  if (value.fillHex !== undefined && !HEX_COLOR.test(value.fillHex))
    return invalid(path + ".fillHex", "Fill color must be #RRGGBB.");
  if (value.renderMode === "bars") {
    if (
      !Number.isFinite(value.barWidthCanonical) ||
      value.barWidthCanonical === undefined ||
      value.barWidthCanonical <= 0
    )
      return invalid(
        path + ".barWidthCanonical",
        "Bar width must be finite and positive.",
      );
  } else if (value.barWidthCanonical !== undefined)
    return invalid(
      path + ".barWidthCanonical",
      "Bar width requires bars render mode.",
    );
  return {
    ok: true,
    value: {
      ...value,
      strokeHex: value.strokeHex.toLowerCase(),
      ...(value.dash ? { dash: [...value.dash] } : {}),
      ...(value.renderMode ? { renderMode: value.renderMode } : {}),
      ...(value.barWidthCanonical !== undefined
        ? { barWidthCanonical: value.barWidthCanonical }
        : {}),
      ...(value.fillHex ? { fillHex: value.fillHex.toLowerCase() } : {}),
    },
  };
}

function analysis(
  value: GraphAnalysisOverlayV1,
  path: string,
  bound: ReadonlySet<string>,
): GraphResult<GraphAnalysisOverlayV1> {
  const key = parseDataSeriesKey(value.seriesKey);
  if (!isUuidV4(value.datasetId) || !key.ok)
    return invalid(path, "Analysis dataset ID or series key is invalid.");
  if (!bound.has(`${value.datasetId}/${key.value}`))
    return invalid(path, "Analysis must reference a bound graph series.");
  const color = (candidate: string, colorPath: string) =>
    HEX_COLOR.test(candidate)
      ? undefined
      : invalid(colorPath, "Color must be #RRGGBB.");
  const line = (strokeHex: string, lineWidth: number) => {
    const invalidColor = color(strokeHex, path + ".strokeHex");
    if (invalidColor) return invalidColor;
    return !Number.isFinite(lineWidth) || lineWidth <= 0 || lineWidth > 20
      ? invalid(path + ".lineWidth", "Line width must be in (0, 20].")
      : undefined;
  };
  const range = (minimum?: number, maximum?: number) =>
    (minimum === undefined) !== (maximum === undefined) ||
    (minimum !== undefined &&
      maximum !== undefined &&
      (!Number.isFinite(minimum) ||
        !Number.isFinite(maximum) ||
        minimum >= maximum));
  if (value.kind === "tangent") {
    const invalidLine = line(value.strokeHex, value.lineWidth);
    if (invalidLine) return invalidLine;
    if (!Number.isFinite(value.xCanonical))
      return invalid(path + ".xCanonical", "Tangent x must be finite.");
    if (
      value.triangleRunCanonical !== undefined &&
      (!Number.isFinite(value.triangleRunCanonical) ||
        value.triangleRunCanonical <= 0)
    )
      return invalid(
        path + ".triangleRunCanonical",
        "Triangle run must be finite and positive.",
      );
    return {
      ok: true,
      value: {
        ...value,
        seriesKey: key.value,
        strokeHex: value.strokeHex.toLowerCase(),
      },
    };
  }
  if (value.kind === "area") {
    const invalidColor = color(value.fillHex, path + ".fillHex");
    if (invalidColor) return invalidColor;
    if (
      !Number.isFinite(value.xMinCanonical) ||
      !Number.isFinite(value.xMaxCanonical) ||
      value.xMinCanonical >= value.xMaxCanonical ||
      !Number.isFinite(value.baselineCanonical) ||
      !Number.isFinite(value.opacity) ||
      value.opacity <= 0 ||
      value.opacity > 1
    )
      return invalid(path, "Area bounds, baseline or opacity are invalid.");
    return {
      ok: true,
      value: {
        ...value,
        seriesKey: key.value,
        fillHex: value.fillHex.toLowerCase(),
      },
    };
  }
  if (value.kind === "maximum") {
    const invalidColor = color(value.markerHex, path + ".markerHex");
    if (invalidColor) return invalidColor;
    if (
      value.label.trim() === "" ||
      range(value.xMinCanonical, value.xMaxCanonical)
    )
      return invalid(path, "Maximum label or range is invalid.");
    return {
      ok: true,
      value: {
        ...value,
        seriesKey: key.value,
        markerHex: value.markerHex.toLowerCase(),
      },
    };
  }
  if (value.kind === "linear-fit") {
    const invalidLine = line(value.strokeHex, value.lineWidth);
    if (invalidLine) return invalidLine;
    if (range(value.xMinCanonical, value.xMaxCanonical))
      return invalid(path, "Fit range is invalid.");
    return {
      ok: true,
      value: {
        ...value,
        seriesKey: key.value,
        strokeHex: value.strokeHex.toLowerCase(),
      },
    };
  }
  if (value.kind === "error-bars") {
    const invalidLine = line(value.strokeHex, value.lineWidth);
    if (invalidLine) return invalidLine;
    if (
      !Number.isFinite(value.capSize) ||
      value.capSize <= 0 ||
      value.capSize > 30
    )
      return invalid(path + ".capSize", "Cap size must be in (0, 30].");
    return {
      ok: true,
      value: {
        ...value,
        seriesKey: key.value,
        strokeHex: value.strokeHex.toLowerCase(),
      },
    };
  }
  return invalid(path + ".kind", "Analysis kind is unsupported.");
}

export function createCartesianGraph(
  input: CartesianGraphV1,
  registry: DefaultUnitRegistry = createDefaultUnitRegistry(),
): GraphResult<CartesianGraphV1> {
  if (!isUuidV4(input.id)) return invalid("$.id", "Graph ID must be UUID-v4.");
  if (input.name.trim() === "")
    return invalid("$.name", "Graph name must not be empty.");
  const xAxis = axis(input.xAxis, "$.xAxis", registry);
  if (!xAxis.ok) return xAxis;
  const yAxis = axis(input.yAxis, "$.yAxis", registry);
  if (!yAxis.ok) return yAxis;
  if (input.series.length === 0)
    return invalid("$.series", "At least one series is required.");
  const bound = new Set<string>();
  const series: GraphSeriesBindingV1[] = [];
  for (let index = 0; index < input.series.length; index += 1) {
    const item = input.series[index]!;
    const key = parseDataSeriesKey(item.seriesKey);
    if (!isUuidV4(item.datasetId) || !key.ok)
      return invalid(
        `$.series[${index}]`,
        "Dataset ID or series key is invalid.",
      );
    const identity = `${item.datasetId}/${key.value}`;
    if (bound.has(identity))
      return invalid(`$.series[${index}]`, "Series binding is duplicated.");
    bound.add(identity);
    const checked = style(item.style, `$.series[${index}].style`);
    if (!checked.ok) return checked;
    series.push({
      datasetId: item.datasetId,
      seriesKey: key.value,
      style: checked.value,
    });
  }
  const localIds = new Set<string>();
  const points: GraphPointMarkerV1[] = [];
  for (let index = 0; index < input.points.length; index += 1) {
    const item = input.points[index]!;
    const key = parseDataSeriesKey(item.seriesKey);
    if (
      !LOCAL_ID.test(item.id) ||
      localIds.has(item.id) ||
      !isUuidV4(item.datasetId) ||
      !key.ok ||
      !Number.isSafeInteger(item.sampleIndex) ||
      item.sampleIndex < 0 ||
      item.label.trim() === "" ||
      !Number.isFinite(item.radius) ||
      item.radius <= 0 ||
      item.radius > 30
    )
      return invalid(
        `$.points[${index}]`,
        "Point marker is malformed or duplicated.",
      );
    localIds.add(item.id);
    points.push({ ...item, seriesKey: key.value });
  }
  const annotations: GraphAnnotationV1[] = [];
  for (let index = 0; index < input.annotations.length; index += 1) {
    const item = input.annotations[index]!;
    if (
      !LOCAL_ID.test(item.id) ||
      localIds.has(item.id) ||
      item.text.trim() === "" ||
      !Number.isFinite(item.xCanonical) ||
      !Number.isFinite(item.yCanonical)
    )
      return invalid(
        `$.annotations[${index}]`,
        "Annotation is malformed or duplicated.",
      );
    localIds.add(item.id);
    annotations.push({ ...item });
  }
  const analyses: GraphAnalysisOverlayV1[] = [];
  for (
    let index = 0;
    index < (input.analysisOverlays?.length ?? 0);
    index += 1
  ) {
    const item = input.analysisOverlays![index]!;
    if (!LOCAL_ID.test(item.id) || localIds.has(item.id))
      return invalid(
        `$.analysisOverlays[${index}].id`,
        "Analysis ID is malformed or duplicated.",
      );
    const checked = analysis(item, `$.analysisOverlays[${index}]`, bound);
    if (!checked.ok) return checked;
    localIds.add(item.id);
    analyses.push(checked.value);
  }
  if (
    input.cursor.mode !== "nearest" &&
    input.cursor.mode !== "linear-interpolation"
  )
    return invalid("$.cursor.mode", "Cursor mode is unsupported.");
  if (input.metadata !== undefined && !finiteJsonObject(input.metadata))
    return invalid("$.metadata", "Metadata must be finite JSON.");
  return {
    ok: true,
    value: freezeDeep({
      id: input.id,
      name: input.name,
      xAxis: xAxis.value,
      yAxis: yAxis.value,
      series,
      points,
      annotations,
      ...(input.analysisOverlays ? { analysisOverlays: analyses } : {}),
      cursor: { ...input.cursor },
      ...(input.metadata
        ? { metadata: cloneJson(input.metadata) as JsonObject }
        : {}),
    }),
  };
}
