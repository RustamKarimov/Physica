import {
  DEFAULT_NUMERICS_POLICY,
  approximatelyEqual,
  requireFinite,
  type NumericsPolicy,
} from "./numerics";
import {
  QUATERNION_IDENTITY,
  conjugateQuaternion,
  normalizeQuaternion,
  rotateVec3ByQuaternion,
  type Quaternion,
} from "./quaternion";
import {
  addVec3,
  scaleVec3,
  subtractVec3,
  vec2,
  vec3,
  type Vec2,
  type Vec3,
} from "./vector";

declare const referenceFrameIdBrand: unique symbol;
export type ReferenceFrameId = string & {
  readonly [referenceFrameIdBrand]: "ReferenceFrameId";
};

export type CoordinateSpaceKind =
  | "entity-local"
  | "physical-world"
  | "reference-frame"
  | "scene-view"
  | "camera"
  | "screen-layout"
  | "graph-data"
  | "image-detector";

export interface Coordinate3<TSpace extends CoordinateSpaceKind> {
  readonly space: TSpace;
  readonly value: Vec3;
}

export interface Direction3<TSpace extends CoordinateSpaceKind> {
  readonly space: TSpace;
  readonly value: Vec3;
}

export type CoordinateError =
  | { readonly kind: "invalid-frame-id"; readonly value: string }
  | { readonly kind: "frame-not-found"; readonly frameId: ReferenceFrameId }
  | {
      readonly kind: "frame-cycle";
      readonly frameIds: readonly ReferenceFrameId[];
    }
  | {
      readonly kind: "missing-parent";
      readonly frameId: ReferenceFrameId;
      readonly parentId: ReferenceFrameId;
    }
  | { readonly kind: "duplicate-frame-id"; readonly frameId: ReferenceFrameId }
  | {
      readonly kind: "invalid-frame-graph";
      readonly issues: readonly CoordinateValidationIssue[];
    }
  | { readonly kind: "unknown-transform-provider"; readonly typeId: string }
  | {
      readonly kind: "invalid-frame-configuration";
      readonly frameId: ReferenceFrameId;
      readonly issues: readonly CoordinateValidationIssue[];
    }
  | { readonly kind: "off-physical-plane"; readonly z: number }
  | { readonly kind: "invalid-scale"; readonly message: string }
  | { readonly kind: "transform-failed"; readonly message: string };

export type CoordinateResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: CoordinateError };

export interface CoordinateValidationIssue {
  readonly code: string;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly path: string;
}

const REFERENCE_FRAME_ID_PATTERN =
  /^[a-z0-9][a-z0-9.-]*:[a-z0-9][a-z0-9._/-]*$/;

export function referenceFrameId(value: string): ReferenceFrameId {
  if (!REFERENCE_FRAME_ID_PATTERN.test(value)) {
    throw new TypeError(`Invalid reference frame ID: ${value}`);
  }
  return value as ReferenceFrameId;
}

export function coordinate3<TSpace extends CoordinateSpaceKind>(
  space: TSpace,
  value: Vec3,
): Coordinate3<TSpace> {
  return Object.freeze({ space, value: vec3(value.x, value.y, value.z) });
}

export function direction3<TSpace extends CoordinateSpaceKind>(
  space: TSpace,
  value: Vec3,
): Direction3<TSpace> {
  return Object.freeze({ space, value: vec3(value.x, value.y, value.z) });
}

export function liftPhysical2D(value: Vec2): Coordinate3<"physical-world"> {
  return coordinate3("physical-world", vec3(value.x, value.y, 0));
}

export function projectPhysicalTo2D(
  value: Coordinate3<"physical-world">,
  options: {
    readonly discardZ?: boolean;
    readonly policy?: NumericsPolicy;
  } = {},
): CoordinateResult<Vec2> {
  const policy = options.policy ?? DEFAULT_NUMERICS_POLICY;
  if (!options.discardZ && Math.abs(value.value.z) > policy.absoluteTolerance) {
    return {
      ok: false,
      error: { kind: "off-physical-plane", z: value.value.z },
    };
  }
  return { ok: true, value: vec2(value.value.x, value.value.y) };
}

export interface ReferenceFrameDefinition<TConfiguration = unknown> {
  readonly id: ReferenceFrameId;
  readonly name: string;
  readonly parentId: ReferenceFrameId | null;
  readonly transformTypeId: string;
  readonly configuration: TConfiguration;
}

export interface GalileanFrameConfiguration {
  readonly originAtEpoch: Vec3;
  readonly orientationToParent: Quaternion;
  readonly velocityRelativeToParent: Vec3;
  readonly epochSeconds: number;
}

