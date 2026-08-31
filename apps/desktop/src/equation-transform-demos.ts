import { DeterministicIdFactory } from "@physica/core-model";
import {
  createEquationModel,
  createEquationTransform,
  DeterministicSemanticEquationIdFactory,
  renderEquationToMarkup,
  type EquationCorrespondenceOverride,
  type EquationModelV1,
  type EquationResult,
  type EquationTransformV1,
  type EquationVerificationRequest,
  type SemanticEquationNode,
  type SemanticEquationNodeId,
} from "@physica/equations";
import { renderToString } from "katex";

export interface EquationVisualFragment {
  readonly nodeId: SemanticEquationNodeId;
  readonly latex: string;
  readonly markup: string;
  readonly spacing: "none" | "binary" | "relation";
}

export interface TransformDemo {
  readonly id: string;
  readonly tab: string;
  readonly title: string;
  readonly note: string;
  readonly accent: "cyan" | "amber" | "coral";
  readonly transform: EquationTransformV1;
  readonly sourceMarkup: string;
  readonly targetMarkup: string;
  readonly sourceFragments: readonly EquationVisualFragment[];
  readonly targetFragments: readonly EquationVisualFragment[];
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
  readonly fragments: (
    source: EquationModelV1,
    target: EquationModelV1,
    transform: EquationTransformV1,
  ) => {
    readonly source: readonly FragmentInput[];
    readonly target: readonly FragmentInput[];
  };
}

interface FragmentInput {
  readonly nodeId: SemanticEquationNodeId;
  readonly latex: string;
  readonly spacing?: EquationVisualFragment["spacing"];
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

function atom(
  model: EquationModelV1,
  value: string | number,
  occurrence = 0,
): SemanticEquationNodeId {
  const node = flatten(model.semanticRoot).filter(
    (candidate) => candidate.kind === "atom" && candidate.value === value,
  )[occurrence];
  if (!node) throw new Error(`Missing semantic atom ${String(value)}.`);
  return node.id;
}

function list(
  model: EquationModelV1,
  head: string,
  occurrence = 0,
): SemanticEquationNodeId {
  const node = flatten(model.semanticRoot).filter(
    (candidate) =>
      candidate.kind === "list" &&
      candidate.items[0]?.kind === "atom" &&
      candidate.items[0].value === head,
  )[occurrence];
  if (!node) throw new Error(`Missing semantic ${head} expression.`);
  return node.id;
}

function assertCorrespondence(
  transform: EquationTransformV1,
  sourceNodeId: SemanticEquationNodeId,
  targetNodeId: SemanticEquationNodeId,
): void {
  const found = transform.tokenCorrespondence.some(
    (item) =>
      item.sourceNodeId === sourceNodeId && item.targetNodeId === targetNodeId,
  );
  if (!found) throw new Error("Built-in transform lost a required term match.");
}

function visualFragment(input: FragmentInput): EquationVisualFragment {
  return {
    ...input,
    spacing: input.spacing ?? "none",
    markup: renderToString(input.latex, {
      displayMode: false,
      throwOnError: true,
      trust: false,
      strict: "warn",
    }),
  };
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
  let overrides: readonly EquationCorrespondenceOverride[] | undefined;
  if (config.overrideAtom) {
    overrides = [
      {
        sourceNodeId: atom(source, config.overrideAtom),
        targetNodeId: atom(target, config.overrideAtom),
      },
    ];
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
  const fragments = config.fragments(source, target, transform);
  return {
    id: config.id,
    tab: config.tab,
    title: config.title,
    note: config.note,
    accent: config.accent,
    transform,
    sourceMarkup: unwrap(renderEquationToMarkup(source)).markup,
    targetMarkup: unwrap(renderEquationToMarkup(target)).markup,
    sourceFragments: fragments.source.map(visualFragment),
    targetFragments: fragments.target.map(visualFragment),
  };
}

export const equationTransformDemos: readonly TransformDemo[] = [
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
    fragments: (source, target, transform) => {
      const sourceV = atom(source, "v");
      const sourceEqual = atom(source, "Equal");
      const sourceU = atom(source, "u");
      const sourceProduct = list(source, "Multiply");
      const targetV = atom(target, "v");
      const targetEqual = atom(target, "Equal");
      const targetU = atom(target, "u");
      const targetProduct = list(target, "Multiply");
      assertCorrespondence(transform, sourceV, targetV);
      assertCorrespondence(transform, sourceEqual, targetEqual);
      assertCorrespondence(transform, sourceU, targetU);
      assertCorrespondence(transform, sourceProduct, targetProduct);
      return {
        source: [
          { nodeId: sourceV, latex: "v" },
          { nodeId: sourceEqual, latex: "=", spacing: "relation" },
          { nodeId: sourceU, latex: "u" },
          { nodeId: atom(source, "Add"), latex: "+", spacing: "binary" },
          { nodeId: sourceProduct, latex: "at" },
        ],
        target: [
          { nodeId: targetV, latex: "v" },
          {
            nodeId: atom(target, "Negate"),
            latex: "-",
            spacing: "binary",
          },
          { nodeId: targetU, latex: "u" },
          { nodeId: targetEqual, latex: "=", spacing: "relation" },
          { nodeId: targetProduct, latex: "at" },
        ],
      };
    },
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
    fragments: (source, target, transform) => {
      const sourceS = atom(source, "s");
      const sourceEqual = atom(source, "Equal");
      const targetS = atom(target, "s");
      const targetEqual = atom(target, "Equal");
      assertCorrespondence(transform, sourceS, targetS);
      assertCorrespondence(transform, sourceEqual, targetEqual);
      return {
        source: [
          { nodeId: sourceS, latex: "s" },
          { nodeId: sourceEqual, latex: "=", spacing: "relation" },
          {
            nodeId: list(source, "Add"),
            latex: String.raw`ut+\frac{1}{2}at^2`,
          },
        ],
        target: [
          { nodeId: targetS, latex: "s" },
          { nodeId: targetEqual, latex: "=", spacing: "relation" },
          { nodeId: atom(target, 28), latex: "28" },
        ],
      };
    },
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
    fragments: (source, target, transform) => {
      const sourceX = atom(source, "x");
      const targetX = atom(target, "x");
      assertCorrespondence(transform, sourceX, targetX);
      return {
        source: [
          { nodeId: sourceX, latex: "x" },
          {
            nodeId: atom(source, "Add"),
            latex: "+(",
            spacing: "binary",
          },
          { nodeId: atom(source, "y", 0), latex: "y" },
          {
            nodeId: atom(source, "Negate"),
            latex: "-",
            spacing: "binary",
          },
          { nodeId: atom(source, "y", 1), latex: "y)" },
        ],
        target: [{ nodeId: targetX, latex: "x" }],
      };
    },
  }),
];
