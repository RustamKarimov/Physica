import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  createEquationMotionPlan,
  evaluateEquationMotion,
  type EquationFragmentLayout,
  type EquationMotionPlan,
  type EquationResult,
  type SemanticEquationNodeId,
} from "@physica/equations";
import {
  equationTransformDemos,
  type EquationVisualFragment,
} from "./equation-transform-demos";
import "./equation-transform-workbench.css";

function unwrap<T>(result: EquationResult<T>): T {
  if (!result.ok) throw new Error(result.error.kind);
  return result.value;
}

function readableStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function fragmentClass(fragment: EquationVisualFragment): string {
  return `tx-fragment has-${fragment.spacing}-spacing`;
}

function MotionFragment({
  fragment,
  className,
  style,
}: {
  readonly fragment: EquationVisualFragment;
  readonly className: string;
  readonly style: CSSProperties;
}) {
  return (
    <span
      className={`tx-token ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: fragment.markup }}
    />
  );
}

export function EquationTransformWorkbench() {
  const [selectedId, setSelectedId] = useState(equationTransformDemos[0]!.id);
  const [progress, setProgress] = useState(0);
  const [motion, setMotion] = useState<EquationMotionPlan | null>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const stageRef = useRef<HTMLDivElement>(null);
  const sourceRefs = useRef(new Map<SemanticEquationNodeId, HTMLSpanElement>());
  const targetRefs = useRef(new Map<SemanticEquationNodeId, HTMLSpanElement>());
  const demo =
    equationTransformDemos.find((item) => item.id === selectedId) ??
    equationTransformDemos[0]!;

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => {
      const stageBox = stage.getBoundingClientRect();
      const layouts = (
        fragments: readonly EquationVisualFragment[],
        elements: ReadonlyMap<SemanticEquationNodeId, HTMLSpanElement>,
      ): readonly EquationFragmentLayout[] =>
        fragments.map((fragment) => {
          const element = elements.get(fragment.nodeId);
          if (!element) throw new Error("Missing rendered equation fragment.");
          const box = element.getBoundingClientRect();
          return {
            nodeId: fragment.nodeId,
            x: box.left - stageBox.left,
            y: box.top - stageBox.top,
            width: box.width,
            height: box.height,
          };
        });

      const nextMotion = unwrap(
        createEquationMotionPlan(
          demo.transform,
          {
            coordinateSpace: "desktop-equation-stage-css-px",
            fragments: layouts(demo.sourceFragments, sourceRefs.current),
          },
          {
            coordinateSpace: "desktop-equation-stage-css-px",
            fragments: layouts(demo.targetFragments, targetRefs.current),
          },
        ),
      );
      setMotion(nextMotion);
    };

    const frameId = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [demo]);

  useEffect(() => {
    if (!playing || reducedMotion || !motion) return;
    const timer = window.setInterval(() => {
      setProgress((current) => {
        const next = current + 0.0125;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
    }, 30);
    return () => window.clearInterval(timer);
  }, [motion, playing, reducedMotion]);

  const frame = useMemo(
    () =>
      motion
        ? unwrap(evaluateEquationMotion(motion, progress, { reducedMotion }))
        : null,
    [motion, progress, reducedMotion],
  );
  const frames = new Map(
    frame?.fragments.map((fragment) => [fragment.nodeId, fragment]) ?? [],
  );
  const sourceById = new Map(
    demo.sourceFragments.map((fragment) => [fragment.nodeId, fragment]),
  );
  const targetById = new Map(
    demo.targetFragments.map((fragment) => [fragment.nodeId, fragment]),
  );
  const methods = [
    ...new Set(demo.transform.tokenCorrespondence.map((item) => item.method)),
  ];

  const selectDemo = (id: string) => {
    setMotion(null);
    setSelectedId(id);
    setProgress(0);
    setPlaying(!reducedMotion);
  };

  return (
    <section
      className="tx-lab"
      id="equation-transform"
      aria-labelledby="tx-title"
    >
      <div className="tx-eyebrow">
        <span>SEMANTIC CORRESPONDENCE · HONEST VALIDITY · MEASURED MOTION</span>
        <b>RELEASE GATE</b>
      </div>
      <div className="tx-hero">
        <div>
          <h1 id="tx-title">
            Transform the equation.
            <br />
            <em>Never manufacture the proof.</em>
          </h1>
          <p>
            Physica matches meaningful terms, measures their actual rendered
            positions, and verifies the mathematics on a separate path. Scrub
            any example: motion may explain a step, but only the symbolic result
            may certify it.
          </p>
        </div>
        <dl className="tx-meta">
          <div>
            <dt>MATCHED</dt>
            <dd>{motion?.matched.length ?? "—"}</dd>
          </div>
          <div>
            <dt>EXIT / ENTER</dt>
            <dd>
              {motion
                ? `${motion.exits.length} / ${motion.entries.length}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt>PROGRESS</dt>
            <dd>{Math.round((frame?.easedProgress ?? 0) * 100)}%</dd>
          </div>
        </dl>
      </div>

      <div className={"tx-console is-" + demo.accent}>
        <nav className="tx-tabs" aria-label="Equation transform examples">
          {equationTransformDemos.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={item.id === demo.id ? "is-active" : ""}
              onClick={() => selectDemo(item.id)}
              aria-pressed={item.id === demo.id}
            >
              <span>0{index + 1}</span>
              {item.tab}
            </button>
          ))}
        </nav>

        <div className="tx-content">
          <section className="tx-stage" aria-labelledby="tx-demo-title">
            <div className="tx-stage-head">
              <div>
                <span>ACTIVE TRANSFORM</span>
                <h2 id="tx-demo-title">{demo.title}</h2>
              </div>
              <span className="tx-status">
                {readableStatus(demo.transform.equivalenceStatus)}
              </span>
            </div>
            <div
              className="tx-equation-rail"
              aria-label="Source and target equations"
            >
              <div>
                <span>SOURCE</span>
                <div dangerouslySetInnerHTML={{ __html: demo.sourceMarkup }} />
              </div>
              <i aria-hidden="true">→</i>
              <div>
                <span>TARGET</span>
                <div dangerouslySetInnerHTML={{ __html: demo.targetMarkup }} />
              </div>
            </div>
            <div
              ref={stageRef}
              className="tx-motion-stage"
              aria-label={`Measured equation transition at ${Math.round((frame?.easedProgress ?? 0) * 100)} percent`}
            >
              <span className="tx-motion-caption">RENDERED TERM GEOMETRY</span>
              <div className="tx-measure-row" aria-hidden="true">
                {demo.sourceFragments.map((fragment) => (
                  <span
                    key={fragment.nodeId}
                    ref={(element) => {
                      if (element)
                        sourceRefs.current.set(fragment.nodeId, element);
                      else sourceRefs.current.delete(fragment.nodeId);
                    }}
                    className={fragmentClass(fragment)}
                    dangerouslySetInnerHTML={{ __html: fragment.markup }}
                  />
                ))}
              </div>
              <div className="tx-measure-row" aria-hidden="true">
                {demo.targetFragments.map((fragment) => (
                  <span
                    key={fragment.nodeId}
                    ref={(element) => {
                      if (element)
                        targetRefs.current.set(fragment.nodeId, element);
                      else targetRefs.current.delete(fragment.nodeId);
                    }}
                    className={fragmentClass(fragment)}
                    dangerouslySetInnerHTML={{ __html: fragment.markup }}
                  />
                ))}
              </div>
              {motion?.matched.map((item) => {
                const state = frames.get(item.target.nodeId);
                const fragment = targetById.get(item.target.nodeId);
                if (!state || !fragment) return null;
                return (
                  <MotionFragment
                    key={item.target.nodeId}
                    fragment={fragment}
                    className="is-matched"
                    style={{
                      left: item.target.x,
                      top: item.target.y,
                      width: item.target.width,
                      height: item.target.height,
                      opacity: state.opacity,
                      transform: `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scaleX}, ${state.scaleY})`,
                    }}
                  />
                );
              })}
              {motion?.exits.map((item) => {
                const state = frames.get(item.nodeId);
                const fragment = sourceById.get(item.nodeId);
                if (!state || !fragment) return null;
                return (
                  <MotionFragment
                    key={item.nodeId}
                    fragment={fragment}
                    className="is-exit"
                    style={{
                      left: item.x,
                      top: item.y,
                      width: item.width,
                      height: item.height,
                      opacity: state.opacity,
                      transform: `scale(${state.scaleX}, ${state.scaleY})`,
                    }}
                  />
                );
              })}
              {motion?.entries.map((item) => {
                const state = frames.get(item.nodeId);
                const fragment = targetById.get(item.nodeId);
                if (!state || !fragment) return null;
                return (
                  <MotionFragment
                    key={item.nodeId}
                    fragment={fragment}
                    className="is-entry"
                    style={{
                      left: item.x,
                      top: item.y,
                      width: item.width,
                      height: item.height,
                      opacity: state.opacity,
                      transform: `scale(${state.scaleX}, ${state.scaleY})`,
                    }}
                  />
                );
              })}
              {!motion && <span className="tx-layout-status">MEASURING…</span>}
            </div>
            <div className="tx-controls">
              <button
                type="button"
                onClick={() => {
                  setProgress(0);
                  setPlaying(!reducedMotion);
                }}
              >
                ↻ REPLAY
              </button>
              <button
                type="button"
                onClick={() => setPlaying((value) => !value)}
                disabled={reducedMotion || !motion}
              >
                {playing ? "Ⅱ PAUSE" : "▶ PLAY"}
              </button>
              <label className="tx-scrubber">
                <span>SCRUB</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  value={progress}
                  disabled={!motion}
                  onChange={(event) => {
                    setPlaying(false);
                    setProgress(Number(event.currentTarget.value));
                  }}
                />
              </label>
              <label className="tx-reduced">
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(event) => {
                    setReducedMotion(event.currentTarget.checked);
                    if (event.currentTarget.checked) setPlaying(false);
                  }}
                />
                REDUCED MOTION
              </label>
            </div>
          </section>

          <aside
            className="tx-inspector"
            aria-label="Transform integrity inspector"
          >
            <div className="tx-inspector-section">
              <span>VERIFICATION</span>
              <strong>
                {readableStatus(demo.transform.equivalenceStatus)}
              </strong>
              <p>{demo.transform.verificationExplanation}</p>
            </div>
            <div className="tx-inspector-section">
              <span>CORRESPONDENCE</span>
              <div className="tx-methods">
                {methods.map((method) => (
                  <code key={method}>{method}</code>
                ))}
              </div>
              <p>{demo.note}</p>
            </div>
            <div className="tx-integrity">
              <span>INTEGRITY BOUNDARY</span>
              <p>
                Motion reads semantic IDs and measured renderer boxes. It never
                edits the equation document, advances a clock or writes physics
                state.
              </p>
            </div>
          </aside>
        </div>
      </div>
      <a className="tx-next-proof" href="#equation-workbench">
        Previous proof retained: live semantic equation editor ↓
      </a>
    </section>
  );
}
