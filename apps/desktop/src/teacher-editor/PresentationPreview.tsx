import type { ProjectDocument, SceneId } from "@physica/core-model";
import { useMemo, useState } from "react";
import { LessonStage } from "./LessonStage";

function textMetadata(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberMetadata(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function PresentationPreview({
  document,
  initialSceneId,
  onClose,
}: {
  readonly document: ProjectDocument;
  readonly initialSceneId: SceneId;
  readonly onClose: () => void;
}) {
  const orderedScenes = useMemo(
    () =>
      document.presentationFlow.sceneOrder
        .map((id) => document.scenes.find((scene) => scene.id === id))
        .filter((scene) => scene !== undefined),
    [document],
  );
  const initialIndex = Math.max(
    orderedScenes.findIndex((scene) => scene.id === initialSceneId),
    0,
  );
  const [index, setIndex] = useState(initialIndex);
  const scene = orderedScenes[index] ?? document.scenes[0];
  if (!scene)
    return (
      <main className="presentation-preview empty">
        <p>This lesson has no scenes to present.</p>
        <button type="button" onClick={onClose}>
          Return to editor
        </button>
      </main>
    );
  const objective = textMetadata(
    scene.metadata?.["physica:lesson/objective"],
    document.metadata.description ?? "",
  );
  const notes = textMetadata(scene.metadata?.["physica:lesson/notes"]);
  const duration = numberMetadata(
    scene.metadata?.["physica:lesson/durationSeconds"],
    15,
  );
  return (
    <main className="presentation-preview">
      <header className="presentation-header">
        <div>
          <span>PHYSICA LESSON PREVIEW</span>
          <b>{document.metadata.title}</b>
        </div>
        <button type="button" onClick={onClose}>
          Exit preview
        </button>
      </header>
      <div className="presentation-layout">
        <aside className="presentation-outline">
          <span>LESSON OUTLINE</span>
          {orderedScenes.map((candidate, sceneIndex) => (
            <button
              type="button"
              key={candidate.id}
              className={sceneIndex === index ? "active" : ""}
              onClick={() => setIndex(sceneIndex)}
            >
              <small>{String(sceneIndex + 1).padStart(2, "0")}</small>
              <b>{candidate.name}</b>
            </button>
          ))}
          <div className="teacher-notes">
            <span>TEACHER NOTES</span>
            <p>{notes || "Add speaker notes in the scene inspector."}</p>
            <small>Visible to the teacher, not learners.</small>
          </div>
        </aside>
        <section className="presentation-canvas">
          <div className="presentation-question">
            <span>LEARNING OBJECTIVE</span>
            <h1>{scene.name}</h1>
            <p>{objective || "Add a learning objective in the editor."}</p>
          </div>
          <LessonStage scene={scene} mode="preview" />
        </section>
      </div>
      <footer className="presentation-controls">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
        >
          ← Previous scene
        </button>
        <div>
          <b>
            Scene {index + 1} of {orderedScenes.length}
          </b>
          <span>{duration} seconds planned</span>
          <i
            style={{ width: ((index + 1) / orderedScenes.length) * 100 + "%" }}
          />
        </div>
        <button
          type="button"
          className="primary"
          disabled={index === orderedScenes.length - 1}
          onClick={() =>
            setIndex((current) =>
              Math.min(orderedScenes.length - 1, current + 1),
            )
          }
        >
          Next scene →
        </button>
      </footer>
    </main>
  );
}
