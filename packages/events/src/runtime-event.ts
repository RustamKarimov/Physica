import {
  isJsonValue,
  type ClockId,
  type JsonValue,
  type RegisteredTypeId,
  type Result,
} from "@physica/core-model";

export interface RuntimeEvent<TPayload extends JsonValue = JsonValue> {
  readonly timestampSeconds: number;
  readonly clockDomain: ClockId;
  readonly sourceId: string;
  readonly eventType: RegisteredTypeId;
  readonly sequenceId: number;
  readonly priority: number;
  readonly payload: TPayload;
}

export type EventError =
  | {
      readonly kind: "invalid-event";
      readonly message: string;
      readonly field: keyof RuntimeEvent;
    }
  | { readonly kind: "event-sequence-exhausted"; readonly current: number };

export type EventResult<T> = Result<T, EventError>;

export interface RuntimeEventInput<TPayload extends JsonValue = JsonValue> {
  readonly timestampSeconds: number;
  readonly clockDomain: ClockId;
  readonly sourceId: string;
  readonly eventType: RegisteredTypeId;
  readonly sequenceId: number;
  readonly priority?: number;
  readonly payload: TPayload;
}

function cloneJson<T extends JsonValue>(value: T): T {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => cloneJson(entry))) as T;
  }
  if (value !== null && typeof value === "object") {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, cloneJson(entry)]),
      ),
    ) as T;
  }
  return value;
}

function invalid(
  field: keyof RuntimeEvent,
  message: string,
): EventResult<never> {
  return { ok: false, error: { kind: "invalid-event", field, message } };
}

export function createRuntimeEvent<TPayload extends JsonValue>(
  input: RuntimeEventInput<TPayload>,
): EventResult<RuntimeEvent<TPayload>> {
  if (!Number.isFinite(input.timestampSeconds))
    return invalid("timestampSeconds", "Event timestamp must be finite.");
  if (typeof input.clockDomain !== "string" || input.clockDomain.length === 0)
    return invalid("clockDomain", "Event clock domain must be non-empty.");
  if (input.sourceId.length === 0)
    return invalid("sourceId", "Event source ID must be non-empty.");
  if (typeof input.eventType !== "string" || input.eventType.length === 0)
    return invalid("eventType", "Event type must be non-empty.");
  if (!Number.isSafeInteger(input.sequenceId) || input.sequenceId < 0)
    return invalid(
      "sequenceId",
      "Event sequence ID must be a non-negative safe integer.",
    );
  const priority = input.priority ?? 0;
  if (!Number.isSafeInteger(priority))
    return invalid("priority", "Event priority must be a safe integer.");
  if (!isJsonValue(input.payload))
    return invalid("payload", "Event payload must be a finite JSON value.");

  return {
    ok: true,
    value: Object.freeze({
      timestampSeconds: input.timestampSeconds,
      clockDomain: input.clockDomain,
      sourceId: input.sourceId,
      eventType: input.eventType,
      sequenceId: input.sequenceId,
      priority,
      payload: cloneJson(input.payload),
    }),
  };
}

export class RuntimeEventSequence {
  private nextValue: number;

  private constructor(initialValue: number) {
    this.nextValue = initialValue;
  }

  static create(initialValue = 0): EventResult<RuntimeEventSequence> {
    return !Number.isSafeInteger(initialValue) || initialValue < 0
      ? invalid(
          "sequenceId",
          "Runtime event sequence must start at a non-negative safe integer.",
        )
      : { ok: true, value: new RuntimeEventSequence(initialValue) };
  }

  next(): EventResult<number> {
    if (this.nextValue === Number.MAX_SAFE_INTEGER)
      return {
        ok: false,
        error: {
          kind: "event-sequence-exhausted",
          current: this.nextValue,
        },
      };
    const value = this.nextValue;
    this.nextValue += 1;
    return { ok: true, value };
  }

  snapshot(): number {
    return this.nextValue;
  }
}

export function createRuntimeEventSequence(
  initialValue = 0,
): EventResult<RuntimeEventSequence> {
  return RuntimeEventSequence.create(initialValue);
}

export class RuntimeEventBuffer {
  private events: RuntimeEvent[] = [];

  enqueue(event: RuntimeEvent): void {
    this.events.push(event);
  }

  snapshot(): readonly RuntimeEvent[] {
    return Object.freeze([...this.events]);
  }

  drain(): readonly RuntimeEvent[] {
    const drained = this.snapshot();
    this.events = [];
    return drained;
  }

  clear(): void {
    this.events = [];
  }

  get size(): number {
    return this.events.length;
  }
}
