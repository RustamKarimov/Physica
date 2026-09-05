import "./teacher-editor/authoring-shell.css";
import { lazy, Suspense, useState } from "react";
import { TeacherEditor } from "./teacher-editor/TeacherEditor";

const FoundationArchive = lazy(() =>
  import("./FoundationArchive").then((module) => ({
    default: module.FoundationArchive,
  })),
);

export function App() {
  const [route, setRoute] = useState<"author" | "archive">("author");
  return (
    <div className="physica-shell">
      <header className="shell-bar">
        <button
          type="button"
          className="shell-brand"
          onClick={() => setRoute("author")}
          aria-label="Open Physica teacher editor"
        >
          <span className="shell-mark">P</span>
          <span>
            <b>Physica</b>
            <small>Teacher authoring preview · Phase 7</small>
          </span>
        </button>
        <nav aria-label="Application views">
          <button
            type="button"
            className={route === "author" ? "active" : ""}
            onClick={() => setRoute("author")}
          >
            Author
          </button>
          <button
            type="button"
            className={route === "archive" ? "active" : ""}
            onClick={() => setRoute("archive")}
          >
            Foundation archive
          </button>
        </nav>
        <span className="shell-status">
          {route === "author"
            ? "A usable first authoring workflow"
            : "Earlier engineering proofs"}
        </span>
      </header>
      {route === "author" ? (
        <TeacherEditor />
      ) : (
        <Suspense
          fallback={
            <div className="archive-loading">
              Loading renderer and solver observatories…
            </div>
          }
        >
          <FoundationArchive />
        </Suspense>
      )}
    </div>
  );
}
