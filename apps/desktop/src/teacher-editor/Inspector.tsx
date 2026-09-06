import type {
  EntityDefinition,
  JsonValue,
  SceneDefinition,
  ValidationReport,
} from "@physica/core-model";
import { useState } from "react";

export type InspectorTab =
  "Content" | "Model" | "Visual" | "Data" | "Validation";

interface InspectorProps {
  readonly entity: EntityDefinition | undefined;
  readonly scene: SceneDefinition;
  readonly layout: { readonly x: number; readonly y: number } | undefined;
  readonly report: ValidationReport;
  readonly onSceneName: (value: string) => void;
  readonly onSceneMetadata: (key: string, value: JsonValue) => void;
  readonly onEntityName: (value: string) => void;
  readonly onEntityContent: (value: string) => void;
  readonly onInitialValue: (
    key: string,
    value: string | number | boolean,
  ) => void;
}

const tabs: readonly InspectorTab[] = [
  "Content",
  "Model",
  "Visual",
  "Data",
  "Validation",
];

export function Inspector({
  entity,
  scene,
  layout,
  report,
  onSceneName,
  onSceneMetadata,
  onEntityName,
  onEntityContent,
  onInitialValue,
}: InspectorProps) {
  const [tab, setTab] = useState<InspectorTab>("Content");
  const component = entity?.componentInstances[0];
  return (
    <aside className="teacher-inspector" aria-label="Selection inspector">
      <div className="panel-heading">
        <span>Inspector</span>
        <b>{entity?.name ?? scene.name}</b>
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
        {tab === "Content" ? (
          entity ? (
            <>
              <EditorField
                label="Object name"
                value={entity.name}
                onCommit={onEntityName}
              />
              <EditorArea
                label="Displayed explanation / formula"
                value={
                  typeof entity.visualDefaults?.content === "string"
                    ? entity.visualDefaults.content
                    : ""
                }
                placeholder="Write what learners should see…"
                onCommit={onEntityContent}
              />
              <p className="inspector-note">
                Content and layout belong to the presentation. They never
                overwrite the physical model.
              </p>
            </>
          ) : (
            <>
              <EditorField
                label="Scene title"
                value={scene.name}
                onCommit={onSceneName}
              />
              <EditorArea
                label="Learning objective"
                value={metadataText(scene, "physica:lesson/objective")}
                placeholder="What should learners understand?"
                onCommit={(value) =>
                  onSceneMetadata("physica:lesson/objective", value)
                }
              />
              <EditorArea
                label="Teacher notes"
                value={metadataText(scene, "physica:lesson/notes")}
                placeholder="Questions, prompts and teaching reminders…"
                onCommit={(value) =>
                  onSceneMetadata("physica:lesson/notes", value)
                }
              />
              <EditorField
                label="Planned duration (seconds)"
                value={String(
                  metadataNumber(scene, "physica:lesson/durationSeconds", 15),
                )}
                type="number"
                onCommit={(value) => {
                  const duration = Number(value);
                  if (Number.isFinite(duration) && duration > 0)
                    onSceneMetadata("physica:lesson/durationSeconds", duration);
                }}
              />
            </>
          )
        ) : tab === "Model" ? (
          entity ? (
            <>
              <Property
                label="Model type"
                value={component?.componentTypeId ?? "Visual-only object"}
              />
              {component &&
                Object.entries(component.initialState).map(([key, value]) =>
                  typeof value === "string" ||
                  typeof value === "number" ||
                  typeof value === "boolean" ? (
                    <EditorField
                      key={key}
                      label={key}
                      value={String(value)}
                      type={typeof value === "number" ? "number" : "text"}
                      onCommit={(next) =>
                        onInitialValue(
                          key,
                          typeof value === "number" ? Number(next) : next,
                        )
                      }
                    />
                  ) : (
                    <Property
                      key={key}
                      label={key}
                      value={JSON.stringify(value)}
                    />
                  ),
                )}
              <p className="inspector-note">
                These values are the saved physical initial state and change
                through undoable project commands.
              </p>
            </>
          ) : (
            <p>Select an apparatus or model object to edit physical values.</p>
          )
        ) : tab === "Visual" ? (
          entity ? (
            <>
              <Property
                label="Stage X"
                value={layout ? Math.round(layout.x) + " px" : "Auto"}
              />
              <Property
                label="Stage Y"
                value={layout ? Math.round(layout.y) + " px" : "Auto"}
              />
              <Property label="Preview" value="Persisted presentation layout" />
              <p className="inspector-note">
                Drag in Layout mode to arrange the lesson without changing
                physics.
              </p>
            </>
          ) : (
            <p>Select an object to inspect its presentation layout.</p>
          )
        ) : tab === "Data" ? (
          <>
            <Property
              label="Initial channels"
              value={String(Object.keys(component?.initialState ?? {}).length)}
            />
            <Property label="Recorded datasets" value="0" />
            <p className="inspector-note">
              Data acquisition remains tied to simulation time, not screen
              refresh.
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

function metadataText(scene: SceneDefinition, key: string): string {
  const value = scene.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function metadataNumber(
  scene: SceneDefinition,
  key: string,
  fallback: number,
): number {
  const value = scene.metadata?.[key];
  return typeof value === "number" ? value : fallback;
}

function EditorField({
  label,
  value,
  type = "text",
  onCommit,
}: {
  readonly label: string;
  readonly value: string;
  readonly type?: "text" | "number";
  readonly onCommit: (value: string) => void;
}) {
  return (
    <label className="inspector-editor-field">
      <span>{label}</span>
      <input
        key={label + value}
        type={type}
        defaultValue={value}
        onBlur={(event) => onCommit(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
    </label>
  );
}

function EditorArea({
  label,
  value,
  placeholder,
  onCommit,
}: {
  readonly label: string;
  readonly value: string;
  readonly placeholder: string;
  readonly onCommit: (value: string) => void;
}) {
  return (
    <label className="inspector-editor-field">
      <span>{label}</span>
      <textarea
        key={label + value}
        defaultValue={value}
        placeholder={placeholder}
        onBlur={(event) => onCommit(event.currentTarget.value)}
      />
    </label>
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
