import {
  addVec3,
  crossVec3,
  dotVec3,
  magnitudeVec3,
  normalizeVec3,
  scaleVec3,
  subtractVec3,
  vec2,
  vec3,
  type Vec2,
  type Vec3,
} from "@physica/mathematics";
import type { RenderResult } from "./errors";
import type {
  CameraBasis,
  CameraDefinition,
  PresentationTransform2D,
  ProjectedPoint,
  ScreenRay,
} from "./types";

const EPSILON = 1e-12;

function finiteVec2(value: Vec2): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y);
}

function finiteVec3(value: Vec3): boolean {
  return (
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Number.isFinite(value.z)
  );
}

function validatePresentation(
  transform: PresentationTransform2D | undefined,
): RenderResult<void> {
  if (!transform) return { ok: true, value: undefined };
  return finiteVec2(transform.translation) &&
    finiteVec2(transform.scale) &&
    Number.isFinite(transform.rotationRadians) &&
    Math.abs(transform.scale.x) > EPSILON &&
    Math.abs(transform.scale.y) > EPSILON
    ? { ok: true, value: undefined }
    : {
        ok: false,
        error: {
          kind: "invalid-transform",
          message: "Presentation transform must be finite with non-zero scale.",
        },
      };
}

function applyPresentation(
  point: Vec2,
  transform: PresentationTransform2D | undefined,
): Vec2 {
  if (!transform) return point;
  const x = point.x * transform.scale.x;
  const y = point.y * transform.scale.y;
  const cosine = Math.cos(transform.rotationRadians);
  const sine = Math.sin(transform.rotationRadians);
  return vec2(
    x * cosine - y * sine + transform.translation.x,
    x * sine + y * cosine + transform.translation.y,
  );
}

function undoPresentation(
  point: Vec2,
  transform: PresentationTransform2D | undefined,
): Vec2 {
  if (!transform) return point;
  const x = point.x - transform.translation.x;
  const y = point.y - transform.translation.y;
  const cosine = Math.cos(-transform.rotationRadians);
  const sine = Math.sin(-transform.rotationRadians);
  return vec2(
    (x * cosine - y * sine) / transform.scale.x,
    (x * sine + y * cosine) / transform.scale.y,
  );
}

function freezeDefinition(definition: CameraDefinition): CameraDefinition {
  return Object.freeze({
    ...definition,
    viewport: Object.freeze({ ...definition.viewport }),
    position: vec3(
      definition.position.x,
      definition.position.y,
      definition.position.z,
    ),
    target: vec3(definition.target.x, definition.target.y, definition.target.z),
    up: vec3(definition.up.x, definition.up.y, definition.up.z),
    ...(definition.presentationTransform
      ? {
          presentationTransform: Object.freeze({
            translation: vec2(
              definition.presentationTransform.translation.x,
              definition.presentationTransform.translation.y,
            ),
            rotationRadians: definition.presentationTransform.rotationRadians,
            scale: vec2(
              definition.presentationTransform.scale.x,
              definition.presentationTransform.scale.y,
            ),
          }),
        }
      : {}),
  });
}

export class CameraService {
  readonly definition: CameraDefinition;
  readonly basis: CameraBasis;

  private constructor(definition: CameraDefinition, basis: CameraBasis) {
    this.definition = freezeDefinition(definition);
    this.basis = Object.freeze(basis);
  }

  static create(definition: CameraDefinition): RenderResult<CameraService> {
    const viewport = definition.viewport;
    if (
      !Number.isFinite(viewport.width) ||
      !Number.isFinite(viewport.height) ||
      !Number.isFinite(viewport.devicePixelRatio) ||
      viewport.width <= 0 ||
      viewport.height <= 0 ||
      viewport.devicePixelRatio <= 0
    )
      return {
        ok: false,
        error: {
          kind: "invalid-viewport",
          message:
            "Viewport dimensions and device-pixel ratio must be finite and positive.",
        },
      };
    if (
      !finiteVec3(definition.position) ||
      !finiteVec3(definition.target) ||
      !finiteVec3(definition.up) ||
      !Number.isFinite(definition.near) ||
      !Number.isFinite(definition.far) ||
      definition.near <= 0 ||
      definition.far <= definition.near
    )
      return {
        ok: false,
        error: {
          kind: "invalid-camera",
          message: "Camera vectors and clipping planes are invalid.",
        },
      };
    if (
      (definition.kind === "orthographic" &&
        (!Number.isFinite(definition.verticalSpan) ||
          definition.verticalSpan <= 0)) ||
      (definition.kind === "perspective" &&
        (!Number.isFinite(definition.verticalFieldOfViewRadians) ||
          definition.verticalFieldOfViewRadians <= 0 ||
          definition.verticalFieldOfViewRadians >= Math.PI))
    )
      return {
        ok: false,
        error: {
          kind: "invalid-camera",
          message: "Camera projection parameters are invalid.",
        },
      };
    const presentation = validatePresentation(definition.presentationTransform);
    if (!presentation.ok) return presentation;
    const forwardResult = normalizeVec3(
      subtractVec3(definition.target, definition.position),
    );
    if (!forwardResult.ok)
      return {
        ok: false,
        error: {
          kind: "invalid-camera",
          message: "Camera position and target must differ.",
        },
      };
    const rightResult = normalizeVec3(
      crossVec3(forwardResult.value, definition.up),
    );
    if (!rightResult.ok)
      return {
        ok: false,
        error: {
          kind: "invalid-camera",
          message:
            "Camera up vector must not be collinear with its view direction.",
        },
      };
    const trueUp = normalizeVec3(
      crossVec3(rightResult.value, forwardResult.value),
    );
    if (!trueUp.ok)
      return {
        ok: false,
        error: {
          kind: "invalid-camera",
          message: "Camera basis is degenerate.",
        },
      };
    return {
      ok: true,
      value: new CameraService(definition, {
        right: rightResult.value,
        up: trueUp.value,
        forward: forwardResult.value,
      }),
    };
  }

