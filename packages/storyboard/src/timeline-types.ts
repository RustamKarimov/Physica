import type { JsonObject } from "@physica/core-model";

export type TimelineTrackKind = "animation" | "clock" | "audio" | "acquisition";

export interface TimelineClipV1 {
  readonly id: string;
  readonly label: string;
  readonly startSeconds: number;
  readonly durationSeconds: number;
  readonly clockKey: string;
  readonly payload: JsonObject;
}

export interface TimelineTrackV1 {
  readonly id: string;
  readonly name: string;
  readonly kind: TimelineTrackKind;
  readonly clockKey: string;
  readonly clips: readonly TimelineClipV1[];
}

export interface AdvancedTimelineV1 {
  readonly schemaVersion: 1;
  readonly tracks: readonly TimelineTrackV1[];
}

export interface CompiledTimeline {
  readonly schemaVersion: 1;
  readonly tracks: readonly TimelineTrackV1[];
  readonly durationSeconds: number;
}

export interface ActiveTimelineClip {
  readonly trackId: string;
  readonly trackKind: TimelineTrackKind;
  readonly clockKey: string;
  readonly clip: TimelineClipV1;
  readonly progress: number;
}

export interface TimelineSnapshot {
  readonly playheadSeconds: number;
  readonly activeClips: readonly ActiveTimelineClip[];
}

export interface TimelineIssue {
  readonly code:
    | "invalid-schema"
    | "duplicate-track"
    | "duplicate-clip"
    | "invalid-track"
    | "invalid-clip"
    | "clock-mismatch"
    | "invalid-playhead";
  readonly message: string;
  readonly trackId?: string;
  readonly clipId?: string;
}

export type TimelineResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly TimelineIssue[] };
