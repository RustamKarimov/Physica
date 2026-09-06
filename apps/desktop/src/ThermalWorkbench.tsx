import "./thermal-workbench.css";
import { useMemo, useState } from "react";
import {
  calculateThermalWorkflow,
  formatThermalValue,
} from "./thermal-analysis";
import { ThermalDiagram } from "./ThermalDiagram";
import {
  THERMAL_WORKFLOWS,
  type ThermalWorkflow,
  type ThermalWorkflowId,
} from "./thermal-workflows";

export function ThermalWorkbench({
  onOpenAuthor,
}: {
  readonly onOpenAuthor: () => void;
}) {
  const [workflowId, setWorkflowId] =
    useState<ThermalWorkflowId>("temperature");
  const [values, setValues] = useState<
    Record<ThermalWorkflowId, ThermalWorkflow["defaults"]>
  >(
    () =>
      Object.fromEntries(
        THERMAL_WORKFLOWS.map((workflow) => [workflow.id, workflow.defaults]),
      ) as Record<ThermalWorkflowId, ThermalWorkflow["defaults"]>,
  );
  const workflow = THERMAL_WORKFLOWS.find((item) => item.id === workflowId)!;
  const active = values[workflowId];
  const analysis = useMemo(
    () => calculateThermalWorkflow(workflowId, active),
    [workflowId, active],
  );
  return (
    <main className="thermal-alpha">
      <aside className="th-nav" aria-label="Thermal and gas workflows">
        <span className="th-eyebrow">Thermal/Gases Alpha</span>
        <h1>Connect particles, state and energy.</h1>
        <p>
          Every apparatus view, graph and ledger is a projection of one
          deterministic thermal model.
        </p>
        <div className="th-workflow-list">
          {THERMAL_WORKFLOWS.map((item, index) => (
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
        <button type="button" className="th-open-author" onClick={onOpenAuthor}>
          Open thermal templates →
        </button>
      </aside>
      <section className="th-stage">
        <header>
          <div>
            <span>{workflow.topic}</span>
            <h2>{workflow.title}</h2>
            <p>{workflow.question}</p>
          </div>
          <strong>PHYSICS-OWNED</strong>
        </header>
        <div className="th-canvas">
          <ThermalDiagram id={workflowId} analysis={analysis} />
        </div>
        <div className="th-equation">
          <small>Physical model</small>
          <b>{workflow.equation}</b>
        </div>
      </section>
      <aside
        className="th-inspector"
        aria-label="Thermal model controls and diagnostics"
      >
        <div className="th-inspector-title">
          <span>Model controls</span>
          <b>SI-CONVERTED</b>
        </div>
        {workflow.controls.map((control) => (
          <label key={control.key}>
            <span>
              {control.label}
              <output>
                {formatThermalValue(active[control.key])} {control.unit}
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
        <section className="th-values" aria-live="polite">
          <h3>Derived observables</h3>
          {analysis.values.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </section>
        <section className="th-assumptions">
          <h3>Assumptions</h3>
          {workflow.assumptions.map((item) => (
            <p key={item}>✓ {item}</p>
          ))}
        </section>
        <div className="th-valid">
          <b>Model within declared scope</b>
          <span>{analysis.validation}</span>
        </div>
      </aside>
    </main>
  );
}
