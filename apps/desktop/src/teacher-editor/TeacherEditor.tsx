import "./teacher-editor.css";
import type {
  EntityDefinition,
  EntityId,
  RegisteredTypeId,
} from "@physica/core-model";
import {
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AdvancedTimeline } from "./AdvancedTimeline";
import {
  addLibraryItem,
  createEditorSession,
  physicsLibrary,
  PROJECT_TEMPLATES,
  setPhysicalPosition,
  type EditorSession,
  type ProjectTemplate,
} from "./editor-model";
import { Inspector } from "./Inspector";
import { ObjectGlyph } from "./ObjectGlyph";
import { PhysScriptPanel } from "./PhysScriptPanel";

type ManipulationMode = "layout" | "physics";
type BottomPanel = "timeline" | "script";
interface StagePosition {
  readonly x: number;
  readonly y: number;
}

function initialPositions(
  session: EditorSession,
): Record<string, StagePosition> {
  const entities =
    session.store.getDocument().scenes[0]?.entityDefinitions ?? [];
  return Object.fromEntries(
    entities.map((entity, index) => [
      entity.id,
      { x: 125 + (index % 4) * 145, y: 115 + Math.floor(index / 4) * 120 },
    ]),
  );
}

export function TeacherEditor() {
  const [session, setSession] = useState<EditorSession>();
  if (!session)
    return (
      <ProjectHome
        onCreate={(template) => setSession(createEditorSession(template))}
      />
    );
  return (
    <AuthoringWorkspace
      session={session}
      onHome={() => setSession(undefined)}
    />
  );
}

function ProjectHome({
  onCreate,
}: {
  readonly onCreate: (template: ProjectTemplate) => void;
}) {
  return (
    <main className="project-home">
      <section className="home-intro">
        <span className="eyebrow">Create a teaching project</span>
        <h1>Start with a physical question.</h1>
        <p>
          These templates open a real project document you can extend with
          models, visuals, timing and declarative PhysScript.
        </p>
      </section>
      <section className="template-grid" aria-label="Project templates">
        {PROJECT_TEMPLATES.map((template, index) => (
          <button
            type="button"
            className="template-card"
            key={template.id}
            onClick={() => onCreate(template)}
          >
            <span className="template-number">0{index + 1}</span>
            <div className={"template-art " + template.id}>
              <i />
              <i />
              <i />
            </div>
            <b>{template.title}</b>
            <p>{template.description}</p>
            <small>{template.question}</small>
            <em>Open template →</em>
          </button>
        ))}
      </section>
      <div className="home-contract">
        <b>What is usable now?</b>
        <span>
          Create a project, add Physics Library objects, inspect and move them,
          author a multi-clock timeline, validate PhysScript, undo changes and
          download the project snapshot.
        </span>
        <small>
          Mechanics plus five Wave/Optics Alpha templates and their complete
          metadata-driven Libraries are available now. Native .physica packaging
          and final export arrive in Phase 20.
        </small>
      </div>
    </main>
  );
}

