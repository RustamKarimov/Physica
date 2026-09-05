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

const WaveOpticsWorkbench = lazy(() =>
  import("./WaveOpticsWorkbench").then((module) => ({
    default: module.WaveOpticsWorkbench,
  })),
);

export function App() {
  const [route, setRoute] = useState<
    "waves" | "mechanics" | "author" | "archive"
  >("waves");
  return (
    <div className="physica-shell">
      <header className="shell-bar">
        <button
          type="button"
          className="shell-brand"
          onClick={() => setRoute("waves")}
          aria-label="Open Physica Wave and Optics Alpha"
        >
          <span className="shell-mark">P</span>
          <span>
            <b>Physica</b>
            <small>Wave/Optics Alpha · Phase 9</small>
          </span>
        </button>
        <nav aria-label="Application views">
          <button
            type="button"
            className={route === "waves" ? "active" : ""}
            aria-current={route === "waves" ? "page" : undefined}
            onClick={() => setRoute("waves")}
          >
            Waves &amp; Optics
          </button>
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
          {route === "waves"
            ? "Shared-state wave, screen, graph and ray workflows"
            : route === "mechanics"
              ? "Seven scientifically linked teaching workflows"
              : route === "author"
                ? "No-code mechanics templates and full Library"
                : "Earlier engineering proofs"}
        </span>
      </header>
      {route === "waves" ? (
        <Suspense
          fallback={
            <div className="archive-loading">Loading Wave/Optics Alpha…</div>
          }
        >
          <WaveOpticsWorkbench onOpenAuthor={() => setRoute("author")} />
        </Suspense>
      ) : route === "mechanics" ? (
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
