import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  type JsonObject,
  type Result,
} from "@physica/core-model";

export interface ProjectMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(input: JsonObject): JsonObject;
}

export interface MigrationSuccess {
  readonly document: JsonObject;
  readonly appliedVersions: readonly number[];
}

export interface MigrationError {
  readonly kind:
    | "invalid-source-version"
    | "future-project-version"
    | "missing-migration"
    | "migration-failed";
  readonly message: string;
  readonly original: JsonObject;
  readonly fromVersion?: number;
  readonly toVersion?: number;
}

export type MigrationResult = Result<MigrationSuccess, MigrationError>;

export interface ProjectMigrationRegistry {
  register(migration: ProjectMigration): void;
  migrateToCurrent(input: JsonObject): MigrationResult;
}

export class DefaultProjectMigrationRegistry implements ProjectMigrationRegistry {
  private readonly migrations = new Map<number, ProjectMigration>();

  constructor(
    private readonly targetVersion: number = CURRENT_PROJECT_SCHEMA_VERSION,
  ) {}

  register(migration: ProjectMigration): void {
    if (
      !Number.isInteger(migration.fromVersion) ||
      migration.fromVersion < 1 ||
      migration.toVersion !== migration.fromVersion + 1
    ) {
      throw new RangeError("Project migrations must be integer n → n+1 steps.");
    }
    if (this.migrations.has(migration.fromVersion)) {
      throw new Error(
        `A migration from version ${migration.fromVersion} is already registered.`,
      );
    }
    this.migrations.set(migration.fromVersion, migration);
  }

  migrateToCurrent(input: JsonObject): MigrationResult {
    const sourceVersion = input.schemaVersion;
    if (!Number.isInteger(sourceVersion) || (sourceVersion as number) < 1) {
      return {
        ok: false,
        error: {
          kind: "invalid-source-version",
          message: "Project schemaVersion must be a positive integer.",
          original: input,
        },
      };
    }

    const numericVersion = sourceVersion as number;
    if (numericVersion > this.targetVersion) {
      return {
        ok: false,
        error: {
          kind: "future-project-version",
          message: `Project version ${numericVersion} is newer than supported version ${this.targetVersion}.`,
          original: input,
          fromVersion: numericVersion,
          toVersion: this.targetVersion,
        },
      };
    }

    let current = input;
    let version = numericVersion;
    const appliedVersions: number[] = [];

    while (version < this.targetVersion) {
      const migration = this.migrations.get(version);
      if (!migration) {
        return {
          ok: false,
          error: {
            kind: "missing-migration",
            message: `No project migration is registered from version ${version}.`,
            original: input,
            fromVersion: version,
            toVersion: version + 1,
          },
        };
      }

      try {
        const migrated = migration.migrate(current);
        if (migrated.schemaVersion !== migration.toVersion) {
          throw new Error(
            `Migration output schemaVersion must be ${migration.toVersion}.`,
          );
        }
        current = migrated;
        version = migration.toVersion;
        appliedVersions.push(version);
      } catch (error) {
        return {
          ok: false,
          error: {
            kind: "migration-failed",
            message:
              error instanceof Error
                ? error.message
                : "Project migration failed.",
            original: input,
            fromVersion: migration.fromVersion,
            toVersion: migration.toVersion,
          },
        };
      }
    }

    return {
      ok: true,
      value: {
        document: current,
        appliedVersions,
      },
    };
  }
}

export function createProjectMigrationRegistry(): ProjectMigrationRegistry {
  return new DefaultProjectMigrationRegistry();
}
