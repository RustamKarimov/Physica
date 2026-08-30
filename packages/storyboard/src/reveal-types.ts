import type {
  ClockId,
  JsonObject,
  RepresentationId,
  SceneId,
  StoryboardStepId,
} from "@physica/core-model";
import type { AnimationEasing } from "./animation-types";

export type RevealChannel = "path" | "mask" | "opacity" | "label" | "emphasis";

interface ProgressOperation {
  readonly startProgress: number;
  readonly endProgress: number;
}

export type RevealOperation =
  | (ProgressOperation & {
      readonly kind: "draw-path";
      readonly direction: "forward" | "reverse";
    })
  | (ProgressOperation & {
      readonly kind: "mask";
      readonly axis: "horizontal" | "vertical";
      readonly edge: "start" | "end";
      readonly feather: number;
    })
  | {
      readonly kind: "opacity";
      readonly startOpacity: number;
      readonly endOpacity: number;
    }
  | (ProgressOperation & { readonly kind: "write-label" })
  | {
      readonly kind: "emphasis";
      readonly mode: "highlight" | "dim" | "isolate";
      readonly startIntensity: number;
      readonly endIntensity: number;
      readonly accent?: {
        readonly red: number;
        readonly green: number;
        readonly blue: number;
        readonly alpha: number;
      };
    };

export interface RevealTarget {
  readonly kind: "representation";
  readonly sceneId: SceneId;
  readonly id: RepresentationId;
}

export interface RevealDefinition {
  readonly id: StoryboardStepId;
  readonly name: string;
  readonly target: RevealTarget;
  readonly clockKey: "presentation";
  readonly startTimeSeconds: number;
  readonly durationSeconds: number;
  readonly easing: AnimationEasing;
  readonly priority: number;
  readonly reversible: boolean;
  readonly scrubbable: boolean;
  readonly operation: RevealOperation;
  readonly metadata?: JsonObject;
}

export interface ScheduledReveal extends RevealDefinition {
  readonly channel: RevealChannel;
  readonly endTimeSeconds: number;
}

export interface RevealSchedule {
  readonly reveals: readonly ScheduledReveal[];
  readonly durationSeconds: number;
}

export interface RevealSource<T> {
  readonly value: T;
  readonly sourceId: StoryboardStepId;
}

export interface RevealTargetState {
  readonly sceneId: SceneId;
  readonly representationId: RepresentationId;
  readonly path?: RevealSource<{
    readonly progress: number;
    readonly direction: "forward" | "reverse";
  }>;
  readonly mask?: RevealSource<{
    readonly progress: number;
    readonly axis: "horizontal" | "vertical";
    readonly edge: "start" | "end";
    readonly feather: number;
  }>;
  readonly opacity?: RevealSource<number>;
  readonly label?: RevealSource<number>;
  readonly emphasis?: RevealSource<{
    readonly mode: "highlight" | "dim" | "isolate";
    readonly intensity: number;
    readonly accent?: {
      readonly red: number;
      readonly green: number;
      readonly blue: number;
      readonly alpha: number;
    };
  }>;
}

export interface PresentationRevealFrame {
  readonly presentationTimeSeconds: number;
  readonly targets: readonly RevealTargetState[];
}

export interface RevealStateSnapshot extends PresentationRevealFrame {
  readonly sceneId: SceneId;
  readonly presentationClockId: ClockId;
  readonly revision: number;
}
