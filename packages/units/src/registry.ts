import { requireFinite } from "@physica/mathematics";
import {
  AMOUNT_OF_SUBSTANCE,
  DIMENSIONLESS,
  ELECTRIC_CURRENT,
  LENGTH,
  LUMINOUS_INTENSITY,
  MASS,
  THERMODYNAMIC_TEMPERATURE,
  TIME,
  dimensionSignature,
  divideDimensions,
  equalDimensions,
  isDimensionless,
  multiplyDimensions,
  powerDimension,
  unitId,
  type Dimension,
  type SemanticDimensionlessKind,
  type UnitId,
} from "./dimensions";

export interface UnitDefinition {
  readonly id: UnitId;
  readonly symbol: string;
  readonly name: string;
  readonly dimension: Dimension;
  readonly scale: number;
  readonly offset: number;
  readonly semanticKind: SemanticDimensionlessKind | null;
  readonly prefixPolicy: "none" | "si-decimal";
  readonly aliases: readonly string[];
}

export interface ParsedUnit {
  readonly expression: string;
  readonly dimension: Dimension;
  readonly scale: number;
  readonly offset: number;
  readonly semanticKind: SemanticDimensionlessKind | null;
  readonly standaloneUnitId?: UnitId;
}

export type UnitError =
  | { readonly kind: "invalid-unit"; readonly message: string }
  | { readonly kind: "duplicate-unit-id"; readonly id: UnitId }
  | { readonly kind: "duplicate-unit-symbol"; readonly symbol: string }
  | { readonly kind: "unknown-unit"; readonly token: string }
  | {
      readonly kind: "invalid-unit-expression";
      readonly expression: string;
      readonly message: string;
    }
  | { readonly kind: "affine-unit-expression"; readonly expression: string }
  | {
      readonly kind: "incompatible-dimension";
      readonly from: Dimension;
      readonly to: Dimension;
    }
  | {
      readonly kind: "incompatible-semantic-kind";
      readonly from: SemanticDimensionlessKind | null;
      readonly to: SemanticDimensionlessKind | null;
    };

export type UnitResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: UnitError };

export const SI_PREFIXES: readonly {
  readonly symbol: string;
  readonly scale: number;
}[] = Object.freeze([
  { symbol: "da", scale: 1e1 },
  { symbol: "Q", scale: 1e30 },
  { symbol: "R", scale: 1e27 },
  { symbol: "Y", scale: 1e24 },
  { symbol: "Z", scale: 1e21 },
  { symbol: "E", scale: 1e18 },
  { symbol: "P", scale: 1e15 },
  { symbol: "T", scale: 1e12 },
  { symbol: "G", scale: 1e9 },
  { symbol: "M", scale: 1e6 },
  { symbol: "k", scale: 1e3 },
  { symbol: "h", scale: 1e2 },
  { symbol: "d", scale: 1e-1 },
  { symbol: "c", scale: 1e-2 },
  { symbol: "m", scale: 1e-3 },
  { symbol: "µ", scale: 1e-6 },
  { symbol: "u", scale: 1e-6 },
  { symbol: "n", scale: 1e-9 },
  { symbol: "p", scale: 1e-12 },
  { symbol: "f", scale: 1e-15 },
  { symbol: "a", scale: 1e-18 },
  { symbol: "z", scale: 1e-21 },
  { symbol: "y", scale: 1e-24 },
  { symbol: "r", scale: 1e-27 },
  { symbol: "q", scale: 1e-30 },
]);

function generatedUnitId(symbol: string): UnitId {
  const encoded = [...symbol]
    .map((character) => character.codePointAt(0)!.toString(16))
    .join("-");
  return unitId(`generated:u${encoded}`);
}

function freezeDefinition(definition: UnitDefinition): UnitDefinition {
  requireFinite(definition.scale, "unit scale");
  requireFinite(definition.offset, "unit offset");
  if (
    definition.scale <= 0 ||
    definition.symbol.length === 0 ||
    definition.name.length === 0
  )
    throw new RangeError("Unit scale, symbol and name are invalid.");
  if (
    isDimensionless(definition.dimension) !==
    (definition.semanticKind !== null)
  )
    throw new RangeError(
      "Only dimensionless units may define a semantic kind, and dimensionless units require one.",
    );
  return Object.freeze({
    ...definition,
    dimension: Object.freeze({ ...definition.dimension }),
    aliases: Object.freeze([...definition.aliases]),
  });
}

function combineSemanticKinds(
  current: SemanticDimensionlessKind | null,
  next: SemanticDimensionlessKind | null,
  resultDimension: Dimension,
): SemanticDimensionlessKind | null {
  if (!isDimensionless(resultDimension)) return null;
  if (current === null) return next ?? "generic";
  if (next === null) return current;
  if (current === "generic") return next;
  if (next === "generic") return current;
  return current === next ? current : "generic";
}