export interface ReferenceFrameTransformProvider<TConfiguration = unknown> {
  readonly typeId: string;
  validate(configuration: TConfiguration): readonly CoordinateValidationIssue[];
  toParentPosition(
    position: Vec3,
    timeSeconds: number,
    configuration: TConfiguration,
  ): CoordinateResult<Vec3>;
  fromParentPosition(
    position: Vec3,
    timeSeconds: number,
    configuration: TConfiguration,
  ): CoordinateResult<Vec3>;
  toParentDirection(
    direction: Vec3,
    configuration: TConfiguration,
  ): CoordinateResult<Vec3>;
  fromParentDirection(
    direction: Vec3,
    configuration: TConfiguration,
  ): CoordinateResult<Vec3>;
}

export const GALILEAN_FRAME_TYPE_ID = "physica.frame:galilean-v1" as const;

function isVec3(value: unknown): value is Vec3 {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<Vec3>;
  return (
    Number.isFinite(candidate.x) &&
    Number.isFinite(candidate.y) &&
    Number.isFinite(candidate.z)
  );
}

function isQuaternion(value: unknown): value is Quaternion {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<Quaternion>;
  return (
    Number.isFinite(candidate.w) &&
    Number.isFinite(candidate.x) &&
    Number.isFinite(candidate.y) &&
    Number.isFinite(candidate.z)
  );
}

export const GalileanFrameTransformProvider: ReferenceFrameTransformProvider<GalileanFrameConfiguration> =
  {
    typeId: GALILEAN_FRAME_TYPE_ID,
    validate(configuration) {
      const issues: CoordinateValidationIssue[] = [];
      if (!isVec3(configuration?.originAtEpoch))
        issues.push({
          code: "invalid-origin",
          severity: "error",
          message: "originAtEpoch must be a finite Vec3.",
          path: "configuration.originAtEpoch",
        });
      if (!isVec3(configuration?.velocityRelativeToParent))
        issues.push({
          code: "invalid-velocity",
          severity: "error",
          message: "velocityRelativeToParent must be a finite Vec3.",
          path: "configuration.velocityRelativeToParent",
        });
      if (
        !isQuaternion(configuration?.orientationToParent) ||
        !normalizeQuaternion(configuration.orientationToParent).ok
      )
        issues.push({
          code: "invalid-orientation",
          severity: "error",
          message: "orientationToParent must be a non-zero finite Quaternion.",
          path: "configuration.orientationToParent",
        });
      if (!Number.isFinite(configuration?.epochSeconds))
        issues.push({
          code: "invalid-epoch",
          severity: "error",
          message: "epochSeconds must be finite.",
          path: "configuration.epochSeconds",
        });
      return issues;
    },
    toParentPosition(position, timeSeconds, configuration) {
      requireFinite(timeSeconds, "timeSeconds");
      const rotated = rotateVec3ByQuaternion(
        position,
        configuration.orientationToParent,
      );
      if (!rotated.ok)
        return {
          ok: false,
          error: { kind: "transform-failed", message: rotated.error.kind },
        };
      const movingOrigin = addVec3(
        configuration.originAtEpoch,
        scaleVec3(
          configuration.velocityRelativeToParent,
          timeSeconds - configuration.epochSeconds,
        ),
      );
      return { ok: true, value: addVec3(movingOrigin, rotated.value) };
    },
    fromParentPosition(position, timeSeconds, configuration) {
      requireFinite(timeSeconds, "timeSeconds");
      const movingOrigin = addVec3(
        configuration.originAtEpoch,
        scaleVec3(
          configuration.velocityRelativeToParent,
          timeSeconds - configuration.epochSeconds,
        ),
      );
      const rotated = rotateVec3ByQuaternion(
        subtractVec3(position, movingOrigin),
        conjugateQuaternion(configuration.orientationToParent),
      );
      return rotated.ok
        ? { ok: true, value: rotated.value }
        : {
            ok: false,
            error: { kind: "transform-failed", message: rotated.error.kind },
          };
    },
    toParentDirection(direction, configuration) {
      const rotated = rotateVec3ByQuaternion(
        direction,
        configuration.orientationToParent,
      );
      return rotated.ok
        ? { ok: true, value: rotated.value }
        : {
            ok: false,
            error: { kind: "transform-failed", message: rotated.error.kind },
          };
    },
    fromParentDirection(direction, configuration) {
      const rotated = rotateVec3ByQuaternion(
        direction,
        conjugateQuaternion(configuration.orientationToParent),
      );
      return rotated.ok
        ? { ok: true, value: rotated.value }
        : {
            ok: false,
            error: { kind: "transform-failed", message: rotated.error.kind },
          };
    },
  };

export class ReferenceFrameProviderRegistry {
  private readonly providers = new Map<
    string,
    ReferenceFrameTransformProvider<unknown>
  >();

