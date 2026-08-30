import type { PresentationTargetState } from "@physica/storyboard";
import type { evaluateDesktopCamera } from "./camera-demo";
import "./camera-demo.css";

type DesktopCameraState = ReturnType<typeof evaluateDesktopCamera>;

export function CameraShowcase({
  state,
}: {
  readonly state: DesktopCameraState;
}) {
  return (
    <div
      className="camera-showcase"
      aria-label={
        "Shared Camera follows the projectile at " +
        Math.round(state.followProgress * 100) +
        " percent"
      }
    >
      <div
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: state.markup }}
      />
      <div className="camera-hud">
        <strong>SHARED ORTHOGRAPHIC CAMERA</strong>
        <span>
          TARGET {state.cameraTarget.x.toFixed(2)} /{" "}
          {state.cameraTarget.y.toFixed(2)}
        </span>
        <span>VERTICAL SPAN {state.verticalSpan.toFixed(2)}</span>
        <span>WORLD POSITION UNCHANGED</span>
      </div>
      <div className="camera-progress" aria-hidden="true">
        <span>
          PAN
          <i style={{ transform: "scaleX(" + state.panProgress + ")" }} />
        </span>
        <span>
          ZOOM
          <i style={{ transform: "scaleX(" + state.zoomProgress + ")" }} />
        </span>
        <span>
          FOLLOW
          <i style={{ transform: "scaleX(" + state.followProgress + ")" }} />
        </span>
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
  cameraState,
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
  readonly cameraState: DesktopCameraState;
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
        Resolve final Camera state
      </label>
      <output>
        X {animatedTarget?.translation.x.toFixed(1) ?? "0.0"} · CAM{" "}
        {cameraState.cameraTarget.x.toFixed(1)}/
        {cameraState.cameraTarget.y.toFixed(1)} · Z{" "}
        {cameraState.verticalSpan.toFixed(2)} · F{" "}
        {Math.round(cameraState.followProgress * 100)}%
      </output>
    </div>
  );
}
