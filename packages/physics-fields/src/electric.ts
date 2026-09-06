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

export const COULOMB_CONSTANT = 8.9875517923e9;

export interface ChargeSource {
  readonly id: string;
  readonly chargeCoulombs: number;
  readonly positionMetres: Vec3;
}

export function electricFieldAt(
  sources: readonly ChargeSource[],
  position: Vec3,
): FieldResult<Vec3> {
  let field = vec3(0, 0, 0);
  for (const source of sources) {
    const displacement = subtract3(position, source.positionMetres);
    const radius = magnitude3(displacement);
    const finite = finiteIssue({
      chargeCoulombs: source.chargeCoulombs,
      radius,
    });
    if (finite) return invalidField(finite);
    if (radius === 0)
      return invalidField({
        severity: "error",
        code: "electric-field.singular-source",
        message: "Electric field is undefined at a point charge.",
        path: source.id,
      });
    field = add3(
      field,
      scale3(
        displacement,
        (COULOMB_CONSTANT * source.chargeCoulombs) / radius ** 3,
      ),
    );
  }
  return validField(field);
}

export function electricPotentialAt(
  sources: readonly ChargeSource[],
  position: Vec3,
): FieldResult<number> {
  let potential = 0;
  for (const source of sources) {
    const radius = magnitude3(subtract3(position, source.positionMetres));
    if (!Number.isFinite(source.chargeCoulombs))
      return invalidField({
        severity: "error",
        code: "electric-field.invalid-charge",
        message: "Source charge must be finite.",
        path: source.id,
      });
    if (!Number.isFinite(radius))
      return invalidField({
        severity: "error",
        code: "electric-field.invalid-position",
        message: "Source and probe positions must be finite.",
        path: source.id,
      });
    if (radius === 0)
      return invalidField({
        severity: "error",
        code: "electric-field.singular-source",
        message: "Electric potential is undefined at a point charge.",
        path: source.id,
      });
    potential += (COULOMB_CONSTANT * source.chargeCoulombs) / radius;
  }
  return validField(potential);
}

export function uniformPlateField(
  voltageVolts: number,
  separationMetres: number,
) {
  const finite = finiteIssue({ voltageVolts, separationMetres });
  if (finite) return invalidField(finite);
  if (separationMetres <= 0)
    return invalidField({
      severity: "error",
      code: "electric-field.invalid-plates",
      message: "Plate separation must be positive.",
    });
  return validField({
    magnitudeNewtonsPerCoulomb: voltageVolts / separationMetres,
    vectorNewtonsPerCoulomb: vec3(0, -voltageVolts / separationMetres, 0),
  });
}

export interface ChargedParticleState {
  readonly positionMetres: Vec3;
  readonly velocityMetresPerSecond: Vec3;
  readonly timeSeconds: number;
}

export function advanceChargedParticleInUniformElectricField(
  state: ChargedParticleState,
  chargeCoulombs: number,
  massKilograms: number,
  fieldNewtonsPerCoulomb: Vec3,
  deltaSeconds: number,
): FieldResult<ChargedParticleState> {
  const finite = finiteIssue({ chargeCoulombs, massKilograms, deltaSeconds });
  if (finite) return invalidField(finite);
  if (deltaSeconds === 0) return validField(state);
  if (massKilograms <= 0 || deltaSeconds < 0)
    return invalidField({
      severity: "error",
      code: "electric-field.invalid-particle",
      message: "Particle mass and time step must be positive.",
    });
  const acceleration = scale3(
    fieldNewtonsPerCoulomb,
    chargeCoulombs / massKilograms,
  );
  const result = rk4(
    (_time, values) => [
      values[3]!,
      values[4]!,
      values[5]!,
      acceleration.x,
      acceleration.y,
      acceleration.z,
    ],
    [
      state.positionMetres.x,
      state.positionMetres.y,
      state.positionMetres.z,
      state.velocityMetresPerSecond.x,
      state.velocityMetresPerSecond.y,
      state.velocityMetresPerSecond.z,
    ],
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
