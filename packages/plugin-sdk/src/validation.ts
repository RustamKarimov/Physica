import {
  PLUGIN_ID_PATTERN,
  REGISTERED_TYPE_ID_PATTERN,
  isJsonValue,
} from "@physica/core-model";
import { libraryError, type LibraryError } from "./errors";
import type {
  InstrumentDefinition,
  LibraryItemDefinition,
  LibrarySource,
  MaterialPresetDefinition,
  PrefabDefinition,
} from "./types";

const LOCAL_ID_PATTERN = /^[a-z][a-z0-9._-]*$/;
const PROPERTY_ID_PATTERN = /^[a-z][a-z0-9-]*(?:\.[a-z][a-zA-Z0-9]*)+$/;

function duplicate(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function invalid(
  code: string,
  message: string,
  path: string,
  definitionId?: LibraryItemDefinition["id"],
): LibraryError {
  return libraryError("invalid-definition", code, message, {
    ...(definitionId ? { definitionId } : {}),
    path,
  });
}

function validSource(source: LibrarySource): boolean {
  return (
    source.sourcePackage.trim().length > 0 &&
    ((source.kind === "plugin" &&
      source.pluginId !== undefined &&
      PLUGIN_ID_PATTERN.test(source.pluginId)) ||
      (source.kind !== "plugin" && source.pluginId === undefined))
  );
}

function baseErrors(value: {
  readonly id: string;
  readonly schemaVersion: number;
  readonly version: string;
  readonly displayName: string;
  readonly source: LibrarySource;
}): LibraryError[] {
  const errors: LibraryError[] = [];
  if (!REGISTERED_TYPE_ID_PATTERN.test(value.id))
    errors.push(
      invalid("invalid-id", "Definition ID must be namespaced.", "id"),
    );
  if (!Number.isSafeInteger(value.schemaVersion) || value.schemaVersion < 1)
    errors.push(
      invalid(
        "invalid-schema-version",
        "Schema version must be a positive safe integer.",
        "schemaVersion",
      ),
    );
  if (!value.version.trim())
    errors.push(invalid("invalid-version", "Version is required.", "version"));
  if (!value.displayName.trim())
    errors.push(
      invalid(
        "invalid-display-name",
        "Display name is required.",
        "displayName",
      ),
    );
  if (!validSource(value.source))
    errors.push(
      invalid(
        "invalid-source",
        "Library source and plugin identity are inconsistent.",
        "source",
      ),
    );
  if (!isJsonValue(value))
    errors.push(
      invalid(
        "non-json-definition",
        "Declarative definitions must contain JSON-safe values only.",
        "",
      ),
    );
  return errors;
}

function uniqueNonEmpty(values: readonly string[]): boolean {
  return values.every((value) => value.trim().length > 0) && !duplicate(values);
}

export function validateLibraryItem(
  item: LibraryItemDefinition,
): readonly LibraryError[] {
  const errors = baseErrors(item);
  const tagGroups = [
    item.domainTags,
    item.curriculumTags,
    item.topicTags,
    item.searchTags,
    item.physicalQuantityTags,
    item.exampleIds,
  ];
  if (tagGroups.some((values) => !uniqueNonEmpty(values)))
    errors.push(
      invalid(
        "invalid-tags",
        "Tags and example IDs must be non-empty and unique.",
        "tags",
        item.id,
      ),
    );
  if (item.exampleIds.length === 0)
    errors.push(
      invalid(
        "missing-example",
        "Every public Library item must declare an example.",
        "exampleIds",
        item.id,
      ),
    );
  if (!item.description.trim() || !item.requiredCoreRange.trim())
    errors.push(
      invalid(
        "missing-description-or-core-range",
        "Description and required core range are required.",
        "description",
        item.id,
      ),
    );
  if (!item.thumbnail.altText.trim() || !item.thumbnail.uri.trim())
    errors.push(
      invalid(
        "invalid-thumbnail",
        "Thumbnail URI and alt text are required.",
        "thumbnail",
        item.id,
      ),
    );
  if (!item.license.spdxId.trim())
    errors.push(
      invalid(
        "missing-license",
        "License metadata is required.",
        "license.spdxId",
        item.id,
      ),
    );
  const anchorIds = item.anchors.map(({ id }) => id);
  const portIds = item.ports.map(({ id }) => id);
  if (
    !uniqueNonEmpty(anchorIds) ||
    !anchorIds.every((id) => LOCAL_ID_PATTERN.test(id))
  )
    errors.push(
      invalid(
        "invalid-anchors",
        "Anchor IDs must be unique semantic local IDs.",
        "anchors",
        item.id,
      ),
    );
  if (
    !uniqueNonEmpty(portIds) ||
    !portIds.every((id) => LOCAL_ID_PATTERN.test(id))
  )
    errors.push(
      invalid(
        "invalid-ports",
        "Port IDs must be unique semantic local IDs.",
        "ports",
        item.id,
      ),
    );
  for (const [index, anchor] of item.anchors.entries()) {
    if (
      ![anchor.position.x, anchor.position.y, anchor.position.z].every(
        Number.isFinite,
      )
    )
      errors.push(
        invalid(
          "non-finite-anchor",
          "Anchor positions must be finite.",
          `anchors[${index}].position`,
          item.id,
        ),
      );
  }
  for (const [index, port] of item.ports.entries()) {
    if (
      !Number.isSafeInteger(port.maximumConnections) ||
      port.maximumConnections < 1 ||
      (port.anchorId !== undefined && !anchorIds.includes(port.anchorId))
    )
      errors.push(
        invalid(
          "invalid-port",
          "Port capacity and anchor reference are invalid.",
          `ports[${index}]`,
          item.id,
        ),
      );
  }
  for (const target of item.compatibleTargets) {
    if (
      target.kind === "port-type" &&
      (!Number.isSafeInteger(target.minimumCount) ||
        !Number.isSafeInteger(target.maximumCount) ||
        target.minimumCount < 0 ||
        target.maximumCount < target.minimumCount)
    )
      errors.push(
        invalid(
          "invalid-target-count",
          "Compatible target port counts are invalid.",
          "compatibleTargets",
          item.id,
        ),
      );
  }
  return Object.freeze(errors);
}

function snapshotIds(definition: PrefabDefinition): readonly string[] {
  const snapshot = definition.snapshot;
  return [
    snapshot.templateSceneId,
    ...snapshot.assets.map(({ id }) => id),
    ...snapshot.datasets.map(({ id }) => id),
    ...snapshot.entityDefinitions.flatMap((entity) => [
      entity.id,
      ...entity.componentInstances.map(({ instanceId }) => instanceId),
    ]),
    ...snapshot.systemDefinitions.map(({ id }) => id),
    ...snapshot.clockDefinitions.map(({ id }) => id),
    ...snapshot.eventDefinitions.map(({ id }) => id),
    ...snapshot.relationshipDefinitions.map(({ id }) => id),
    ...snapshot.representations.map(({ id }) => id),
    ...snapshot.controls.map(({ id }) => id),
    ...snapshot.equationDefinitions.map(({ id }) => id),
    ...snapshot.graphDefinitions.map(({ id }) => id),
  ];
}

export function validatePrefab(
  definition: PrefabDefinition,
): readonly LibraryError[] {
  const errors = baseErrors(definition);
  if (
    !uniqueNonEmpty(definition.exampleIds) ||
    definition.exampleIds.length === 0
  )
    errors.push(
      invalid(
        "missing-example",
        "Every prefab must declare an example.",
        "exampleIds",
        definition.id,
      ),
    );
  const slotIds = definition.targetSlots.map(({ id }) => id);
  if (
    !uniqueNonEmpty(slotIds) ||
    !slotIds.every((id) => LOCAL_ID_PATTERN.test(id))
  )
    errors.push(
      invalid(
        "invalid-target-slots",
        "Target slot IDs must be unique semantic local IDs.",
        "targetSlots",
        definition.id,
      ),
    );
  const ids = snapshotIds(definition);
  if (duplicate(ids))
    errors.push(
      invalid(
        "duplicate-template-id",
        "Prefab template identities must be globally unique.",
        "snapshot",
        definition.id,
      ),
    );
  return Object.freeze(errors);
}

export function validateInstrument(
  definition: InstrumentDefinition,
): readonly LibraryError[] {
  const errors = baseErrors(definition);
  if (
    !uniqueNonEmpty(definition.exampleIds) ||
    definition.exampleIds.length === 0
  )
    errors.push(
      invalid(
        "missing-example",
        "Every instrument must declare an example.",
        "exampleIds",
        definition.id,
      ),
    );
  for (const [index, requirement] of definition.portRequirements.entries()) {
    if (
      !requirement.role.trim() ||
      requirement.compatiblePortTypeIds.length === 0 ||
      !Number.isSafeInteger(requirement.minimumCount) ||
      !Number.isSafeInteger(requirement.maximumCount) ||
      requirement.minimumCount < 0 ||
      requirement.maximumCount < requirement.minimumCount
    )
      errors.push(
        invalid(
          "invalid-port-requirement",
          "Instrument port requirements are invalid.",
          `portRequirements[${index}]`,
          definition.id,
        ),
      );
  }
  return Object.freeze(errors);
}

export function validateMaterialPreset(
  definition: MaterialPresetDefinition,
): readonly LibraryError[] {
  const errors = baseErrors(definition);
  if (
    !uniqueNonEmpty(definition.exampleIds) ||
    definition.exampleIds.length === 0
  )
    errors.push(
      invalid(
        "missing-example",
        "Every material preset must declare an example.",
        "exampleIds",
        definition.id,
      ),
    );
  const ids = definition.properties.map(({ propertyId }) => propertyId);
  if (duplicate(ids))
    errors.push(
      invalid(
        "duplicate-property",
        "Material property IDs must be unique.",
        "properties",
        definition.id,
      ),
    );
  for (const [index, property] of definition.properties.entries()) {
    if (
      !PROPERTY_ID_PATTERN.test(property.propertyId) ||
      !Number.isFinite(property.value) ||
      !property.unitId.trim() ||
      !property.reference.trim() ||
      (property.uncertainty !== undefined &&
        (!Number.isFinite(property.uncertainty) || property.uncertainty < 0))
    )
      errors.push(
        invalid(
          "invalid-material-property",
          "Material property identity, value, unit or reference is invalid.",
          `properties[${index}]`,
          definition.id,
        ),
      );
  }
  return Object.freeze(errors);
}
