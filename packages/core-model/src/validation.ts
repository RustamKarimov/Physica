import type { ComponentDefinition } from "./component";
import { isUuidV4 } from "./ids";
import type { RegisteredTypeId } from "./ids";
import type { ProjectDocument } from "./project";
import type { DocumentReference } from "./references";
import type { SceneDefinition } from "./scene";
import type {
  ResolvedStateChannelClaim,
  StateChannelRef,
} from "./state-channels";
import type { SystemTypeDefinition } from "./system";
import {
  createValidationReport,
  type ValidationIssue,
  type ValidationReport,
} from "./validation-types";

export interface ProjectDefinitionRegistry {
  getComponentDefinition(
    typeId: RegisteredTypeId,
    schemaVersion: number,
  ): ComponentDefinition | undefined;
  getSystemDefinition(
    typeId: RegisteredTypeId,
    schemaVersion: number,
  ): SystemTypeDefinition | undefined;
}

function referenceIssue(
  code: string,
  message: string,
  path: string,
  relatedIds: readonly string[],
): ValidationIssue {
  return {
    code,
    severity: "error",
    message,
    path,
    source: "reference",
    recoverable: true,
    relatedIds,
  };
}

function findScene(
  document: ProjectDocument,
  sceneId: string,
): SceneDefinition | undefined {
  return document.scenes.find((scene) => scene.id === sceneId);
}

export function documentReferenceExists(
  document: ProjectDocument,
  reference: DocumentReference,
): boolean {
  if (reference.kind === "dataset") {
    return document.datasets.some((dataset) => dataset.id === reference.id);
  }
  if (reference.kind === "asset") {
    return document.assets.some((asset) => asset.id === reference.id);
  }

  const sceneId = reference.kind === "scene" ? reference.id : reference.sceneId;
  const scene = findScene(document, sceneId);
  if (!scene) return false;
  if (reference.kind === "scene") return true;

  switch (reference.kind) {
    case "entity":
      return scene.entityDefinitions.some(
        (entity) => entity.id === reference.id,
      );
    case "component": {
      const entity = scene.entityDefinitions.find(
        (candidate) => candidate.id === reference.entityId,
      );
      return Boolean(
        entity?.componentInstances.some(
          (component) => component.instanceId === reference.id,
        ),
      );
    }
    case "system":
      return scene.systemDefinitions.some(
        (system) => system.id === reference.id,
      );
    case "representation":
      return scene.representations.some(
        (representation) => representation.id === reference.id,
      );
    case "relationship":
      return scene.relationshipDefinitions.some(
        (relationship) => relationship.id === reference.id,
      );
    case "control":
      return scene.controls.some((control) => control.id === reference.id);
    case "equation":
      return scene.equationDefinitions.some(
        (equation) => equation.id === reference.id,
      );
    case "graph":
      return scene.graphDefinitions.some((graph) => graph.id === reference.id);
  }
}

function stateRefExists(scene: SceneDefinition, ref: StateChannelRef): boolean {
  if (ref.scope === "entity") {
    return scene.entityDefinitions.some((entity) => entity.id === ref.entityId);
  }
  return scene.systemDefinitions.some((system) => system.id === ref.systemId);
}