  project(world: Vec3): RenderResult<ProjectedPoint> {
    if (!finiteVec3(world))
      return {
        ok: false,
        error: {
          kind: "invalid-projection",
          message: "World point must be finite.",
        },
      };
    const relative = subtractVec3(world, this.definition.position);
    const x = dotVec3(relative, this.basis.right);
    const y = dotVec3(relative, this.basis.up);
    const depth = dotVec3(relative, this.basis.forward);
    const aspect =
      this.definition.viewport.width / this.definition.viewport.height;
    let ndcX: number;
    let ndcY: number;
    if (this.definition.kind === "orthographic") {
      ndcX = x / ((this.definition.verticalSpan * aspect) / 2);
      ndcY = y / (this.definition.verticalSpan / 2);
    } else {
      if (depth <= EPSILON)
        return {
          ok: false,
          error: {
            kind: "invalid-projection",
            message: "Perspective point is on or behind the camera plane.",
          },
        };
      const tangent = Math.tan(this.definition.verticalFieldOfViewRadians / 2);
      ndcX = x / (depth * tangent * aspect);
      ndcY = y / (depth * tangent);
    }
    const screen = applyPresentation(
      vec2(
        ((ndcX + 1) / 2) * this.definition.viewport.width,
        ((1 - ndcY) / 2) * this.definition.viewport.height,
      ),
      this.definition.presentationTransform,
    );
    const ndcDepth =
      ((depth - this.definition.near) /
        (this.definition.far - this.definition.near)) *
        2 -
      1;
    return {
      ok: true,
      value: Object.freeze({
        screen,
        normalizedDevice: vec3(ndcX, ndcY, ndcDepth),
        depth,
        visible:
          Math.abs(ndcX) <= 1 &&
          Math.abs(ndcY) <= 1 &&
          depth >= this.definition.near &&
          depth <= this.definition.far,
      }),
    };
  }

  unprojectOrthographic(screen: Vec2, depth: number): RenderResult<Vec3> {
    if (this.definition.kind !== "orthographic")
      return {
        ok: false,
        error: {
          kind: "invalid-projection",
          message:
            "Only orthographic cameras map a screen point and depth to one world point.",
        },
      };
    if (!finiteVec2(screen) || !Number.isFinite(depth))
      return {
        ok: false,
        error: {
          kind: "invalid-projection",
          message: "Screen point and depth must be finite.",
        },
      };
    const raw = undoPresentation(screen, this.definition.presentationTransform);
    const ndcX = (raw.x / this.definition.viewport.width) * 2 - 1;
    const ndcY = 1 - (raw.y / this.definition.viewport.height) * 2;
    const aspect =
      this.definition.viewport.width / this.definition.viewport.height;
    return {
      ok: true,
      value: addVec3(
        addVec3(
          addVec3(
            this.definition.position,
            scaleVec3(this.basis.forward, depth),
          ),
          scaleVec3(
            this.basis.right,
            ndcX * this.definition.verticalSpan * aspect * 0.5,
          ),
        ),
        scaleVec3(this.basis.up, ndcY * this.definition.verticalSpan * 0.5),
      ),
    };
  }

  screenRay(screen: Vec2): RenderResult<ScreenRay> {
    if (!finiteVec2(screen))
      return {
        ok: false,
        error: {
          kind: "invalid-projection",
          message: "Screen point must be finite.",
        },
      };
    const raw = undoPresentation(screen, this.definition.presentationTransform);
    const ndcX = (raw.x / this.definition.viewport.width) * 2 - 1;
    const ndcY = 1 - (raw.y / this.definition.viewport.height) * 2;
    const aspect =
      this.definition.viewport.width / this.definition.viewport.height;
    if (this.definition.kind === "orthographic") {
      const origin = this.unprojectOrthographic(screen, this.definition.near);
      return origin.ok
        ? {
            ok: true,
            value: Object.freeze({
              origin: origin.value,
              direction: this.basis.forward,
            }),
          }
        : origin;
    }
    const tangent = Math.tan(this.definition.verticalFieldOfViewRadians / 2);
    const direction = normalizeVec3(
      addVec3(
        addVec3(
          this.basis.forward,
          scaleVec3(this.basis.right, ndcX * tangent * aspect),
        ),
        scaleVec3(this.basis.up, ndcY * tangent),
      ),
    );
    return direction.ok
      ? {
          ok: true,
          value: Object.freeze({
            origin: this.definition.position,
            direction: direction.value,
          }),
        }
      : {
          ok: false,
          error: {
            kind: "invalid-projection",
            message: "Screen ray direction is degenerate.",
          },
        };
  }
}

export function createCameraService(
  definition: CameraDefinition,
): RenderResult<CameraService> {
  return CameraService.create(definition);
}

export function cameraDistance(a: Vec3, b: Vec3): number {
  return magnitudeVec3(subtractVec3(a, b));
}
