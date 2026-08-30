import type {
  CapabilityId,
  DocumentReference,
  RegisteredTypeId,
} from "@physica/core-model";
import {
  libraryError,
  type CompatibleTargetDefinition,
  type LibraryItemClass,
  type LibraryItemDefinition,
  type LibraryResult,
  type LibrarySourceKind,
  type PhysicsLibraryRegistries,
} from "@physica/plugin-sdk";

export interface LibrarySearchQuery {
  readonly text?: string;
  readonly itemClasses?: readonly LibraryItemClass[];
  readonly sources?: readonly LibrarySourceKind[];
  readonly domainTags?: readonly string[];
  readonly curriculumTags?: readonly string[];
  readonly dimensionality?: "2D" | "3D";
}

export interface LibraryTargetContext {
  readonly reference: DocumentReference;
  readonly entityTypeId?: RegisteredTypeId;
  readonly capabilityIds: readonly CapabilityId[];
  readonly anchorTypeIds: readonly RegisteredTypeId[];
  readonly portTypeCounts: Readonly<Record<string, number>>;
  readonly observableKinds: readonly string[];
}

export interface LibraryCompatibility {
  readonly compatible: boolean;
  readonly matchedTargets: readonly CompatibleTargetDefinition[];
  readonly unmetTargets: readonly CompatibleTargetDefinition[];
}

export interface LibraryDragPayload {
  readonly kind: "physica/library-item";
  readonly itemId: RegisteredTypeId;
  readonly version: string;
  readonly sourceKind: LibrarySourceKind;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function targetMatches(
  target: CompatibleTargetDefinition,
  context: LibraryTargetContext,
): boolean {
  switch (target.kind) {
    case "entity-type":
      return context.entityTypeId === target.typeId;
    case "capability":
      return context.capabilityIds.includes(target.capabilityId);
    case "anchor-type":
      return context.anchorTypeIds.includes(target.anchorTypeId);
    case "port-type": {
      const count = context.portTypeCounts[target.portTypeId] ?? 0;
      return count >= target.minimumCount && count <= target.maximumCount;
    }
    case "observable-kind":
      return context.observableKinds.includes(target.valueKind);
    case "dataset":
      return context.reference.kind === "dataset";
  }
}

export class PhysicsLibraryCatalog {
  constructor(readonly registries: PhysicsLibraryRegistries) {}

  validateReferences(): LibraryResult<void> {
    for (const item of this.registries.library.list()) {
      const reference = item.creation;
      const exists =
        reference.kind === "prefab"
          ? this.registries.prefabs.has(reference.definitionId)
          : reference.kind === "instrument"
            ? this.registries.instruments.has(reference.definitionId)
            : this.registries.materials.has(reference.definitionId);
      if (!exists)
        return {
          ok: false,
          error: libraryError(
            "registry-reference-missing",
            "registry-reference-missing",
            "A Library item references a definition that is not registered.",
            { definitionId: item.id, path: "creation.definitionId" },
          ),
        };
    }
    for (const instrument of this.registries.instruments.list()) {
      if (!this.registries.prefabs.has(instrument.prefabId))
        return {
          ok: false,
          error: libraryError(
            "registry-reference-missing",
            "instrument-prefab-missing",
            "An instrument references a prefab that is not registered.",
            { definitionId: instrument.id, path: "prefabId" },
          ),
        };
    }
    return { ok: true, value: undefined };
  }

  get(id: RegisteredTypeId): LibraryResult<LibraryItemDefinition> {
    const item = this.registries.library.get(id);
    return item
      ? { ok: true, value: item }
      : {
          ok: false,
          error: libraryError(
            "missing-registration",
            "library-item-missing",
            "The requested Library item is not registered.",
            { definitionId: id },
          ),
        };
  }

  search(query: LibrarySearchQuery = {}): readonly LibraryItemDefinition[] {
    const text = normalize(query.text ?? "");
    const tokens = text.split(/\s+/u).filter(Boolean);
    return this.registries.library
      .list()
      .filter((item) => {
        if (query.itemClasses && !query.itemClasses.includes(item.itemClass))
          return false;
        if (query.sources && !query.sources.includes(item.source.kind))
          return false;
        if (
          query.domainTags &&
          !query.domainTags.every((tag) => item.domainTags.includes(tag))
        )
          return false;
        if (
          query.curriculumTags &&
          !query.curriculumTags.every((tag) =>
            item.curriculumTags.includes(tag),
          )
        )
          return false;
        if (
          query.dimensionality &&
          item.dimensionality !== "BOTH" &&
          item.dimensionality !== query.dimensionality
        )
          return false;
        const haystack = normalize(
          [
            item.displayName,
            item.description,
            ...item.domainTags,
            ...item.curriculumTags,
            ...item.topicTags,
            ...item.searchTags,
            ...item.physicalQuantityTags,
          ].join(" "),
        );
        return tokens.every((token) => haystack.includes(token));
      })
      .sort((left, right) => {
        if (!text) return left.displayName.localeCompare(right.displayName);
        const leftExact = normalize(left.displayName) === text ? 1 : 0;
        const rightExact = normalize(right.displayName) === text ? 1 : 0;
        return (
          rightExact - leftExact ||
          left.displayName.localeCompare(right.displayName) ||
          left.id.localeCompare(right.id)
        );
      });
  }

  compatibility(
    item: LibraryItemDefinition,
    context: LibraryTargetContext,
  ): LibraryCompatibility {
    const matchedTargets = item.compatibleTargets.filter((target) =>
      targetMatches(target, context),
    );
    const unmetTargets = item.compatibleTargets.filter(
      (target) => !targetMatches(target, context),
    );
    return Object.freeze({
      compatible:
        item.compatibleTargets.length === 0 || matchedTargets.length > 0,
      matchedTargets: Object.freeze(matchedTargets),
      unmetTargets: Object.freeze(unmetTargets),
    });
  }

  dragPayload(item: LibraryItemDefinition): LibraryDragPayload {
    return Object.freeze({
      kind: "physica/library-item",
      itemId: item.id,
      version: item.version,
      sourceKind: item.source.kind,
    });
  }
}