function collectIdentityIssues(document: ProjectDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const identities = new Map<string, string>();

  function register(id: string, path: string): void {
    if (!isUuidV4(id)) {
      issues.push({
        code: "invalid-uuid-v4",
        severity: "fatal",
        message: `Persisted ID at ${path} is not a UUID v4 string.`,
        path,
        source: "schema",
        recoverable: false,
        relatedIds: [id],
      });
    }

    const previousPath = identities.get(id);
    if (previousPath) {
      issues.push({
        code: "duplicate-persisted-id",
        severity: "error",
        message: `Persisted ID is duplicated at ${previousPath} and ${path}.`,
        path,
        source: "reference",
        recoverable: true,
        relatedIds: [id],
      });
    } else {
      identities.set(id, path);
    }
  }

  register(document.projectId, "projectId");
  document.assets.forEach((asset, index) =>
    register(asset.id, `assets[${index}].id`),
  );
  document.datasets.forEach((dataset, index) =>
    register(dataset.id, `datasets[${index}].id`),
  );
  document.globalVariables.forEach((variable, index) =>
    register(variable.id, `globalVariables[${index}].id`),
  );
  document.exportPresets.forEach((preset, index) =>
    register(preset.id, `exportPresets[${index}].id`),
  );
  document.presentationFlow.transitions.forEach((transition, index) =>
    register(transition.id, `presentationFlow.transitions[${index}].id`),
  );

  document.scenes.forEach((scene, sceneIndex) => {
    const base = `scenes[${sceneIndex}]`;
    register(scene.id, `${base}.id`);
    register(scene.storyboard.id, `${base}.storyboard.id`);
    scene.storyboard.steps.forEach((step, index) =>
      register(step.id, `${base}.storyboard.steps[${index}].id`),
    );
    scene.entityDefinitions.forEach((entity, entityIndex) => {
      register(entity.id, `${base}.entityDefinitions[${entityIndex}].id`);
      entity.componentInstances.forEach((component, componentIndex) =>
        register(
          component.instanceId,
          `${base}.entityDefinitions[${entityIndex}].componentInstances[${componentIndex}].instanceId`,
        ),
      );
    });
    scene.systemDefinitions.forEach((system, index) =>
      register(system.id, `${base}.systemDefinitions[${index}].id`),
    );
    scene.representations.forEach((representation, index) =>
      register(representation.id, `${base}.representations[${index}].id`),
    );
    const registeredCollections = [
      ["clockDefinitions", scene.clockDefinitions],
      ["eventDefinitions", scene.eventDefinitions],
      ["relationshipDefinitions", scene.relationshipDefinitions],
      ["controls", scene.controls],
      ["equationDefinitions", scene.equationDefinitions],
      ["graphDefinitions", scene.graphDefinitions],
    ] as const;
    for (const [name, collection] of registeredCollections) {
      collection.forEach((entry, index) =>
        register(entry.id, `${base}.${name}[${index}].id`),
      );
    }
  });

  return issues;
}

