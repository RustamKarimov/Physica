import { collectSemanticEquationIds } from "./identity";
import { freezeDeep } from "./internal";
import { validateEquationTransform } from "./transform";
import type {
  EquationFragmentLayout,
  EquationFragmentLayoutSet,
  EquationMotionFrame,
  EquationMotionPlan,
  EquationResult,
  EquationTransformV1,
  SemanticEquationNodeId,
} from "./types";

function invalidLayout(
  path: string,
  message: string,
): EquationResult<EquationMotionPlan> {
  return {
    ok: false,
    error: { kind: "invalid-fragment-layout", path, message },
  };
}

function validateLayouts(
  set: EquationFragmentLayoutSet,
  validIds: ReadonlySet<SemanticEquationNodeId>,
  path: string,
): EquationResult<readonly EquationFragmentLayout[]> {
  if (set.coordinateSpace.trim().length === 0) {
    return {
      ok: false,
      error: {
        kind: "invalid-fragment-layout",
        path: path + ".coordinateSpace",
        message: "Coordinate space must not be empty.",
      },
    };
  }
  if (!Array.isArray(set.fragments)) {
    return {
      ok: false,
      error: {
        kind: "invalid-fragment-layout",
        path: path + ".fragments",
        message: "Fragment layouts must be an array.",
      },
    };
  }
  const seen = new Set<string>();
  const layouts: EquationFragmentLayout[] = [];
  for (let index = 0; index < set.fragments.length; index += 1) {
    const fragment = set.fragments[index]!;
    const itemPath = path + ".fragments[" + index + "]";
    if (!validIds.has(fragment.nodeId)) {
      return {
        ok: false,
        error: {
          kind: "invalid-fragment-layout",
          path: itemPath + ".nodeId",
          message: "Fragment refers to a missing semantic node.",
        },
      };
    }
    if (seen.has(fragment.nodeId)) {
      return {
        ok: false,
        error: {
          kind: "invalid-fragment-layout",
          path: itemPath + ".nodeId",
          message: "Fragment semantic node IDs must be unique.",
        },
      };
    }
    if (
      !Number.isFinite(fragment.x) ||
      !Number.isFinite(fragment.y) ||
      !Number.isFinite(fragment.width) ||
      !Number.isFinite(fragment.height) ||
      fragment.width <= 0 ||
      fragment.height <= 0
    ) {
      return {
        ok: false,
        error: {
          kind: "invalid-fragment-layout",
          path: itemPath,
          message:
            "Fragment boxes require finite coordinates and positive size.",
        },
      };
    }
    seen.add(fragment.nodeId);
    layouts.push({ ...fragment });
  }
  return { ok: true, value: layouts };
}

export function createEquationMotionPlan(
  transform: EquationTransformV1,
  source: EquationFragmentLayoutSet,
  target: EquationFragmentLayoutSet,
): EquationResult<EquationMotionPlan> {
  const validTransform = validateEquationTransform(transform);
  if (!validTransform.ok) return validTransform;
  if (source.coordinateSpace !== target.coordinateSpace) {
    return invalidLayout(
      "$.coordinateSpace",
      "Source and target fragments must use one presentation coordinate space.",
    );
  }
  const sourceIds = new Set(
    collectSemanticEquationIds(transform.sourceExpression.semanticRoot),
  );
  const targetIds = new Set(
    collectSemanticEquationIds(transform.targetExpression.semanticRoot),
  );
  const sourceLayouts = validateLayouts(source, sourceIds, "$.source");
  if (!sourceLayouts.ok) return sourceLayouts;
  const targetLayouts = validateLayouts(target, targetIds, "$.target");
  if (!targetLayouts.ok) return targetLayouts;

  const correspondenceBySource = new Map(
    transform.tokenCorrespondence.map((item) => [item.sourceNodeId, item]),
  );
  const targetById = new Map(
    targetLayouts.value.map((fragment) => [fragment.nodeId, fragment]),
  );
  const matchedTargets = new Set<string>();
  const matched = [];
  const exits: EquationFragmentLayout[] = [];
  for (const sourceFragment of sourceLayouts.value) {
    const correspondence = correspondenceBySource.get(sourceFragment.nodeId);
    const targetFragment = correspondence
      ? targetById.get(correspondence.targetNodeId)
      : undefined;
    if (!correspondence || !targetFragment) {
      exits.push({ ...sourceFragment });
      continue;
    }
    matchedTargets.add(targetFragment.nodeId);
    matched.push({
      source: { ...sourceFragment },
      target: { ...targetFragment },
      correspondence: { ...correspondence },
      inverseTranslateX: sourceFragment.x - targetFragment.x,
      inverseTranslateY: sourceFragment.y - targetFragment.y,
      inverseScaleX: sourceFragment.width / targetFragment.width,
      inverseScaleY: sourceFragment.height / targetFragment.height,
    });
  }
  const entries = targetLayouts.value
    .filter((fragment) => !matchedTargets.has(fragment.nodeId))
    .map((fragment) => ({ ...fragment }));

  return {
    ok: true,
    value: freezeDeep({
      coordinateSpace: source.coordinateSpace,
      status: transform.equivalenceStatus,
      matched,
      exits,
      entries,
    }),
  };
}

function smoothstep(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}

function interpolate(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

export function evaluateEquationMotion(
  plan: EquationMotionPlan,
  progress: number,
  options: { readonly reducedMotion?: boolean } = {},
): EquationResult<EquationMotionFrame> {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    return {
      ok: false,
      error: { kind: "invalid-motion-progress", value: progress },
    };
  }
  const resolvedProgress = options.reducedMotion ? 1 : progress;
  const easedProgress = smoothstep(resolvedProgress);
  const fragments = [
    ...plan.matched.map((item) => ({
      nodeId: item.target.nodeId,
      role: "matched" as const,
      translateX: interpolate(item.inverseTranslateX, 0, easedProgress),
      translateY: interpolate(item.inverseTranslateY, 0, easedProgress),
      scaleX: interpolate(item.inverseScaleX, 1, easedProgress),
      scaleY: interpolate(item.inverseScaleY, 1, easedProgress),
      opacity: 1,
    })),
    ...plan.exits.map((item) => ({
      nodeId: item.nodeId,
      role: "exit" as const,
      translateX: 0,
      translateY: 0,
      scaleX: interpolate(1, 0.84, easedProgress),
      scaleY: interpolate(1, 0.84, easedProgress),
      opacity: 1 - easedProgress,
    })),
    ...plan.entries.map((item) => ({
      nodeId: item.nodeId,
      role: "entry" as const,
      translateX: 0,
      translateY: 0,
      scaleX: interpolate(0.84, 1, easedProgress),
      scaleY: interpolate(0.84, 1, easedProgress),
      opacity: easedProgress,
    })),
  ];
  return {
    ok: true,
    value: freezeDeep({
      progress: resolvedProgress,
      easedProgress,
      status: plan.status,
      fragments,
    }),
  };
}
