import {
  compileAdvancedTimeline,
  evaluateAdvancedTimeline,
} from "@physica/storyboard";
import { useMemo, useState } from "react";
import { TEACHER_TIMELINE } from "./editor-model";

const compilation = compileAdvancedTimeline(TEACHER_TIMELINE);
if (!compilation.ok) throw new Error(compilation.issues[0]?.message);
const compiled = compilation.value;

export function AdvancedTimeline() {
  const [playhead, setPlayhead] = useState(2.5);
  const snapshot = useMemo(
    () => evaluateAdvancedTimeline(compiled, playhead),
    [playhead],
  );
  const active = new Set(
    snapshot.ok ? snapshot.value.activeClips.map((entry) => entry.clip.id) : [],
  );
  return (
    <section className="advanced-timeline" aria-label="Advanced timeline">
      <div className="timeline-toolbar">
        <div>
          <b>Advanced timeline</b>
          <span>Each track names its own authoritative clock.</span>
        </div>
        <output>{playhead.toFixed(2)} s</output>
      </div>
      <input
        className="timeline-scrubber"
        type="range"
        min="0"
        max={compiled.durationSeconds}
        step="0.05"
        value={playhead}
        aria-label="Timeline playhead"
        onChange={(event) => setPlayhead(Number(event.currentTarget.value))}
      />
      <div className="timeline-tracks">
        {compiled.tracks.map((track) => (
          <div className="timeline-track" key={track.id}>
            <div className="timeline-label">
              <i className={"track-dot " + track.kind} />
              <b>{track.name}</b>
              <span>{track.clockKey} clock</span>
            </div>
            <div className="timeline-lane">
              {track.clips.map((clip) => (
                <div
                  key={clip.id}
                  className={
                    "timeline-clip " + (active.has(clip.id) ? "active" : "")
                  }
                  style={{
                    left:
                      (clip.startSeconds / compiled.durationSeconds) * 100 +
                      "%",
                    width:
                      Math.max(
                        (clip.durationSeconds / compiled.durationSeconds) * 100,
                        1,
                      ) + "%",
                  }}
                >
                  {clip.label}
                </div>
              ))}
              <i
                className="timeline-playhead"
                style={{
                  left: (playhead / compiled.durationSeconds) * 100 + "%",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
