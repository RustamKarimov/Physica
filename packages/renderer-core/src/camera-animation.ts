import type { RepresentationId } from "@physica/core-model";
import {
  addVec3,
  dotVec3,
  scaleVec3,
  subtractVec3,
  vec3,
  type Vec3,
} from "@physica/mathematics";
import { createCameraService } from "./camera";
import {
  copyCameraVec3 as copyVec3,
  finiteCameraVec3 as finiteVec3,
  invalidCameraAnimation as invalid,
  validateCameraPresentationOperation,
  type CameraBounds3,
  type CameraSubjectSnapshot,
  type EvaluatedCameraOperation,
} from "./camera-animation-contract";
import type { RenderResult } from "./errors";
import type { CameraDefinition } from "./types";

const EPSILON = 1e-12;

export {
  cameraOperationChannels,
  validateCameraPresentationOperation,
} from "./camera-animation-contract";
export type {
  CameraAnimationChannel,
  CameraBounds3,
  CameraPresentationOperation,
  CameraSubjectSnapshot,
  EvaluatedCameraOperation,
} from "./camera-animation-contract";

function interpolateVec3(start: Vec3, end: Vec3, progress: number): Vec3 {
  return addVec3(start, scaleVec3(subtractVec3(end, start), progress));
}

function interpolate(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function validateSubject(
  snapshot: CameraSubjectSnapshot,
): RenderResult<CameraSubjectSnapshot> {
  if (
    typeof snapshot.representationId !== "string" ||
    snapshot.representationId.length === 0 ||
    !finiteVec3(snapshot.position)
  )
    return invalid("Camera subject ID and position must be valid.");
  if (snapshot.bounds) {
    const { minimum, maximum } = snapshot.bounds;
    if (
      !finiteVec3(minimum) ||
      !finiteVec3(maximum) ||
      maximum.x < minimum.x ||
      maximum.y < minimum.y ||
      maximum.z < minimum.z
    )
      return {
        ok: false,
        error: {
          kind: "invalid-fit-bounds",
          representationId: snapshot.representationId,
          message: "Subject bounds must be a finite ordered AABB.",
        },
      };
  }
  return {
    ok: true,
    value: Object.freeze({
      representationId: snapshot.representationId,
      position: copyVec3(snapshot.position),
      ...(snapshot.bounds
        ? {
            bounds: Object.freeze({
              minimum: copyVec3(snapshot.bounds.minimum),
              maximum: copyVec3(snapshot.bounds.maximum),
            }),
          }
        : {}),
    }),
  };
}

function subjectFor(
  subjects: ReadonlyMap<RepresentationId, CameraSubjectSnapshot>,
  representationId: RepresentationId,
): RenderResult<CameraSubjectSnapshot> {
  const subject = subjects.get(representationId);
  return subject
    ? { ok: true, value: subject }
    : {
        ok: false,
        error: { kind: "missing-camera-subject", representationId },
      };
}

function zoomCamera(camera: CameraDefinition, zoom: number): CameraDefinition {
  return camera.kind === "orthographic"
    ? { ...camera, verticalSpan: camera.verticalSpan / zoom }
    : {
        ...camera,
        verticalFieldOfViewRadians:
          2 * Math.atan(Math.tan(camera.verticalFieldOfViewRadians / 2) / zoom),
      };
}

function boundsCorners(bounds: CameraBounds3): readonly Vec3[] {
  const { minimum, maximum } = bounds;
  return Object.freeze([
    vec3(minimum.x, minimum.y, minimum.z),
    vec3(minimum.x, minimum.y, maximum.z),
    vec3(minimum.x, maximum.y, minimum.z),
    vec3(minimum.x, maximum.y, maximum.z),
    vec3(maximum.x, minimum.y, minimum.z),
    vec3(maximum.x, minimum.y, maximum.z),
    vec3(maximum.x, maximum.y, minimum.z),
    vec3(maximum.x, maximum.y, maximum.z),
  ]);
}

function fitCamera(
  camera: CameraDefinition,
  snapshot: CameraSubjectSnapshot,
  padding: number,
): RenderResult<CameraDefinition> {
  const bounds = snapshot.bounds;
  if (!bounds)
    return {
      ok: false,
      error: {
        kind: "invalid-fit-bounds",
        representationId: snapshot.representationId,
        message: "Fit-object requires subject bounds.",
      },
    };
  const center = scaleVec3(addVec3(bounds.minimum, bounds.maximum), 0.5);
  const service = createCameraService(camera);
  if (!service.ok) return service;
  let rightExtent = 0;
  let upExtent = 0;
  let forwardExtent = 0;
  for (const corner of boundsCorners(bounds)) {
    const relative = subtractVec3(corner, center);
    rightExtent = Math.max(
      rightExtent,
      Math.abs(dotVec3(relative, service.value.basis.right)),
    );
    upExtent = Math.max(
      upExtent,
      Math.abs(dotVec3(relative, service.value.basis.up)),
    );
    forwardExtent = Math.max(
      forwardExtent,
      Math.abs(dotVec3(relative, service.value.basis.forward)),
    );
  }
  if (rightExtent <= EPSILON && upExtent <= EPSILON)
    return {
      ok: false,
      error: {
        kind: "invalid-fit-bounds",
        representationId: snapshot.representationId,
        message: "Fit bounds have no visible extent in the camera plane.",
      },
    };
  const paddingScale = 1 + padding;
  const aspect = camera.viewport.width / camera.viewport.height;
  if (camera.kind === "orthographic") {
    const verticalSpan =
      2 * Math.max(upExtent, rightExtent / aspect) * paddingScale;
    const distance = Math.sqrt(
      (camera.position.x - camera.target.x) ** 2 +
        (camera.position.y - camera.target.y) ** 2 +
        (camera.position.z - camera.target.z) ** 2,
    );
    const position = subtractVec3(
      center,
      scaleVec3(service.value.basis.forward, distance),
    );
    return {
      ok: true,
      value: {
        ...camera,
        position,
        target: center,
        verticalSpan,
      },
    };
  }
  const tangent = Math.tan(camera.verticalFieldOfViewRadians / 2);
  const planeDistance =
    Math.max(upExtent / tangent, rightExtent / (tangent * aspect)) *
    paddingScale;
  const distance = Math.max(
    forwardExtent + camera.near,
    forwardExtent + planeDistance,
  );
  if (distance + forwardExtent > camera.far)
    return {
      ok: false,
      error: {
        kind: "invalid-fit-bounds",
        representationId: snapshot.representationId,
        message: "Fit bounds exceed the camera clipping range.",
      },
    };
  return {
    ok: true,
    value: {
      ...camera,
      position: subtractVec3(
        center,
        scaleVec3(service.value.basis.forward, distance),
      ),
      target: center,
    },
  };
}

function interpolateCamera(
  start: CameraDefinition,
  end: CameraDefinition,
  progress: number,
): CameraDefinition {
  const pose = {
    position: interpolateVec3(start.position, end.position, progress),
    target: interpolateVec3(start.target, end.target, progress),
  };
  if (start.kind === "orthographic" && end.kind === "orthographic")
    return {
      ...start,
      ...pose,
      verticalSpan: interpolate(start.verticalSpan, end.verticalSpan, progress),
    };
  if (start.kind === "perspective" && end.kind === "perspective")
    return {
      ...start,
      ...pose,
      verticalFieldOfViewRadians: interpolate(
        start.verticalFieldOfViewRadians,
        end.verticalFieldOfViewRadians,
        progress,
      ),
    };
  return start;
}

function applyOperation(
  camera: CameraDefinition,
  evaluated: EvaluatedCameraOperation,
  subjects: ReadonlyMap<RepresentationId, CameraSubjectSnapshot>,
): RenderResult<CameraDefinition> {
  if (
    typeof evaluated.sourceId !== "string" ||
    evaluated.sourceId.length === 0 ||
    !Number.isFinite(evaluated.progress) ||
    evaluated.progress < 0 ||
    evaluated.progress > 1
  )
    return invalid(
      "Evaluated operation requires a source ID and progress in [0, 1].",
    );
  const operationResult = validateCameraPresentationOperation(
    evaluated.operation,
  );
  if (!operationResult.ok) return operationResult;
  const operation = operationResult.value;
  let next: RenderResult<CameraDefinition>;
  switch (operation.kind) {
    case "pan": {
      const offset = interpolateVec3(
        operation.startOffset,
        operation.endOffset,
        evaluated.progress,
      );
      next = {
        ok: true,
        value: {
          ...camera,
          position: addVec3(camera.position, offset),
          target: addVec3(camera.target, offset),
        },
      };
      break;
    }
    case "zoom": {
      const zoom = interpolate(
        operation.startZoom,
        operation.endZoom,
        evaluated.progress,
      );
      next = { ok: true, value: zoomCamera(camera, zoom) };
      break;
    }
    case "powers-of-ten-zoom": {
      const exponent = interpolate(
        operation.startExponent,
        operation.endExponent,
        evaluated.progress,
      );
      next = { ok: true, value: zoomCamera(camera, 10 ** exponent) };
      break;
    }
    case "fit-object": {
      const subject = subjectFor(subjects, operation.representationId);
      if (!subject.ok) return subject;
      const fitted = fitCamera(camera, subject.value, operation.padding);
      next = fitted.ok
        ? {
            ok: true,
            value: interpolateCamera(camera, fitted.value, evaluated.progress),
          }
        : fitted;
      break;
    }
    case "follow-target": {
      const subject = subjectFor(subjects, operation.representationId);
      if (!subject.ok) return subject;
      const desiredPosition = addVec3(
        subject.value.position,
        operation.cameraOffset,
      );
      const desiredTarget = addVec3(
        subject.value.position,
        operation.lookAtOffset,
      );
      next = {
        ok: true,
        value: {
          ...camera,
          position: interpolateVec3(
            camera.position,
            desiredPosition,
            evaluated.progress,
          ),
          target: interpolateVec3(
            camera.target,
            desiredTarget,
            evaluated.progress,
          ),
        },
      };
      break;
    }
  }
  if (!next.ok) return next;
  const validated = createCameraService(next.value);
  return validated.ok
    ? { ok: true, value: validated.value.definition }
    : validated;
}

export function resolveCameraPresentation(
  baseCamera: CameraDefinition,
  evaluatedOperations: readonly EvaluatedCameraOperation[],
  subjectSnapshots: readonly CameraSubjectSnapshot[] = [],
): RenderResult<CameraDefinition> {
  const base = createCameraService(baseCamera);
  if (!base.ok) return base;
  const subjects = new Map<RepresentationId, CameraSubjectSnapshot>();
  for (const candidate of subjectSnapshots) {
    const subject = validateSubject(candidate);
    if (!subject.ok) return subject;
    if (subjects.has(subject.value.representationId))
      return invalid(
        `Duplicate camera subject: ${subject.value.representationId}.`,
      );
    subjects.set(subject.value.representationId, subject.value);
  }
  let camera = base.value.definition;
  for (const evaluated of evaluatedOperations) {
    const result = applyOperation(camera, evaluated, subjects);
    if (!result.ok) return result;
    camera = result.value;
  }
  return { ok: true, value: camera };
}
