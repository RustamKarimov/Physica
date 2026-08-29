import { describe, expect, it } from "vitest";
import {
  DIMENSIONLESS,
  LENGTH,
  MASS,
  TIME,
  addQuantity,
  approximatelyEqualQuantity,
  createDefaultUnitRegistry,
  createQuantity,
  divideDimensions,
  divideQuantity,
  equalDimensions,
  formatQuantityDisplayValue,
  multiplyDimensions,
  multiplyQuantity,
  powerDimension,
  quantityDisplayValue,
  rootDimension,
  scaleQuantity,
  unitId,
  withDisplayUnit,
} from "../src";

describe("SI dimensions", () => {
  it("performs exact derived dimensional algebra", () => {
    const acceleration = divideDimensions(LENGTH, powerDimension(TIME, 2));
    const force = multiplyDimensions(MASS, acceleration);
    const energy = multiplyDimensions(force, LENGTH);
    expect(force).toEqual({
      mass: 1,
      length: 1,
      time: -2,
      electricCurrent: 0,
      thermodynamicTemperature: 0,
      amountOfSubstance: 0,
      luminousIntensity: 0,
    });
    expect(energy).toEqual({ ...force, length: 2 });
    expect(rootDimension(powerDimension(LENGTH, 2), 2)).toEqual({
      ok: true,
      value: LENGTH,
    });
    expect(rootDimension(LENGTH, 2)).toMatchObject({
      ok: false,
      error: { kind: "inexact-dimension-root" },
    });
    expect(
      equalDimensions(divideDimensions(LENGTH, LENGTH), DIMENSIONLESS),
    ).toBe(true);
  });
});

describe("unit registry and parser", () => {
  it("resolves exact units before prefixes and covers representative SI prefixes", () => {
    const registry = createDefaultUnitRegistry();
    expect(registry.resolveSymbol("kg")).toMatchObject({
      ok: true,
      value: { id: unitId("si:kilogram"), scale: 1 },
    });
    expect(registry.resolveSymbol("km")).toMatchObject({
      ok: true,
      value: { scale: 1000 },
    });
    expect(registry.resolveSymbol("mm")).toMatchObject({
      ok: true,
      value: { scale: 0.001 },
    });
    expect(registry.resolveSymbol("µm")).toMatchObject({
      ok: true,
      value: { scale: 1e-6 },
    });
    expect(registry.resolveSymbol("Qm")).toMatchObject({
      ok: true,
      value: { scale: 1e30 },
    });
    expect(registry.resolveSymbol("qm")).toMatchObject({
      ok: true,
      value: { scale: 1e-30 },
    });
    expect(registry.resolveSymbol("h")).toMatchObject({
      ok: true,
      value: { id: unitId("accepted:hour") },
    });
  });

  it("parses products, divisions, whitespace and integer exponents", () => {
    const registry = createDefaultUnitRegistry();
    const force = registry.parse("kg * m / s^2");
    const newton = registry.parse("N");
    expect(
      force.ok &&
        newton.ok &&
        equalDimensions(force.value.dimension, newton.value.dimension),
    ).toBe(true);
    expect(force).toMatchObject({ ok: true, value: { scale: 1 } });
    expect(registry.parse("m s^-1")).toMatchObject({
      ok: true,
      value: { dimension: { length: 1, time: -1 } },
    });
    expect(registry.parse("m//s")).toMatchObject({
      ok: false,
      error: { kind: "invalid-unit-expression" },
    });
    expect(registry.parse("unknown")).toMatchObject({
      ok: false,
      error: { kind: "unknown-unit" },
    });
    expect(registry.parse("°C/s")).toMatchObject({
      ok: false,
      error: { kind: "affine-unit-expression" },
    });
  });

  it("rejects duplicate registry identities and symbols", () => {
    const registry = createDefaultUnitRegistry();
    const metre = registry.get(unitId("si:metre"))!;
    expect(registry.register({ ...metre })).toMatchObject({
      ok: false,
      error: { kind: "duplicate-unit-id" },
    });
    expect(
      registry.register({ ...metre, id: unitId("test:other-metre") }),
    ).toMatchObject({ ok: false, error: { kind: "duplicate-unit-symbol" } });
  });
});

