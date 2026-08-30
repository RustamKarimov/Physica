import type {
  ClockId,
  JsonObject,
  SceneId,
  StoryboardStepId,
} from "@physica/core-model";
import type {
  CameraPresentationOperation,
  EvaluatedCameraOperation,
} from "@physica/renderer-core";
import type { AnimationEasing } from "./animation-types";

export interface CameraAnimationTarget {
  readonly kind: "scene";
  readonly sceneId: SceneId;
}

export interface CameraAnimationDefinition {
  readonly id: StoryboardStepId;
  readonly name: string;
  readonly target: CameraAnimationTarget;
  readonly clockKey: "presentation";
  readonly startTimeSeconds: number;
  readonly durationSeconds: number;
  readonly easing: AnimationEasing;
  readonly priority: number;
  readonly reversible: boolean;
  readonly scrubbable: boolean;
  readonly operation: CameraPresentationOperation;
  readonly metadata?: JsonObject;
}

export interface ScheduledCameraAnimation extends CameraAnimationDefinition {
  readonly endTimeSeconds: number;
}

export interface CameraAnimationSchedule {
  readonly animations: readonly ScheduledCameraAnimation[];
  readonly durationSeconds: number;
}

export interface PresentationCameraFrame {
  readonly presentationTimeSeconds: number;
  readonly operations: readonly EvaluatedCameraOperation[];
}

export interface CameraAnimationStateSnapshot extends PresentationCameraFrame {
  readonly sceneId: SceneId;
  readonly presentationClockId: ClockId;
  readonly revision: number;
}