function collectReferenceIssues(document: ProjectDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const sceneIds = new Set(document.scenes.map((scene) => scene.id));
  const orderedSceneIds = new Set<string>();

  if (
    document.presentationFlow.entrySceneId !== null &&
    !sceneIds.has(document.presentationFlow.entrySceneId)
  ) {
    issues.push(
      referenceIssue(
        "dangling-entry-scene",
        "PresentationFlow entrySceneId does not reference an existing Scene.",
        "presentationFlow.entrySceneId",
        [document.presentationFlow.entrySceneId],
      ),
    );
  }

  document.presentationFlow.sceneOrder.forEach((sceneId, index) => {
    if (!sceneIds.has(sceneId)) {
      issues.push(
        referenceIssue(
          "dangling-scene-order-reference",
          "PresentationFlow sceneOrder contains an unknown Scene ID.",
          `presentationFlow.sceneOrder[${index}]`,
          [sceneId],
        ),
      );
    }
    if (orderedSceneIds.has(sceneId)) {
      issues.push(
        referenceIssue(
          "duplicate-scene-order-reference",
          "A Scene occurs more than once in PresentationFlow sceneOrder.",
          `presentationFlow.sceneOrder[${index}]`,
          [sceneId],
        ),
      );
    }
    orderedSceneIds.add(sceneId);
  });

  for (const scene of document.scenes) {
    if (!orderedSceneIds.has(scene.id)) {
      issues.push(
        referenceIssue(
          "scene-missing-from-order",
          "Every Scene must occur exactly once in PresentationFlow sceneOrder.",
          "presentationFlow.sceneOrder",
          [scene.id],
        ),
      );
    }
  }

  document.presentationFlow.transitions.forEach((transition, index) => {
    if (!sceneIds.has(transition.fromSceneId)) {
      issues.push(
        referenceIssue(
          "dangling-transition-source",
          "Presentation transition source Scene does not exist.",
          `presentationFlow.transitions[${index}].fromSceneId`,
          [transition.fromSceneId],
        ),
      );
    }
    if (!sceneIds.has(transition.toSceneId)) {
      issues.push(
        referenceIssue(
          "dangling-transition-target",
          "Presentation transition target Scene does not exist.",
          `presentationFlow.transitions[${index}].toSceneId`,
          [transition.toSceneId],
        ),
      );
    }
  });

  const assetIds = new Set(document.assets.map((asset) => asset.id));
  document.datasets.forEach((dataset, index) => {
    if (
      dataset.storage.kind === "asset" &&
      !assetIds.has(dataset.storage.assetId)
    ) {
      issues.push(
        referenceIssue(
          "dangling-dataset-asset",
          "Dataset storage references an unknown Asset.",
          `datasets[${index}].storage.assetId`,
          [dataset.storage.assetId],
        ),
      );
    }
  });

  const datasetIds = new Set(document.datasets.map((dataset) => dataset.id));
  document.scenes.forEach((scene, sceneIndex) => {
    const entityIds = new Set(
      scene.entityDefinitions.map((entity) => entity.id),
    );
    const systemIds = new Set(
      scene.systemDefinitions.map((system) => system.id),
    );
    const relationshipIds = new Set(
      scene.relationshipDefinitions.map((relationship) => relationship.id),
    );
    const clockIds = new Set(scene.clockDefinitions.map((clock) => clock.id));

    scene.datasetRefs.forEach((datasetId, index) => {
      if (!datasetIds.has(datasetId)) {
        issues.push(
          referenceIssue(
            "dangling-scene-dataset",
            "Scene datasetRefs contains an unknown Dataset.",
            `scenes[${sceneIndex}].datasetRefs[${index}]`,
            [datasetId],
          ),
        );
      }
    });

    scene.entityDefinitions.forEach((entity, entityIndex) => {
      entity.componentInstances.forEach((component, componentIndex) => {
        component.bindings.forEach((binding, bindingIndex) => {
          if (!documentReferenceExists(document, binding.target)) {
            issues.push(
              referenceIssue(
                "dangling-component-binding",
                "Component binding target does not exist.",
                `scenes[${sceneIndex}].entityDefinitions[${entityIndex}].componentInstances[${componentIndex}].bindings[${bindingIndex}].target`,
                [binding.target.id],
              ),
            );
          }
        });
      });
    });

    scene.systemDefinitions.forEach((system, systemIndex) => {
      system.participants.forEach((participant, participantIndex) => {
        if (
          participant.kind === "entity" &&
          !entityIds.has(participant.entityId)
        ) {
          issues.push(
            referenceIssue(
              "dangling-system-participant",
              "System participant references an unknown Entity in its Scene.",
              `scenes[${sceneIndex}].systemDefinitions[${systemIndex}].participants[${participantIndex}]`,
              [participant.entityId],
            ),
          );
        }
      });
      if (system.clockRef && !clockIds.has(system.clockRef)) {
        issues.push(
          referenceIssue(
            "dangling-system-clock",
            "System clockRef references an unknown Clock in its Scene.",
            `scenes[${sceneIndex}].systemDefinitions[${systemIndex}].clockRef`,
            [system.clockRef],
          ),
        );
      }
      [...system.declaredInputs, ...system.declaredOutputs].forEach(
        (ref, refIndex) => {
          if (!stateRefExists(scene, ref)) {
            issues.push(
              referenceIssue(
                "dangling-state-channel-reference",
                "System state-channel reference target does not exist.",
                `scenes[${sceneIndex}].systemDefinitions[${systemIndex}].stateRefs[${refIndex}]`,
                [ref.scope === "entity" ? ref.entityId : ref.systemId],
              ),
            );
          }
        },
      );
    });

    scene.representations.forEach((representation, representationIndex) => {
      representation.relationshipRefs.forEach((relationshipId, index) => {
        if (!relationshipIds.has(relationshipId)) {
          issues.push(
            referenceIssue(
              "dangling-representation-relationship",
              "Representation references an unknown Relationship.",
              `scenes[${sceneIndex}].representations[${representationIndex}].relationshipRefs[${index}]`,
              [relationshipId],
            ),
          );
        }
      });

      representation.sourceBindings.forEach((binding, bindingIndex) => {
        let exists = true;
        if (binding.kind === "entity") exists = entityIds.has(binding.entityId);
        if (binding.kind === "system") exists = systemIds.has(binding.systemId);
        if (binding.kind === "dataset")
          exists = datasetIds.has(binding.datasetId);
        if (binding.kind === "asset") exists = assetIds.has(binding.assetId);
        if (binding.kind === "observable") {
          if (binding.source.sourceKind === "system") {
            exists = systemIds.has(binding.source.systemId);
          } else {
            const source = binding.source;
            const entity = scene.entityDefinitions.find(
              (candidate) => candidate.id === source.entityId,
            );
            exists = Boolean(
              entity?.componentInstances.some(
                (component) =>
                  component.instanceId === source.componentInstanceId,
              ),
            );
          }
        }
        if (!exists) {
          issues.push(
            referenceIssue(
              "dangling-representation-source",
              "Representation source binding target does not exist.",
              `scenes[${sceneIndex}].representations[${representationIndex}].sourceBindings[${bindingIndex}]`,
              [],
            ),
          );
        }
      });
    });
  });

  return issues;
}

