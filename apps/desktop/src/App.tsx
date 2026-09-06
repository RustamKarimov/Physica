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

const ThermalWorkbench = lazy(() =>
  import("./ThermalWorkbench").then((module) => ({
    default: module.ThermalWorkbench,
  })),
);

export function App() {
  const [route, setRoute] = useState<
    | "thermal"
    | "fields"
    | "electricity"
    | "waves"
    | "mechanics"
    | "author"
    | "archive"
  >("thermal");
  return (
    <div className="physica-shell">
      <header className="shell-bar">
        <button
          type="button"
          className="shell-brand"
          onClick={() => setRoute("thermal")}
          aria-label="Open Physica Thermal and Gases Alpha"
        >
          <span className="shell-mark">P</span>
          <span>
            <b>Physica</b>
            <small>Thermal/Gases Alpha · Phase 12</small>
          </span>
        </button>
        <nav aria-label="Application views">
          <button
            type="button"
            className={route === "thermal" ? "active" : ""}
            aria-current={route === "thermal" ? "page" : undefined}
            onClick={() => setRoute("thermal")}
          >
            Thermal &amp; Gases
          </button>
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
          {route === "thermal"
            ? "Temperature, particles, gas state and energy-ledger workflows"
            : route === "fields"
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
      {route === "thermal" ? (
        <Suspense
          fallback={
            <div className="archive-loading">Loading Thermal/Gases Alpha…</div>
          }
        >
          <ThermalWorkbench onOpenAuthor={() => setRoute("author")} />
        </Suspense>
      ) : route === "fields" ? (
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
