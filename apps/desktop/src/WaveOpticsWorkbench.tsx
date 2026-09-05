import "./wave-optics-workbench.css";
import { useMemo, useState } from "react";
import { calculateWaveOptics, formatWaveValue } from "./wave-optics-analysis";
import { WaveOpticsDiagram } from "./WaveOpticsDiagram";
import {
  WAVE_OPTICS_WORKFLOWS,
  type WaveOpticsWorkflow,
  type WaveOpticsWorkflowId,
} from "./wave-optics-workflows";

export function WaveOpticsWorkbench({
  onOpenAuthor,
}: {
  readonly onOpenAuthor: () => void;
}) {
  const [workflowId, setWorkflowId] =
    useState<WaveOpticsWorkflowId>("double-slit");
  const workflow = WAVE_OPTICS_WORKFLOWS.find(
    (candidate) => candidate.id === workflowId,
  )!;
  const [values, setValues] = useState<
    Record<WaveOpticsWorkflowId, WaveOpticsWorkflow["defaults"]>
  >(
    () =>
      Object.fromEntries(
        WAVE_OPTICS_WORKFLOWS.map((item) => [item.id, item.defaults]),
      ) as Record<WaveOpticsWorkflowId, WaveOpticsWorkflow["defaults"]>,
  );
  const active = values[workflowId];
  const analysis = useMemo(
    () => calculateWaveOptics(workflowId, active),
    [workflowId, active],
  );
  return (
    <main className="wave-optics-alpha">
      <aside className="wo-nav" aria-label="Wave and optics workflows">
        <span className="wo-eyebrow">Wave/Optics Alpha</span>
        <h1>One model. Every representation.</h1>
        <p>
          Screen, graph, wave, ray and values remain tied to the same
          deterministic parameters.
        </p>
        <div className="wo-workflow-list">
          {WAVE_OPTICS_WORKFLOWS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === workflowId}
              className={item.id === workflowId ? "active" : ""}
              onClick={() => setWorkflowId(item.id)}
            >
              <i>{index + 1}</i>
              <span>
                <b>{item.title}</b>
                <small>{item.topic}</small>
              </span>
            </button>
          ))}
        </div>
        <button type="button" className="wo-open-author" onClick={onOpenAuthor}>
          Open authoring templates →
        </button>
      </aside>
      <section className="wo-stage">
        <header>
          <div>
            <span>{workflow.topic}</span>
            <h2>{workflow.title}</h2>
            <p>{workflow.question}</p>
          </div>
          <strong>SHARED STATE</strong>
        </header>
        <div className="wo-canvas">
          <WaveOpticsDiagram
            id={workflowId}
            values={active}
            analysis={analysis}
          />
        </div>
        <div className="wo-equation">
          <small>Physical model</small>
          <b>{workflow.equation}</b>
        </div>
      </section>
      <aside
        className="wo-inspector"
        aria-label="Wave and optics controls and diagnostics"
      >
        <div className="wo-inspector-title">
          <span>Model controls</span>
          <b>SI-CONVERTED</b>
        </div>
        {workflow.controls.map((control) => (
          <label key={control.key}>
            <span>
              {control.label}
              <output>
                {formatWaveValue(active[control.key])} {control.unit}
              </output>
            </span>
            <input
              aria-label={`${control.label} in ${control.unit || "dimensionless units"}`}
              type="range"
              min={control.min}
              max={control.max}
              step={control.step}
              value={active[control.key]}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [workflowId]: {
                    ...current[workflowId],
                    [control.key]: Number(event.currentTarget.value),
                  },
                }))
              }
            />
          </label>
        ))}
        <section className="wo-values" aria-live="polite">
          <h3>Derived observables</h3>
          {analysis.values.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </section>
        <section className="wo-assumptions">
          <h3>Assumptions</h3>
          {workflow.assumptions.map((assumption) => (
            <p key={assumption}>✓ {assumption}</p>
          ))}
        </section>
        <div className="wo-valid">
          <b>Model within declared scope</b>
          <span>{analysis.validation}</span>
        </div>
      </aside>
    </main>
  );
}
