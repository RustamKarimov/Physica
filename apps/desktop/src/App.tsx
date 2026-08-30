import { useEffect, useRef, useState } from "react";
import {
  createBuiltInPhysicsLibrary,
  type LibraryDragPayload,
  type LibraryItemClass,
  type LibraryItemDefinition,
} from "@physica/assets";
import { DeterministicIdFactory } from "@physica/core-model";
import { mountPixiRenderPlan } from "@physica/renderer-pixi";
import { mountThreeRenderPlan } from "@physica/renderer-three";
import {
  compileAnimationSchedule,
  evaluateAnimationSchedule,
  type AnimationDefinition,
} from "@physica/storyboard";
import { Adapter } from "./Adapter";
import { LibraryBrowser } from "./LibraryBrowser";
import {
  DEMO_HEIGHT,
  DEMO_WIDTH,
  pickingService,
  pixiPlan,
  svgPlan,
  threePlan,
} from "./rendering-demo";
import {
  evaluateDesktopReveal,
  desktopRevealDurationSeconds,
} from "./reveal-demo";
import { PresentationControls, RevealShowcase } from "./presentation-panels";

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
const animationIds = new DeterministicIdFactory(170_000);
const animationSceneId = animationIds.sceneId();
const animationRepresentationId = animationIds.representationId();
const animationBase = {
  name: "Desktop animation",
  target: {
    kind: "representation" as const,
    sceneId: animationSceneId,
    id: animationRepresentationId,
  },
  clockKey: "presentation" as const,
  startTimeSeconds: 0,
  durationSeconds: 4,
  easing: { kind: "named" as const, id: "ease-in-out" as const },
  conflictPolicy: "replace" as const,
  priority: 0,
  reversible: true,
  scrubbable: true,
};
const animationDefinitions: readonly AnimationDefinition[] = [
  {
    ...animationBase,
    id: animationIds.storyboardStepId(),
    channel: "presentation.translation",
    startValue: { kind: "vec3", x: -150, y: 35, z: 0 },
    endValue: { kind: "vec3", x: 150, y: -45, z: 0 },
  },
  {
    ...animationBase,
    id: animationIds.storyboardStepId(),
    channel: "presentation.rotation",
    startValue: { kind: "scalar", value: 0 },
    endValue: { kind: "scalar", value: Math.PI * 2 },
  },
  {
    ...animationBase,
    id: animationIds.storyboardStepId(),
    channel: "presentation.scale",
    startValue: { kind: "vec3", x: 0.7, y: 0.7, z: 0.7 },
    endValue: { kind: "vec3", x: 1.35, y: 1.35, z: 1.35 },
  },
];
const compiledAnimation = compileAnimationSchedule(animationDefinitions);
if (!compiledAnimation.ok) throw new Error(compiledAnimation.error.code);
const desktopAnimationSchedule = compiledAnimation.value;

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
  const [animationTime, setAnimationTime] = useState(0);
  const [animationPlaying, setAnimationPlaying] = useState(true);
  const [animationDirection, setAnimationDirection] = useState<1 | -1>(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const visibleLibraryItems = physicsLibrary.search({
    text: libraryQuery,
    ...(libraryClass === "all" ? {} : { itemClasses: [libraryClass] }),
  });
  const animationFrame = evaluateAnimationSchedule(
    desktopAnimationSchedule,
    animationTime,
    { reducedMotion },
  );
  const animatedTarget = animationFrame.ok
    ? animationFrame.value.targets[0]
    : undefined;
  const revealState = evaluateDesktopReveal(animationTime, reducedMotion);

  useEffect(() => {
    if (!animationPlaying || reducedMotion) return;
    const timer = window.setInterval(() => {
      setAnimationTime((current) => {
        const next = current + animationDirection * 0.025;
        if (next > desktopAnimationSchedule.durationSeconds) return 0;
        if (next < 0) return desktopAnimationSchedule.durationSeconds;
        return next;
      });
    }, 25);
    return () => window.clearInterval(timer);
  }, [animationDirection, animationPlaying, reducedMotion]);

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
          <strong>12 / DRAW · WRITE · REVEAL</strong>
        </div>
        <div className="engine-state">
          <i /> deterministic frame ready
        </div>
      </header>

      <section className="hero" id="rendering-lab" aria-labelledby="app-title">
        <div className="eyebrow">
          <span>DETERMINISTIC SCIENTIFIC REVEALS</span>
          <b>LIVE</b>
        </div>
        <div className="hero-copy">
          <div>
            <h1 id="app-title">
              Draw the reasoning.
              <br />
              <em>Reveal meaning, not new physics.</em>
            </h1>
            <p>
              Draw a vector by path length, write a Unicode-safe label and
              highlight the instructional focus. Every effect is derived from
              the same scrub-safe presentation-time coordinate.
            </p>
          </div>
          <dl className="frame-meta">
            <div>
              <dt>TIME</dt>
              <dd>{animationTime.toFixed(2)} s</dd>
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
          <LibraryBrowser
            items={visibleLibraryItems}
            itemClasses={libraryClasses}
            query={libraryQuery}
            selectedClass={libraryClass}
            onQueryChange={setLibraryQuery}
            onClassChange={setLibraryClass}
            onPlace={placeItem}
            dragPayload={(item) => physicsLibrary.dragPayload(item)}
          />{" "}
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
              aria-label="Layered drawing, writing and emphasis demonstration"
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
              <RevealShowcase state={revealState} />
              {animatedTarget && (
                <button
                  className="animation-object"
                  style={{
                    opacity: animatedTarget.opacity,
                    transform:
                      "translate(" +
                      animatedTarget.translation.x +
                      "px, " +
                      animatedTarget.translation.y +
                      "px) rotate(" +
                      animatedTarget.rotationRadians +
                      "rad) scale(" +
                      animatedTarget.scale.x +
                      ")",
                  }}
                  onClick={() =>
                    setSelection(
                      "Presentation transform · physics state unchanged",
                    )
                  }
                  aria-label="Animated presentation object"
                >
                  φ
                </button>
              )}
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
                <span>SCENE / REVEAL LAB</span>
                <span>{animationTime.toFixed(2)} s / PRESENTATION</span>
              </div>
            </div>
          </div>
          <aside className="inspector" aria-label="Renderer diagnostics">
            <div className="inspector-heading">
              <span>FRAME INSPECTOR</span>
              <b>12</b>
            </div>
            <PresentationControls
              playing={animationPlaying}
              direction={animationDirection}
              timeSeconds={animationTime}
              durationSeconds={desktopRevealDurationSeconds}
              reducedMotion={reducedMotion}
              animatedTarget={animatedTarget}
              revealState={revealState}
              onTogglePlaying={() => setAnimationPlaying((current) => !current)}
              onFlipDirection={() => {
                setAnimationDirection((current) => (current === 1 ? -1 : 1));
                setAnimationPlaying(true);
              }}
              onReset={() => {
                setAnimationPlaying(false);
                setAnimationTime(0);
              }}
              onScrub={(timeSeconds) => {
                setAnimationPlaying(false);
                setAnimationTime(timeSeconds);
              }}
              onReducedMotion={setReducedMotion}
            />{" "}
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
                Draw, write and emphasis state is transient. It never modifies
                force, velocity or any authoritative physical channel.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <footer>
        <span>PHYSICS-FIRST AUTHORING SYSTEM</span>
        <span>
          PRESENTATION CLOCK → PATH · GRAPHEME · EMPHASIS → READABLE FRAME
        </span>
      </footer>
    </main>
  );
}
