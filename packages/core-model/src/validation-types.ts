export type ValidationSeverity = "fatal" | "error" | "warning" | "info";

export interface ValidationIssue {
  readonly code: string;
  readonly severity: ValidationSeverity;
  readonly message: string;
  readonly path?: string;
  readonly source:
    "schema" | "reference" | "capability" | "authority" | "plugin" | "semantic";
  readonly recoverable: boolean;
  readonly relatedIds?: readonly string[];
}

export interface ValidationReport {
  readonly issues: readonly ValidationIssue[];
  readonly hasFatal: boolean;
  readonly hasErrors: boolean;
}

export function createValidationReport(
  issues: readonly ValidationIssue[],
): ValidationReport {
  return {
    issues,
    hasFatal: issues.some((issue) => issue.severity === "fatal"),
    hasErrors: issues.some(
      (issue) => issue.severity === "fatal" || issue.severity === "error",
    ),
  };
}