export class DefaultUnitRegistry {
  private readonly byId = new Map<UnitId, UnitDefinition>();
  private readonly bySymbol = new Map<string, UnitDefinition>();
  private readonly parsedCache = new Map<string, ParsedUnit>();

  register(definition: UnitDefinition): UnitResult<void> {
    let frozen: UnitDefinition;
    try {
      frozen = freezeDefinition(definition);
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: "invalid-unit",
          message: error instanceof Error ? error.message : "Invalid unit.",
        },
      };
    }
    if (this.byId.has(frozen.id))
      return { ok: false, error: { kind: "duplicate-unit-id", id: frozen.id } };
    for (const symbol of [frozen.symbol, ...frozen.aliases]) {
      if (this.bySymbol.has(symbol))
        return { ok: false, error: { kind: "duplicate-unit-symbol", symbol } };
    }
    this.byId.set(frozen.id, frozen);
    for (const symbol of [frozen.symbol, ...frozen.aliases])
      this.bySymbol.set(symbol, frozen);
    this.parsedCache.clear();
    return { ok: true, value: undefined };
  }

  get(id: UnitId): UnitDefinition | undefined {
    return this.byId.get(id);
  }

  resolveSymbol(symbolOrAlias: string): UnitResult<UnitDefinition> {
    const exact = this.bySymbol.get(symbolOrAlias);
    if (exact) return { ok: true, value: exact };
    for (const prefix of SI_PREFIXES) {
      if (
        !symbolOrAlias.startsWith(prefix.symbol) ||
        symbolOrAlias.length === prefix.symbol.length
      )
        continue;
      const base = this.bySymbol.get(symbolOrAlias.slice(prefix.symbol.length));
      if (base?.prefixPolicy === "si-decimal" && base.offset === 0) {
        return {
          ok: true,
          value: Object.freeze({
            ...base,
            id: generatedUnitId(symbolOrAlias),
            symbol: symbolOrAlias,
            name: `${prefix.symbol}${base.name}`,
            scale: prefix.scale * base.scale,
            prefixPolicy: "none",
            aliases: [],
          }),
        };
      }
    }
    return { ok: false, error: { kind: "unknown-unit", token: symbolOrAlias } };
  }

  parse(expression: string): UnitResult<ParsedUnit> {
    const normalized = expression.trim();
    const cached = this.parsedCache.get(normalized);
    if (cached) return { ok: true, value: cached };
    if (normalized === "") {
      const one = this.byId.get(unitId("si:one"))!;
      const parsed = Object.freeze({
        expression: "",
        dimension: one.dimension,
        scale: 1,
        offset: 0,
        semanticKind: one.semanticKind,
        standaloneUnitId: one.id,
      });
      return { ok: true, value: parsed };
    }
    const divisions = normalized.split("/");
    if (divisions.some((segment) => segment.trim() === ""))
      return {
        ok: false,
        error: {
          kind: "invalid-unit-expression",
          expression,
          message: "Division requires a unit on both sides.",
        },
      };
    let resultDimension = DIMENSIONLESS;
    let resultScale = 1;
    let semanticKind: SemanticDimensionlessKind | null = "generic";
    let standalone: UnitDefinition | undefined;
    let factorCount = 0;
    for (
      let divisionIndex = 0;
      divisionIndex < divisions.length;
      divisionIndex += 1
    ) {
      const tokens = divisions[divisionIndex]!.replaceAll("*", " ")
        .trim()
        .split(/\s+/u);
      for (const token of tokens) {
        const match = /^([^^]+?)(?:\^([+-]?\d+))?$/u.exec(token);
        if (!match)
          return {
            ok: false,
            error: {
              kind: "invalid-unit-expression",
              expression,
              message: `Invalid factor ${token}.`,
            },
          };
        const resolved = this.resolveSymbol(match[1]!);
        if (!resolved.ok) return resolved;
        let exponent = match[2] === undefined ? 1 : Number(match[2]);
        if (!Number.isSafeInteger(exponent))
          return {
            ok: false,
            error: {
              kind: "invalid-unit-expression",
              expression,
              message: "Unit exponents must be safe integers.",
            },
          };
        if (divisionIndex > 0) exponent *= -1;
        factorCount += 1;
        if (
          resolved.value.offset !== 0 &&
          (factorCount !== 1 || divisions.length !== 1 || exponent !== 1)
        )
          return {
            ok: false,
            error: { kind: "affine-unit-expression", expression },
          };
        resultDimension = multiplyDimensions(
          resultDimension,
          powerDimension(resolved.value.dimension, exponent),
        );
        resultScale *= resolved.value.scale ** exponent;
        semanticKind = combineSemanticKinds(
          semanticKind,
          resolved.value.semanticKind,
          resultDimension,
        );
        standalone =
          factorCount === 1 && exponent === 1 && divisions.length === 1
            ? resolved.value
            : undefined;
      }
    }
    const parsed: ParsedUnit = Object.freeze({
      expression: normalized,
      dimension: resultDimension,
      scale: resultScale,
      offset: standalone?.offset ?? 0,
      semanticKind: isDimensionless(resultDimension)
        ? (semanticKind ?? "generic")
        : null,
      ...(standalone ? { standaloneUnitId: standalone.id } : {}),
    });
    this.parsedCache.set(normalized, parsed);
    return { ok: true, value: parsed };
  }

  coherentUnit(
    dimensionValue: Dimension,
    semanticKind: SemanticDimensionlessKind | null,
  ): UnitDefinition {
    const existing = [...this.byId.values()].find(
      (candidate) =>
        equalDimensions(candidate.dimension, dimensionValue) &&
        candidate.scale === 1 &&
        candidate.offset === 0 &&
        candidate.semanticKind === semanticKind,
    );
    if (existing) return existing;
    const safeSemanticKind = (semanticKind ?? "physical").replaceAll(
      /[^a-z0-9._/-]/g,
      "-",
    );
    const id = unitId(
      `coherent:${dimensionSignature(dimensionValue)}-${safeSemanticKind}`,
    );
    const generated = freezeDefinition({
      id,
      symbol: `[${dimensionSignature(dimensionValue)}]`,
      name: "coherent SI unit",
      dimension: dimensionValue,
      scale: 1,
      offset: 0,
      semanticKind,
      prefixPolicy: "none",
      aliases: [],
    });
    this.byId.set(id, generated);
    return generated;
  }
}

