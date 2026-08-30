import type {
  ClockId,
  JsonObject,
  RepresentationId,
  SceneId,
  StoryboardStepId,
} from "@physica/core-model";

export type AnimationChannel =
  | "presentation.translation"
  | "presentation.rotation"
  | "presentation.scale"
  | "presentation.opacity";

export type AnimationValue =
  | { readonly kind: "scalar"; readonly value: number }
  | {
      readonly kind: "vec3";
      readonly x: number;
      readonly y: number;
      readonly z: number;
    };

export type AnimationEasing =
  | {
      readonly kind: "named";
      readonly id: "linear" | "ease-in" | "ease-out" | "ease-in-out";
    }
  | {
      readonly kind: "cubic-bezier";
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
    };

export type AnimationConflictPolicy =
  "sequence" | "replace" | "additive" | "multiplicative" | "reject";

export interface AnimationTarget {
  readonly kind: "representation";
  readonly sceneId: SceneId;
  readonly id: RepresentationId;
}

export interface AnimationDefinition {
  readonly id: StoryboardStepId;
  readonly name: string;
  readonly target: AnimationTarget;
  readonly clockKey: "presentation";
  readonly channel: AnimationChannel;
  readonly startTimeSeconds: number;
  readonly durationSeconds: number;
  readonly easing: AnimationEasing;
  readonly startValue: AnimationValue;
  readonly endValue: AnimationValue;
  readonly conflictPolicy: AnimationConflictPolicy;
  readonly priority: number;
  readonly reversible: boolean;
  readonly scrubbable: boolean;
  readonly metadata?: JsonObject;
}

export interface ScheduledAnimation extends AnimationDefinition {
  readonly endTimeSeconds: number;
}

export interface AnimationSchedule {
  readonly animations: readonly ScheduledAnimation[];
  readonly durationSeconds: number;
}

export type AnimationComposition =
  | { readonly kind: "clip"; readonly animation: AnimationDefinition }
  | {
      readonly kind: "sequence" | "parallel";
      readonly children: readonly AnimationComposition[];
    }
  | {
      readonly kind: "stagger";
      readonly intervalSeconds: number;
      readonly children: readonly AnimationComposition[];
    }
  | { readonly kind: "wait"; readonly durationSeconds: number };

export interface PresentationTargetState {
  readonly sceneId: SceneId;
  readonly representationId: RepresentationId;
  readonly translation: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly rotationRadians: number;
  readonly scale: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly opacity: number;
  readonly sourceAnimationIds: {
    readonly translation: readonly StoryboardStepId[];
    readonly rotation: readonly StoryboardStepId[];
    readonly scale: readonly StoryboardStepId[];
    readonly opacity: readonly StoryboardStepId[];
  };
}

export interface PresentationAnimationFrame {
  readonly presentationTimeSeconds: number;
  readonly targets: readonly PresentationTargetState[];
}

export interface PresentationStateSnapshot extends PresentationAnimationFrame {
  readonly sceneId: SceneId;
  readonly presentationClockId: ClockId;
  readonly revision: number;
}