describe("quantities, conversions and uncertainty", () => {
  it("stores canonical SI values and changes display units without changing them", () => {
    const registry = createDefaultUnitRegistry();
    const distance = createQuantity(1.5, "km", registry);
    expect(distance).toMatchObject({
      ok: true,
      value: { canonicalValue: 1500 },
    });
    if (!distance.ok) return;
    const metres = withDisplayUnit(distance.value, "m", registry);
    expect(metres.ok).toBe(true);
    if (metres.ok) {
      expect(metres.value.canonicalValue).toBe(1500);
      expect(quantityDisplayValue(metres.value)).toBe(1500);
    }
  });

  it("converts affine temperature units safely", () => {
    const registry = createDefaultUnitRegistry();
    const temperature = createQuantity(20, "°C", registry);
    expect(temperature).toMatchObject({
      ok: true,
      value: { canonicalValue: 293.15 },
    });
    if (!temperature.ok) return;
    const kelvin = withDisplayUnit(temperature.value, "K", registry);
    expect(kelvin.ok).toBe(true);
    if (kelvin.ok)
      expect(quantityDisplayValue(kelvin.value)).toBeCloseTo(293.15, 12);
  });

  it("enforces dimension and semantic-kind compatibility", () => {
    const registry = createDefaultUnitRegistry();
    const length = createQuantity(1, "m", registry);
    const time = createQuantity(1, "s", registry);
    const angle = createQuantity(1, "rad", registry);
    const ratio = createQuantity(1, "1", registry);
    if (!length.ok || !time.ok || !angle.ok || !ratio.ok)
      throw new Error("fixture failure");
    expect(addQuantity(length.value, time.value)).toMatchObject({
      ok: false,
      error: { kind: "incompatible-quantity" },
    });
    expect(addQuantity(angle.value, ratio.value)).toMatchObject({
      ok: false,
      error: { kind: "incompatible-quantity" },
    });
    const speed = divideQuantity(length.value, time.value, registry);
    expect(speed).toMatchObject({
      ok: true,
      value: { dimension: { length: 1, time: -1 }, semanticKind: null },
    });
    const dimensionless = divideQuantity(length.value, length.value, registry);
    expect(dimensionless).toMatchObject({
      ok: true,
      value: { semanticKind: "generic" },
    });
  });

  it("propagates independent uncertainty by root-sum-square", () => {
    const registry = createDefaultUnitRegistry();
    const a = createQuantity(10, "m", registry, {
      uncertainty: { kind: "absolute-display", value: 0.3 },
    });
    const b = createQuantity(20, "m", registry, {
      uncertainty: { kind: "absolute-display", value: 0.4 },
    });
    if (!a.ok || !b.ok) throw new Error("fixture failure");
    expect(addQuantity(a.value, b.value)).toMatchObject({
      ok: true,
      value: { uncertainty: { kind: "absolute", canonicalValue: 0.5 } },
    });
    const product = multiplyQuantity(a.value, b.value, registry);
    expect(product.ok).toBe(true);
    if (product.ok && product.value.uncertainty?.kind === "relative")
      expect(product.value.uncertainty.fraction).toBeCloseTo(
        Math.hypot(0.03, 0.02),
        12,
      );
    expect(scaleQuantity(a.value, -2)).toMatchObject({
      ok: true,
      value: { uncertainty: { canonicalValue: 0.6 } },
    });
  });

  it("handles atomic and astronomical finite ranges", () => {
    const registry = createDefaultUnitRegistry();
    const atomic = createQuantity(1e-30, "m", registry);
    const astronomical = createQuantity(1e30, "m", registry);
    expect(atomic.ok && astronomical.ok).toBe(true);
    if (atomic.ok)
      expect(approximatelyEqualQuantity(atomic.value, atomic.value)).toBe(true);
    expect(createQuantity(Number.NaN, "m", registry)).toMatchObject({
      ok: false,
      error: { kind: "non-finite-result" },
    });
    if (atomic.ok) {
      expect(
        scaleQuantity(atomic.value, Number.POSITIVE_INFINITY),
      ).toMatchObject({ ok: false, error: { kind: "non-finite-result" } });
    }
  });

  it("formats explicit precision policies deterministically", () => {
    const registry = createDefaultUnitRegistry();
    const decimal = createQuantity(1.2345, "m", registry, {
      precisionPolicy: { kind: "decimal-places", places: 2 },
    });
    const significant = createQuantity(1234.5, "m", registry, {
      precisionPolicy: { kind: "significant-figures", figures: 3 },
    });
    if (!decimal.ok || !significant.ok) throw new Error("fixture failure");
    expect(formatQuantityDisplayValue(decimal.value)).toBe("1.23");
    expect(formatQuantityDisplayValue(significant.value)).toBe("1.23e+3");
  });
});
