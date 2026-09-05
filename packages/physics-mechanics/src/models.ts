import {
  invalidModel,
  validModel,
  type ModelEvent,
  type ModelValidation,
  type PhysicalModelContract,
} from "@physica/physics-core";
import {
  evaluateUniformCircularMotion,
  type CircularMotionParameters,
  type CircularMotionState,
} from "./circular";
import {
  evaluateProjectile,
  type ProjectileParameters,
  type ProjectileState,
} from "./kinematics";

function validationFromResult(result: {
  readonly ok: boolean;
  readonly issues?: readonly {
    readonly code: string;
    readonly message: string;
    readonly path?: string;
  }[];
}): ModelValidation {
  if (result.ok) return validModel();
  return invalidModel(
    ...(result.issues ?? []).map((issue) => ({
      severity: "error" as const,
      code: issue.code,
      message: issue.message,
      ...(issue.path === undefined ? {} : { path: issue.path }),
    })),
  );
}

const projectileContract: PhysicalModelContract<
  ProjectileParameters,
  ProjectileState,
  ProjectileState,
  { readonly kind: "ground-contact" }
> = {
  provenance: Object.freeze({
    modelId: "physica:model/projectile-v1",
    version: "1.0.0",
    category: "analytical",
    deterministic: true,
    assumptions: Object.freeze([
      "Uniform gravitational field",
      "Negligible air resistance",
      "Point-particle body",
    ]),
    validityConditions: Object.freeze([
      "Constant positive gravitational acceleration",
      "Times at or after launch",
    ]),
    approximationLevel: "educational",
    curriculumTags: Object.freeze(["cambridge-9702-topic-2"]),
    referenceNotes: Object.freeze([
      "Constant-acceleration analytical kinematics in a right-handed +y-up frame.",
    ]),
  }),
  stateChannels: Object.freeze(["position", "velocity"]),
  observableIds: Object.freeze([
    "mechanics.position",
    "mechanics.displacement",
    "mechanics.velocity",
    "mechanics.speed",
    "mechanics.acceleration",
  ]),
  solverPolicy: Object.freeze({
    solverTypeId: "physica:solver/analytical-v1",
    recommendedMethod: "closed-form constant acceleration",
  }),
  validateParameters(parameters) {
    return validationFromResult(evaluateProjectile(parameters, 0));
  },
  createInitialState(parameters) {
    const result = evaluateProjectile(parameters, 0);
    if (!result.ok) throw new RangeError(result.issues[0]?.message);
    return result.value;
  },
  evaluate(parameters, timeSeconds) {
    const result = evaluateProjectile(parameters, timeSeconds);
    if (!result.ok) throw new RangeError(result.issues[0]?.message);
    return result.value;
  },
  emitEvents(
    previous,
    current,
    context,
  ): readonly ModelEvent<{ readonly kind: "ground-contact" }>[] {
    if (previous.positionMetres.y >= 0 && current.positionMetres.y < 0)
      return Object.freeze([
        {
          timestampSeconds: context.timeSeconds,
          priority: 0,
          sequenceId: 0,
          eventType: "mechanics.projectile.ground-contact",
          payload: Object.freeze({ kind: "ground-contact" as const }),
        },
      ]);
    return Object.freeze([]);
  },
  computeObservables(state) {
    return state;
  },
  validateState(state) {
    return Number.isFinite(state.positionMetres.x) &&
      Number.isFinite(state.positionMetres.y)
      ? validModel()
      : invalidModel({
          severity: "error",
          code: "projectile.invalid-state",
          message: "Projectile state must remain finite.",
        });
  },
};
export const projectileModel = Object.freeze(projectileContract);

const circularMotionContract: PhysicalModelContract<
  CircularMotionParameters,
  CircularMotionState,
  CircularMotionState
> = {
  provenance: Object.freeze({
    modelId: "physica:model/uniform-circular-motion-v1",
    version: "1.0.0",
    category: "analytical",
    deterministic: true,
    assumptions: Object.freeze([
      "Fixed radius",
      "Constant angular speed",
      "Point-particle body",
    ]),
    validityConditions: Object.freeze(["Positive radius and mass"]),
    approximationLevel: "educational",
    curriculumTags: Object.freeze(["cambridge-9702-topic-12"]),
    referenceNotes: Object.freeze([
      "Uniform circular motion with tangent velocity and inward radial acceleration.",
    ]),
  }),
  stateChannels: Object.freeze(["angular-position", "position", "velocity"]),
  observableIds: Object.freeze([
    "mechanics.angle",
    "mechanics.angular-speed",
    "mechanics.linear-speed",
    "mechanics.centripetal-acceleration",
    "mechanics.centripetal-force",
  ]),
  solverPolicy: Object.freeze({
    solverTypeId: "physica:solver/analytical-v1",
    recommendedMethod: "closed-form uniform circular motion",
  }),
  validateParameters(parameters) {
    return validationFromResult(evaluateUniformCircularMotion(parameters, 0));
  },
  createInitialState(parameters) {
    const result = evaluateUniformCircularMotion(parameters, 0);
    if (!result.ok) throw new RangeError(result.issues[0]?.message);
    return result.value;
  },
  evaluate(parameters, timeSeconds) {
    const result = evaluateUniformCircularMotion(parameters, timeSeconds);
    if (!result.ok) throw new RangeError(result.issues[0]?.message);
    return result.value;
  },
  emitEvents() {
    return Object.freeze([]);
  },
  computeObservables(state) {
    return state;
  },
  validateState(state) {
    return Number.isFinite(state.angleRadians)
      ? validModel()
      : invalidModel({
          severity: "error",
          code: "circular.invalid-state",
          message: "Circular-motion state must remain finite.",
        });
  },
};
export const circularMotionModel = Object.freeze(circularMotionContract);
