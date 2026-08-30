import type { PresentationTargetState } from "@physica/storyboard";
import type { evaluateDesktopMorph } from "./morph-demo";
import "./morph-demo.css";

type DesktopMorphState = ReturnType<typeof evaluateDesktopMorph>;

export function MorphShowcase({
  state,
}: {
  readonly state: DesktopMorphState;
}) {
  return (
    <div className="morph-showcase">
      <svg
        className="morph-canvas"
        viewBox="0 0 310 210"
        role="img"
        aria-label={
          "Circle to ellipse morph " + Math.round(state.progress * 100) + "%"
        }
      >
        <path d={state.pathData} />
        <circle cx="155" cy="105" r="4" />
        <text x="12" y="20">
          64 ARC-LENGTH SAMPLES
        </text>
        <text x="12" y="195">
          PRESENTATION GEOMETRY · PHYSICS UNCHANGED
        </text>
      </svg>
      <div className="match-board" aria-label="Matched transform diagnostics">
        <div className="match-card">
          <small>SEMANTIC ID MATCH</small>
          <strong>{state.matchedMorphId}</strong>
          <span>PATH → MORPH</span>
        </div>
        <div className="match-card replace">
          <small>INCOMPATIBLE OBJECT</small>
          <strong>{state.matchedReplaceId}</strong>
          <span>TEXT → IMAGE · REPLACE</span>
        </div>
      </div>
      <div className="morph-legend">
        CIRCLE → CANONICAL RESAMPLE → ELLIPSE ·{" "}
        {Math.round(state.progress * 100)}%
      </div>
    </div>
  );
}

export function PresentationControls({
  playing,
  direction,
  timeSeconds,
  durationSeconds,
  reducedMotion,
  animatedTarget,
  morphState,
  onTogglePlaying,
  onFlipDirection,
  onReset,
  onScrub,
  onReducedMotion,
}: {
  readonly playing: boolean;
  readonly direction: 1 | -1;
  readonly timeSeconds: number;
  readonly durationSeconds: number;
  readonly reducedMotion: boolean;
  readonly animatedTarget: PresentationTargetState | undefined;
  readonly morphState: DesktopMorphState;
  readonly onTogglePlaying: () => void;
  readonly onFlipDirection: () => void;
  readonly onReset: () => void;
  readonly onScrub: (timeSeconds: number) => void;
  readonly onReducedMotion: (enabled: boolean) => void;
}) {
  return (
    <div className="animation-controls">
      <small>PRESENTATION CLOCK</small>
      <div className="transport">
        <button onClick={onTogglePlaying}>{playing ? "Pause" : "Play"}</button>
        <button onClick={onFlipDirection}>
          {direction === 1 ? "Reverse" : "Forward"}
        </button>
        <button onClick={onReset}>Reset</button>
      </div>
      <input
        aria-label="Scrub presentation time"
        type="range"
        min="0"
        max={durationSeconds}
        step="0.01"
        value={timeSeconds}
        onChange={(event) => onScrub(Number(event.target.value))}
      />
      <label>
        <input
          type="checkbox"
          checked={reducedMotion}
          onChange={(event) => onReducedMotion(event.target.checked)}
        />
        Resolve final state
      </label>
      <output>
        X {animatedTarget?.translation.x.toFixed(1) ?? "0.0"} · θ{" "}
        {animatedTarget?.rotationRadians.toFixed(2) ?? "0.00"} · M{" "}
        {Math.round(morphState.progress * 100)}% · N {morphState.sampleCount}
      </output>
    </div>
  );
}
