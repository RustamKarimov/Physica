import type { RelationshipId } from "@physica/core-model";
import {
  addVec2,
  addVec3,
  magnitudeVec2,
  magnitudeVec3,
  normalizeVec2,
  scaleVec2,
  scaleVec3,
  subtractVec2,
  subtractVec3,
  vec2,
  type Vec2,
} from "@physica/mathematics";
import type {
  DependencyRelationshipV1,
  DerivedOperator,
  RelationshipInput,
  RelationshipResult,
  RelationshipValue,
} from "./relationship-types";

function fail(
  code: "missing-input" | "type-mismatch" | "singular-curve",
  message: string,
): RelationshipResult<never> {
  return { ok: false, error: { code, message } };
}

export function relationshipInputs(
  definition: DependencyRelationshipV1,
): readonly RelationshipInput[] {
  const operation = definition.operation;
  switch (operation.kind) {
    case "bind":
    case "offset":
      return [operation.input];
    case "attach":
    case "follow":
      return [operation.position];
    case "tangent":
    case "normal":
      return [operation.curve, operation.parameter];
    case "derive":
      return operation.inputs;
  }
}

function compatibleUnits(
  left: RelationshipValue,
  right: RelationshipValue,
): boolean {
  const leftUnit = "unit" in left ? left.unit : undefined;
  const rightUnit = "unit" in right ? right.unit : undefined;
  return (
    leftUnit === rightUnit || leftUnit === undefined || rightUnit === undefined
  );
}

function vec2Value(value: Vec2, unit?: string): RelationshipValue {
  return Object.freeze({
    kind: "vec2",
    x: value.x,
    y: value.y,
    ...(unit === undefined ? {} : { unit }),
  });
}

function addValues(
  left: RelationshipValue,
  right: RelationshipValue,
  subtract: boolean,
): RelationshipResult<RelationshipValue> {
  if (left.kind !== right.kind || !compatibleUnits(left, right))
    return fail("type-mismatch", "Relationship values are not add-compatible.");
  const sign = subtract ? -1 : 1;
  const unit = "unit" in left ? left.unit : undefined;
  if (left.kind === "scalar" && right.kind === "scalar")
    return {
      ok: true,
      value: Object.freeze({
        kind: "scalar",
        value: left.value + sign * right.value,
        ...(unit === undefined ? {} : { unit }),
      }),
    };
  if (left.kind === "vec2" && right.kind === "vec2")
    return {
      ok: true,
      value: vec2Value(
        subtract ? subtractVec2(left, right) : addVec2(left, right),
        unit,
      ),
    };
  if (left.kind === "vec3" && right.kind === "vec3") {
    const value = subtract ? subtractVec3(left, right) : addVec3(left, right);
    return {
      ok: true,
      value: Object.freeze({
        kind: "vec3",
        ...value,
        ...(unit === undefined ? {} : { unit }),
      }),
    };
  }
  return fail("type-mismatch", "Only scalar and vector values can be added.");
}

function scaleValue(
  value: RelationshipValue,
  scalar: RelationshipValue,
): RelationshipResult<RelationshipValue> {
  if (scalar.kind !== "scalar")
    return fail("type-mismatch", "Scale factor must be scalar.");
  const unit = "unit" in value ? value.unit : undefined;
  if (value.kind === "scalar")
    return {
      ok: true,
      value: Object.freeze({
        kind: "scalar",
        value: value.value * scalar.value,
        ...(unit === undefined ? {} : { unit }),
      }),
    };
  if (value.kind === "vec2")
    return {
      ok: true,
      value: vec2Value(scaleVec2(value, scalar.value), unit),
    };
  if (value.kind === "vec3") {
    const result = scaleVec3(value, scalar.value);
    return {
      ok: true,
      value: Object.freeze({
        kind: "vec3",
        ...result,
        ...(unit === undefined ? {} : { unit }),
      }),
    };
  }
  return fail("type-mismatch", "Only scalar and vector values can be scaled.");
}

function component(
  operator: DerivedOperator,
  value: RelationshipValue,
): RelationshipResult<RelationshipValue> {
  const axis =
    operator === "component-x" ? "x" : operator === "component-y" ? "y" : "z";
  if (value.kind !== "vec2" && value.kind !== "vec3")
    return fail("type-mismatch", "Component extraction requires a vector.");
  if (value.kind === "vec2" && axis === "z")
    return fail("type-mismatch", "A 2D vector has no z component.");
  const componentValue =
    axis === "x"
      ? value.x
      : axis === "y"
        ? value.y
        : (value as { readonly z: number }).z;
  return {
    ok: true,
    value: Object.freeze({
      kind: "scalar",
      value: componentValue,
      ...(value.unit === undefined ? {} : { unit: value.unit }),
    }),
  };
}

