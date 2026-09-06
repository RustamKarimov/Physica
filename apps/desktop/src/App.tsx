import "./teacher-editor/authoring-shell.css";
import { lazy, Suspense, useState } from "react";

const TeacherEditor = lazy(() =>
  import("./teacher-editor/TeacherEditor").then((module) => ({
    default: module.TeacherEditor,
  })),
);

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

const ElectricityWorkbench = lazy(() =>
  import("./ElectricityWorkbench").then((module) => ({
    default: module.ElectricityWorkbench,
  })),
);

const FieldsWorkbench = lazy(() =>
  import("./FieldsWorkbench").then((module) => ({
    default: module.FieldsWorkbench,
  })),
);

export function App() {
  const [route, setRoute] = useState<
    "fields" | "electricity" | "waves" | "mechanics" | "author" | "archive"
  >("fields");
  return (
    <div className="physica-shell">
      <header className="shell-bar">
        <button
          type="button"
          className="shell-brand"
          onClick={() => setRoute("fields")}
          aria-label="Open Physica Fields and Alternating Currents Alpha"
        >
          <span className="shell-mark">P</span>
          <span>
            <b>Physica</b>
            <small>Fields/AC Alpha · Phase 11</small>
          </span>
        </button>
        <nav aria-label="Application views">
          <button
            type="button"
            className={route === "fields" ? "active" : ""}
            aria-current={route === "fields" ? "page" : undefined}
            onClick={() => setRoute("fields")}
          >
            Fields &amp; AC
          </button>
          <button
            type="button"
            className={route === "electricity" ? "active" : ""}
            aria-current={route === "electricity" ? "page" : undefined}
            onClick={() => setRoute("electricity")}
          >
            Electricity &amp; Circuits
          </button>
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
          {route === "fields"
            ? "Gravity, electric and magnetic fields with synchronized AC"
            : route === "electricity"
              ? "Solved circuits, meters, characteristics and RC transients"
              : route === "waves"
                ? "Shared-state wave, screen, graph and ray workflows"
                : route === "mechanics"
                  ? "Seven scientifically linked teaching workflows"
                  : route === "author"
                    ? "No-code physics templates and complete registered Library"
                    : "Earlier engineering proofs"}
        </span>
      </header>
      {route === "fields" ? (
        <Suspense
          fallback={
            <div className="archive-loading">Loading Fields/AC Alpha…</div>
          }
        >
          <FieldsWorkbench onOpenAuthor={() => setRoute("author")} />
        </Suspense>
      ) : route === "electricity" ? (
        <Suspense
          fallback={
            <div className="archive-loading">
              Loading Electricity/Circuits Alpha…
            </div>
          }
        >
          <ElectricityWorkbench onOpenAuthor={() => setRoute("author")} />
        </Suspense>
      ) : route === "waves" ? (
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
        <Suspense
          fallback={
            <div className="archive-loading">
              Loading the teacher authoring workspace…
            </div>
          }
        >
          <TeacherEditor />
        </Suspense>
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
