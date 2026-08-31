import type { RepresentationId } from "@physica/core-model";
import { vec3, type Vec3 } from "@physica/mathematics";
import type { RenderResult } from "./errors";

export type CameraAnimationChannel = "pose" | "projection";

export interface CameraBounds3 {
  readonly minimum: Vec3;
  readonly maximum: Vec3;
}

export interface CameraSubjectSnapshot {
  readonly representationId: RepresentationId;
  readonly position: Vec3;
  readonly bounds?: CameraBounds3;
}

export type CameraPresentationOperation =
  | {
      readonly kind: "pan";
      readonly startOffset: Vec3;
      readonly endOffset: Vec3;
    }
  | {
      readonly kind: "zoom";
      readonly startZoom: number;
      readonly endZoom: number;
    }
  | {
      readonly kind: "fit-object";
      readonly representationId: RepresentationId;
      readonly padding: number;
    }
  | {
      readonly kind: "follow-target";
      readonly representationId: RepresentationId;
      readonly cameraOffset: Vec3;
      readonly lookAtOffset: Vec3;
    }
  | {
      readonly kind: "powers-of-ten-zoom";
      readonly startExponent: number;
      readonly endExponent: number;
    };

export interface EvaluatedCameraOperation {
  readonly sourceId: string;
  readonly operation: CameraPresentationOperation;
  readonly progress: number;
}

export function finiteCameraVec3(value: unknown): value is Vec3 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Vec3>;
  return (
    Number.isFinite(candidate.x) &&
    Number.isFinite(candidate.y) &&
    Number.isFinite(candidate.z)
  );
}

export function copyCameraVec3(value: Vec3): Vec3 {
  return vec3(value.x, value.y, value.z);
}

export function invalidCameraAnimation(message: string): RenderResult<never> {
  return {
    ok: false,
    error: { kind: "invalid-camera-animation", message },
  };
}

export function cameraOperationChannels(
  operation: CameraPresentationOperation,
): readonly CameraAnimationChannel[] {
  switch (operation.kind) {
    case "pan":
    case "follow-target":
      return Object.freeze(["pose"]);
    case "zoom":
    case "powers-of-ten-zoom":
      return Object.freeze(["projection"]);
    case "fit-object":
      return Object.freeze(["pose", "projection"]);
  }
}

export function validateCameraPresentationOperation(
  operation: unknown,
): RenderResult<CameraPresentationOperation> {
  if (!operation || typeof operation !== "object")
    return invalidCameraAnimation("Camera operation must be an object.");
  const candidate = operation as Record<string, unknown>;
  switch (candidate.kind) {
    case "pan":
      if (
        !finiteCameraVec3(candidate.startOffset) ||
        !finiteCameraVec3(candidate.endOffset)
      )
        return invalidCameraAnimation(
          "Pan offsets must be finite Vec3 values.",
        );
      return {
        ok: true,
        value: Object.freeze({
          kind: "pan",
          startOffset: copyCameraVec3(candidate.startOffset),
          endOffset: copyCameraVec3(candidate.endOffset),
        }),
      };
    case "zoom":
      if (
        !Number.isFinite(candidate.startZoom) ||
        !Number.isFinite(candidate.endZoom) ||
        (candidate.startZoom as number) <= 0 ||
        (candidate.endZoom as number) <= 0
      )
        return invalidCameraAnimation(
          "Zoom factors must be finite and positive.",
        );
      return {
        ok: true,
        value: Object.freeze({
          kind: "zoom",
          startZoom: candidate.startZoom as number,
          endZoom: candidate.endZoom as number,
        }),
      };
    case "fit-object":
      if (
        typeof candidate.representationId !== "string" ||
        candidate.representationId.length === 0 ||
        !Number.isFinite(candidate.padding) ||
        (candidate.padding as number) < 0 ||
        (candidate.padding as number) > 10
      )
        return invalidCameraAnimation(
          "Fit-object requires a Representation ID and padding in [0, 10].",
        );
      return {
        ok: true,
        value: Object.freeze({
          kind: "fit-object",
          representationId: candidate.representationId as RepresentationId,
          padding: candidate.padding as number,
        }),
      };
    case "follow-target":
      if (
        typeof candidate.representationId !== "string" ||
        candidate.representationId.length === 0 ||
        !finiteCameraVec3(candidate.cameraOffset) ||
        !finiteCameraVec3(candidate.lookAtOffset)
      )
        return invalidCameraAnimation(
          "Follow-target requires a Representation ID and finite offsets.",
        );
      return {
        ok: true,
        value: Object.freeze({
          kind: "follow-target",
          representationId: candidate.representationId as RepresentationId,
          cameraOffset: copyCameraVec3(candidate.cameraOffset),
          lookAtOffset: copyCameraVec3(candidate.lookAtOffset),
        }),
      };
    case "powers-of-ten-zoom":
      if (
        !Number.isFinite(candidate.startExponent) ||
        !Number.isFinite(candidate.endExponent) ||
        (candidate.startExponent as number) < -12 ||
        (candidate.startExponent as number) > 12 ||
        (candidate.endExponent as number) < -12 ||
        (candidate.endExponent as number) > 12
      )
        return invalidCameraAnimation(
          "Powers-of-ten exponents must be finite and in [-12, 12].",
        );
      return {
        ok: true,
        value: Object.freeze({
          kind: "powers-of-ten-zoom",
          startExponent: candidate.startExponent as number,
          endExponent: candidate.endExponent as number,
        }),
      };
    default:
      return invalidCameraAnimation("Camera operation kind is unknown.");
  }
}
