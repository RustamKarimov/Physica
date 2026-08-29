import type {
  CommandId,
  IdFactory,
  JsonObject,
  ProjectDocument,
  RegisteredTypeId,
  Result,
  TransactionId,
  ValidationIssue,
  ValidationReport,
} from "@physica/core-model";

export interface Command<TPayload = JsonObject> {
  readonly id: CommandId;
  readonly type: RegisteredTypeId;
  readonly label?: string;
  readonly payload: TPayload;
}

export interface CommandContext {
  readonly idFactory: IdFactory;
}

export interface DocumentChange {
  readonly kind: "add" | "remove" | "replace" | "reorder";
  readonly path: string;
  readonly relatedIds: readonly string[];
}

export interface CommandApplyResult {
  readonly document: ProjectDocument;
  readonly inverse: Command<unknown>;
  readonly changes: readonly DocumentChange[];
}

export interface CommandHandler<TPayload = JsonObject> {
  validate(
    document: ProjectDocument,
    command: Command<TPayload>,
  ): readonly ValidationIssue[];
  apply(
    document: ProjectDocument,
    command: Command<TPayload>,
    context: CommandContext,
  ): CommandApplyResult;
}

export interface CommandError {
  readonly kind:
    | "unknown-command"
    | "command-validation-failed"
    | "document-validation-failed"
    | "command-execution-failed"
    | "history-empty";
  readonly message: string;
  readonly commandId?: CommandId;
  readonly validation?: ValidationReport;
  readonly issues?: readonly ValidationIssue[];
}

export type DispatchResult = Result<
  {
    readonly revision: number;
    readonly changes: readonly DocumentChange[];
  },
  CommandError
>;

export interface CommandTransaction {
  readonly id: TransactionId;
  readonly label?: string;
  readonly commands: readonly Command<unknown>[];
}

export interface HistoryEntry {
  readonly transactionId: TransactionId;
  readonly label?: string;
  readonly forward: readonly Command<unknown>[];
  readonly inverse: readonly Command<unknown>[];
}

export function command<TPayload>(
  idFactory: IdFactory,
  type: RegisteredTypeId,
  payload: TPayload,
  label?: string,
): Command<TPayload> {
  return {
    id: idFactory.commandId(),
    type,
    payload,
    ...(label === undefined ? {} : { label }),
  };
}