  register<TConfiguration>(
    provider: ReferenceFrameTransformProvider<TConfiguration>,
  ): void {
    if (this.providers.has(provider.typeId))
      throw new Error(
        `Reference-frame provider already registered: ${provider.typeId}`,
      );
    this.providers.set(
      provider.typeId,
      provider as ReferenceFrameTransformProvider<unknown>,
    );
  }

  get(typeId: string): ReferenceFrameTransformProvider<unknown> | undefined {
    return this.providers.get(typeId);
  }
}

export function createDefaultReferenceFrameProviderRegistry(): ReferenceFrameProviderRegistry {
  const registry = new ReferenceFrameProviderRegistry();
  registry.register(GalileanFrameTransformProvider);
  return registry;
}

export function identityGalileanFrameConfiguration(): GalileanFrameConfiguration {
  return Object.freeze({
    originAtEpoch: vec3(0, 0, 0),
    orientationToParent: QUATERNION_IDENTITY,
    velocityRelativeToParent: vec3(0, 0, 0),
    epochSeconds: 0,
  });
}

export function validateReferenceFrames(
  definitions: readonly ReferenceFrameDefinition[],
  providers: ReferenceFrameProviderRegistry,
): readonly CoordinateValidationIssue[] {
  const issues: CoordinateValidationIssue[] = [];
  const byId = new Map<ReferenceFrameId, ReferenceFrameDefinition>();
  definitions.forEach((definition, index) => {
    if (byId.has(definition.id)) {
      issues.push({
        code: "duplicate-frame-id",
        severity: "error",
        message: `Duplicate frame ID ${definition.id}.`,
        path: `frames[${index}].id`,
      });
    } else {
      byId.set(definition.id, definition);
    }
  });
  definitions.forEach((definition, index) => {
    if (definition.parentId === definition.id)
      issues.push({
        code: "self-parent-frame",
        severity: "error",
        message: "A frame cannot parent itself.",
        path: `frames[${index}].parentId`,
      });
    if (definition.parentId !== null && !byId.has(definition.parentId))
      issues.push({
        code: "missing-parent-frame",
        severity: "error",
        message: `Parent frame ${definition.parentId} does not exist.`,
        path: `frames[${index}].parentId`,
      });
    const provider = providers.get(definition.transformTypeId);
    if (!provider) {
      issues.push({
        code: "unknown-frame-provider",
        severity: "warning",
        message: `Transform provider ${definition.transformTypeId} is unavailable.`,
        path: `frames[${index}].transformTypeId`,
      });
    } else if (definition.parentId !== null) {
      issues.push(
        ...provider.validate(definition.configuration).map((issue) => ({
          ...issue,
          path: `frames[${index}].${issue.path}`,
        })),
      );
    }
  });
  const completed = new Set<ReferenceFrameId>();
  for (const definition of definitions) {
    if (completed.has(definition.id)) continue;
    const path: ReferenceFrameId[] = [];
    const positions = new Map<ReferenceFrameId, number>();
    let current: ReferenceFrameDefinition | undefined = definition;
    while (current) {
      const existing = positions.get(current.id);
      if (existing !== undefined) {
        issues.push({
          code: "frame-cycle",
          severity: "error",
          message: `Reference-frame cycle: ${path.slice(existing).join(" -> ")}.`,
          path: "frames",
        });
        break;
      }
      if (completed.has(current.id)) break;
      positions.set(current.id, path.length);
      path.push(current.id);
      current =
        current.parentId === null ? undefined : byId.get(current.parentId);
    }
    path.forEach((id) => completed.add(id));
  }
  return issues;
}

export class ReferenceFrameGraph {
  private readonly byId: ReadonlyMap<
    ReferenceFrameId,
    ReferenceFrameDefinition
  >;

  constructor(
    readonly definitions: readonly ReferenceFrameDefinition[],
    private readonly providers: ReferenceFrameProviderRegistry,
  ) {
    const issues = validateReferenceFrames(definitions, providers).filter(
      (issue) => issue.severity === "error",
    );
    if (issues.length > 0)
      throw new Error(issues.map((issue) => issue.code).join(", "));
    this.definitions = Object.freeze([...definitions]);
    this.byId = new Map(
      definitions.map((definition) => [definition.id, definition]),
    );
  }

  private ancestry(
    frameId: ReferenceFrameId,
  ): CoordinateResult<readonly ReferenceFrameDefinition[]> {
    const result: ReferenceFrameDefinition[] = [];
    let current = this.byId.get(frameId);
    if (!current)
      return { ok: false, error: { kind: "frame-not-found", frameId } };
    while (current) {
      result.push(current);
      current =
        current.parentId === null ? undefined : this.byId.get(current.parentId);
    }
    return { ok: true, value: result };
  }