function AuthoringWorkspace({
  session,
  onHome,
}: {
  readonly session: EditorSession;
  readonly onHome: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [revision, setRevision] = useState(session.store.getRevision());
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<EntityId>();
  const [positions, setPositions] = useState(() => initialPositions(session));
  const [mode, setMode] = useState<ManipulationMode>("layout");
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>("timeline");
  const [dragging, setDragging] = useState<EntityId>();
  const [notice, setNotice] = useState(
    "Layout mode moves the drawing only. Physics values stay unchanged.",
  );

  const document = session.store.getDocument();
  const scene = document.scenes.find(
    (candidate) => candidate.id === session.sceneId,
  )!;
  const selectedEntity = scene.entityDefinitions.find(
    (entity) => entity.id === selection,
  );
  const items = useMemo(
    () => physicsLibrary.search({ text: query }).slice(0, 14),
    [query],
  );

  function refresh(message?: string) {
    setRevision(session.store.getRevision());
    if (message) setNotice(message);
  }

  function addItem(itemId: RegisteredTypeId) {
    try {
      const ids = addLibraryItem(session, itemId);
      setPositions((current) => {
        const next = { ...current };
        ids.forEach((id, index) => {
          next[id] = {
            x: 150 + ((scene.entityDefinitions.length + index) % 4) * 135,
            y:
              125 +
              Math.floor((scene.entityDefinitions.length + index) / 4) * 115,
          };
        });
        return next;
      });
      setSelection(ids[0]);
      refresh("Added from the metadata-driven Physics Library.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  }

  function pointerPosition(event: ReactPointerEvent): StagePosition {
    const bounds = stageRef.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max(event.clientX - bounds.left, 55), bounds.width - 55),
      y: Math.min(Math.max(event.clientY - bounds.top, 50), bounds.height - 45),
    };
  }

  function startDrag(event: ReactPointerEvent, entityId: EntityId) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelection(entityId);
    setDragging(entityId);
  }

  function moveDrag(event: ReactPointerEvent, entityId: EntityId) {
    if (dragging !== entityId) return;
    const position = pointerPosition(event);
    setPositions((current) => ({ ...current, [entityId]: position }));
  }

  function finishDrag(event: ReactPointerEvent, entityId: EntityId) {
    if (dragging !== entityId) return;
    const position = pointerPosition(event);
    setDragging(undefined);
    if (mode === "layout") {
      setNotice(
        "Layout changed. The component's physical initial state was untouched.",
      );
      return;
    }
    const bounds = stageRef.current!.getBoundingClientRect();
    const x = (position.x - bounds.width / 2) / 45;
    const y = (bounds.height / 2 - position.y) / 45;
    if (setPhysicalPosition(session, entityId, x, y))
      refresh(
        `Physical initial position set to (${x.toFixed(2)}, ${y.toFixed(2)}) m through one command.`,
      );
    else
      setNotice(
        "This visual-only object has no physical component to manipulate.",
      );
  }

  function undo() {
    const result = session.store.undo();
    if (result.ok) refresh("Undid the last document command.");
  }

  function redo() {
    const result = session.store.redo();
    if (result.ok) refresh("Redid the document command.");
  }

  function downloadSnapshot() {
    const blob = new Blob([JSON.stringify(document, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = document.metadata.title.replace(/\W+/g, "-") + ".json";
    anchor.click();
    URL.revokeObjectURL(url);
    session.store.markSaved();
    setNotice(
      "Downloaded a JSON project snapshot. Native .physica packaging is a later phase.",
    );
  }

  return (
    <main className="teacher-workspace" data-revision={revision}>
      <div className="author-toolbar">
        <button type="button" onClick={onHome}>
          ← Templates
        </button>
        <div className="project-identity">
          <b>{document.metadata.title}</b>
          <span>
            {scene.entityDefinitions.length} objects ·{" "}
            {session.store.isDirty() ? "Unsaved changes" : "Snapshot current"}
          </span>
        </div>
        <div className="toolbar-actions">
          <button
            type="button"
            disabled={!session.store.canUndo()}
            onClick={undo}
          >
            Undo
          </button>
          <button
            type="button"
            disabled={!session.store.canRedo()}
            onClick={redo}
          >
            Redo
          </button>
          <button type="button" className="primary" onClick={downloadSnapshot}>
            Download snapshot
          </button>
        </div>
      </div>
      <div className="editor-grid">
        <aside className="library-panel" aria-label="Physics Library">
          <div className="panel-heading">
            <span>Physics Library</span>
            <b>Add to scene</b>
          </div>
          <input
            type="search"
            placeholder="Search ball, spring, graph…"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <div className="library-results">
            {items.map((item) => {
              const preset = item.itemClass === "material-preset";
              return (
                <button
                  type="button"
                  key={item.id}
                  disabled={preset}
                  title={
                    preset
                      ? "Select a compatible target first"
                      : item.description
                  }
                  onClick={() => addItem(item.id)}
                >
                  <ObjectGlyph name={item.displayName} />
                  <span>
                    <b>{item.displayName}</b>
                    <small>{preset ? "Targeted preset" : item.itemClass}</small>
                  </span>
                  <em>{preset ? "—" : "+"}</em>
                </button>
              );
            })}
          </div>
        </aside>
        <section className="stage-column">
          <div className="stage-toolbar">
            <div
              className="mode-switch"
              role="group"
              aria-label="Manipulation mode"
            >
              <button
                type="button"
                className={mode === "layout" ? "active" : ""}
                onClick={() => {
                  setMode("layout");
                  setNotice(
                    "Layout mode moves the drawing only. Physics values stay unchanged.",
                  );
                }}
              >
                Layout
              </button>
              <button
                type="button"
                className={mode === "physics" ? "active physics" : ""}
                onClick={() => {
                  setMode("physics");
                  setNotice(
                    "Physics mode commits one initial-state command when a drag ends.",
                  );
                }}
              >
                Physics
              </button>
            </div>
            <span className={"mode-explainer " + mode}>{notice}</span>
          </div>
          <div
            className={"author-stage " + mode}
            ref={stageRef}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) setSelection(undefined);
            }}
          >
            <div className="stage-grid-lines" />
            <div className="stage-axis horizontal">
              <span>x</span>
            </div>
            <div className="stage-axis vertical">
              <span>y</span>
            </div>
            {scene.entityDefinitions.map((entity, index) => (
              <StageObject
                key={entity.id}
                entity={entity}
                position={
                  positions[entity.id] ?? {
                    x: 120 + (index % 4) * 140,
                    y: 110 + Math.floor(index / 4) * 115,
                  }
                }
                selected={selection === entity.id}
                mode={mode}
                onPointerDown={(event) => startDrag(event, entity.id)}
                onPointerMove={(event) => moveDrag(event, entity.id)}
                onPointerUp={(event) => finishDrag(event, entity.id)}
              />
            ))}
            {scene.entityDefinitions.length === 0 && (
              <div className="empty-stage">
                <b>Your scene is empty</b>
                <span>Add a model or visual from the Physics Library.</span>
              </div>
            )}
          </div>
          <div className="bottom-switcher">
            <button
              type="button"
              className={bottomPanel === "timeline" ? "active" : ""}
              onClick={() => setBottomPanel("timeline")}
            >
              Timeline
            </button>
            <button
              type="button"
              className={bottomPanel === "script" ? "active" : ""}
              onClick={() => setBottomPanel("script")}
            >
              PhysScript
            </button>
            <span>
              {bottomPanel === "timeline"
                ? "Animation · clocks · audio · acquisition"
                : "Parser · validator · canonical command mapping"}
            </span>
          </div>
          {bottomPanel === "timeline" ? (
            <AdvancedTimeline />
          ) : (
            <PhysScriptPanel />
          )}
        </section>
        <Inspector
          entity={selectedEntity}
          layout={selection ? positions[selection] : undefined}
          report={session.store.validate()}
        />
      </div>
    </main>
  );
}

function StageObject({
  entity,
  position,
  selected,
  mode,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  readonly entity: EntityDefinition;
  readonly position: StagePosition;
  readonly selected: boolean;
  readonly mode: ManipulationMode;
  readonly onPointerDown: (event: ReactPointerEvent) => void;
  readonly onPointerMove: (event: ReactPointerEvent) => void;
  readonly onPointerUp: (event: ReactPointerEvent) => void;
}) {
  return (
    <button
      type="button"
      className={"stage-object " + (selected ? "selected " : "") + mode}
      style={{ left: position.x, top: position.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      aria-label={entity.name + ", drag in " + mode + " mode"}
    >
      <ObjectGlyph name={entity.name} />
      <span>{entity.name}</span>
      {selected && <i>{mode === "layout" ? "LAYOUT" : "PHYSICS"}</i>}
    </button>
  );
}
