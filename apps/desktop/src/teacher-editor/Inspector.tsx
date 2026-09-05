import type { EntityDefinition, ValidationReport } from "@physica/core-model";
import { useState } from "react";

export type InspectorTab =
  "Model" | "Visual" | "Relationships" | "Data" | "Validation";

interface InspectorProps {
  readonly entity: EntityDefinition | undefined;
  readonly layout: { readonly x: number; readonly y: number } | undefined;
  readonly report: ValidationReport;
}

const tabs: readonly InspectorTab[] = [
  "Model",
  "Visual",
  "Relationships",
  "Data",
  "Validation",
];

export function Inspector({ entity, layout, report }: InspectorProps) {
  const [tab, setTab] = useState<InspectorTab>("Model");
  const component = entity?.componentInstances[0];
  return (
    <aside className="teacher-inspector" aria-label="Selection inspector">
      <div className="panel-heading">
        <span>Inspector</span>
        <b>{entity?.name ?? "Nothing selected"}</b>
      </div>
      <div className="inspector-tabs" role="tablist">
        {tabs.map((entry) => (
          <button
            type="button"
            key={entry}
            role="tab"
            aria-selected={tab === entry}
            className={tab === entry ? "active" : ""}
            onClick={() => setTab(entry)}
          >
            {entry}
          </button>
        ))}
      </div>
      <div className="inspector-content">
        {!entity ? (
          <p>Select an object on the stage to inspect its authored meaning.</p>
        ) : tab === "Model" ? (
          <>
            <Property label="Entity" value={entity.name} />
            <Property
              label="Model type"
              value={component?.componentTypeId ?? "Visual-only object"}
            />
            {component &&
              Object.entries(component.initialState).map(([key, value]) => (
                <Property key={key} label={key} value={String(value)} />
              ))}
            <p className="inspector-note">
              Physical values are document-owned and changed through commands.
            </p>
          </>
        ) : tab === "Visual" ? (
          <>
            <Property
              label="Stage X"
              value={layout ? Math.round(layout.x) + " px" : "Auto"}
            />
            <Property
              label="Stage Y"
              value={layout ? Math.round(layout.y) + " px" : "Auto"}
            />
            <Property label="Glyph" value="Semantic preview" />
            <p className="inspector-note">
              Layout is presentation state; it never changes the physics model.
            </p>
          </>
        ) : tab === "Relationships" ? (
          <>
            <Property label="Connected definitions" value="0" />
            <p className="inspector-note">
              Attach, follow, tangent and data dependencies will appear here.
            </p>
          </>
        ) : tab === "Data" ? (
          <>
            <Property
              label="Initial channels"
              value={String(Object.keys(component?.initialState ?? {}).length)}
            />
            <Property label="Recorded datasets" value="0" />
            <p className="inspector-note">
              Acquisition is tied to the simulation clock, not display frames.
            </p>
          </>
        ) : report.issues.length === 0 ? (
          <div className="validation-ok">
            <b>Valid project</b>
            <span>No structural or reference issues.</span>
          </div>
        ) : (
          report.issues.map((entry) => (
            <div
              className={"validation-entry " + entry.severity}
              key={entry.code + entry.path}
            >
              <b>{entry.severity}</b>
              <span>{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function Property({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="inspector-property">
      <span>{label}</span>
      <b title={value}>{value}</b>
    </div>
  );
}
