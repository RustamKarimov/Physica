import "./fields-workbench.css";
import { useMemo, useState } from "react";
import { calculateFieldWorkflow, formatFieldValue } from "./field-analysis";
import { FieldDiagram } from "./FieldDiagram";
import {
  FIELD_WORKFLOWS,
  type FieldWorkflow,
  type FieldWorkflowId,
} from "./field-workflows";

export function FieldsWorkbench({
  onOpenAuthor,
}: {
  readonly onOpenAuthor: () => void;
}) {
  const [workflowId, setWorkflowId] = useState<FieldWorkflowId>("gravity");
  const [values, setValues] = useState<
    Record<FieldWorkflowId, FieldWorkflow["defaults"]>
  >(
    () =>
      Object.fromEntries(
        FIELD_WORKFLOWS.map((item) => [item.id, item.defaults]),
      ) as Record<FieldWorkflowId, FieldWorkflow["defaults"]>,
  );
  const workflow = FIELD_WORKFLOWS.find((item) => item.id === workflowId)!;
  const active = values[workflowId];
  const analysis = useMemo(
    () => calculateFieldWorkflow(workflowId, active),
    [workflowId, active],
  );
  return (
    <main className="fields-alpha">
      <aside
        className="fd-nav"
        aria-label="Fields and alternating-current workflows"
      >
        <span className="fd-eyebrow">Fields/AC Alpha</span>
        <h1>Reveal the cause behind every arrow.</h1>
        <p>
          Vectors, potentials, trajectories and waveforms are projections of one
          deterministic physical state.
        </p>
        <div className="fd-workflow-list">
          {FIELD_WORKFLOWS.map((item, index) => (
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
        <button type="button" className="fd-open-author" onClick={onOpenAuthor}>
          Open field templates →
        </button>
      </aside>
      <section className="fd-stage">
        <header>
          <div>
            <span>{workflow.topic}</span>
            <h2>{workflow.title}</h2>
            <p>{workflow.question}</p>
          </div>
          <strong>PHYSICS-OWNED</strong>
        </header>
        <div className="fd-canvas">
          <FieldDiagram id={workflowId} analysis={analysis} />
        </div>
        <div className="fd-equation">
          <small>Physical model</small>
          <b>{workflow.equation}</b>
        </div>
      </section>
      <aside
        className="fd-inspector"
        aria-label="Field model controls and diagnostics"
      >
        <div className="fd-inspector-title">
          <span>Model controls</span>
          <b>SI-CONVERTED</b>
        </div>
        {workflow.controls.map((control) => (
          <label key={control.key}>
            <span>
              {control.label}
              <output>
                {formatFieldValue(active[control.key])} {control.unit}
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
        <section className="fd-values" aria-live="polite">
          <h3>Derived observables</h3>
          {analysis.values.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </section>
        <section className="fd-assumptions">
          <h3>Assumptions</h3>
          {workflow.assumptions.map((item) => (
            <p key={item}>✓ {item}</p>
          ))}
        </section>
        <div className="fd-valid">
          <b>Model within declared scope</b>
          <span>{analysis.validation}</span>
        </div>
      </aside>
    </main>
  );
}
