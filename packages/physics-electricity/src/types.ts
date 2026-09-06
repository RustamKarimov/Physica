export interface ElectricityIssue {
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

export type ElectricityResult<T> =
  | { readonly ok: true; readonly value: Readonly<T> }
  | { readonly ok: false; readonly issues: readonly ElectricityIssue[] };

export function electricityIssue(
  code: string,
  message: string,
  path?: string,
): ElectricityIssue {
  return Object.freeze({
    severity: "error" as const,
    code,
    message,
    ...(path === undefined ? {} : { path }),
  });
}

export function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
  }
  return value;
}

export function validElectricity<T>(value: T): ElectricityResult<T> {
  return { ok: true, value: deepFreeze(value) };
}

export function invalidElectricity<T = never>(
  ...issues: ElectricityIssue[]
): ElectricityResult<T> {
  return { ok: false, issues: Object.freeze(issues) };
}

export function finiteElectricityInputs(
  values: Readonly<Record<string, number>>,
): ElectricityIssue[] {
  return Object.entries(values)
    .filter(([, value]) => !Number.isFinite(value))
    .map(([path]) =>
      electricityIssue(
        "electricity.non-finite",
        `${path} must be finite.`,
        path,
      ),
    );
}
