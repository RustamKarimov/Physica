import type { EntityId, JsonValue, SceneId } from "@physica/core-model";
import { registeredTypeId } from "@physica/core-model";
import { serializeProjectJson } from "@physica/serialization";
import { useMemo, useState } from "react";
import { AdvancedTimeline } from "./AdvancedTimeline";
import {
  addLessonScene,
  addLibraryItem,
  physicsLibrary,
  removeLessonScene,
  reorderLessonScenes,
  setEntityInitialValue,
  setEntityPresentation,
  setPhysicalPosition,
  setSceneDetails,
  type EditorSession,
} from "./editor-model";
import { Inspector } from "./Inspector";
import { LessonStage } from "./LessonStage";
import { ObjectGlyph } from "./ObjectGlyph";
import { PhysScriptPanel } from "./PhysScriptPanel";
import { PresentationPreview } from "./PresentationPreview";
import { entityStagePosition, type StagePosition } from "./stage-layout";

type ManipulationMode = "layout" | "physics";
type BottomPanel = "timeline" | "script";
type LeftPanel = "scenes" | "library";

export function AuthoringWorkspace({
  session,
  onHome,
  onOpen,
}: {
  readonly session: EditorSession;
  readonly onHome: () => void;
  readonly onOpen: () => void;
}) {
  const [revision, setRevision] = useState(session.store.getRevision());
  const [activeSceneId, setActiveSceneId] = useState(session.sceneId);
  const [selection, setSelection] = useState<EntityId>();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ManipulationMode>("layout");
  const [leftPanel, setLeftPanel] = useState<LeftPanel>("scenes");
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>("timeline");
  const [preview, setPreview] = useState(false);
  const [livePositions, setLivePositions] = useState<
    Record<string, StagePosition>
  >({});
  const [notice, setNotice] = useState(
    "Start by naming this scene and adding a learning objective.",
  );

  const document = session.store.getDocument();
  const orderedScenes = document.presentationFlow.sceneOrder
    .map((id) => document.scenes.find((scene) => scene.id === id))
    .filter((scene) => scene !== undefined);
  const scene =
    document.scenes.find((candidate) => candidate.id === activeSceneId) ??
    orderedScenes[0]!;
  const selectedEntity = scene.entityDefinitions.find(
    (entity) => entity.id === selection,
  );
  const items = useMemo(
    () => physicsLibrary.search({ text: query }).slice(0, 18),
    [query],
  );

  if (preview)
    return (
      <PresentationPreview
        document={document}
        initialSceneId={scene.id}
        onClose={() => setPreview(false)}
      />
    );

  function refresh(message?: string) {
    setRevision(session.store.getRevision());
    if (message) setNotice(message);
  }

  function chooseScene(sceneId: SceneId) {
    setActiveSceneId(sceneId);
    setSelection(undefined);
    setLivePositions({});
    setLeftPanel("scenes");
  }

  function createScene() {
    const id = addLessonScene(session, "New scene");
    chooseScene(id);
    refresh("New scene added to the lesson.");
  }

  function deleteScene() {
    const index = orderedScenes.findIndex(
      (candidate) => candidate.id === scene.id,
    );
    if (!removeLessonScene(session, scene.id)) {
      setNotice("A lesson must keep at least one scene.");
      return;
    }
    const next = orderedScenes[index - 1] ?? orderedScenes[index + 1];
    if (next) chooseScene(next.id);
    refresh("Scene removed. Undo is available.");
  }

  function moveScene(direction: -1 | 1) {
    const order = [...document.presentationFlow.sceneOrder];
    const index = order.indexOf(scene.id);
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target]!, order[index]!];
    if (reorderLessonScenes(session, order))
      refresh("Presentation scene order updated.");
  }

  function addItem(itemId: string) {
    try {
      const ids = addLibraryItem(session, registeredTypeId(itemId), scene.id);
      const currentScene = session.store
        .getDocument()
        .scenes.find((candidate) => candidate.id === scene.id)!;
      ids.forEach((id, offset) => {
        const entity = currentScene.entityDefinitions.find(
          (candidate) => candidate.id === id,
        );
        if (!entity) return;
        setEntityPresentation(session, scene.id, id, entity.name, {
          ...(entity.visualDefaults ?? {}),
          x: 160 + ((currentScene.entityDefinitions.length + offset) % 4) * 150,
          y:
            145 +
            Math.floor((currentScene.entityDefinitions.length + offset) / 4) *
              125,
        });
      });
      setSelection(ids[0]);
      refresh("Object added to the selected scene.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  }

  function updateSceneMetadata(key: string, value: JsonValue) {
    if (
      setSceneDetails(session, scene.id, scene.name, {
        ...(scene.metadata ?? {}),
        [key]: value,
      })
    )
      refresh("Scene details saved to the project.");
  }

  function updateEntity(
    name: string,
    visualDefaults = selectedEntity?.visualDefaults ?? {},
  ) {
    if (
      selectedEntity &&
      setEntityPresentation(
        session,
        scene.id,
        selectedEntity.id,
        name,
        visualDefaults,
      )
    )
      refresh("Object presentation saved.");
  }

  function moveObject(
    entityId: EntityId,
    position: StagePosition,
    commit: boolean,
  ) {
    setLivePositions((current) => ({ ...current, [entityId]: position }));
    if (!commit) return;
    const entity = scene.entityDefinitions.find(
      (candidate) => candidate.id === entityId,
    );
    if (!entity) return;
    setEntityPresentation(session, scene.id, entityId, entity.name, {
      ...(entity.visualDefaults ?? {}),
      x: position.x,
      y: position.y,
    });
    if (mode === "physics") {
      const x = (position.x - 410) / 45;
      const y = (245 - position.y) / 45;
      setPhysicalPosition(session, scene.id, entityId, x, y);
      refresh("Physical position and matching presentation layout saved.");
    } else {
      refresh("Presentation layout saved. Physics is unchanged.");
    }
  }

  function downloadSnapshot() {
    const serialized = serializeProjectJson(document);
    if (!serialized.ok) {
      setNotice(serialized.error.message);
      return;
    }
    const blob = new Blob([serialized.value], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download =
      document.metadata.title
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "") + ".physica.json";
    anchor.click();
    URL.revokeObjectURL(url);
    session.store.markSaved();
    refresh("Editable project snapshot downloaded.");
  }

  return (
    <main className="teacher-workspace" data-revision={revision}>
      <div className="author-toolbar">
        <button type="button" onClick={onHome}>
          ← Lessons
        </button>
        <div className="project-identity">
          <b>{document.metadata.title}</b>
          <span>
            {orderedScenes.length} scenes ·{" "}
            {session.store.isDirty()
              ? "Unsaved changes"
              : "Saved snapshot current"}
          </span>
        </div>
        <div className="toolbar-actions">
          <button
            type="button"
            disabled={!session.store.canUndo()}
            onClick={() => {
              if (session.store.undo().ok) refresh("Undid the last edit.");
            }}
          >
            Undo
          </button>
          <button
            type="button"
            disabled={!session.store.canRedo()}
            onClick={() => {
              if (session.store.redo().ok) refresh("Redid the edit.");
            }}
          >
            Redo
          </button>
          <button type="button" onClick={onOpen}>
            Open
          </button>
          <button type="button" onClick={downloadSnapshot}>
            Save snapshot
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => setPreview(true)}
          >
            Preview lesson
          </button>
        </div>
      </div>
      <div className="editor-grid">
        <aside className="lesson-left-panel">
          <div className="left-panel-tabs">
            <button
              type="button"
              className={leftPanel === "scenes" ? "active" : ""}
              onClick={() => setLeftPanel("scenes")}
            >
              Scenes
            </button>
            <button
              type="button"
              className={leftPanel === "library" ? "active" : ""}
              onClick={() => setLeftPanel("library")}
            >
              Library
            </button>
          </div>
          {leftPanel === "scenes" ? (
            <>
              <div className="panel-heading">
                <span>Lesson outline</span>
                <b>Presentation order</b>
              </div>
              <div className="scene-list">
                {orderedScenes.map((candidate, index) => (
                  <button
                    type="button"
                    key={candidate.id}
                    className={candidate.id === scene.id ? "active" : ""}
                    onClick={() => chooseScene(candidate.id)}
                  >
                    <small>{String(index + 1).padStart(2, "0")}</small>
                    <span>
                      <b>{candidate.name}</b>
                      <em>{candidate.entityDefinitions.length} objects</em>
                    </span>
                  </button>
                ))}
              </div>
              <button type="button" className="add-scene" onClick={createScene}>
                ＋ Add scene
              </button>
              <div className="scene-actions">
                <button type="button" onClick={() => moveScene(-1)}>
                  Move up
                </button>
                <button type="button" onClick={() => moveScene(1)}>
                  Move down
                </button>
                <button type="button" onClick={deleteScene}>
                  Delete
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="panel-heading">
                <span>Physics Library</span>
                <b>Add to {scene.name}</b>
              </div>
              <input
                type="search"
                placeholder="Search cart, text, graph…"
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
                      title={item.description}
                      onClick={() => addItem(item.id)}
                    >
                      <ObjectGlyph name={item.displayName} />
                      <span>
                        <b>{item.displayName}</b>
                        <small>{item.itemClass}</small>
                      </span>
                      <em>{preset ? "—" : "+"}</em>
                    </button>
                  );
                })}
              </div>
            </>
          )}
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
                onClick={() => setMode("layout")}
              >
                Arrange lesson
              </button>
              <button
                type="button"
                className={mode === "physics" ? "active physics" : ""}
                onClick={() => setMode("physics")}
              >
                Change physical position
              </button>
            </div>
            <span className={"mode-explainer " + mode}>{notice}</span>
            <button
              type="button"
              className="scene-settings-button"
              onClick={() => setSelection(undefined)}
            >
              Scene settings
            </button>
          </div>
          <LessonStage
            scene={scene}
            selectedId={selection}
            mode={mode}
            positionOverrides={livePositions}
            onSelect={setSelection}
            onMove={moveObject}
          />
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
                ? "Presentation timing preview"
                : "Optional deterministic scripting"}
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
          scene={scene}
          layout={
            selectedEntity
              ? (livePositions[selectedEntity.id] ??
                entityStagePosition(
                  selectedEntity,
                  scene.entityDefinitions.indexOf(selectedEntity),
                ))
              : undefined
          }
          report={session.store.validate()}
          onSceneName={(name) => {
            if (setSceneDetails(session, scene.id, name, scene.metadata ?? {}))
              refresh("Scene title updated.");
          }}
          onSceneMetadata={updateSceneMetadata}
          onEntityName={(name) => updateEntity(name)}
          onEntityContent={(content) =>
            selectedEntity &&
            updateEntity(selectedEntity.name, {
              ...(selectedEntity.visualDefaults ?? {}),
              content,
            })
          }
          onInitialValue={(key, value) => {
            if (
              selectedEntity &&
              setEntityInitialValue(
                session,
                scene.id,
                selectedEntity.id,
                key,
                value,
              )
            )
              refresh("Physical initial value updated.");
          }}
        />
      </div>
    </main>
  );
}
