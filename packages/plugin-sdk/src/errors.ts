import type { RegisteredTypeId, Result } from "@physica/core-model";

export interface LibraryError {
  readonly kind:
    | "invalid-definition"
    | "duplicate-registration"
    | "missing-registration"
    | "registry-reference-missing"
    | "plugin-namespace-mismatch"
    | "plugin-version-conflict"
    | "dependency-missing"
    | "incompatible-target"
    | "incomplete-target"
    | "invalid-prefab-snapshot"
    | "identity-collision"
    | "instantiation-failed"
    | "invalid-my-library-manifest"
    | "unsupported-manifest-version";
  readonly code: string;
  readonly message: string;
  readonly definitionId?: RegisteredTypeId;
  readonly path?: string;
}

export type LibraryResult<T> = Result<T, LibraryError>;

export function libraryError(
  kind: LibraryError["kind"],
  code: string,
  message: string,
  options: {
    readonly definitionId?: RegisteredTypeId;
    readonly path?: string;
  } = {},
): LibraryError {
  return Object.freeze({ kind, code, message, ...options });
}
