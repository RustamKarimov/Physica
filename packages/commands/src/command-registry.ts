import {
  createValidationReport,
  type JsonObject,
  type ProjectDocument,
  type RegisteredTypeId,
  type Result,
} from "@physica/core-model";
import type {
  Command,
  CommandApplyResult,
  CommandContext,
  CommandError,
  CommandHandler,
} from "./command";

export class CommandRegistry {
  private readonly handlers = new Map<string, CommandHandler<unknown>>();

  register<TPayload>(
    type: RegisteredTypeId,
    handler: CommandHandler<TPayload>,
  ): void {
    if (this.handlers.has(type)) {
      throw new Error(`Command handler is already registered: ${type}`);
    }
    this.handlers.set(type, handler as CommandHandler<unknown>);
  }

  apply(
    document: ProjectDocument,
    command: Command<unknown>,
    context: CommandContext,
  ): Result<CommandApplyResult, CommandError> {
    const handler = this.handlers.get(command.type);
    if (!handler) {
      return {
        ok: false,
        error: {
          kind: "unknown-command",
          message: `No handler is registered for command ${command.type}.`,
          commandId: command.id,
        },
      };
    }

    const issues = handler.validate(document, command);
    if (issues.length > 0) {
      return {
        ok: false,
        error: {
          kind: "command-validation-failed",
          message: `Command ${command.type} failed validation.`,
          commandId: command.id,
          issues,
          validation: createValidationReport(issues),
        },
      };
    }

    try {
      return {
        ok: true,
        value: handler.apply(document, command, context),
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: "command-execution-failed",
          message:
            error instanceof Error
              ? error.message
              : "Command execution failed.",
          commandId: command.id,
        },
      };
    }
  }
}

export type UnknownCommandPayload = JsonObject;
