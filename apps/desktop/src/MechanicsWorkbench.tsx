import "./mechanics-workbench.css";
import { useMemo, useState } from "react";
import { calculate, number } from "./mechanics-analysis";
import { MechanicsDiagram } from "./MechanicsDiagram";
import {
  WORKFLOWS,
  type Workflow,
  type WorkflowId,
} from "./mechanics-workflows";

export function MechanicsWorkbench({
  onOpenAuthor,
}: {
  readonly onOpenAuthor: () => void;
}) {
  const [workflowId, setWorkflowId] = useState<WorkflowId>("projectile");
  const workflow = WORKFLOWS.find((candidate) => candidate.id === workflowId)!;
  const [values, setValues] = useState<
    Record<WorkflowId, Workflow["defaults"]>
  >(
    () =>
      Object.fromEntries(
        WORKFLOWS.map((item) => [item.id, item.defaults]),
      ) as Record<WorkflowId, Workflow["defaults"]>,
  );
  const active = values[workflowId];
  const analysis = useMemo(
    () => calculate(workflowId, active),
    [workflowId, active],
  );
  return (
    <main className="mechanics-alpha">
      <aside className="mechanics-nav" aria-label="Mechanics Alpha workflows">
        <span className="eyebrow">Mechanics Alpha</span>
        <h1>Build meaning from one physical state.</h1>
        <p>
          These are usable scientific teaching workflows. Diagram, values,
          vectors and equations update from the same deterministic model.
        </p>
        <div className="workflow-list">
          {WORKFLOWS.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className={item.id === workflowId ? "active" : ""}
              aria-pressed={item.id === workflowId}
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
        <button type="button" className="open-author" onClick={onOpenAuthor}>
          Open authoring templates →
        </button>
      </aside>
      <section className="mechanics-stage">
        <header>
          <div>
            <span>{workflow.topic}</span>
            <h2>{workflow.title}</h2>
            <p>{workflow.question}</p>
          </div>
          <strong>PHYSICS-LINKED</strong>
        </header>
        <div className="mechanics-canvas">
          <MechanicsDiagram
            id={workflowId}
            values={active}
            analysis={analysis}
          />
        </div>
        <div className="equation-strip">
          <small>Model equation</small>
          <b>{workflow.equation}</b>
        </div>
      </section>
      <aside
        className="mechanics-inspector"
        aria-label="Mechanics controls and diagnostics"
      >
        <div className="inspector-title">
          <span>Experiment controls</span>
          <b>SI-LINKED</b>
        </div>
        {workflow.controls.map((control) => (
          <label key={control.key}>
            <span>
              {control.label}
              <output>
                {number(active[control.key])} {control.unit}
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
        <section className="live-values">
          <h3>Derived observables</h3>
          {analysis.values.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </section>
        <section className="assumptions">
          <h3>Assumptions</h3>
          {workflow.assumptions.map((assumption) => (
            <p key={assumption}>✓ {assumption}</p>
          ))}
        </section>
        <div className="validation-ok">
          <b>Scientifically valid</b>
          <span>{analysis.validation}</span>
        </div>
      </aside>
    </main>
  );
}
