import { useState } from "react";
import {
  graphAnalysisDemos,
  type GraphAnalysisDemo,
} from "./graph-analysis-demos";
import { GraphSvg } from "./GraphSvg";
import "./graph-analysis-workbench.css";

export function GraphAnalysisWorkbench() {
  const [selected, setSelected] = useState<GraphAnalysisDemo["id"]>("gradient");
  const demo = graphAnalysisDemos.find((item) => item.id === selected)!;
  return (
    <section
      className="analysis-workbench"
      id="graph-analysis"
      aria-labelledby="analysis-title"
    >
      <div className="analysis-heading">
        <div>
          <div className="graph-kicker">
            <span>STEP 4.4 · GRAPH ANALYSIS</span>
            <b>VERIFIED</b>
          </div>
          <h1 id="analysis-title">
            Interrogate the evidence.<em> Show the method.</em>
          </h1>
          <p>
            Tangents, areas, fits, uncertainty, distributions and spectra are
            calculated from immutable canonical samples. Every overlay exposes
            its scientific readout and uses the same renderer-neutral graph
            plan.
          </p>
        </div>
        <dl className="graph-summary">
          <div>
            <dt>CAPABILITIES</dt>
            <dd>8</dd>
          </div>
          <div>
            <dt>MODEL</dt>
            <dd>PIECEWISE</dd>
          </div>
          <div>
            <dt>AUTHORITY</dt>
            <dd>READ-ONLY</dd>
          </div>
        </dl>
      </div>
      <div
        className="analysis-tabs"
        role="tablist"
        aria-label="Graph analysis examples"
      >
        {graphAnalysisDemos.map((item, index) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={selected === item.id}
            onClick={() => setSelected(item.id)}
          >
            <span>0{index + 1}</span>
            <b>{item.title}</b>
            <small>{item.eyebrow}</small>
          </button>
        ))}
      </div>
      <div className="analysis-grid">
        <div className="analysis-stage">
          <div className="graph-stage-header">
            <div>
              <small>RESOLVED SCIENTIFIC PLAN</small>
              <strong>{demo.plan.name}</strong>
            </div>
            <span>{demo.eyebrow}</span>
          </div>
          <GraphSvg plan={demo.plan} id={`analysis-${demo.id}`} />
          <div className="graph-legend" aria-label="Analysis legend">
            {demo.plan.curves.map((curve) => (
              <span key={curve.seriesKey}>
                <i
                  style={{
                    borderColor: curve.style.strokeHex,
                    borderStyle: curve.bars ? "solid" : "solid",
                  }}
                />
                {curve.name}
              </span>
            ))}
            {demo.plan.analyses.map((analysis) => (
              <span key={analysis.id}>
                <i className={`analysis-key analysis-key-${analysis.kind}`} />
                {analysis.kind.replace("-", " ")}
              </span>
            ))}
          </div>
        </div>
        <aside
          className="analysis-inspector"
          aria-label="Scientific analysis readouts"
        >
          <div className="graph-inspector-title">
            <span>ANALYSIS INSPECTOR</span>
            <b>18</b>
          </div>
          <div className="analysis-readouts">
            {demo.readouts.map((readout) => (
              <div key={readout.label}>
                <small>{readout.label}</small>
                <strong>{readout.value}</strong>
              </div>
            ))}
          </div>
          <div className="analysis-method">
            <span>METHOD CONTRACT</span>
            {demo.plan.analyses.length > 0 ? (
              demo.plan.analyses.map((analysis) => (
                <p key={analysis.id}>{analysis.summary}</p>
              ))
            ) : (
              <p>
                {demo.id === "histogram"
                  ? "Left-closed bins; final right edge included."
                  : "Direct real DFT; DC and Nyquist are not doubled."}
              </p>
            )}
          </div>
          <dl className="graph-contracts">
            <div>
              <dt>SOURCE</dt>
              <dd>CANONICAL DATA</dd>
            </div>
            <div>
              <dt>LAYOUT</dt>
              <dd>DERIVED</dd>
            </div>
            <div>
              <dt>PHYSICS WRITES</dt>
              <dd>NONE</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
