export interface ThermalIssue {
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

export type ThermalResult<T> =
  | { readonly ok: true; readonly value: Readonly<T> }
  | { readonly ok: false; readonly issues: readonly ThermalIssue[] };

export function thermalIssue(
  code: string,
  message: string,
  path?: string,
): ThermalIssue {
  return Object.freeze({
    severity: "error",
    code,
    message,
    ...(path === undefined ? {} : { path }),
  });
}

export function validThermal<T>(value: T): ThermalResult<T> {
  return { ok: true, value: deepFreeze(value) };
}

export function invalidThermal<T = never>(
  ...issues: ThermalIssue[]
): ThermalResult<T> {
  return { ok: false, issues: Object.freeze(issues) };
}

export function finiteThermalIssue(
  values: Readonly<Record<string, number>>,
): ThermalIssue | undefined {
  const invalid = Object.entries(values).find(
    ([, value]) => !Number.isFinite(value),
  );
  return invalid
    ? thermalIssue(
        "thermal.non-finite",
        invalid[0] + " must be finite.",
        invalid[0],
      )
    : undefined;
}

export function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
  }
  return value;
}
