export interface WaveIssue {
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

export type WaveResult<T> =
  | { readonly ok: true; readonly value: Readonly<T> }
  | { readonly ok: false; readonly issues: readonly WaveIssue[] };

export function waveIssue(
  code: string,
  message: string,
  path?: string,
): WaveIssue {
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

export function validWave<T>(value: T): WaveResult<T> {
  return { ok: true, value: deepFreeze(value) };
}

export function invalidWave<T = never>(...issues: WaveIssue[]): WaveResult<T> {
  return { ok: false, issues: Object.freeze(issues) };
}

export function finiteWaveInputs(
  values: Readonly<Record<string, number>>,
): WaveIssue[] {
  return Object.entries(values)
    .filter(([, value]) => !Number.isFinite(value))
    .map(([path]) =>
      waveIssue("waves.non-finite", `${path} must be finite.`, path),
    );
}
