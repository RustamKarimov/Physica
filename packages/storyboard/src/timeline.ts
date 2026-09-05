import type {
  ActiveTimelineClip,
  AdvancedTimelineV1,
  CompiledTimeline,
  TimelineIssue,
  TimelineResult,
  TimelineSnapshot,
  TimelineTrackV1,
} from "./timeline-types";

const TRACK_KINDS = new Set(["animation", "clock", "audio", "acquisition"]);

function validateTrack(
  track: TimelineTrackV1,
  trackIds: Set<string>,
  clipIds: Set<string>,
): TimelineIssue[] {
  const issues: TimelineIssue[] = [];
  if (!track.id.trim() || !track.name.trim() || !TRACK_KINDS.has(track.kind)) {
    issues.push({
      code: "invalid-track",
      message: "Timeline tracks require an ID, name and supported kind.",
      trackId: track.id,
    });
  }
  if (!track.clockKey.trim()) {
    issues.push({
      code: "invalid-track",
      message: "Every timeline track must name its authoritative clock.",
      trackId: track.id,
    });
  }
  if (trackIds.has(track.id)) {
    issues.push({
      code: "duplicate-track",
      message: `Timeline track ID '${track.id}' is duplicated.`,
      trackId: track.id,
    });
  }
  trackIds.add(track.id);

  for (const clip of track.clips) {
    if (clipIds.has(clip.id)) {
      issues.push({
        code: "duplicate-clip",
        message: `Timeline clip ID '${clip.id}' is duplicated.`,
        trackId: track.id,
        clipId: clip.id,
      });
    }
    clipIds.add(clip.id);
    if (
      !clip.id.trim() ||
      !clip.label.trim() ||
      !Number.isFinite(clip.startSeconds) ||
      clip.startSeconds < 0 ||
      !Number.isFinite(clip.durationSeconds) ||
      clip.durationSeconds < 0 ||
      !clip.clockKey.trim()
    ) {
      issues.push({
        code: "invalid-clip",
        message:
          "Timeline clips require finite non-negative timing and a clock.",
        trackId: track.id,
        clipId: clip.id,
      });
    }
    if (clip.clockKey !== track.clockKey) {
      issues.push({
        code: "clock-mismatch",
        message: `Clip '${clip.id}' must use its track clock '${track.clockKey}'.`,
        trackId: track.id,
        clipId: clip.id,
      });
    }
  }
  return issues;
}

export function compileAdvancedTimeline(
  timeline: AdvancedTimelineV1,
): TimelineResult<CompiledTimeline> {
  if (timeline.schemaVersion !== 1) {
    return {
      ok: false,
      issues: [
        {
          code: "invalid-schema",
          message: "Advanced timeline schemaVersion must be 1.",
        },
      ],
    };
  }

  const trackIds = new Set<string>();
  const clipIds = new Set<string>();
  const issues = timeline.tracks.flatMap((track) =>
    validateTrack(track, trackIds, clipIds),
  );
  if (issues.length > 0) return { ok: false, issues };

  let durationSeconds = 0;
  const tracks = timeline.tracks.map((track) => {
    const clips = [...track.clips].sort(
      (left, right) =>
        left.startSeconds - right.startSeconds ||
        left.id.localeCompare(right.id),
    );
    for (const clip of clips) {
      durationSeconds = Math.max(
        durationSeconds,
        clip.startSeconds + clip.durationSeconds,
      );
    }
    return Object.freeze({ ...track, clips: Object.freeze(clips) });
  });

  return {
    ok: true,
    value: Object.freeze({
      schemaVersion: 1 as const,
      tracks: Object.freeze(tracks),
      durationSeconds,
    }),
  };
}

export function evaluateAdvancedTimeline(
  timeline: CompiledTimeline,
  playheadSeconds: number,
): TimelineResult<TimelineSnapshot> {
  if (!Number.isFinite(playheadSeconds) || playheadSeconds < 0) {
    return {
      ok: false,
      issues: [
        {
          code: "invalid-playhead",
          message: "Timeline playhead must be finite and non-negative.",
        },
      ],
    };
  }

  const activeClips: ActiveTimelineClip[] = [];
  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      const end = clip.startSeconds + clip.durationSeconds;
      const active =
        clip.durationSeconds === 0
          ? playheadSeconds === clip.startSeconds
          : playheadSeconds >= clip.startSeconds && playheadSeconds < end;
      if (!active) continue;
      activeClips.push({
        trackId: track.id,
        trackKind: track.kind,
        clockKey: clip.clockKey,
        clip,
        progress:
          clip.durationSeconds === 0
            ? 1
            : (playheadSeconds - clip.startSeconds) / clip.durationSeconds,
      });
    }
  }
  return {
    ok: true,
    value: Object.freeze({
      playheadSeconds,
      activeClips: Object.freeze(activeClips),
    }),
  };
}
