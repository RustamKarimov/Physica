import { useEffect, useRef, useState } from "react";
import { mountPixiRenderPlan } from "@physica/renderer-pixi";
import { mountThreeRenderPlan } from "@physica/renderer-three";
import {
  DEMO_HEIGHT,
  DEMO_WIDTH,
  pickingService,
  pixiPlan,
  renderingFrame,
  svgPlan,
  threePlan,
} from "./rendering-demo";

type AdapterState = "initializing" | "ready" | "unavailable";

export function App() {
  const pixiHost = useRef<HTMLDivElement>(null);
  const threeHost = useRef<HTMLDivElement>(null);
  const [pixiState, setPixiState] = useState<AdapterState>("initializing");
  const [threeState, setThreeState] = useState<AdapterState>("initializing");
  const [selection, setSelection] = useState(
    "Move across the scene to inspect semantic picks",
  );

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
          <strong>09 / RENDERING</strong>
        </div>
        <div className="engine-state">
          <i /> deterministic frame ready
        </div>
      </header>

      <section className="hero" id="rendering-lab" aria-labelledby="app-title">
        <div className="eyebrow">
          <span>RENDERING FOUNDATION</span>
          <b>LIVE</b>
        </div>
        <div className="hero-copy">
          <div>
            <h1 id="app-title">
              One world.
              <br />
              <em>Three renderers.</em>
            </h1>
            <p>
              A shared camera and immutable frame coordinate SVG precision, Pixi
              particle throughput, and Three-dimensional geometry.
            </p>
          </div>
          <dl className="frame-meta">
            <div>
              <dt>REVISION</dt>
              <dd>
                {renderingFrame.sourceRevision.toString().padStart(3, "0")}
              </dd>
            </div>
            <div>
              <dt>VIEWPORT</dt>
              <dd>
                {DEMO_WIDTH} × {DEMO_HEIGHT}
              </dd>
            </div>
            <div>
              <dt>CAMERA</dt>
              <dd>PERSPECTIVE / RH</dd>
            </div>
          </dl>
        </div>

        <div className="workbench">
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
              <div className="stage-caption">
                <span>SCENE / 009900</span>
                <span>Z = 0</span>
              </div>
            </div>
          </div>

          <aside className="inspector" aria-label="Renderer diagnostics">
            <div className="inspector-heading">
              <span>FRAME INSPECTOR</span>
              <b>01</b>
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
                Renderers consume projected state. They never advance physics.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <footer>
        <span>PHYSICS-FIRST AUTHORING SYSTEM</span>
        <span>CAMERA → FRAME → ADAPTER → PICK</span>
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
