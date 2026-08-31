import type {
  ComponentInstance,
  ComponentInstanceId,
  EntityDefinition,
  EntityId,
  ProjectDocument,
  SceneDefinition,
  SceneId,
  ValidationIssue,
} from "@physica/core-model";

export function issue(
  code: string,
  message: string,
  path: string,
  relatedIds: readonly string[] = [],
): ValidationIssue {
  return {
    code,
    severity: "error",
    message,
    path,
    source: "semantic",
    recoverable: true,
    relatedIds,
  };
}

export function validIndex(index: number | undefined, length: number): boolean {
  return (
    index === undefined ||
    (Number.isInteger(index) && index >= 0 && index <= length)
  );
}

export function insertAt<T>(
  values: readonly T[],
  value: T,
  index?: number,
): readonly T[] {
  const target = index ?? values.length;
  return [...values.slice(0, target), value, ...values.slice(target)];
}

export function insertManyAtOriginalIndexes<T>(
  values: readonly T[],
  entries: readonly { readonly index: number; readonly value: T }[],
): readonly T[] {
  const result = [...values];
  for (const entry of [...entries].sort((a, b) => a.index - b.index)) {
    result.splice(entry.index, 0, entry.value);
  }
  return result;
}

export function findScene(
  document: ProjectDocument,
  sceneId: SceneId,
): SceneDefinition | undefined {
  return document.scenes.find((scene) => scene.id === sceneId);
}

export function replaceScene(
  document: ProjectDocument,
  sceneId: SceneId,
  update: (scene: SceneDefinition) => SceneDefinition,
): ProjectDocument {
  return {
    ...document,
    scenes: document.scenes.map((scene) =>
      scene.id === sceneId ? update(scene) : scene,
    ),
  };
}

export function findEntity(
  document: ProjectDocument,
  sceneId: SceneId,
  entityId: EntityId,
): EntityDefinition | undefined {
  return findScene(document, sceneId)?.entityDefinitions.find(
    (entity) => entity.id === entityId,
  );
}

export function findComponent(
  document: ProjectDocument,
  sceneId: SceneId,
  entityId: EntityId,
  componentInstanceId: ComponentInstanceId,
): ComponentInstance | undefined {
  return findEntity(document, sceneId, entityId)?.componentInstances.find(
    (component) => component.instanceId === componentInstanceId,
  );
}
