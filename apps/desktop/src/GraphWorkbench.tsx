import { useEffect, useMemo, useState } from "react";
import type { ResolvedCartesianGraph } from "@physica/graphs";
import {
  graphDemoEvidence,
  resolveBasicGraphDemo,
  resolveLiveGraphDemo,
} from "./graph-demos";
import "./graph-workbench.css";

type DemoKey = "basic" | "live";

const polyline = (
  points: readonly { readonly x: number; readonly y: number }[],
) => points.map((point) => `${point.x},${point.y}`).join(" ");

function GraphCanvas({
  plan,
  demo,
}: {
  readonly plan: ResolvedCartesianGraph;
  readonly demo: DemoKey;
}) {
  const clipId = `graph-plot-${demo}`;
  return (
    <svg
      className="graph-canvas"
      viewBox={`0 0 ${plan.viewport.width} ${plan.viewport.height}`}
      role="img"
      aria-labelledby={`graph-title-${demo} graph-description-${demo}`}
    >
      <title id={`graph-title-${demo}`}>{plan.name}</title>
      <desc id={`graph-description-${demo}`}>{plan.accessibilitySummary}</desc>
      <defs>
        <clipPath id={clipId}>
          <rect {...plan.plotRect} />
        </clipPath>
      </defs>
      <rect
        className="graph-plot-background"
        x={plan.plotRect.x}
        y={plan.plotRect.y}
        width={plan.plotRect.width}
        height={plan.plotRect.height}
      />
      <g className="graph-grid" aria-hidden="true">
        {plan.xTicks.map((tick) => (
          <line
            key={`x-grid-${tick.canonicalValue}`}
            x1={tick.position.x}
            x2={tick.position.x}
            y1={plan.plotRect.y}
            y2={plan.plotRect.y + plan.plotRect.height}
          />
        ))}
        {plan.yTicks.map((tick) => (
          <line
            key={`y-grid-${tick.canonicalValue}`}
            x1={plan.plotRect.x}
            x2={plan.plotRect.x + plan.plotRect.width}
            y1={tick.position.y}
            y2={tick.position.y}
          />
        ))}
      </g>
      <g className="graph-axes" aria-hidden="true">
        <line
          x1={plan.plotRect.x}
          x2={plan.plotRect.x + plan.plotRect.width}
          y1={plan.plotRect.y + plan.plotRect.height}
          y2={plan.plotRect.y + plan.plotRect.height}
        />
        <line
          x1={plan.plotRect.x}
          x2={plan.plotRect.x}
          y1={plan.plotRect.y}
          y2={plan.plotRect.y + plan.plotRect.height}
        />
      </g>
      <g className="graph-ticks" aria-hidden="true">
        {plan.xTicks.map((tick) => (
          <text
            key={`x-label-${tick.canonicalValue}`}
            x={tick.position.x}
            y={plan.plotRect.y + plan.plotRect.height + 25}
            textAnchor="middle"
          >
            {tick.label}
          </text>
        ))}
        {plan.yTicks.map((tick) => (
          <text
            key={`y-label-${tick.canonicalValue}`}
            x={plan.plotRect.x - 15}
            y={tick.position.y + 5}
            textAnchor="end"
          >
            {tick.label}
          </text>
        ))}
        <text
          className="graph-axis-title"
          x={plan.plotRect.x + plan.plotRect.width / 2}
          y={plan.viewport.height - 12}
          textAnchor="middle"
        >
          {plan.xAxisLabel}
        </text>
        <text
          className="graph-axis-title"
          x={19}
          y={plan.plotRect.y + plan.plotRect.height / 2}
          textAnchor="middle"
          transform={`rotate(-90 19 ${plan.plotRect.y + plan.plotRect.height / 2})`}
        >
          {plan.yAxisLabel}
        </text>
      </g>
      <g clipPath={`url(#${clipId})`}>
        {plan.curves.map((curve) => (
          <polyline
            key={`${curve.datasetId}-${curve.seriesKey}`}
            points={polyline(curve.points)}
            fill="none"
            stroke={curve.style.strokeHex}
            strokeWidth={curve.style.lineWidth}
            strokeDasharray={curve.style.dash?.join(" ")}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {plan.cursor && (
          <line
            className="graph-cursor-line"
            x1={plan.cursor.x}
            x2={plan.cursor.x}
            y1={plan.plotRect.y}
            y2={plan.plotRect.y + plan.plotRect.height}
          />
        )}
      </g>
      <g className="graph-markers">
        {plan.points.map((marker) => (
          <g key={marker.id}>
            <circle cx={marker.point.x} cy={marker.point.y} r={marker.radius} />
            <text
              x={marker.point.x - 10}
              y={marker.point.y - 14}
              textAnchor="end"
            >
              {marker.label}
            </text>
          </g>
        ))}
        {plan.cursor?.readouts.map((readout) => (
          <circle
            className="graph-cursor-point"
            key={`${readout.datasetId}-${readout.seriesKey}`}
            cx={readout.point.x}
            cy={readout.point.y}
            r={6}
          />
        ))}
      </g>
      <g className="graph-annotations">
        {plan.annotations.map((annotation) => (
          <g key={annotation.id}>
            <line
              x1={annotation.point.x - 42}
              y1={annotation.point.y + 22}
              x2={annotation.point.x - 4}
              y2={annotation.point.y + 4}
            />
            <text
              x={annotation.point.x - 48}
              y={annotation.point.y + 29}
              textAnchor="end"
            >
              {annotation.text}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

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
          <GraphCanvas plan={plan} demo={demo} />
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
