import "./teacher-editor/authoring-shell.css";
import { lazy, Suspense, useState } from "react";
import { TeacherEditor } from "./teacher-editor/TeacherEditor";

const FoundationArchive = lazy(() =>
  import("./FoundationArchive").then((module) => ({
    default: module.FoundationArchive,
  })),
);

const MechanicsWorkbench = lazy(() =>
  import("./MechanicsWorkbench").then((module) => ({
    default: module.MechanicsWorkbench,
  })),
);

export function App() {
  const [route, setRoute] = useState<"mechanics" | "author" | "archive">(
    "mechanics",
  );
  return (
    <div className="physica-shell">
      <header className="shell-bar">
        <button
          type="button"
          className="shell-brand"
          onClick={() => setRoute("mechanics")}
          aria-label="Open Physica Mechanics Alpha"
        >
          <span className="shell-mark">P</span>
          <span>
            <b>Physica</b>
            <small>Mechanics Alpha · Phase 8</small>
          </span>
        </button>
        <nav aria-label="Application views">
          <button
            type="button"
            className={route === "mechanics" ? "active" : ""}
            aria-current={route === "mechanics" ? "page" : undefined}
            onClick={() => setRoute("mechanics")}
          >
            Mechanics
          </button>
          <button
            type="button"
            className={route === "author" ? "active" : ""}
            aria-current={route === "author" ? "page" : undefined}
            onClick={() => setRoute("author")}
          >
            Author
          </button>
          <button
            type="button"
            className={route === "archive" ? "active" : ""}
            aria-current={route === "archive" ? "page" : undefined}
            onClick={() => setRoute("archive")}
          >
            Foundation archive
          </button>
        </nav>
        <span className="shell-status">
          {route === "mechanics"
            ? "Seven scientifically linked teaching workflows"
            : route === "author"
              ? "No-code mechanics templates and full Library"
              : "Earlier engineering proofs"}
        </span>
      </header>
      {route === "mechanics" ? (
        <Suspense
          fallback={
            <div className="archive-loading">Loading Mechanics Alpha…</div>
          }
        >
          <MechanicsWorkbench onOpenAuthor={() => setRoute("author")} />
        </Suspense>
      ) : route === "author" ? (
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
