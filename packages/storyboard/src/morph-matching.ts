import { freezeMorph } from "./morph-definitions";
import { morphError, type MorphResult } from "./morph-errors";
import type {
  MatchedTransformElement,
  MatchedTransformPlan,
} from "./morph-types";

function validateSide(
  elements: readonly MatchedTransformElement[],
  side: "source" | "destination",
): MorphResult<Map<string, MatchedTransformElement>> {
  const byId = new Map<string, MatchedTransformElement>();
  for (const element of elements) {
    if (
      element === null ||
      typeof element !== "object" ||
      typeof element.semanticId !== "string" ||
      element.semanticId.trim().length === 0 ||
      typeof element.compatibilityKey !== "string" ||
      element.compatibilityKey.trim().length === 0 ||
      element.target === null ||
      typeof element.target !== "object" ||
      element.target.kind !== "representation" ||
      !element.target.sceneId ||
      !element.target.id
    )
      return {
        ok: false,
        error: morphError(
          "invalid-definition",
          "invalid-matched-transform-element",
          `The ${side} matched-transform element is malformed.`,
        ),
      };
    if (byId.has(element.semanticId))
      return {
        ok: false,
        error: morphError(
          "duplicate-semantic-id",
          `duplicate-${side}-semantic-id`,
          `The ${side} matched-transform semantic IDs must be unique.`,
          { relatedIds: [element.semanticId] },
        ),
      };
    byId.set(element.semanticId, freezeMorph(element));
  }
  return { ok: true, value: byId };
}

export function createMatchedTransformPlan(
  sourceElements: readonly MatchedTransformElement[],
  destinationElements: readonly MatchedTransformElement[],
): MorphResult<MatchedTransformPlan> {
  const source = validateSide(sourceElements, "source");
  if (!source.ok) return source;
  const destination = validateSide(destinationElements, "destination");
  if (!destination.ok) return destination;
  const semanticIds = [
    ...new Set([...source.value.keys(), ...destination.value.keys()]),
  ].sort((left, right) => left.localeCompare(right));
  const matches: MatchedTransformPlan["matches"][number][] = [];
  const exits: MatchedTransformElement[] = [];
  const entries: MatchedTransformElement[] = [];
  for (const semanticId of semanticIds) {
    const sourceElement = source.value.get(semanticId);
    const destinationElement = destination.value.get(semanticId);
    if (sourceElement && destinationElement) {
      matches.push({
        semanticId,
        source: sourceElement,
        destination: destinationElement,
        strategy:
          sourceElement.compatibilityKey === destinationElement.compatibilityKey
            ? "morph"
            : "replace",
      });
    } else if (sourceElement) exits.push(sourceElement);
    else if (destinationElement) entries.push(destinationElement);
  }
  return {
    ok: true,
    value: freezeMorph({ matches, exits, entries }),
  };
}
