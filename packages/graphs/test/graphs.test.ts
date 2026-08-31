import { describe, expect, it } from "vitest";
import { DeterministicIdFactory, registeredTypeId } from "@physica/core-model";
import { createCartesianDataset, dataSeriesKey } from "@physica/data";
import {
  createCartesianGraph,
  parseCartesianGraphDefinition,
  resolveCartesianGraph,
  toCartesianGraphDefinition,
} from "../src/index";

const ids = new DeterministicIdFactory(1_800_000);
const key = dataSeriesKey("motion");
const data = createCartesianDataset({
  id: ids.datasetId(),
  name: "Motion",
  series: [
    {
      key,
      name: "Measured",
      x: { label: "Time", symbol: "t", unitExpression: "s" },
      y: { label: "Displacement", symbol: "s", unitExpression: "m" },
      samples: [
        { xCanonical: 0, yCanonical: 0 },
        { xCanonical: 1, yCanonical: 2 },
        { xCanonical: 2, yCanonical: 4 },
      ],
    },
  ],
  provenance: { sourceKind: "measured", sourceDescription: "Timer" },
});
if (!data.ok) throw new Error(data.error.kind);
const viewport = {
  space: "screen-layout" as const,
  x: 0,
  y: 0,
  width: 600,
  height: 360,
  padding: { left: 60, right: 20, top: 20, bottom: 50 },
};

const analysisKey = dataSeriesKey("analysis.motion");
const analysisData = createCartesianDataset({
  id: ids.datasetId(),
  name: "Analysed motion",
  series: [
    {
      key: analysisKey,
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
  provenance: { sourceKind: "measured", sourceDescription: "Motion sensor" },
});
if (!analysisData.ok) throw new Error(analysisData.error.kind);

function graph() {
  return createCartesianGraph({
    id: ids.graphId(),
    name: "Displacement–time",
    xAxis: {
      label: "Time",
      unitExpression: "s",
      scale: "linear",
      domain: { kind: "manual", minCanonical: 0, maxCanonical: 2 },
      tickTarget: 5,
    },
    yAxis: {
      label: "Displacement",
      unitExpression: "m",
      scale: "linear",
      domain: { kind: "manual", minCanonical: 0, maxCanonical: 4 },
      tickTarget: 5,
    },
    series: [
      {
        datasetId: data.value.id,
        seriesKey: key,
        style: { strokeHex: "#35cfe1", lineWidth: 2 },
      },
    ],
    points: [
      {
        id: "midpoint",
        datasetId: data.value.id,
        seriesKey: key,
        sampleIndex: 1,
        label: "mid",
        radius: 4,
      },
    ],
    annotations: [
      { id: "uniform", text: "uniform motion", xCanonical: 1.5, yCanonical: 3 },
    ],
    cursor: { enabled: true, mode: "linear-interpolation" },
  });
}

function analysisGraph() {
  return createCartesianGraph({
    id: ids.graphId(),
    name: "Velocity analysis",
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
        datasetId: analysisData.value.id,
        seriesKey: analysisKey,
        style: { strokeHex: "#35cfe1", lineWidth: 2 },
      },
    ],
    points: [],
    annotations: [],
    analysisOverlays: [
      {
        id: "gradient",
        kind: "tangent",
        datasetId: analysisData.value.id,
        seriesKey: analysisKey,
        xCanonical: 2,
        strokeHex: "#ffcf70",
        lineWidth: 2,
        triangleRunCanonical: 1,
      },
      {
        id: "area",
        kind: "area",
        datasetId: analysisData.value.id,
        seriesKey: analysisKey,
        xMinCanonical: 0,
        xMaxCanonical: 4,
        baselineCanonical: 0,
        fillHex: "#79a7ff",
        opacity: 0.25,
      },
      {
        id: "maximum",
        kind: "maximum",
        datasetId: analysisData.value.id,
        seriesKey: analysisKey,
        label: "maximum velocity",
        markerHex: "#ff8c70",
      },
      {
        id: "fit",
        kind: "linear-fit",
        datasetId: analysisData.value.id,
        seriesKey: analysisKey,
        strokeHex: "#d499ff",
        lineWidth: 2,
      },
      {
        id: "uncertainty",
        kind: "error-bars",
        datasetId: analysisData.value.id,
        seriesKey: analysisKey,
        strokeHex: "#e9f7f5",
        lineWidth: 1,
        capSize: 5,
      },
    ],
    cursor: { enabled: false, mode: "nearest" },
  });
}

