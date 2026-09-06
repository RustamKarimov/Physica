import "./electricity-workbench.css";
import { useMemo, useState } from "react";
import {
  calculateElectricity,
  formatElectricityValue,
} from "./electricity-analysis";
import { ElectricityDiagram } from "./ElectricityDiagram";
import {
  ELECTRICITY_WORKFLOWS,
  type ElectricityWorkflow,
  type ElectricityWorkflowId,
} from "./electricity-workflows";

export function ElectricityWorkbench({
  onOpenAuthor,
}: {
  readonly onOpenAuthor: () => void;
}) {
  const [workflowId, setWorkflowId] =
    useState<ElectricityWorkflowId>("network");
  const workflow = ELECTRICITY_WORKFLOWS.find(
    (item) => item.id === workflowId,
  )!;
  const [values, setValues] = useState<
    Record<ElectricityWorkflowId, ElectricityWorkflow["defaults"]>
  >(
    () =>
      Object.fromEntries(
        ELECTRICITY_WORKFLOWS.map((item) => [item.id, item.defaults]),
      ) as Record<ElectricityWorkflowId, ElectricityWorkflow["defaults"]>,
  );
  const active = values[workflowId];
  const analysis = useMemo(
    () => calculateElectricity(workflowId, active),
    [workflowId, active],
  );
  return (
    <main className="electricity-alpha">
      <aside className="el-nav" aria-label="Electricity and circuit workflows">
        <span className="el-eyebrow">Electricity/Circuits Alpha</span>
        <h1>Build the circuit. Trust the state.</h1>
        <p>
          Currents, potentials, meters, graphs and charge all come from one
          deterministic model.
        </p>
        <div className="el-workflow-list">
          {ELECTRICITY_WORKFLOWS.map((item, index) => (
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
        <button type="button" className="el-open-author" onClick={onOpenAuthor}>
          Open electrical templates →
        </button>
      </aside>
      <section className="el-stage">
        <header>
          <div>
            <span>{workflow.topic}</span>
            <h2>{workflow.title}</h2>
            <p>{workflow.question}</p>
          </div>
          <strong>SOLVER-OWNED</strong>
        </header>
        <div className="el-canvas">
          <ElectricityDiagram id={workflowId} analysis={analysis} />
        </div>
        <div className="el-equation">
          <small>Physical model</small>
          <b>{workflow.equation}</b>
        </div>
      </section>
      <aside
        className="el-inspector"
        aria-label="Electricity controls and diagnostics"
      >
        <div className="el-inspector-title">
          <span>Model controls</span>
          <b>SI-CONVERTED</b>
        </div>
        {workflow.controls.map((control) => (
          <label key={control.key}>
            <span>
              {control.label}
              <output>
                {control.kind === "toggle"
                  ? active[control.key] >= 0.5
                    ? "Closed"
                    : "Open"
                  : `${formatElectricityValue(active[control.key])} ${control.unit}`}
              </output>
            </span>
            {control.kind === "toggle" ? (
              <button
                type="button"
                className="el-switch-control"
                aria-pressed={active[control.key] >= 0.5}
                onClick={() =>
                  setValues((current) => ({
                    ...current,
                    [workflowId]: {
                      ...current[workflowId],
                      [control.key]: active[control.key] >= 0.5 ? 0 : 1,
                    },
                  }))
                }
              >
                {active[control.key] >= 0.5 ? "Open switch" : "Close switch"}
              </button>
            ) : (
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
            )}
          </label>
        ))}
        <section className="el-values" aria-live="polite">
          <h3>Derived observables</h3>
          {analysis.values.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </section>
        <section className="el-assumptions">
          <h3>Assumptions</h3>
          {workflow.assumptions.map((item) => (
            <p key={item}>✓ {item}</p>
          ))}
        </section>
        <div className="el-valid">
          <b>Model within declared scope</b>
          <span>{analysis.validation}</span>
        </div>
      </aside>
    </main>
  );
}
