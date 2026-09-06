import "./oscillation-workbench.css";
import { useMemo, useState } from "react";
import {
  calculateOscillationWorkflow,
  formatOscillationValue,
} from "./oscillation-analysis";
import { OscillationDiagram } from "./OscillationDiagram";
import {
  OSCILLATION_WORKFLOWS,
  type OscillationWorkflow,
  type OscillationWorkflowId,
} from "./oscillation-workflows";

export function OscillationWorkbench({
  onOpenAuthor,
}: {
  readonly onOpenAuthor: () => void;
}) {
  const [workflowId, setWorkflowId] = useState<OscillationWorkflowId>("shm");
  const [values, setValues] = useState<
    Record<OscillationWorkflowId, OscillationWorkflow["defaults"]>
  >(
    () =>
      Object.fromEntries(
        OSCILLATION_WORKFLOWS.map((workflow) => [
          workflow.id,
          workflow.defaults,
        ]),
      ) as Record<OscillationWorkflowId, OscillationWorkflow["defaults"]>,
  );
  const workflow = OSCILLATION_WORKFLOWS.find(
    (item) => item.id === workflowId,
  )!;
  const active = values[workflowId];
  const analysis = useMemo(
    () => calculateOscillationWorkflow(workflowId, active),
    [workflowId, active],
  );
  return (
    <main className="oscillation-alpha">
      <aside className="os-nav" aria-label="Oscillation workflows">
        <span className="os-eyebrow">Oscillations Alpha</span>
        <h1>Scrub one time. Trust every view.</h1>
        <p>
          Motion, vectors, graphs and energy are linked outputs of one
          deterministic periodic model.
        </p>
        <div className="os-workflow-list">
          {OSCILLATION_WORKFLOWS.map((item, index) => (
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
        <button type="button" className="os-open-author" onClick={onOpenAuthor}>
          Open oscillation templates →
        </button>
      </aside>
      <section className="os-stage">
        <header>
          <div>
            <span>{workflow.topic}</span>
            <h2>{workflow.title}</h2>
            <p>{workflow.question}</p>
          </div>
          <strong>SHARED TIME</strong>
        </header>
        <div className="os-canvas">
          <OscillationDiagram id={workflowId} analysis={analysis} />
        </div>
        <div className="os-equation">
          <small>Physical model</small>
          <b>{workflow.equation}</b>
        </div>
      </section>
      <aside
        className="os-inspector"
        aria-label="Oscillation model controls and diagnostics"
      >
        <div className="os-inspector-title">
          <span>Model controls</span>
          <b>SI-CONVERTED</b>
        </div>
        {workflow.controls.map((control) => (
          <label key={control.key}>
            <span>
              {control.label}
              <output>
                {formatOscillationValue(active[control.key])} {control.unit}
              </output>
            </span>
            <input
              aria-label={
                control.label + " in " + (control.unit || "dimensionless units")
              }
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
        <section className="os-values" aria-live="polite">
          <h3>Derived observables</h3>
          {analysis.values.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </section>
        <section className="os-assumptions">
          <h3>Assumptions</h3>
          {workflow.assumptions.map((item) => (
            <p key={item}>✓ {item}</p>
          ))}
        </section>
        <div className="os-valid">
          <b>Model within declared scope</b>
          <span>{analysis.validation}</span>
        </div>
      </aside>
    </main>
  );
}
