import {
  invalid,
  mechanicsIssue,
  valid,
  validateFinite,
  type MechanicsResult,
  type Vector2,
} from "./types";

export interface CircularMotionParameters {
  readonly radiusMetres: number;
  readonly angularSpeedRadiansPerSecond: number;
  readonly initialAngleRadians: number;
  readonly massKilograms: number;
}
export interface CircularMotionState {
  readonly timeSeconds: number;
  readonly angleRadians: number;
  readonly positionMetres: Vector2;
  readonly velocityMetresPerSecond: Vector2;
  readonly accelerationMetresPerSecondSquared: Vector2;
  readonly linearSpeedMetresPerSecond: number;
  readonly centripetalAccelerationMetresPerSecondSquared: number;
  readonly centripetalForceNewtons: number;
}
export function evaluateUniformCircularMotion(
  parameters: CircularMotionParameters,
  timeSeconds: number,
): MechanicsResult<CircularMotionState> {
  const issues = validateFinite({ ...parameters, timeSeconds });
  if (parameters.radiusMetres <= 0)
    issues.push(
      mechanicsIssue(
        "circular.invalid-radius",
        "Radius must be greater than zero.",
        "radiusMetres",
      ),
    );
  if (parameters.massKilograms <= 0)
    issues.push(
      mechanicsIssue(
        "circular.invalid-mass",
        "Mass must be greater than zero.",
        "massKilograms",
      ),
    );
  if (timeSeconds < 0)
    issues.push(
      mechanicsIssue(
        "circular.negative-time",
        "Evaluation time cannot be negative.",
        "timeSeconds",
      ),
    );
  if (issues.length > 0) return invalid(...issues);
  const angleRadians =
    parameters.initialAngleRadians +
    parameters.angularSpeedRadiansPerSecond * timeSeconds;
  const c = Math.cos(angleRadians);
  const s = Math.sin(angleRadians);
  const linearSpeedMetresPerSecond =
    Math.abs(parameters.angularSpeedRadiansPerSecond) * parameters.radiusMetres;
  const centripetalAccelerationMetresPerSecondSquared =
    parameters.angularSpeedRadiansPerSecond ** 2 * parameters.radiusMetres;
  return valid({
    timeSeconds,
    angleRadians,
    positionMetres: {
      x: parameters.radiusMetres * c,
      y: parameters.radiusMetres * s,
    },
    velocityMetresPerSecond: {
      x: -parameters.radiusMetres * parameters.angularSpeedRadiansPerSecond * s,
      y: parameters.radiusMetres * parameters.angularSpeedRadiansPerSecond * c,
    },
    accelerationMetresPerSecondSquared: {
      x: -centripetalAccelerationMetresPerSecondSquared * c,
      y: -centripetalAccelerationMetresPerSecondSquared * s,
    },
    linearSpeedMetresPerSecond,
    centripetalAccelerationMetresPerSecondSquared,
    centripetalForceNewtons:
      parameters.massKilograms * centripetalAccelerationMetresPerSecondSquared,
  });
}

export function centripetalFromLinearSpeed(
  massKilograms: number,
  speedMetresPerSecond: number,
  radiusMetres: number,
): MechanicsResult<{
  readonly accelerationMetresPerSecondSquared: number;
  readonly forceNewtons: number;
}> {
  const issues = validateFinite({
    massKilograms,
    speedMetresPerSecond,
    radiusMetres,
  });
  if (massKilograms <= 0 || radiusMetres <= 0)
    issues.push(
      mechanicsIssue(
        "circular.invalid-input",
        "Mass and radius must be greater than zero.",
      ),
    );
  if (speedMetresPerSecond < 0)
    issues.push(
      mechanicsIssue("circular.negative-speed", "Speed cannot be negative."),
    );
  if (issues.length > 0) return invalid(...issues);
  const accelerationMetresPerSecondSquared =
    speedMetresPerSecond ** 2 / radiusMetres;
  return valid({
    accelerationMetresPerSecondSquared,
    forceNewtons: massKilograms * accelerationMetresPerSecondSquared,
  });
}