function derive(
  operator: DerivedOperator,
  values: readonly RelationshipValue[],
): RelationshipResult<RelationshipValue> {
  if ((operator === "add" || operator === "subtract") && values.length === 2)
    return addValues(values[0]!, values[1]!, operator === "subtract");
  if (operator === "scale" && values.length === 2)
    return scaleValue(values[0]!, values[1]!);
  if (operator === "magnitude" && values.length === 1) {
    const value = values[0]!;
    if (value.kind === "vec2" || value.kind === "vec3")
      return {
        ok: true,
        value: Object.freeze({
          kind: "scalar",
          value:
            value.kind === "vec2" ? magnitudeVec2(value) : magnitudeVec3(value),
          ...(value.unit === undefined ? {} : { unit: value.unit }),
        }),
      };
  }
  if (operator.startsWith("component-") && values.length === 1)
    return component(operator, values[0]!);
  return fail(
    "type-mismatch",
    "Invalid inputs for derived operator " + operator + ".",
  );
}

function curveDirection(
  curve: RelationshipValue,
  parameter: RelationshipValue,
  normal: boolean,
): RelationshipResult<RelationshipValue> {
  if (curve.kind !== "curve2" || parameter.kind !== "scalar")
    return fail(
      "type-mismatch",
      "Tangent and normal require a curve and scalar parameter.",
    );
  const samples = curve.samples;
  let before = samples[0]!;
  let after = samples[1]!;
  if (parameter.value >= samples.at(-1)!.parameter) {
    before = samples.at(-2)!;
    after = samples.at(-1)!;
  } else if (parameter.value > before.parameter) {
    const exact = samples.findIndex(
      (sample) => sample.parameter === parameter.value,
    );
    if (exact > 0 && exact < samples.length - 1) {
      before = samples[exact - 1]!;
      after = samples[exact + 1]!;
    } else {
      const upper = samples.findIndex(
        (sample) => sample.parameter > parameter.value,
      );
      before = samples[upper - 1]!;
      after = samples[upper]!;
    }
  }
  const normalized = normalizeVec2(subtractVec2(after.point, before.point));
  if (!normalized.ok)
    return fail("singular-curve", "Curve direction is singular.");
  const direction = normal
    ? vec2(-normalized.value.y, normalized.value.x)
    : normalized.value;
  return { ok: true, value: vec2Value(direction) };
}

export function resolveRelationshipInput(
  input: RelationshipInput,
  values: ReadonlyMap<RelationshipId, RelationshipValue>,
  external: (key: string) => RelationshipValue | undefined,
): RelationshipResult<RelationshipValue> {
  const value =
    input.kind === "external"
      ? external(input.key)
      : values.get(input.relationshipId);
  return value === undefined
    ? fail("missing-input", "Relationship input is unavailable.")
    : { ok: true, value };
}

export function computeRelationship(
  definition: DependencyRelationshipV1,
  values: ReadonlyMap<RelationshipId, RelationshipValue>,
  external: (key: string) => RelationshipValue | undefined,
): RelationshipResult<RelationshipValue> {
  const operation = definition.operation;
  const resolve = (input: RelationshipInput) =>
    resolveRelationshipInput(input, values, external);
  if (operation.kind === "bind") return resolve(operation.input);
  if (operation.kind === "offset") {
    const input = resolve(operation.input);
    return input.ok ? addValues(input.value, operation.offset, false) : input;
  }
  if (operation.kind === "attach" || operation.kind === "follow") {
    const position = resolve(operation.position);
    if (!position.ok || operation.offset === undefined) return position;
    return addValues(position.value, operation.offset, false);
  }
  if (operation.kind === "tangent" || operation.kind === "normal") {
    const curve = resolve(operation.curve);
    if (!curve.ok) return curve;
    const parameter = resolve(operation.parameter);
    return parameter.ok
      ? curveDirection(
          curve.value,
          parameter.value,
          operation.kind === "normal",
        )
      : parameter;
  }
  if (operation.kind !== "derive")
    return fail("type-mismatch", "Unsupported relationship operation.");
  const inputs: RelationshipValue[] = [];
  for (const input of operation.inputs) {
    const value = resolve(input);
    if (!value.ok) return value;
    inputs.push(value.value);
  }
  return derive(operation.operator, inputs);
}
