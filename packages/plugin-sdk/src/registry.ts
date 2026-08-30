import type { RegisteredTypeId } from "@physica/core-model";
import { libraryError, type LibraryError, type LibraryResult } from "./errors";
import type {
  InstrumentDefinition,
  LibraryItemDefinition,
  MaterialPresetDefinition,
  PrefabDefinition,
} from "./types";
import {
  validateInstrument,
  validateLibraryItem,
  validateMaterialPreset,
  validatePrefab,
} from "./validation";

type RegistryEntry = {
  readonly id: RegisteredTypeId;
};

type Validator<T> = (entry: T) => readonly LibraryError[];

function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) return Object.freeze(value.map(deepFreeze)) as T;
  if (value !== null && typeof value === "object")
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, deepFreeze(entry)]),
      ),
    ) as T;
  return value;
}

export class DefinitionRegistry<T extends RegistryEntry> {
  private readonly entries = new Map<RegisteredTypeId, T>();

  constructor(private readonly validateDefinition: Validator<T>) {}

  validateMany(entries: readonly T[]): LibraryResult<void> {
    const batchIds = new Set<RegisteredTypeId>();
    for (const entry of entries) {
      const errors = this.validateDefinition(entry);
      if (errors.length > 0) return { ok: false, error: errors[0]! };
      if (batchIds.has(entry.id) || this.entries.has(entry.id))
        return {
          ok: false,
          error: libraryError(
            "duplicate-registration",
            "duplicate-registration",
            `Definition is already registered: ${entry.id}.`,
            { definitionId: entry.id },
          ),
        };
      batchIds.add(entry.id);
    }
    return { ok: true, value: undefined };
  }

  register(entry: T): LibraryResult<T> {
    const validation = this.validateMany([entry]);
    if (!validation.ok) return validation;
    const stored = deepFreeze(entry);
    this.entries.set(stored.id, stored);
    return { ok: true, value: stored };
  }

  registerMany(entries: readonly T[]): LibraryResult<readonly T[]> {
    const validation = this.validateMany(entries);
    if (!validation.ok) return validation;
    const stored = entries.map((entry) => deepFreeze(entry));
    for (const entry of stored) this.entries.set(entry.id, entry);
    return { ok: true, value: Object.freeze(stored) };
  }

  unregister(id: RegisteredTypeId): LibraryResult<T> {
    const entry = this.entries.get(id);
    if (!entry)
      return {
        ok: false,
        error: libraryError(
          "missing-registration",
          "missing-registration",
          `Definition is not registered: ${id}.`,
          { definitionId: id },
        ),
      };
    this.entries.delete(id);
    return { ok: true, value: entry };
  }

  get(id: RegisteredTypeId): T | undefined {
    return this.entries.get(id);
  }

  has(id: RegisteredTypeId): boolean {
    return this.entries.has(id);
  }

  list(): readonly T[] {
    return Object.freeze(
      [...this.entries.values()].sort((left, right) =>
        left.id.localeCompare(right.id),
      ),
    );
  }
}

export class LibraryRegistry extends DefinitionRegistry<LibraryItemDefinition> {
  constructor() {
    super(validateLibraryItem);
  }
}

export class PrefabRegistry extends DefinitionRegistry<PrefabDefinition> {
  constructor() {
    super(validatePrefab);
  }
}

export class InstrumentRegistry extends DefinitionRegistry<InstrumentDefinition> {
  constructor() {
    super(validateInstrument);
  }
}

export class MaterialPresetRegistry extends DefinitionRegistry<MaterialPresetDefinition> {
  constructor() {
    super(validateMaterialPreset);
  }
}

export interface PhysicsLibraryRegistries {
  readonly library: LibraryRegistry;
  readonly prefabs: PrefabRegistry;
  readonly instruments: InstrumentRegistry;
  readonly materials: MaterialPresetRegistry;
}

export function createPhysicsLibraryRegistries(): PhysicsLibraryRegistries {
  return Object.freeze({
    library: new LibraryRegistry(),
    prefabs: new PrefabRegistry(),
    instruments: new InstrumentRegistry(),
    materials: new MaterialPresetRegistry(),
  });
}