function claimKey(claim: ResolvedStateChannelClaim): string {
  const target =
    claim.ref.scope === "entity" ? claim.ref.entityId : claim.ref.systemId;
  return `${claim.ref.scope}:${target}:${claim.ref.channel}`;
}

function collectAuthorityIssues(
  document: ProjectDocument,
  registry?: ProjectDefinitionRegistry,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  document.scenes.forEach((scene, sceneIndex) => {
    const claims: ResolvedStateChannelClaim[] = [];

    scene.entityDefinitions.forEach((entity) => {
      entity.componentInstances.forEach((component) => {
        if (!component.enabled || !registry) return;
        const definition = registry.getComponentDefinition(
          component.componentTypeId,
          component.componentSchemaVersion,
        );
        for (const claim of definition?.resolveStateClaims(component) ?? []) {
          claims.push({
            ownerKind: "component",
            ownerId: component.instanceId,
            ref: {
              scope: "entity",
              entityId: entity.id,
              channel: claim.channel,
            },
            role: claim.role,
          });
        }
      });
    });

    scene.systemDefinitions.forEach((system) => {
      if (!system.enabled) return;
      const definition = registry?.getSystemDefinition(
        system.systemTypeId,
        system.systemSchemaVersion,
      );
      if (definition) {
        claims.push(...definition.resolveStateClaims(system));
      } else {
        for (const ref of system.declaredOutputs) {
          claims.push({
            ownerKind: "system",
            ownerId: system.id,
            ref,
            role: "authoritative-write",
          });
        }
      }
    });

    const writers = new Map<string, Map<string, ResolvedStateChannelClaim>>();
    for (const claim of claims) {
      if (claim.role !== "authoritative-write") continue;
      const key = claimKey(claim);
      const owners = writers.get(key) ?? new Map();
      owners.set(`${claim.ownerKind}:${claim.ownerId}`, claim);
      writers.set(key, owners);
    }

    for (const [key, owners] of writers) {
      if (owners.size <= 1) continue;
      issues.push({
        code: "multiple-authoritative-state-writers",
        severity: "error",
        message: `Multiple active authorities claim mutable state channel ${key}.`,
        path: `scenes[${sceneIndex}]`,
        source: "authority",
        recoverable: true,
        relatedIds: [...owners.values()].map((claim) => claim.ownerId),
      });
    }
  });

  return issues;
}

export function validateProjectDocument(
  document: ProjectDocument,
  registry?: ProjectDefinitionRegistry,
): ValidationReport {
  return createValidationReport([
    ...collectIdentityIssues(document),
    ...collectReferenceIssues(document),
    ...collectAuthorityIssues(document, registry),
  ]);
}
