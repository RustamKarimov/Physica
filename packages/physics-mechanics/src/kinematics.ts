import { constantAcceleration1D } from "@physica/solver-analytical";
import {
  invalid,
  mechanicsIssue,
  valid,
  validateFinite,
  type MechanicsResult,
  type Vector2,
} from "./types";

export interface Kinematics1DParameters {
  readonly initialPositionMetres: number;
  readonly initialVelocityMetresPerSecond: number;
  readonly accelerationMetresPerSecondSquared: number;
}
export interface Kinematics1DState {
  readonly timeSeconds: number;
  readonly positionMetres: number;
  readonly displacementMetres: number;
  readonly velocityMetresPerSecond: number;
  readonly speedMetresPerSecond: number;
  readonly accelerationMetresPerSecondSquared: number;
}
export function evaluateKinematics1D(
  parameters: Kinematics1DParameters,
  timeSeconds: number,
): MechanicsResult<Kinematics1DState> {
  const issues = validateFinite({ ...parameters, timeSeconds });
  if (timeSeconds < 0)
    issues.push(
      mechanicsIssue(
        "kinematics.negative-time",
        "Evaluation time cannot be negative.",
        "timeSeconds",
      ),
    );
  if (issues.length > 0) return invalid(...issues);
  const state = constantAcceleration1D(
    parameters.initialPositionMetres,
    parameters.initialVelocityMetresPerSecond,
    parameters.accelerationMetresPerSecondSquared,
    timeSeconds,
  );
  return valid({
    timeSeconds,
    positionMetres: state.position,
    displacementMetres: state.position - parameters.initialPositionMetres,
    velocityMetresPerSecond: state.velocity,
    speedMetresPerSecond: Math.abs(state.velocity),
    accelerationMetresPerSecondSquared: state.acceleration,
  });
}

export interface ProjectileParameters {
  readonly initialPositionMetres: Vector2;
  readonly launchSpeedMetresPerSecond: number;
  readonly launchAngleRadians: number;
  readonly gravityMetresPerSecondSquared: number;
}
export interface ProjectileState {
  readonly timeSeconds: number;
  readonly positionMetres: Vector2;
  readonly displacementMetres: Vector2;
  readonly velocityMetresPerSecond: Vector2;
  readonly accelerationMetresPerSecondSquared: Vector2;
  readonly speedMetresPerSecond: number;
}
export function evaluateProjectile(
  parameters: ProjectileParameters,
  timeSeconds: number,
): MechanicsResult<ProjectileState> {
  const issues = validateFinite({
    initialX: parameters.initialPositionMetres.x,
    initialY: parameters.initialPositionMetres.y,
    launchSpeedMetresPerSecond: parameters.launchSpeedMetresPerSecond,
    launchAngleRadians: parameters.launchAngleRadians,
    gravityMetresPerSecondSquared: parameters.gravityMetresPerSecondSquared,
    timeSeconds,
  });
  if (parameters.launchSpeedMetresPerSecond < 0)
    issues.push(
      mechanicsIssue(
        "projectile.negative-speed",
        "Launch speed cannot be negative.",
        "launchSpeedMetresPerSecond",
      ),
    );
  if (parameters.gravityMetresPerSecondSquared <= 0)
    issues.push(
      mechanicsIssue(
        "projectile.invalid-gravity",
        "Gravitational acceleration magnitude must be positive.",
        "gravityMetresPerSecondSquared",
      ),
    );
  if (timeSeconds < 0)
    issues.push(
      mechanicsIssue(
        "kinematics.negative-time",
        "Evaluation time cannot be negative.",
        "timeSeconds",
      ),
    );
  if (issues.length > 0) return invalid(...issues);
  const vx =
    parameters.launchSpeedMetresPerSecond *
    Math.cos(parameters.launchAngleRadians);
  const vy0 =
    parameters.launchSpeedMetresPerSecond *
    Math.sin(parameters.launchAngleRadians);
  const displacement = {
    x: vx * timeSeconds,
    y:
      vy0 * timeSeconds -
      0.5 * parameters.gravityMetresPerSecondSquared * timeSeconds ** 2,
  };
  const velocity = {
    x: vx,
    y: vy0 - parameters.gravityMetresPerSecondSquared * timeSeconds,
  };
  return valid({
    timeSeconds,
    positionMetres: {
      x: parameters.initialPositionMetres.x + displacement.x,
      y: parameters.initialPositionMetres.y + displacement.y,
    },
    displacementMetres: displacement,
    velocityMetresPerSecond: velocity,
    accelerationMetresPerSecondSquared: {
      x: 0,
      y: -parameters.gravityMetresPerSecondSquared,
    },
    speedMetresPerSecond: Math.hypot(velocity.x, velocity.y),
  });
}

export function projectileFlightTime(
  parameters: ProjectileParameters,
): MechanicsResult<number> {
  if (parameters.initialPositionMetres.y !== 0)
    return invalid(
      mechanicsIssue(
        "projectile.nonzero-launch-height",
        "This exact flight-time helper requires launch and landing at y = 0.",
        "initialPositionMetres.y",
      ),
    );
  const validation = evaluateProjectile(parameters, 0);
  if (!validation.ok) return validation;
  return valid(
    (2 *
      parameters.launchSpeedMetresPerSecond *
      Math.sin(parameters.launchAngleRadians)) /
      parameters.gravityMetresPerSecondSquared,
  );
}

export interface PiecewiseMotionSegment extends Kinematics1DParameters {
  readonly startSeconds: number;
  readonly durationSeconds: number;
}
export function evaluatePiecewiseMotion(
  segments: readonly PiecewiseMotionSegment[],
  timeSeconds: number,
): MechanicsResult<Kinematics1DState> {
  if (segments.length === 0)
    return invalid(
      mechanicsIssue(
        "kinematics.no-segments",
        "At least one motion segment is required.",
      ),
    );
  const ordered = [...segments].sort((a, b) => a.startSeconds - b.startSeconds);
  const overlapping = ordered.some(
    (segment, index) =>
      index > 0 &&
      segment.startSeconds <
        ordered[index - 1]!.startSeconds + ordered[index - 1]!.durationSeconds,
  );
  if (overlapping)
    return invalid(
      mechanicsIssue(
        "kinematics.overlap",
        "Piecewise motion segments cannot overlap.",
      ),
    );
  const segment = ordered.find(
    (candidate, index) =>
      timeSeconds >= candidate.startSeconds &&
      (timeSeconds < candidate.startSeconds + candidate.durationSeconds ||
        (index === ordered.length - 1 &&
          timeSeconds === candidate.startSeconds + candidate.durationSeconds)),
  );
  if (!segment)
    return invalid(
      mechanicsIssue(
        "kinematics.time-outside-segments",
        "Time is outside the defined piecewise motion intervals.",
        "timeSeconds",
      ),
    );
  return evaluateKinematics1D(segment, timeSeconds - segment.startSeconds);
}
