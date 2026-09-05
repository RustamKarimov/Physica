export interface OpticsIssue {
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

export type OpticsResult<T> =
  | { readonly ok: true; readonly value: Readonly<T> }
  | { readonly ok: false; readonly issues: readonly OpticsIssue[] };

export function opticsIssue(
  code: string,
  message: string,
  path?: string,
): OpticsIssue {
  return Object.freeze({
    severity: "error" as const,
    code,
    message,
    ...(path === undefined ? {} : { path }),
  });
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
  }
  return value;
}

export function validOptics<T>(value: T): OpticsResult<T> {
  return { ok: true, value: deepFreeze(value) };
}

export function invalidOptics<T = never>(
  ...issues: OpticsIssue[]
): OpticsResult<T> {
  return { ok: false, issues: Object.freeze(issues) };
}

export function finiteOpticsInputs(
  values: Readonly<Record<string, number>>,
): OpticsIssue[] {
  return Object.entries(values)
    .filter(([, value]) => !Number.isFinite(value))
    .map(([path]) =>
      opticsIssue("optics.non-finite", `${path} must be finite.`, path),
    );
}
