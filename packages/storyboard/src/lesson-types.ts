import type {
  JsonValue,
  PresentationFlow,
  PresentationTransition,
  PresentationTrigger,
  StoryboardStepId,
} from "@physica/core-model";

export type StoryboardObservableValue =
  | { readonly kind: "scalar"; readonly value: number }
  | { readonly kind: "boolean"; readonly value: boolean }
  | { readonly kind: "text"; readonly value: string };

export type StoryboardConditionOperator =
  | "equals"
  | "not-equals"
  | "greater-than"
  | "greater-than-or-equal"
  | "less-than"
  | "less-than-or-equal";

export type LessonAction =
  | {
      readonly kind: "presentation";
      readonly target: string;
      readonly property: string;
      readonly value: JsonValue;
    }
  | {
      readonly kind: "simulation";
      readonly command: "play" | "pause" | "reset" | "seek";
      readonly timeSeconds?: number;
    }
  | {
      readonly kind: "note";
      readonly text: string;
      readonly audience: "teacher" | "learner" | "all";
    }
  | { readonly kind: "camera"; readonly cue: string }
  | { readonly kind: "flow"; readonly trigger: PresentationTrigger };

export type LessonAdvanceRule =
  | { readonly kind: "manual" }
  | { readonly kind: "after-duration"; readonly durationSeconds: number }
  | {
      readonly kind: "condition";
      readonly sourceKey: string;
      readonly operator: StoryboardConditionOperator;
      readonly value: StoryboardObservableValue;
    }
  | {
      readonly kind: "interaction-pause";
      readonly interactionKey: string;
      readonly prompt: string;
    };

export interface LessonStepV1 {
  readonly id: StoryboardStepId;
  readonly name: string;
  readonly actions: readonly LessonAction[];
  readonly advance: LessonAdvanceRule;
}

export interface LessonSchedule {
  readonly steps: readonly LessonStepV1[];
}

export type StoryboardDirective = LessonAction & {
  readonly stepId: StoryboardStepId;
};

export interface StoryboardSnapshot {
  readonly currentStepIndex: number;
  readonly currentStepId?: StoryboardStepId;
  readonly status: "idle" | "active" | "waiting" | "complete";
  readonly latestDirectives: readonly StoryboardDirective[];
  readonly directiveHistory: readonly StoryboardDirective[];
}

export interface LessonFlowResolution {
  readonly transition: PresentationTransition;
  readonly flow: PresentationFlow;
}

export interface LessonError {
  readonly code:
    | "invalid-envelope"
    | "invalid-step"
    | "duplicate-step"
    | "missing-clock"
    | "missing-observable"
    | "condition-type-mismatch"
    | "transition-not-found";
  readonly message: string;
  readonly stepId?: StoryboardStepId;
}

export type LessonResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: LessonError };
