import type {
  ClockId,
  JsonObject,
  RepresentationId,
  SceneId,
  StoryboardStepId,
} from "@physica/core-model";
import type { AnimationEasing } from "./animation-types";

export interface MorphTarget {
  readonly kind: "representation";
  readonly sceneId: SceneId;
  readonly id: RepresentationId;
}

export type MorphOperation =
  | {
      readonly kind: "shape-morph";
      readonly topology: "open" | "closed";
      readonly sampleCount: number;
    }
  | {
      readonly kind: "matched-transform";
      readonly semanticId: string;
      readonly sourceCompatibilityKey: string;
      readonly destinationCompatibilityKey: string;
      readonly strategy: "morph" | "replace";
    };

export interface MorphDefinition {
  readonly id: StoryboardStepId;
  readonly name: string;
  readonly source: MorphTarget;
  readonly destination: MorphTarget;
  readonly clockKey: "presentation";
  readonly startTimeSeconds: number;
  readonly durationSeconds: number;
  readonly easing: AnimationEasing;
  readonly priority: number;
  readonly reversible: boolean;
  readonly scrubbable: boolean;
  readonly operation: MorphOperation;
  readonly metadata?: JsonObject;
}

export interface ScheduledMorph extends MorphDefinition {
  readonly endTimeSeconds: number;
}

export interface MorphSchedule {
  readonly morphs: readonly ScheduledMorph[];
  readonly durationSeconds: number;
}

export interface MorphTransitionState {
  readonly id: StoryboardStepId;
  readonly source: MorphTarget;
  readonly destination: MorphTarget;
  readonly operation: MorphOperation;
  readonly progress: number;
  readonly sourceOpacity: number;
  readonly destinationOpacity: number;
}

export interface PresentationMorphFrame {
  readonly presentationTimeSeconds: number;
  readonly transitions: readonly MorphTransitionState[];
}

export interface MorphStateSnapshot extends PresentationMorphFrame {
  readonly sceneId: SceneId;
  readonly presentationClockId: ClockId;
  readonly revision: number;
}

export interface MatchedTransformElement {
  readonly semanticId: string;
  readonly target: MorphTarget;
  readonly compatibilityKey: string;
}

export interface MatchedTransformPair {
  readonly semanticId: string;
  readonly source: MatchedTransformElement;
  readonly destination: MatchedTransformElement;
  readonly strategy: "morph" | "replace";
}

export interface MatchedTransformPlan {
  readonly matches: readonly MatchedTransformPair[];
  readonly exits: readonly MatchedTransformElement[];
  readonly entries: readonly MatchedTransformElement[];
}