  transformPosition(
    position: Vec3,
    fromFrameId: ReferenceFrameId,
    toFrameId: ReferenceFrameId,
    timeSeconds: number,
  ): CoordinateResult<Vec3> {
    if (!Number.isFinite(timeSeconds)) {
      return {
        ok: false,
        error: {
          kind: "transform-failed",
          message: "timeSeconds must be finite.",
        },
      };
    }
    return this.transform(position, fromFrameId, toFrameId, timeSeconds, false);
  }

  transformDirection(
    direction: Vec3,
    fromFrameId: ReferenceFrameId,
    toFrameId: ReferenceFrameId,
  ): CoordinateResult<Vec3> {
    return this.transform(direction, fromFrameId, toFrameId, 0, true);
  }

  private transform(
    input: Vec3,
    fromFrameId: ReferenceFrameId,
    toFrameId: ReferenceFrameId,
    timeSeconds: number,
    direction: boolean,
  ): CoordinateResult<Vec3> {
    const fromPath = this.ancestry(fromFrameId);
    if (!fromPath.ok) return fromPath;
    const toPath = this.ancestry(toFrameId);
    if (!toPath.ok) return toPath;
    const toIndex = new Map(
      toPath.value.map((frame, index) => [frame.id, index]),
    );
    const commonFromIndex = fromPath.value.findIndex((frame) =>
      toIndex.has(frame.id),
    );
    if (commonFromIndex < 0)
      return {
        ok: false,
        error: {
          kind: "transform-failed",
          message: "Frames have no common root.",
        },
      };
    const common = fromPath.value[commonFromIndex]!;
    let value = vec3(input.x, input.y, input.z);
    for (let index = 0; index < commonFromIndex; index += 1) {
      const frame = fromPath.value[index]!;
      const provider = this.providers.get(frame.transformTypeId);
      if (!provider)
        return {
          ok: false,
          error: {
            kind: "unknown-transform-provider",
            typeId: frame.transformTypeId,
          },
        };
      const transformed = direction
        ? provider.toParentDirection(value, frame.configuration)
        : provider.toParentPosition(value, timeSeconds, frame.configuration);
      if (!transformed.ok) return transformed;
      value = transformed.value;
    }
    const commonToIndex = toIndex.get(common.id)!;
    for (let index = commonToIndex - 1; index >= 0; index -= 1) {
      const child = toPath.value[index]!;
      const provider = this.providers.get(child.transformTypeId);
      if (!provider)
        return {
          ok: false,
          error: {
            kind: "unknown-transform-provider",
            typeId: child.transformTypeId,
          },
        };
      const transformed = direction
        ? provider.fromParentDirection(value, child.configuration)
        : provider.fromParentPosition(value, timeSeconds, child.configuration);
      if (!transformed.ok) return transformed;
      value = transformed.value;
    }
    return { ok: true, value };
  }
}

export function createReferenceFrameGraph(
  definitions: readonly ReferenceFrameDefinition[],
  providers: ReferenceFrameProviderRegistry,
): CoordinateResult<ReferenceFrameGraph> {
  const issues = validateReferenceFrames(definitions, providers).filter(
    (issue) => issue.severity === "error",
  );
  return issues.length > 0
    ? { ok: false, error: { kind: "invalid-frame-graph", issues } }
    : { ok: true, value: new ReferenceFrameGraph(definitions, providers) };
}

export type ScaleMode = "physical" | "educational" | "logarithmic";

export interface EducationalScale {
  readonly physicalScale: number;
  readonly visualScale: number;
  readonly scaleMode: ScaleMode;
  readonly notToScaleWarning: boolean;
}

export function educationalScale(
  input: EducationalScale,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): CoordinateResult<EducationalScale> {
  if (
    !Number.isFinite(input.physicalScale) ||
    input.physicalScale <= 0 ||
    !Number.isFinite(input.visualScale) ||
    input.visualScale <= 0
  ) {
    return {
      ok: false,
      error: {
        kind: "invalid-scale",
        message: "Physical and visual scales must be finite and positive.",
      },
    };
  }
  const proportional = approximatelyEqual(
    input.physicalScale,
    input.visualScale,
    policy,
  );
  if (
    input.scaleMode === "physical" &&
    (!proportional || input.notToScaleWarning)
  ) {
    return {
      ok: false,
      error: {
        kind: "invalid-scale",
        message:
          "Physical scale must be proportional and cannot carry a not-to-scale warning.",
      },
    };
  }
  if (
    input.scaleMode !== "physical" &&
    !proportional &&
    !input.notToScaleWarning
  ) {
    return {
      ok: false,
      error: {
        kind: "invalid-scale",
        message:
          "Non-proportional educational/logarithmic scale requires a not-to-scale warning.",
      },
    };
  }
  return { ok: true, value: Object.freeze({ ...input }) };
}
