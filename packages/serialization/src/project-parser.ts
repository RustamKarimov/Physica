import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  createValidationReport,
  validateProjectDocument,
  type JsonObject,
  type ProjectDefinitionRegistry,
  type ProjectDocument,
  type Result,
  type ValidationIssue,
  type ValidationReport,
} from "@physica/core-model";
import type { ZodError } from "zod";
import {
  canonicalParseJson,
  canonicalStringify,
  type CanonicalJsonError,
} from "./canonical-json";
import {
  createProjectMigrationRegistry,
  type MigrationError,
  type ProjectMigrationRegistry,
} from "./migrations";
import { ProjectDocumentSchemaV1 } from "./project-schema-v1";

export interface ParsedProject {
  readonly document: ProjectDocument;
  readonly validation: ValidationReport;
}

export type ProjectLoadError =
  | {
      readonly kind: "InvalidJson";
      readonly message: string;
      readonly details: CanonicalJsonError;
    }
  | {
      readonly kind: "InvalidProjectStructure";
      readonly message: string;
      readonly validation: ValidationReport;
    }
  | {
      readonly kind: "UnsupportedFutureProjectVersion";
      readonly message: string;
      readonly projectVersion: number;
      readonly currentVersion: number;
    }
  | {
      readonly kind: "ProjectMigrationFailed";
      readonly message: string;
      readonly details: MigrationError;
    };

export type ProjectParseResult = Result<ParsedProject, ProjectLoadError>;

function zodIssues(error: ZodError): readonly ValidationIssue[] {
  return error.issues.map((issue) => ({
    code: `schema-${issue.code}`,
    severity: "fatal" as const,
    message: issue.message,
    path: issue.path.length > 0 ? issue.path.join(".") : "$",
    source: "schema" as const,
    recoverable: false,
  }));
}

export interface ParseProjectOptions {
  readonly migrations?: ProjectMigrationRegistry;
  readonly definitions?: ProjectDefinitionRegistry;
}

export function parseProjectJson(
  text: string,
  options: ParseProjectOptions = {},
): ProjectParseResult {
  const parsedJson = canonicalParseJson(text);
  if (!parsedJson.ok) {
    return {
      ok: false,
      error: {
        kind: "InvalidJson",
        message: "Project text is not valid canonical JSON data.",
        details: parsedJson.error,
      },
    };
  }

  if (
    parsedJson.value === null ||
    Array.isArray(parsedJson.value) ||
    typeof parsedJson.value !== "object"
  ) {
    const validation = createValidationReport([
      {
        code: "schema-invalid-root",
        severity: "fatal",
        message: "Project JSON root must be an object.",
        path: "$",
        source: "schema",
        recoverable: false,
      },
    ]);
    return {
      ok: false,
      error: {
        kind: "InvalidProjectStructure",
        message: "Project JSON root is invalid.",
        validation,
      },
    };
  }

  const raw = parsedJson.value as JsonObject;
  const schemaVersion = raw.schemaVersion;
  if (
    typeof schemaVersion === "number" &&
    Number.isInteger(schemaVersion) &&
    schemaVersion > CURRENT_PROJECT_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      error: {
        kind: "UnsupportedFutureProjectVersion",
        message: `Project schema version ${schemaVersion} is newer than supported version ${CURRENT_PROJECT_SCHEMA_VERSION}.`,
        projectVersion: schemaVersion,
        currentVersion: CURRENT_PROJECT_SCHEMA_VERSION,
      },
    };
  }

  const migrationRegistry =
    options.migrations ?? createProjectMigrationRegistry();
  const migration = migrationRegistry.migrateToCurrent(raw);
  if (!migration.ok) {
    if (migration.error.kind === "future-project-version") {
      return {
        ok: false,
        error: {
          kind: "UnsupportedFutureProjectVersion",
          message: migration.error.message,
          projectVersion: migration.error.fromVersion ?? -1,
          currentVersion: CURRENT_PROJECT_SCHEMA_VERSION,
        },
      };
    }
    return {
      ok: false,
      error: {
        kind: "ProjectMigrationFailed",
        message: migration.error.message,
        details: migration.error,
      },
    };
  }

  const structural = ProjectDocumentSchemaV1.safeParse(
    migration.value.document,
  );
  if (!structural.success) {
    const validation = createValidationReport(zodIssues(structural.error));
    return {
      ok: false,
      error: {
        kind: "InvalidProjectStructure",
        message: "Project JSON failed V1 structural validation.",
        validation,
      },
    };
  }

  const document = structural.data;
  return {
    ok: true,
    value: {
      document,
      validation: validateProjectDocument(document, options.definitions),
    },
  };
}

export function serializeProjectJson(
  document: ProjectDocument,
): Result<string, CanonicalJsonError> {
  return canonicalStringify(document);
}

export interface ProjectJsonSerializer {
  stringify(document: ProjectDocument): string;
  parse(text: string): ProjectParseResult;
}

export class DefaultProjectJsonSerializer implements ProjectJsonSerializer {
  constructor(private readonly options: ParseProjectOptions = {}) {}

  stringify(document: ProjectDocument): string {
    const result = serializeProjectJson(document);
    if (!result.ok) {
      throw new TypeError(
        `Project document is not JSON-safe: ${result.error.message}`,
      );
    }
    return result.value;
  }

  parse(text: string): ProjectParseResult {
    return parseProjectJson(text, this.options);
  }
}
