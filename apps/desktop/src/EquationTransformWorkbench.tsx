import { useEffect, useMemo, useState } from "react";
import { DeterministicIdFactory } from "@physica/core-model";
import {
  createEquationModel,
  createEquationMotionPlan,
  createEquationTransform,
  DeterministicSemanticEquationIdFactory,
  evaluateEquationMotion,
  matchEquationNodes,
  renderEquationToMarkup,
  type EquationCorrespondenceOverride,
  type EquationModelV1,
  type EquationMotionPlan,
  type EquationResult,
  type EquationTransformV1,
  type EquationVerificationRequest,
  type SemanticEquationNode,
  type SemanticEquationNodeId,
} from "@physica/equations";
import "./equation-transform-workbench.css";

interface TransformDemo {
  readonly id: string;
  readonly tab: string;
  readonly title: string;
  readonly note: string;
  readonly accent: "cyan" | "amber" | "coral";
  readonly transform: EquationTransformV1;
  readonly motion: EquationMotionPlan;
  readonly sourceMarkup: string;
  readonly targetMarkup: string;
  readonly sourceLabels: ReadonlyMap<SemanticEquationNodeId, string>;
  readonly targetLabels: ReadonlyMap<SemanticEquationNodeId, string>;
}

interface DemoConfig {
  readonly id: string;
  readonly tab: string;
  readonly title: string;
  readonly note: string;
  readonly accent: TransformDemo["accent"];
  readonly sourceLatex: string;
  readonly targetLatex: string;
  readonly verification: EquationVerificationRequest;
  readonly semanticSeed: number;
  readonly overrideAtom?: string;
}

function unwrap<T>(result: EquationResult<T>): T {
  if (!result.ok) throw new Error(result.error.kind);
  return result.value;
}

function flatten(root: SemanticEquationNode): readonly SemanticEquationNode[] {
  const nodes: SemanticEquationNode[] = [];
  const visit = (node: SemanticEquationNode) => {
    nodes.push(node);
    if (node.kind === "list") node.items.forEach(visit);
    if (node.kind === "record") {
      node.entries.forEach((entry) => visit(entry.value));
    }
  };
  visit(root);
  return nodes;
}

function displayLabel(node: SemanticEquationNode): string {
  if (node.kind !== "atom") return "term";
  if (node.value === "Equal") return "=";
  if (node.value === "Add") return "+";
  if (node.value === "Multiply") return "·";
  if (node.value === "Negate") return "−";
  if (node.value === "Rational") return "½";
  return String(node.value);
}

function nodeLookup(model: EquationModelV1) {
  return new Map(flatten(model.semanticRoot).map((node) => [node.id, node]));
}

const documentIds = new DeterministicIdFactory(900_000);

