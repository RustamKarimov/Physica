import type {
  IdFactory,
  ProjectDocument,
  Result,
  ValidationReport,
} from "@physica/core-model";
import type {
  Command,
  CommandContext,
  CommandError,
  CommandTransaction,
  DocumentChange,
} from "./command";
import type { CommandRegistry } from "./command-registry";

export interface TransactionApplyResult {
  readonly document: ProjectDocument;
  readonly inverse: readonly Command<unknown>[];
  readonly changes: readonly DocumentChange[];
}

export type DocumentValidator = (document: ProjectDocument) => ValidationReport;

export function applyCommandSequence(
  document: ProjectDocument,
  commands: readonly Command<unknown>[],
  registry: CommandRegistry,
  idFactory: IdFactory,
  validateFinalDocument?: DocumentValidator,
): Result<TransactionApplyResult, CommandError> {
  const context: CommandContext = { idFactory };
  let intermediate = document;
  const inverses: Command<unknown>[] = [];
  const changes: DocumentChange[] = [];

  for (const currentCommand of commands) {
    const applied = registry.apply(intermediate, currentCommand, context);
    if (!applied.ok) return applied;
    intermediate = applied.value.document;
    inverses.unshift(applied.value.inverse);
    changes.push(...applied.value.changes);
  }

  const validation = validateFinalDocument?.(intermediate);
  if (validation?.hasErrors) {
    return {
      ok: false,
      error: {
        kind: "document-validation-failed",
        message: "The transaction would publish an invalid ProjectDocument.",
        validation,
      },
    };
  }

  return {
    ok: true,
    value: {
      document: intermediate,
      inverse: inverses,
      changes,
    },
  };
}

export function transaction(
  idFactory: IdFactory,
  commands: readonly Command<unknown>[],
  label?: string,
): CommandTransaction {
  return {
    id: idFactory.transactionId(),
    commands,
    ...(label === undefined ? {} : { label }),
  };
}
