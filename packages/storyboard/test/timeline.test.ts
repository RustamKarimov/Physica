import { describe, expect, it } from "vitest";
import {
  compileAdvancedTimeline,
  evaluateAdvancedTimeline,
  type AdvancedTimelineV1,
} from "../src";

const timeline: AdvancedTimelineV1 = {
  schemaVersion: 1,
  tracks: [
    {
      id: "motion",
      name: "Animation",
      kind: "animation",
      clockKey: "presentation",
      clips: [
        {
          id: "late",
          label: "Reveal path",
          startSeconds: 2,
          durationSeconds: 2,
          clockKey: "presentation",
          payload: { target: "trajectory" },
        },
        {
          id: "early",
          label: "Introduce ball",
          startSeconds: 0,
          durationSeconds: 3,
          clockKey: "presentation",
          payload: { target: "ball" },
        },
      ],
    },
    {
      id: "samples",
      name: "Acquisition",
      kind: "acquisition",
      clockKey: "simulation",
      clips: [
        {
          id: "capture",
          label: "Record height",
          startSeconds: 1,
          durationSeconds: 4,
          clockKey: "simulation",
          payload: { observable: "ball.height" },
        },
      ],
    },
  ],
};

describe("advanced multi-clock timeline", () => {
  it("compiles deterministically and evaluates without advancing a clock", () => {
    const compiled = compileAdvancedTimeline(timeline);
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    expect(compiled.value.tracks[0]?.clips.map((clip) => clip.id)).toEqual([
      "early",
      "late",
    ]);
    expect(compiled.value.durationSeconds).toBe(5);

    const snapshot = evaluateAdvancedTimeline(compiled.value, 2.5);
    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) return;
    expect(snapshot.value.activeClips.map((clip) => clip.clip.id)).toEqual([
      "early",
      "late",
      "capture",
    ]);
    expect(snapshot.value.activeClips[1]?.progress).toBe(0.25);
    expect(snapshot.value.activeClips[2]?.clockKey).toBe("simulation");
  });

  it("rejects duplicate IDs, invalid timing and hidden clock substitution", () => {
    const result = compileAdvancedTimeline({
      schemaVersion: 1,
      tracks: [
        {
          id: "track",
          name: "Audio",
          kind: "audio",
          clockKey: "audio",
          clips: [
            {
              id: "clip",
              label: "Narration",
              startSeconds: -1,
              durationSeconds: 1,
              clockKey: "presentation",
              payload: {},
            },
          ],
        },
        {
          id: "track",
          name: "Clock",
          kind: "clock",
          clockKey: "simulation",
          clips: [],
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "invalid-clip",
        "clock-mismatch",
        "duplicate-track",
      ]),
    );
  });
});