function buildDemo(config: DemoConfig): TransformDemo {
  const source = unwrap(
    createEquationModel({
      id: documentIds.equationId(),
      name: config.title + " source",
      latex: config.sourceLatex,
      idFactory: new DeterministicSemanticEquationIdFactory(
        config.semanticSeed,
      ),
    }),
  );
  const target = unwrap(
    createEquationModel({
      id: documentIds.equationId(),
      name: config.title + " target",
      latex: config.targetLatex,
      idFactory: new DeterministicSemanticEquationIdFactory(
        config.semanticSeed + 10_000,
      ),
    }),
  );
  const sourceNodes = nodeLookup(source);
  const targetNodes = nodeLookup(target);
  let overrides: readonly EquationCorrespondenceOverride[] | undefined;
  if (config.overrideAtom) {
    const sourceNode = [...sourceNodes.values()].find(
      (node) => node.kind === "atom" && node.value === config.overrideAtom,
    );
    const targetNode = [...targetNodes.values()].find(
      (node) => node.kind === "atom" && node.value === config.overrideAtom,
    );
    if (!sourceNode || !targetNode) throw new Error("Missing override atom.");
    overrides = [{ sourceNodeId: sourceNode.id, targetNodeId: targetNode.id }];
  }
  const transform = unwrap(
    createEquationTransform({
      id: documentIds.equationId(),
      name: config.title,
      source,
      target,
      verification: config.verification,
      ...(overrides ? { overrides } : {}),
      metadata: { desktopProof: config.id },
    }),
  );
  const match = unwrap(
    matchEquationNodes({
      source,
      target,
      ...(overrides ? { overrides } : {}),
    }),
  );
  const matched = transform.tokenCorrespondence
    .filter((item) => {
      const sourceNode = sourceNodes.get(item.sourceNodeId);
      const targetNode = targetNodes.get(item.targetNodeId);
      return (
        sourceNode?.kind === "atom" &&
        targetNode?.kind === "atom" &&
        displayLabel(sourceNode) === displayLabel(targetNode)
      );
    })
    .slice(0, 5);
  const sourceOnly = match.sourceOnly
    .filter((id) => sourceNodes.get(id)?.kind === "atom")
    .slice(0, 4);
  const targetOnly = match.targetOnly
    .filter((id) => targetNodes.get(id)?.kind === "atom")
    .slice(0, 3);
  const sourceFragments = [
    ...matched.map((item, index) => ({
      nodeId: item.sourceNodeId,
      x: 54 + index * 82,
      y: 58 + (index % 2) * 3,
      width: 46,
      height: 48,
    })),
    ...sourceOnly.map((nodeId, index) => ({
      nodeId,
      x: 500 + index * 58,
      y: 58,
      width: 46,
      height: 48,
    })),
  ];
  const targetFragments = [
    ...matched.map((item, index) => ({
      nodeId: item.targetNodeId,
      x: 78 + index * 88 + (index % 2) * 18,
      y: 142 - (index % 2) * 4,
      width: 48,
      height: 48,
    })),
    ...targetOnly.map((nodeId, index) => ({
      nodeId,
      x: 500 + index * 60,
      y: 142,
      width: 48,
      height: 48,
    })),
  ];
  const motion = unwrap(
    createEquationMotionPlan(
      transform,
      {
        coordinateSpace: "equation-transform-stage-px",
        fragments: sourceFragments,
      },
      {
        coordinateSpace: "equation-transform-stage-px",
        fragments: targetFragments,
      },
    ),
  );
  const sourceMarkup = unwrap(renderEquationToMarkup(source)).markup;
  const targetMarkup = unwrap(renderEquationToMarkup(target)).markup;
  return {
    id: config.id,
    tab: config.tab,
    title: config.title,
    note: config.note,
    accent: config.accent,
    transform,
    motion,
    sourceMarkup,
    targetMarkup,
    sourceLabels: new Map(
      sourceFragments.map((fragment) => [
        fragment.nodeId,
        displayLabel(sourceNodes.get(fragment.nodeId)!),
      ]),
    ),
    targetLabels: new Map(
      targetFragments.map((fragment) => [
        fragment.nodeId,
        displayLabel(targetNodes.get(fragment.nodeId)!),
      ]),
    ),
  };
}

const demos: readonly TransformDemo[] = [
  buildDemo({
    id: "rearrange",
    tab: "REARRANGE",
    title: "Move u. Keep the physics.",
    note: "Verified from equal simplified residuals.",
    accent: "cyan",
    sourceLatex: "v=u+at",
    targetLatex: "v-u=at",
    verification: { kind: "automatic-equivalence" },
    semanticSeed: 910_000,
  }),
  buildDemo({
    id: "substitute",
    tab: "SUBSTITUTE",
    title: "Replace symbols with known values.",
    note: "Declared values are checked before the status changes.",
    accent: "amber",
    sourceLatex: String.raw`s=ut+\frac{1}{2}at^2`,
    targetLatex: "s=28",
    verification: {
      kind: "substitution",
      substitutions: { u: 3, t: 4, a: 2 },
    },
    semanticSeed: 930_000,
  }),
  buildDemo({
    id: "cancel",
    tab: "CANCEL",
    title: "Let the cancelled pair leave.",
    note: "Teacher override pins x; the symbolic check remains independent.",
    accent: "coral",
    sourceLatex: "x+(y-y)",
    targetLatex: "x",
    verification: { kind: "automatic-equivalence" },
    semanticSeed: 950_000,
    overrideAtom: "x",
  }),
];

