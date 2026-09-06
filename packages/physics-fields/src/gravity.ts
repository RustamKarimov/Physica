import { rk4 } from "@physica/solver-ode";
import {
  add3,
  finiteIssue,
  invalidField,
  magnitude3,
  scale3,
  subtract3,
  validField,
  vec3,
  type FieldResult,
  type Vec3,
} from "./types";

export const GRAVITATIONAL_CONSTANT = 6.6743e-11;

export interface MassSource {
  readonly id: string;
  readonly massKilograms: number;
  readonly positionMetres: Vec3;
}

export function gravitationalFieldAt(
  sources: readonly MassSource[],
  position: Vec3,
): FieldResult<Vec3> {
  let field = vec3(0, 0, 0);
  for (const source of sources) {
    const finite = finiteIssue({
      massKilograms: source.massKilograms,
      x: source.positionMetres.x,
      y: source.positionMetres.y,
      z: source.positionMetres.z,
    });
    if (finite) return invalidField(finite);
    if (source.massKilograms <= 0)
      return invalidField({
        severity: "error",
        code: "gravity.invalid-mass",
        message: "Source mass must be positive.",
        path: source.id,
      });
    const displacement = subtract3(source.positionMetres, position);
    const radius = magnitude3(displacement);
    if (radius === 0)
      return invalidField({
        severity: "error",
        code: "gravity.singular-source",
        message: "Gravitational field is undefined at a point-mass source.",
        path: source.id,
      });
    field = add3(
      field,
      scale3(
        displacement,
        (GRAVITATIONAL_CONSTANT * source.massKilograms) / radius ** 3,
      ),
    );
  }
  return validField(field);
}

export function gravitationalPotentialAt(
  sources: readonly MassSource[],
  position: Vec3,
): FieldResult<number> {
  let potential = 0;
  for (const source of sources) {
    const displacement = subtract3(position, source.positionMetres);
    const radius = magnitude3(displacement);
    if (!Number.isFinite(source.massKilograms) || source.massKilograms <= 0)
      return invalidField({
        severity: "error",
        code: "gravity.invalid-mass",
        message: "Source mass must be positive and finite.",
        path: source.id,
      });
    if (!Number.isFinite(radius))
      return invalidField({
        severity: "error",
        code: "gravity.invalid-position",
        message: "Source and probe positions must be finite.",
        path: source.id,
      });
    if (radius === 0)
      return invalidField({
        severity: "error",
        code: "gravity.singular-source",
        message: "Gravitational potential is undefined at a point-mass source.",
        path: source.id,
      });
    potential -= (GRAVITATIONAL_CONSTANT * source.massKilograms) / radius;
  }
  return validField(potential);
}

export function circularOrbit(
  centralMassKilograms: number,
  radiusMetres: number,
  satelliteMassKilograms = 1,
) {
  const finite = finiteIssue({
    centralMassKilograms,
    radiusMetres,
    satelliteMassKilograms,
  });
  if (finite) return invalidField(finite);
  if (
    centralMassKilograms <= 0 ||
    radiusMetres <= 0 ||
    satelliteMassKilograms <= 0
  )
    return invalidField({
      severity: "error",
      code: "gravity.invalid-orbit",
      message: "Orbit masses and radius must be positive.",
    });
  const speed = Math.sqrt(
    (GRAVITATIONAL_CONSTANT * centralMassKilograms) / radiusMetres,
  );
  const period =
    2 *
    Math.PI *
    Math.sqrt(
      radiusMetres ** 3 / (GRAVITATIONAL_CONSTANT * centralMassKilograms),
    );
  const kinetic = 0.5 * satelliteMassKilograms * speed ** 2;
  const potential =
    (-GRAVITATIONAL_CONSTANT * centralMassKilograms * satelliteMassKilograms) /
    radiusMetres;
  return validField({
    speedMetresPerSecond: speed,
    periodSeconds: period,
    escapeSpeedMetresPerSecond: Math.sqrt(2) * speed,
    kineticEnergyJoules: kinetic,
    potentialEnergyJoules: potential,
    totalEnergyJoules: kinetic + potential,
  });
}

export interface OrbitState {
  readonly positionMetres: Vec3;
  readonly velocityMetresPerSecond: Vec3;
  readonly timeSeconds: number;
}

export function advanceOrbit(
  source: MassSource,
  state: OrbitState,
  deltaSeconds: number,
): FieldResult<OrbitState> {
  if (deltaSeconds === 0) return validField(state);
  if (
    !Number.isFinite(deltaSeconds) ||
    deltaSeconds < 0 ||
    deltaSeconds > 86_400
  )
    return invalidField({
      severity: "error",
      code: "gravity.invalid-step",
      message: "Orbit step must be positive and no greater than one day.",
    });
  const initial = [
    state.positionMetres.x,
    state.positionMetres.y,
    state.positionMetres.z,
    state.velocityMetresPerSecond.x,
    state.velocityMetresPerSecond.y,
    state.velocityMetresPerSecond.z,
  ];
  const result = rk4(
    (_time, values) => {
      const position = vec3(values[0]!, values[1]!, values[2]!);
      const field = gravitationalFieldAt([source], position);
      if (!field.ok) throw new RangeError(field.issues[0]?.message);
      return [
        values[3]!,
        values[4]!,
        values[5]!,
        field.value.x,
        field.value.y,
        field.value.z,
      ];
    },
    initial,
    state.timeSeconds,
    deltaSeconds,
  );
  return validField({
    positionMetres: vec3(result.state[0]!, result.state[1]!, result.state[2]!),
    velocityMetresPerSecond: vec3(
      result.state[3]!,
      result.state[4]!,
      result.state[5]!,
    ),
    timeSeconds: result.timeSeconds,
  });
}
