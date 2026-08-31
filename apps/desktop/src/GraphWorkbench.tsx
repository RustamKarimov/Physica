import { useEffect, useMemo, useState } from "react";
import {
  graphDemoEvidence,
  resolveBasicGraphDemo,
  resolveLiveGraphDemo,
} from "./graph-demos";
import { GraphSvg } from "./GraphSvg";
import "./graph-workbench.css";

type DemoKey = "basic" | "live";

export function GraphWorkbench() {
  const [demo, setDemo] = useState<DemoKey>("basic");
  const [cursorTime, setCursorTime] = useState(2.25);
  const [playing, setPlaying] = useState(false);
  const basicPlan = useMemo(() => resolveBasicGraphDemo(), []);
  const livePlan = useMemo(
    () => resolveLiveGraphDemo(cursorTime),
    [cursorTime],
  );
  const plan = demo === "basic" ? basicPlan : livePlan;

  useEffect(() => {
    if (!playing || demo !== "live") return;
    const timer = window.setInterval(() => {
      setCursorTime((current) => (current >= 5 ? 0 : current + 0.05));
    }, 50);
    return () => window.clearInterval(timer);
  }, [demo, playing]);

  return (
    <section
      className="graph-workbench-section"
      id="graph-engine"
      aria-labelledby="graph-workbench-title"
    >
      <div className="graph-workbench-heading">
        <div>
          <div className="graph-kicker">
            <span>STEP 4.3 · GRAPH ENGINE</span>
            <b>VERIFIED</b>
          </div>
          <h1 id="graph-workbench-title">
            Plot the evidence.
            <em> Keep physics authoritative.</em>
          </h1>
          <p>
            Canonical, unit-aware samples resolve into axes, curves, markers,
            annotations and cursor readouts. Resizing or inspecting the graph
            never rewrites the dataset or re-runs the simulation.
          </p>
        </div>
        <dl className="graph-summary">
          <div>
            <dt>SERIES</dt>
            <dd>{plan.curves.length}</dd>
          </div>
          <div>
            <dt>SCALE</dt>
            <dd>LINEAR</dd>
          </div>
          <div>
            <dt>SPACE</dt>
            <dd>GRAPH-DATA</dd>
          </div>
        </dl>
      </div>

      <div
        className="graph-demo-tabs"
        role="tablist"
        aria-label="Graph examples"
      >
        <button
          role="tab"
          aria-selected={demo === "basic"}
          onClick={() => {
            setDemo("basic");
            setPlaying(false);
          }}
        >
          <span>01</span>
          <b>Compare motion</b>
          <small>Measured + model</small>
        </button>
        <button
          role="tab"
          aria-selected={demo === "live"}
          onClick={() => setDemo("live")}
        >
          <span>02</span>
          <b>Live cursor</b>
          <small>Fixed-clock samples</small>
        </button>
      </div>

      <div className="graph-workbench-grid">
        <div className="graph-stage-card">
          <div className="graph-stage-header">
            <div>
              <small>RESOLVED GRAPH</small>
              <strong>{plan.name}</strong>
            </div>
            <span>
              {demo === "live" ? "SIMULATION CLOCK" : "PERSISTED DATASET"}
            </span>
          </div>
          <GraphSvg plan={plan} id={`foundation-${demo}`} />
          <div className="graph-legend" aria-label="Graph legend">
            {plan.curves.map((curve) => (
              <span key={curve.seriesKey}>
                <i
                  style={{
                    borderColor: curve.style.strokeHex,
                    borderStyle: curve.style.dash ? "dashed" : "solid",
                  }}
                />
                {curve.name}
              </span>
            ))}
          </div>
        </div>

        <aside className="graph-inspector" aria-label="Graph inspector">
          <div className="graph-inspector-title">
            <span>GRAPH INSPECTOR</span>
            <b>17</b>
          </div>
          {demo === "live" ? (
            <div className="graph-cursor-control">
              <small>PRESENTATION CURSOR</small>
              <strong>{cursorTime.toFixed(2)} s</strong>
              <input
                aria-label="Graph cursor time"
                type="range"
                min="0"
                max="5"
                step="0.05"
                value={cursorTime}
                onChange={(event) => {
                  setPlaying(false);
                  setCursorTime(Number(event.target.value));
                }}
              />
              <button onClick={() => setPlaying((current) => !current)}>
                {playing ? "PAUSE CURSOR" : "PLAY CURSOR"}
              </button>
              <div className="graph-readouts" aria-live="polite">
                {plan.cursor?.readouts.map((readout) => (
                  <div key={readout.seriesKey}>
                    <span>{readout.seriesName}</span>
                    <strong>{readout.yDisplay} m/s</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="graph-static-evidence">
              <small>OBSERVATION</small>
              <strong>10.3 m at 4 s</strong>
              <p>
                The solid measured curve and dashed model curve share SI
                dimensions but retain independent provenance and styling.
              </p>
            </div>
          )}
          <dl className="graph-contracts">
            <div>
              <dt>DATA AUTHORITY</dt>
              <dd>
                {graphDemoEvidence.basicDatasetFrozen ? "FROZEN" : "MUTABLE"}
              </dd>
            </div>
            <div>
              <dt>LIVE SAMPLES</dt>
              <dd>{graphDemoEvidence.liveSampleCount}</dd>
            </div>
            <div>
              <dt>SAMPLING</dt>
              <dd>{graphDemoEvidence.liveSamplingMethod}</dd>
            </div>
          </dl>
          <div className="graph-authority-note">
            <span>SEPARATION CONTRACT</span>
            <p>
              Cursor position lives in presentation state. It interpolates
              stored values and cannot become an authoritative writer.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