function readableStatus(value: string): string {
  return value.replaceAll("_", " ");
}

export function EquationTransformWorkbench() {
  const [selectedId, setSelectedId] = useState(demos[0]!.id);
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const demo = demos.find((item) => item.id === selectedId) ?? demos[0]!;

  useEffect(() => {
    if (!playing || reducedMotion) return;
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
  }, [playing, reducedMotion, selectedId]);

  const frame = useMemo(
    () =>
      unwrap(evaluateEquationMotion(demo.motion, progress, { reducedMotion })),
    [demo, progress, reducedMotion],
  );
  const frames = new Map(
    frame.fragments.map((fragment) => [fragment.nodeId, fragment]),
  );
  const methods = [
    ...new Set(demo.transform.tokenCorrespondence.map((item) => item.method)),
  ];

  const selectDemo = (id: string) => {
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
        <span>SEMANTIC CORRESPONDENCE · HONEST VALIDITY · FLIP MOTION</span>
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
            Physica matches semantic terms for motion, then verifies the
            mathematics on a separate path. Scrub any example: visual
            correspondence can explain a step, but only the symbolic result may
            certify it.
          </p>
        </div>
        <dl className="tx-meta">
          <div>
            <dt>MATCHED</dt>
            <dd>{demo.motion.matched.length}</dd>
          </div>
          <div>
            <dt>EXIT / ENTER</dt>
            <dd>
              {demo.motion.exits.length} / {demo.motion.entries.length}
            </dd>
          </div>
          <div>
            <dt>PROGRESS</dt>
            <dd>{Math.round(frame.easedProgress * 100)}%</dd>
          </div>
        </dl>
      </div>

      <div className={"tx-console is-" + demo.accent}>
        <nav className="tx-tabs" aria-label="Equation transform examples">
          {demos.map((item, index) => (
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
              className="tx-motion-stage"
              aria-label="Semantic equation fragment motion"
            >
              <span className="tx-guide tx-guide-source">FIRST</span>
              <span className="tx-guide tx-guide-target">LAST</span>
              {demo.motion.matched.map((item) => {
                const state = frames.get(item.target.nodeId)!;
                return (
                  <span
                    key={item.target.nodeId}
                    className="tx-token is-matched"
                    title={item.correspondence.method}
                    style={{
                      left: item.target.x,
                      top: item.target.y,
                      opacity: state.opacity,
                      transform: `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scaleX}, ${state.scaleY})`,
                    }}
                  >
                    {demo.targetLabels.get(item.target.nodeId)}
                  </span>
                );
              })}
              {demo.motion.exits.map((item) => {
                const state = frames.get(item.nodeId)!;
                return (
                  <span
                    key={item.nodeId}
                    className="tx-token is-exit"
                    style={{
                      left: item.x,
                      top: item.y,
                      opacity: state.opacity,
                      transform: `scale(${state.scaleX})`,
                    }}
                  >
                    {demo.sourceLabels.get(item.nodeId)}
                  </span>
                );
              })}
              {demo.motion.entries.map((item) => {
                const state = frames.get(item.nodeId)!;
                return (
                  <span
                    key={item.nodeId}
                    className="tx-token is-entry"
                    style={{
                      left: item.x,
                      top: item.y,
                      opacity: state.opacity,
                      transform: `scale(${state.scaleX})`,
                    }}
                  >
                    {demo.targetLabels.get(item.nodeId)}
                  </span>
                );
              })}
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
                disabled={reducedMotion}
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
                Motion reads semantic IDs and layout boxes. It never edits the
                equation document, advances a clock or writes physics state.
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
