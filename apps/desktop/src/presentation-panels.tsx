import type { PresentationTargetState } from "@physica/storyboard";
import type { evaluateDesktopReveal } from "./reveal-demo";
import "./reveal-demo.css";

type DesktopRevealState = ReturnType<typeof evaluateDesktopReveal>;

export function RevealShowcase({
  state,
}: {
  readonly state: DesktopRevealState;
}) {
  return (
    <div className="reveal-showcase">
      <svg
        className="reveal-vector"
        viewBox="0 0 310 210"
        role="img"
        aria-label={
          "Force vector " + Math.round(state.pathProgress * 100) + "% drawn"
        }
      >
        <line
          x1="52"
          y1="166"
          x2="255"
          y2="56"
          pathLength={state.dashArray}
          strokeDasharray={state.dashArray}
          strokeDashoffset={state.dashOffset}
        />
        {state.arrowHeadVisible && <path d="M255 56L224 59M255 56L239 83" />}
        <text x="62" y="188">
          PATH DRAW
        </text>
      </svg>
      <div
        className="written-label"
        aria-label={state.fullLabel}
        title="Full accessible label remains available while the visual prefix writes"
      >
        <small>GRAPHEME-SAFE LABEL</small>
        <strong>{state.visibleLabel}</strong>
        <span aria-hidden="true" />
      </div>
      <div className="emphasis-diagram">
        <div
          className="focus-vector"
          style={{
            boxShadow:
              "0 0 " +
              34 * state.highlightIntensity +
              "px rgba(246,199,67,.72)",
          }}
        >
          F
        </div>
        <div
          className="context-vector"
          style={{ opacity: state.contextOpacity }}
        >
          v
        </div>
        <p>Focus: resultant force · velocity remains context</p>
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
  revealState,
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
  readonly revealState: DesktopRevealState;
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
        {animatedTarget?.rotationRadians.toFixed(2) ?? "0.00"} · S{" "}
        {animatedTarget?.scale.x.toFixed(2) ?? "1.00"} · D{" "}
        {Math.round(revealState.pathProgress * 100)}% · W{" "}
        {revealState.visibleGraphemes}/{revealState.totalGraphemes}
      </output>
    </div>
  );
}
