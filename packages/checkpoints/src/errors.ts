import type { Result } from "@physica/core-model";

export type CheckpointError =
  | { readonly kind: "invalid-checkpoint"; readonly message: string }
  | { readonly kind: "invalid-checkpoint-policy"; readonly message: string }
  | { readonly kind: "duplicate-checkpoint"; readonly checkpointId: string }
  | {
      readonly kind: "checkpoint-not-found";
      readonly sceneId: string;
      readonly clockId: string;
      readonly targetTimeSeconds: number;
    }
  | {
      readonly kind: "checkpoint-sequence-exhausted";
      readonly sequence: number;
    }
  | {
      readonly kind: "checksum-mismatch";
      readonly checkpointId: string;
      readonly expected: string;
      readonly actual: string;
    }
  | {
      readonly kind: "scene-mismatch";
      readonly expected: string;
      readonly actual: string;
    }
  | { readonly kind: "clock-not-found"; readonly clockId: string }
  | { readonly kind: "snapshot-validation-failed"; readonly message: string }
  | { readonly kind: "duplicate-participant"; readonly participantId: string }
  | { readonly kind: "participant-not-found"; readonly participantId: string }
  | {
      readonly kind: "participant-capture-failed";
      readonly participantId: string;
      readonly message: string;
    }
  | {
      readonly kind: "participant-restore-failed";
      readonly participantId: string;
      readonly message: string;
    }
  | { readonly kind: "restore-rollback-failed"; readonly message: string }
  | {
      readonly kind: "invalid-scrub-target";
      readonly targetTimeSeconds: number;
    }
  | {
      readonly kind: "invalid-replay-step";
      readonly maximumStepSeconds: number;
    }
  | {
      readonly kind: "replay-step-failed";
      readonly message: string;
      readonly fromTimeSeconds: number;
      readonly toTimeSeconds: number;
    }
  | {
      readonly kind: "replay-clock-diverged";
      readonly clockId: string;
      readonly expectedTimeSeconds: number;
      readonly actualTimeSeconds: number;
    }
  | { readonly kind: "derived-regeneration-failed"; readonly message: string }
  | { readonly kind: "analytical-evaluation-failed"; readonly message: string };

export type CheckpointResult<T> = Result<T, CheckpointError>;
