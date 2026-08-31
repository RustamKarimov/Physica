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