function unit(
  definition: Omit<UnitDefinition, "aliases" | "prefixPolicy"> &
    Partial<Pick<UnitDefinition, "aliases" | "prefixPolicy">>,
): UnitDefinition {
  return {
    ...definition,
    aliases: definition.aliases ?? [],
    prefixPolicy: definition.prefixPolicy ?? "none",
  };
}

export function createDefaultUnitRegistry(): DefaultUnitRegistry {
  const registry = new DefaultUnitRegistry();
  const derived = {
    frequency: powerDimension(TIME, -1),
    force: multiplyDimensions(
      MASS,
      multiplyDimensions(LENGTH, powerDimension(TIME, -2)),
    ),
  };
  const pressure = divideDimensions(derived.force, powerDimension(LENGTH, 2));
  const energy = multiplyDimensions(derived.force, LENGTH);
  const power = divideDimensions(energy, TIME);
  const charge = multiplyDimensions(ELECTRIC_CURRENT, TIME);
  const voltage = divideDimensions(power, ELECTRIC_CURRENT);
  const resistance = divideDimensions(voltage, ELECTRIC_CURRENT);
  const conductance = powerDimension(resistance, -1);
  const capacitance = divideDimensions(charge, voltage);
  const flux = multiplyDimensions(voltage, TIME);
  const magneticFluxDensity = divideDimensions(flux, powerDimension(LENGTH, 2));
  const inductance = divideDimensions(flux, ELECTRIC_CURRENT);
  const definitions: UnitDefinition[] = [
    unit({
      id: unitId("si:one"),
      symbol: "1",
      name: "one",
      dimension: DIMENSIONLESS,
      scale: 1,
      offset: 0,
      semanticKind: "generic",
    }),
    unit({
      id: unitId("si:radian"),
      symbol: "rad",
      name: "radian",
      dimension: DIMENSIONLESS,
      scale: 1,
      offset: 0,
      semanticKind: "angle",
    }),
    unit({
      id: unitId("si:steradian"),
      symbol: "sr",
      name: "steradian",
      dimension: DIMENSIONLESS,
      scale: 1,
      offset: 0,
      semanticKind: "solid-angle",
    }),
    unit({
      id: unitId("si:percent"),
      symbol: "%",
      name: "percent",
      dimension: DIMENSIONLESS,
      scale: 0.01,
      offset: 0,
      semanticKind: "ratio",
    }),
    unit({
      id: unitId("si:metre"),
      symbol: "m",
      name: "metre",
      dimension: LENGTH,
      scale: 1,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
      aliases: ["meter"],
    }),
    unit({
      id: unitId("si:kilogram"),
      symbol: "kg",
      name: "kilogram",
      dimension: MASS,
      scale: 1,
      offset: 0,
      semanticKind: null,
    }),
    unit({
      id: unitId("si:gram"),
      symbol: "g",
      name: "gram",
      dimension: MASS,
      scale: 1e-3,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
    }),
    unit({
      id: unitId("si:second"),
      symbol: "s",
      name: "second",
      dimension: TIME,
      scale: 1,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
    }),
    unit({
      id: unitId("si:ampere"),
      symbol: "A",
      name: "ampere",
      dimension: ELECTRIC_CURRENT,
      scale: 1,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
    }),
    unit({
      id: unitId("si:kelvin"),
      symbol: "K",
      name: "kelvin",
      dimension: THERMODYNAMIC_TEMPERATURE,
      scale: 1,
      offset: 0,
      semanticKind: null,
    }),
    unit({
      id: unitId("si:mole"),
      symbol: "mol",
      name: "mole",
      dimension: AMOUNT_OF_SUBSTANCE,
      scale: 1,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
    }),
    unit({
      id: unitId("si:candela"),
      symbol: "cd",
      name: "candela",
      dimension: LUMINOUS_INTENSITY,
      scale: 1,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
    }),
    unit({
      id: unitId("si:hertz"),
      symbol: "Hz",
      name: "hertz",
      dimension: derived.frequency,
      scale: 1,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
    }),
    unit({
      id: unitId("si:newton"),
      symbol: "N",
      name: "newton",
      dimension: derived.force,
      scale: 1,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
    }),
    unit({
      id: unitId("si:pascal"),
      symbol: "Pa",
      name: "pascal",
      dimension: pressure,
      scale: 1,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
    }),
    unit({
      id: unitId("si:joule"),
      symbol: "J",
      name: "joule",
      dimension: energy,
      scale: 1,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
    }),
    unit({
      id: unitId("si:watt"),
      symbol: "W",
      name: "watt",
      dimension: power,
      scale: 1,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
    }),
    unit({
      id: unitId("si:coulomb"),
      symbol: "C",
      name: "coulomb",
      dimension: charge,
      scale: 1,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
    }),
    unit({
      id: unitId("si:volt"),
      symbol: "V",
      name: "volt",
      dimension: voltage,
      scale: 1,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
    }),
    unit({
      id: unitId("si:farad"),
      symbol: "F",
      name: "farad",
      dimension: capacitance,
      scale: 1,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
    }),
    unit({
      id: unitId("si:ohm"),
      symbol: "Ω",
      name: "ohm",
      dimension: resistance,
      scale: 1,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
      aliases: ["ohm"],
    }),
    unit({
      id: unitId("si:siemens"),
      symbol: "S",
      name: "siemens",
      dimension: conductance,
      scale: 1,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
    }),
    unit({
      id: unitId("si:weber"),
      symbol: "Wb",
      name: "weber",
      dimension: flux,
      scale: 1,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
    }),
    unit({
      id: unitId("si:tesla"),
      symbol: "T",
      name: "tesla",
      dimension: magneticFluxDensity,
      scale: 1,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
    }),
    unit({
      id: unitId("si:henry"),
      symbol: "H",
      name: "henry",
      dimension: inductance,
      scale: 1,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
    }),
    unit({
      id: unitId("accepted:litre"),
      symbol: "L",
      name: "litre",
      dimension: powerDimension(LENGTH, 3),
      scale: 1e-3,
      offset: 0,
      semanticKind: null,
      prefixPolicy: "si-decimal",
      aliases: ["l"],
    }),
    unit({
      id: unitId("accepted:minute"),
      symbol: "min",
      name: "minute",
      dimension: TIME,
      scale: 60,
      offset: 0,
      semanticKind: null,
    }),
    unit({
      id: unitId("accepted:hour"),
      symbol: "h",
      name: "hour",
      dimension: TIME,
      scale: 3600,
      offset: 0,
      semanticKind: null,
    }),
    unit({
      id: unitId("accepted:degree"),
      symbol: "°",
      name: "degree",
      dimension: DIMENSIONLESS,
      scale: Math.PI / 180,
      offset: 0,
      semanticKind: "angle",
      aliases: ["deg"],
    }),
    unit({
      id: unitId("accepted:celsius"),
      symbol: "°C",
      name: "degree Celsius",
      dimension: THERMODYNAMIC_TEMPERATURE,
      scale: 1,
      offset: 273.15,
      semanticKind: null,
      aliases: ["degC"],
    }),
  ];
  for (const definition of definitions) {
    const result = registry.register(definition);
    if (!result.ok)
      throw new Error(`Invalid built-in unit: ${result.error.kind}`);
  }
  return registry;
}

export function convertValue(
  value: number,
  from: ParsedUnit,
  to: ParsedUnit,
): UnitResult<number> {
  requireFinite(value, "value");
  if (!equalDimensions(from.dimension, to.dimension))
    return {
      ok: false,
      error: {
        kind: "incompatible-dimension",
        from: from.dimension,
        to: to.dimension,
      },
    };
  if (from.semanticKind !== to.semanticKind)
    return {
      ok: false,
      error: {
        kind: "incompatible-semantic-kind",
        from: from.semanticKind,
        to: to.semanticKind,
      },
    };
  return {
    ok: true,
    value: (value * from.scale + from.offset - to.offset) / to.scale,
  };
}
