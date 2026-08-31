import {
  DeterministicIdFactory,
  createEmptyProject,
  createEmptyScene,
} from "@physica/core-model";
import {
  collectSemanticEquationIds,
  createEquationModel,
  DeterministicSemanticEquationIdFactory,
  editEquationModel,
  parseEquationDefinition,
  renderEquationToMarkup,
  toEquationDefinition,
  type EquationResult,
} from "@physica/equations";
import { parseProjectJson, serializeProjectJson } from "@physica/serialization";

function unwrap<T>(result: EquationResult<T>): T {
  if (!result.ok) throw new Error(result.error.kind);
  return result.value;
}

export function runEditAndRender() {
  const ids = new DeterministicIdFactory(240_000);
  const semanticIds = new DeterministicSemanticEquationIdFactory(250_000);
  const initial = unwrap(
    createEquationModel({
      id: ids.equationId(),
      name: "Constant-acceleration displacement",
      latex: String.raw`x=x_0+ut+\frac{1}{2}at^2`,
      idFactory: semanticIds,
      metadata: { topic: "kinematics", gallery: "edit-and-render" },
    }),
  );
  const edited = unwrap(
    editEquationModel({
      previous: initial,
      latex: String.raw`x=x_0+ut+\frac{1}{2}at^2+bt^3`,
      idFactory: semanticIds,
    }),
  );
  const initialIds = new Set(collectSemanticEquationIds(initial.semanticRoot));
  const editedIds = collectSemanticEquationIds(edited.semanticRoot);
  const retainedIds = editedIds.filter((id) => initialIds.has(id));
  const introducedIds = editedIds.filter((id) => !initialIds.has(id));

  const definition = unwrap(toEquationDefinition(edited));
  const scene = createEmptyScene(ids, "Semantic equation");
  const project = createEmptyProject(ids, {
    title: "Edit notation without losing meaning",
    tags: ["example", "equations", "kinematics"],
    createdAt: "2026-08-31T00:00:00.000Z",
  });
  const document = {
    ...project,
    scenes: [{ ...scene, equationDefinitions: [definition] }],
    presentationFlow: {
      entrySceneId: scene.id,
      sceneOrder: [scene.id],
      transitions: [],
    },
  };
  const serialized = serializeProjectJson(document);
  if (!serialized.ok) throw new Error(serialized.error.message);
  const parsed = parseProjectJson(serialized.value);
  if (!parsed.ok) throw new Error(parsed.error.message);
  const restoredDefinition =
    parsed.value.document.scenes[0]!.equationDefinitions[0]!;
  const restored = unwrap(parseEquationDefinition(restoredDefinition));
  const rendered = unwrap(renderEquationToMarkup(edited));
  const rerendered = unwrap(renderEquationToMarkup(restored));
  const restoredText = serializeProjectJson(parsed.value.document);

  return {
    id: "edit-and-render",
    sourceBefore: initial.source.value,
    sourceAfter: edited.source.value,
    canonicalBefore: initial.canonicalMathJson,
    canonicalAfter: edited.canonicalMathJson,
    nodeCountBefore: collectSemanticEquationIds(initial.semanticRoot).length,
    nodeCountAfter: editedIds.length,
    retainedIdentityCount: retainedIds.length,
    introducedIdentityCount: introducedIds.length,
    retainedIdentitySuffixes: retainedIds.map((id) => id.slice(-6)),
    envelope: {
      typeId: definition.typeId,
      schemaVersion: definition.schemaVersion,
      canonicalProjectRoundTrip:
        restoredText.ok && restoredText.value === serialized.value,
      semanticTreeRoundTrip:
        JSON.stringify(collectSemanticEquationIds(restored.semanticRoot)) ===
          JSON.stringify(editedIds) &&
        JSON.stringify(restored.canonicalMathJson) ===
          JSON.stringify(edited.canonicalMathJson),
    },
    rendering: {
      stable: rerendered.markup === rendered.markup,
      containsMathMl: rendered.markup.includes("<math"),
      containsKatexHtml: rendered.markup.includes("katex-html"),
      markupLength: rendered.markup.length,
    },
  };
}
