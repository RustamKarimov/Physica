import {
  validateProjectDocument,
  type IdFactory,
  type ProjectDefinitionRegistry,
  type ProjectDocument,
  type ValidationReport,
} from "@physica/core-model";
import type {
  Command,
  CommandError,
  CommandTransaction,
  DispatchResult,
  DocumentChange,
} from "./command";
import type { CommandRegistry } from "./command-registry";
import type { StoreHistoryEntry } from "./history";
import {
  applyCommandSequence,
  transaction,
  type DocumentValidator,
} from "./transaction";

export interface ProjectStoreChange {
  readonly document: ProjectDocument;
  readonly revision: number;
  readonly changes: readonly DocumentChange[];
}

export type ProjectStoreListener = (change: ProjectStoreChange) => void;
export type Unsubscribe = () => void;

export interface ReplaceDocumentOptions {
  readonly markSaved?: boolean;
}

export interface ProjectStoreOptions {
  readonly definitionRegistry?: ProjectDefinitionRegistry;
  readonly validateDocument?: DocumentValidator;
}

export interface ProjectStore {
  getDocument(): ProjectDocument;
  getRevision(): number;
  dispatch(command: Command<unknown>): DispatchResult;
  dispatchTransaction(transaction: CommandTransaction): DispatchResult;
  undo(): DispatchResult;
  redo(): DispatchResult;
  canUndo(): boolean;
  canRedo(): boolean;
  subscribe(listener: ProjectStoreListener): Unsubscribe;
  validate(): ValidationReport;
  replaceDocument(
    document: ProjectDocument,
    options?: ReplaceDocumentOptions,
  ): void;
  markSaved(): void;
  isDirty(): boolean;
}

export class DefaultProjectStore implements ProjectStore {
  private document: ProjectDocument;
  private revision = 0;
  private readonly listeners = new Set<ProjectStoreListener>();
  private history: StoreHistoryEntry[] = [];
  private historyPosition = 0;
  private nextToken = 1;
  private currentToken = 0;
  private savedToken: number | null = 0;
  private readonly validateDocument: DocumentValidator;

  constructor(
    document: ProjectDocument,
    private readonly registry: CommandRegistry,
    private readonly idFactory: IdFactory,
    options: ProjectStoreOptions = {},
  ) {
    this.document = document;
    this.validateDocument =
      options.validateDocument ??
      ((candidate) =>
        validateProjectDocument(candidate, options.definitionRegistry));
  }

  getDocument(): ProjectDocument {
    return this.document;
  }

  getRevision(): number {
    return this.revision;
  }

  dispatch(currentCommand: Command<unknown>): DispatchResult {
    return this.dispatchTransaction(
      transaction(this.idFactory, [currentCommand], currentCommand.label),
    );
  }

  dispatchTransaction(currentTransaction: CommandTransaction): DispatchResult {
    const applied = applyCommandSequence(
      this.document,
      currentTransaction.commands,
      this.registry,
      this.idFactory,
      this.validateDocument,
    );
    if (!applied.ok) return applied;

    if (this.historyPosition < this.history.length) {
      this.history = this.history.slice(0, this.historyPosition);
    }

    const afterToken = this.nextToken++;
    this.history.push({
      transactionId: currentTransaction.id,
      ...(currentTransaction.label === undefined
        ? {}
        : { label: currentTransaction.label }),
      forward: currentTransaction.commands,
      inverse: applied.value.inverse,
      beforeToken: this.currentToken,
      afterToken,
    });
    this.historyPosition = this.history.length;
    this.currentToken = afterToken;
    return this.publish(applied.value.document, applied.value.changes);
  }

  undo(): DispatchResult {
    if (!this.canUndo())
      return this.historyError("There is no transaction to undo.");
    const entry = this.history[this.historyPosition - 1]!;
    const applied = applyCommandSequence(
      this.document,
      entry.inverse,
      this.registry,
      this.idFactory,
      this.validateDocument,
    );
    if (!applied.ok) return applied;
    this.historyPosition -= 1;
    this.currentToken = entry.beforeToken;
    return this.publish(applied.value.document, applied.value.changes);
  }

  redo(): DispatchResult {
    if (!this.canRedo())
      return this.historyError("There is no transaction to redo.");
    const entry = this.history[this.historyPosition]!;
    const applied = applyCommandSequence(
      this.document,
      entry.forward,
      this.registry,
      this.idFactory,
      this.validateDocument,
    );
    if (!applied.ok) return applied;
    this.historyPosition += 1;
    this.currentToken = entry.afterToken;
    return this.publish(applied.value.document, applied.value.changes);
  }

  canUndo(): boolean {
    return this.historyPosition > 0;
  }

  canRedo(): boolean {
    return this.historyPosition < this.history.length;
  }

  subscribe(listener: ProjectStoreListener): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  validate(): ValidationReport {
    return this.validateDocument(this.document);
  }

  replaceDocument(
    document: ProjectDocument,
    options: ReplaceDocumentOptions = {},
  ): void {
    this.history = [];
    this.historyPosition = 0;
    this.currentToken = this.nextToken++;
    this.savedToken = (options.markSaved ?? true) ? this.currentToken : null;
    this.publish(document, [
      { kind: "replace", path: "", relatedIds: [document.projectId] },
    ]);
  }

  markSaved(): void {
    this.savedToken = this.currentToken;
  }

  isDirty(): boolean {
    return this.savedToken !== this.currentToken;
  }

  private publish(
    document: ProjectDocument,
    changes: readonly DocumentChange[],
  ): DispatchResult {
    this.document = document;
    this.revision += 1;
    const change: ProjectStoreChange = {
      document,
      revision: this.revision,
      changes,
    };
    for (const listener of this.listeners) listener(change);
    return { ok: true, value: { revision: this.revision, changes } };
  }

  private historyError(message: string): DispatchResult {
    const error: CommandError = { kind: "history-empty", message };
    return { ok: false, error };
  }
}