describe("Cartesian graph V1", () => {
  it("round-trips its GraphDefinition envelope", () => {
    const model = graph();
    expect(model.ok).toBe(true);
    if (!model.ok) return;
    const envelope = toCartesianGraphDefinition(model.value);
    expect(envelope.ok).toBe(true);
    if (!envelope.ok) return;
    expect(
      parseCartesianGraphDefinition(JSON.parse(JSON.stringify(envelope.value))),
    ).toEqual(model);
  });
  it("rejects unsupported and malformed graph envelopes", () => {
    const model = graph();
    expect(model.ok).toBe(true);
    if (!model.ok) return;
    const envelope = toCartesianGraphDefinition(model.value);
    expect(envelope.ok).toBe(true);
    if (!envelope.ok) return;
    expect(
      parseCartesianGraphDefinition({
        ...envelope.value,
        typeId: registeredTypeId("physica:graph/future-v2"),
      }),
    ).toMatchObject({
      ok: false,
      error: { kind: "unsupported-graph-envelope" },
    });
    expect(
      parseCartesianGraphDefinition({
        ...envelope.value,
        configuration: { name: "Malformed", xAxis: "invalid" },
      }),
    ).toMatchObject({
      ok: false,
      error: { kind: "invalid-graph-envelope" },
    });
  });
  it("resolves axes, curves, cursor, points and annotations", () => {
    const model = graph();
    expect(model.ok).toBe(true);
    if (!model.ok) return;
    const result = resolveCartesianGraph({
      graph: model.value,
      datasets: [data.value],
      viewport,
      cursorXCanonical: 1.5,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.curves[0]!.points).toEqual([
      { space: "screen-layout", x: 60, y: 310 },
      { space: "screen-layout", x: 320, y: 165 },
      { space: "screen-layout", x: 580, y: 20 },
    ]);
    expect(result.value.cursor?.readouts[0]).toMatchObject({
      xDisplay: "1.5",
      yDisplay: "3",
    });
    expect(result.value.points).toHaveLength(1);
    expect(result.value.annotations).toHaveLength(1);
    expect(Object.isFrozen(result.value.curves[0]!.points)).toBe(true);
  });
  it("rejects incompatible units and non-positive log data", () => {
    const model = graph();
    expect(model.ok).toBe(true);
    if (!model.ok) return;
    const incompatible = createCartesianGraph({
      ...model.value,
      id: ids.graphId(),
      yAxis: { ...model.value.yAxis, unitExpression: "s" },
    });
    expect(incompatible.ok).toBe(true);
    if (!incompatible.ok) return;
    expect(
      resolveCartesianGraph({
        graph: incompatible.value,
        datasets: [data.value],
        viewport,
      }),
    ).toMatchObject({
      ok: false,
      error: { kind: "incompatible-axis-unit", axis: "y" },
    });
    const logarithmic = createCartesianGraph({
      ...model.value,
      id: ids.graphId(),
      xAxis: { ...model.value.xAxis, scale: "log10", domain: { kind: "auto" } },
    });
    expect(logarithmic.ok).toBe(true);
    if (!logarithmic.ok) return;
    expect(
      resolveCartesianGraph({
        graph: logarithmic.value,
        datasets: [data.value],
        viewport,
      }),
    ).toMatchObject({
      ok: false,
      error: { kind: "invalid-log-domain", axis: "x", value: 0 },
    });
  });
  it("resolves positive log axes, degenerate auto ranges and display units", () => {
    const positiveKey = dataSeriesKey("positive");
    const positiveData = createCartesianDataset({
      id: ids.datasetId(),
      name: "Positive scale data",
      series: [
        {
          key: positiveKey,
          name: "Length",
          x: { label: "Ratio", symbol: "r", unitExpression: "s" },
          y: { label: "Length", symbol: "l", unitExpression: "m" },
          samples: [1, 10, 100].map((xCanonical) => ({
            xCanonical,
            yCanonical: 0.02,
          })),
        },
      ],
      provenance: { sourceKind: "derived", sourceDescription: "Scale test" },
    });
    expect(positiveData.ok).toBe(true);
    if (!positiveData.ok) return;
    const logarithmic = createCartesianGraph({
      id: ids.graphId(),
      name: "Logarithmic scale",
      xAxis: {
        label: "Ratio",
        unitExpression: "s",
        scale: "log10",
        domain: { kind: "auto" },
        tickTarget: 4,
      },
      yAxis: {
        label: "Length",
        unitExpression: "cm",
        scale: "linear",
        domain: { kind: "auto" },
        tickTarget: 5,
      },
      series: [
        {
          datasetId: positiveData.value.id,
          seriesKey: positiveKey,
          style: { strokeHex: "#ffffff", lineWidth: 2 },
        },
      ],
      points: [],
      annotations: [],
      cursor: { enabled: false, mode: "nearest" },
    });
    expect(logarithmic.ok).toBe(true);
    if (!logarithmic.ok) return;
    const resolved = resolveCartesianGraph({
      graph: logarithmic.value,
      datasets: [positiveData.value],
      viewport,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.value.xDomain).toEqual([1, 100]);
    expect(resolved.value.xTicks.map((tick) => tick.label)).toEqual([
      "1",
      "10",
      "100",
    ]);
    expect(resolved.value.yDomain[0]).toBeLessThan(0.02);
    expect(resolved.value.yDomain[1]).toBeGreaterThan(0.02);
    expect(resolved.value.yAxisLabel).toBe("Length (cm)");
    expect(resolved.value.curves[0]!.source[0]!.yCanonical).toBe(0.02);
  });
  it("resizes layout without mutating canonical data", () => {
    const model = graph();
    expect(model.ok).toBe(true);
    if (!model.ok) return;
    const before = JSON.stringify(data.value);
    const small = resolveCartesianGraph({
      graph: model.value,
      datasets: [data.value],
      viewport: { ...viewport, width: 300 },
    });
    const large = resolveCartesianGraph({
      graph: model.value,
      datasets: [data.value],
      viewport,
    });
    expect(
      small.ok &&
        large.ok &&
        small.value.curves[0]!.points[1]!.x !==
          large.value.curves[0]!.points[1]!.x,
    ).toBe(true);
    expect(JSON.stringify(data.value)).toBe(before);
  });
});

describe("Cartesian graph analysis overlays", () => {
  it("round-trips optional V1 analyses without changing legacy omission", () => {
    const legacy = graph();
    const analysed = analysisGraph();
    expect(legacy.ok && analysed.ok).toBe(true);
    if (!legacy.ok || !analysed.ok) return;
    const legacyEnvelope = toCartesianGraphDefinition(legacy.value);
    const analysedEnvelope = toCartesianGraphDefinition(analysed.value);
    expect(legacyEnvelope.ok && analysedEnvelope.ok).toBe(true);
    if (!legacyEnvelope.ok || !analysedEnvelope.ok) return;
    expect("analysisOverlays" in legacyEnvelope.value.configuration).toBe(
      false,
    );
    expect(
      parseCartesianGraphDefinition(
        JSON.parse(JSON.stringify(analysedEnvelope.value)),
      ),
    ).toEqual(analysed);
  });

  it("resolves exact tangent, triangle, area, maximum, fit and uncertainty", () => {
    const model = analysisGraph();
    expect(model.ok).toBe(true);
    if (!model.ok) return;
    const before = JSON.stringify(analysisData.value);
    const resolved = resolveCartesianGraph({
      graph: model.value,
      datasets: [analysisData.value],
      viewport,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const tangent = resolved.value.analyses.find(
      (item) => item.kind === "tangent",
    );
    const area = resolved.value.analyses.find((item) => item.kind === "area");
    const maximum = resolved.value.analyses.find(
      (item) => item.kind === "maximum",
    );
    const fit = resolved.value.analyses.find(
      (item) => item.kind === "linear-fit",
    );
    const uncertainty = resolved.value.analyses.find(
      (item) => item.kind === "error-bars",
    );
    expect(tangent).toMatchObject({
      slopeCanonical: 2,
      anchor: { xCanonical: 2, yCanonical: 5 },
      triangle: { runCanonical: 1, riseCanonical: 2 },
    });
    expect(area).toMatchObject({ signedAreaCanonical: 20, displayArea: 20 });
    expect(maximum).toMatchObject({
      source: { xCanonical: 4, yCanonical: 9 },
    });
    expect(fit).toMatchObject({
      slopeCanonical: 2,
      interceptCanonical: 1,
      rSquared: 1,
    });
    expect(uncertainty).toMatchObject({ sampleCount: 5 });
    expect(
      uncertainty?.kind === "error-bars" && uncertainty.segments,
    ).toHaveLength(10);
    expect(Object.isFrozen(resolved.value.analyses)).toBe(true);
    expect(JSON.stringify(analysisData.value)).toBe(before);
  });

  it("keeps canonical results invariant across viewport changes", () => {
    const model = analysisGraph();
    expect(model.ok).toBe(true);
    if (!model.ok) return;
    const small = resolveCartesianGraph({
      graph: model.value,
      datasets: [analysisData.value],
      viewport: { ...viewport, width: 320 },
    });
    const large = resolveCartesianGraph({
      graph: model.value,
      datasets: [analysisData.value],
      viewport,
    });
    expect(small.ok && large.ok).toBe(true);
    if (!small.ok || !large.ok) return;
    expect(
      small.value.analyses.map(({ kind, summary }) => ({ kind, summary })),
    ).toEqual(
      large.value.analyses.map(({ kind, summary }) => ({ kind, summary })),
    );
    const smallTangent = small.value.analyses.find(
      (item) => item.kind === "tangent",
    );
    const largeTangent = large.value.analyses.find(
      (item) => item.kind === "tangent",
    );
    expect(
      smallTangent?.kind === "tangent" &&
        largeTangent?.kind === "tangent" &&
        smallTangent.line.to.x !== largeTangent.line.to.x,
    ).toBe(true);
  });

  it("resolves histogram bars from canonical bin centres", () => {
    const histogramKey = dataSeriesKey("histogram.count");
    const histogram = createCartesianDataset({
      id: ids.datasetId(),
      name: "Histogram",
      series: [
        {
          key: histogramKey,
          name: "Counts",
          x: { label: "Length", symbol: "l", unitExpression: "m" },
          y: { label: "Count", symbol: "n", unitExpression: "" },
          samples: [
            { xCanonical: 1, yCanonical: 2 },
            { xCanonical: 3, yCanonical: 3 },
          ],
        },
      ],
      provenance: { sourceKind: "derived", sourceDescription: "Histogram" },
    });
    expect(histogram.ok).toBe(true);
    if (!histogram.ok) return;
    const model = createCartesianGraph({
      id: ids.graphId(),
      name: "Histogram",
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
          datasetId: histogram.value.id,
          seriesKey: histogramKey,
          style: {
            strokeHex: "#35cfe1",
            fillHex: "#35cfe1",
            lineWidth: 1,
            renderMode: "bars",
            barWidthCanonical: 2,
          },
        },
      ],
      points: [],
      annotations: [],
      cursor: { enabled: false, mode: "nearest" },
    });
    expect(model.ok).toBe(true);
    if (!model.ok) return;
    const resolved = resolveCartesianGraph({
      graph: model.value,
      datasets: [histogram.value],
      viewport,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.value.curves[0]!.bars).toHaveLength(2);
    expect(resolved.value.curves[0]!.bars?.[0]?.source).toEqual({
      xMinCanonical: 0,
      xMaxCanonical: 2,
      yCanonical: 2,
      baselineCanonical: 0,
    });
  });
});
