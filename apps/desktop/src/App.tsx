import { useEffect, useRef, useState } from "react";
import {
  createBuiltInPhysicsLibrary,
  type LibraryDragPayload,
  type LibraryItemClass,
  type LibraryItemDefinition,
} from "@physica/assets";
import { mountPixiRenderPlan } from "@physica/renderer-pixi";
import { mountThreeRenderPlan } from "@physica/renderer-three";
import {
  DEMO_HEIGHT,
  DEMO_WIDTH,
  pickingService,
  pixiPlan,
  svgPlan,
  threePlan,
} from "./rendering-demo";

type AdapterState = "initializing" | "ready" | "unavailable";

const physicsLibrary = createBuiltInPhysicsLibrary();
const allLibraryItems = physicsLibrary.search();
const libraryClasses: readonly (LibraryItemClass | "all")[] = [
  "all",
  "smart-model",
  "prefab",
  "visual-object",
  "instrument",
  "representation",
  "material-preset",
];

export function App() {
  const pixiHost = useRef<HTMLDivElement>(null);
  const threeHost = useRef<HTMLDivElement>(null);
  const [pixiState, setPixiState] = useState<AdapterState>("initializing");
  const [threeState, setThreeState] = useState<AdapterState>("initializing");
  const [selection, setSelection] = useState(
    "Move across the scene to inspect semantic picks",
  );
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryClass, setLibraryClass] = useState<LibraryItemClass | "all">(
    "all",
  );
  const [placedItems, setPlacedItems] = useState<
    readonly LibraryItemDefinition[]
  >([]);
  const visibleLibraryItems = physicsLibrary.search({
    text: libraryQuery,
    ...(libraryClass === "all" ? {} : { itemClasses: [libraryClass] }),
  });

  const placeItem = (item: LibraryItemDefinition) => {
    if (item.itemClass === "material-preset") {
      setSelection(item.displayName + " is a property preset, ready to apply.");
      return;
    }
    setPlacedItems((current) => [...current, item]);
    setSelection(
      item.displayName + " instantiated from an immutable Library snapshot",
    );
  };

  const dropLibraryItem = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData("application/x-physica-library");
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as LibraryDragPayload;
      const item = allLibraryItems.find(
        (candidate) => candidate.id === payload.itemId,
      );
      if (item) placeItem(item);
    } catch {
      setSelection("Ignored an invalid Library drag payload");
    }
  };

  useEffect(() => {
    const host = threeHost.current;
    if (!host) return;
    const mounted = mountThreeRenderPlan(host, threePlan);
    if (!mounted.ok) {
      setThreeState("unavailable");
      return;
    }
    setThreeState("ready");
    return () => {
      mounted.value.dispose();
    };
  }, []);

  useEffect(() => {
    const host = pixiHost.current;
    if (!host) return;
    let active = true;
    let dispose: (() => void) | undefined;
    void mountPixiRenderPlan(host, pixiPlan).then((mounted) => {
      if (!active) {
        if (mounted.ok) mounted.value.dispose();
        return;
      }
      if (!mounted.ok) {
        setPixiState("unavailable");
        return;
      }
      dispose = () => {
        mounted.value.dispose();
      };
      setPixiState("ready");
    });
    return () => {
      active = false;
      dispose?.();
    };
  }, []);

  const inspect = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const point = {
      x: ((event.clientX - bounds.left) / bounds.width) * DEMO_WIDTH,
      y: ((event.clientY - bounds.top) / bounds.height) * DEMO_HEIGHT,
    };
    const hit = pickingService.pick(point)[0];
    setSelection(
      hit
        ? `${hit.renderId} · ${hit.backend.toUpperCase()} · ${hit.layer}`
        : `World (${point.x.toFixed(0)}, ${point.y.toFixed(0)}) · no semantic hit`,
    );
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#rendering-lab" aria-label="Physica home">
          <span className="brand-mark" aria-hidden="true">
            φ
          </span>
          <span>PHYSICA</span>
        </a>
        <div className="step-label">
          <span>FOUNDATION TRACK</span>
          <strong>10 / PHYSICS LIBRARY</strong>
        </div>
        <div className="engine-state">
          <i /> deterministic frame ready
        </div>
      </header>

      <section className="hero" id="rendering-lab" aria-labelledby="app-title">
        <div className="eyebrow">
          <span>PHYSICS LIBRARY FOUNDATION</span>
          <b>LIVE</b>
        </div>
        <div className="hero-copy">
          <div>
            <h1 id="app-title">
              Build from physics.
              <br />
              <em>Teach by construction.</em>
            </h1>
            <p>
              Search first-party smart models, apparatus, instruments and
              representations. Drag an item onto the live stage to create a
              versioned snapshot with fresh document identities.
            </p>
          </div>
          <dl className="frame-meta">
            <div>
              <dt>REVISION</dt>
              <dd>{placedItems.length.toString().padStart(3, "0")}</dd>
            </div>
            <div>
              <dt>OBJECTS</dt>
              <dd>{allLibraryItems.length}</dd>
            </div>
            <div>
              <dt>SOURCE</dt>
              <dd>BUILT-IN</dd>
            </div>
          </dl>
        </div>

        <div className="workbench">
          <aside className="library-browser" aria-label="Physics Library">
            <div className="library-heading">
              <div>
                <small>CATALOG</small>
                <strong>Library</strong>
              </div>
              <span>{visibleLibraryItems.length}</span>
            </div>
            <label className="library-search">
              <span className="sr-only">Search Library</span>
              <input
                value={libraryQuery}
                onChange={(event) => setLibraryQuery(event.target.value)}
                placeholder="Search objects…"
              />
              <kbd>⌕</kbd>
            </label>
            <div className="library-filters" aria-label="Library item class">
              {libraryClasses.map((itemClass) => (
                <button
                  key={itemClass}
                  className={libraryClass === itemClass ? "active" : ""}
                  onClick={() => setLibraryClass(itemClass)}
                >
                  {itemClass === "all" ? "All" : itemClass.replace("-", " ")}
                </button>
              ))}
            </div>
            <div className="library-list">
              {visibleLibraryItems.map((item) => (
                <article
                  className="library-card"
                  key={item.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "copy";
                    event.dataTransfer.setData(
                      "application/x-physica-library",
                      JSON.stringify(physicsLibrary.dragPayload(item)),
                    );
                  }}
                >
                  <div
                    className={"library-glyph glyph-" + item.itemClass}
                    aria-hidden="true"
                  >
                    {item.displayName.slice(0, 1)}
                  </div>
                  <div>
                    <strong>{item.displayName}</strong>
                    <span>{item.itemClass.replace("-", " ")}</span>
                  </div>
                  <button
                    onClick={() => placeItem(item)}
                    aria-label={"Add " + item.displayName + " to stage"}
                  >
                    +
                  </button>
                </article>
              ))}
            </div>
          </aside>
          <div className="stage-frame">
            <div className="stage-ruler stage-ruler-x">
              <span>−4</span>
              <span>0</span>
              <span>+4</span>
            </div>
            <div className="stage-ruler stage-ruler-y">
              <span>+2</span>
              <span>0</span>
              <span>−2</span>
            </div>
            <div
              className="stage"
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDrop={dropLibraryItem}
              onPointerMove={inspect}
              onPointerLeave={() =>
                setSelection("Move across the scene to inspect semantic picks")
              }
              aria-label="Layered rendering demonstration"
            >
              <div
                ref={threeHost}
                className="render-layer layer-three"
                aria-hidden="true"
              />
              <div
                ref={pixiHost}
                className="render-layer layer-pixi"
                aria-hidden="true"
              />
              <div
                className="render-layer layer-svg"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: svgPlan.payload.markup }}
              />
              <div className="stage-grid" aria-hidden="true" />
              <div className="placed-items" aria-live="polite">
                {placedItems.map((item, index) => (
                  <button
                    key={item.id + "-" + index}
                    className={"placed-item placed-" + (index % 6)}
                    onClick={() =>
                      setSelection(
                        item.displayName +
                          " · source " +
                          item.source.kind +
                          " · v" +
                          item.version,
                      )
                    }
                    title={item.description}
                  >
                    <b>{item.displayName.slice(0, 1)}</b>
                    <span>{item.displayName}</span>
                  </button>
                ))}
              </div>
              {placedItems.length === 0 && (
                <div className="drop-invitation">
                  <strong>DROP A PHYSICS OBJECT</strong>
                  <span>or use + in the Library</span>
                </div>
              )}
              <div className="stage-caption">
                <span>SCENE / LIBRARY LAB</span>
                <span>{placedItems.length} INSTANCES</span>
              </div>
            </div>
          </div>

          <aside className="inspector" aria-label="Renderer diagnostics">
            <div className="inspector-heading">
              <span>FRAME INSPECTOR</span>
              <b>10</b>
            </div>
            <div className="selection-readout">
              <small>SEMANTIC PICK</small>
              <strong>{selection}</strong>
            </div>
            <div className="adapter-list">
              <Adapter
                name="SVG"
                purpose="vectors + annotation"
                state="ready"
                accent="amber"
                count={svgPlan.payload.elementCount}
              />
              <Adapter
                name="PIXI"
                purpose="particle cloud"
                state={pixiState}
                accent="cyan"
                count={pixiPlan.payload.displayedParticleCount}
              />
              <Adapter
                name="THREE"
                purpose="3D vector"
                state={threeState}
                accent="coral"
                count={threePlan.payload.vectors.length}
              />
            </div>
            <div className="contract-note">
              <span>AUTHORITY</span>
              <p>
                Library instances are snapshots. Editing the catalog never
                mutates placed document objects.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <footer>
        <span>PHYSICS-FIRST AUTHORING SYSTEM</span>
        <span>DISCOVER → PREFLIGHT → SNAPSHOT → COMMAND</span>
      </footer>
    </main>
  );
}

function Adapter({
  name,
  purpose,
  state,
  accent,
  count,
}: {
  name: string;
  purpose: string;
  state: AdapterState;
  accent: string;
  count: number;
}) {
  return (
    <div className={`adapter adapter-${accent}`}>
      <div>
        <strong>{name}</strong>
        <span>{purpose}</span>
      </div>
      <div className="adapter-stat">
        <b>{count}</b>
        <small>{state}</small>
      </div>
    </div>
  );
}
