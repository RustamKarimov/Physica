import {
  registeredTypeId,
  type ClockId,
  type JsonValue,
} from "@physica/core-model";
import { describe, expect, it } from "vitest";
import {
  createRuntimeEvent,
  createRuntimeEventSequence,
  RuntimeEventBuffer,
} from "../src";

const CLOCK = "00000000-0000-4000-8000-000000000001" as ClockId;

function event(sequenceId: number, payload: JsonValue = { value: 1 }) {
  const result = createRuntimeEvent({
    timestampSeconds: 1,
    clockDomain: CLOCK,
    sourceId: "system-a",
    eventType: registeredTypeId("physica:event/test"),
    sequenceId,
    payload,
  });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe("runtime events", () => {
  it("creates immutable JSON-safe event envelopes", () => {
    const result = createRuntimeEvent({
      timestampSeconds: 2.5,
      clockDomain: CLOCK,
      sourceId: "detector",
      eventType: registeredTypeId("physica:event/detected"),
      sequenceId: 3,
      priority: -1,
      payload: { nested: [1, true, null] },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.priority).toBe(-1);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.payload)).toBe(true);
  });

  it("returns typed validation errors for invalid runtime input", () => {
    const result = createRuntimeEvent({
      timestampSeconds: Number.NaN,
      clockDomain: CLOCK,
      sourceId: "source",
      eventType: registeredTypeId("physica:event/test"),
      sequenceId: 0,
      payload: null,
    });
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "invalid-event",
        field: "timestampSeconds",
        message: "Event timestamp must be finite.",
      },
    });
  });

  it("allocates monotonic sequence IDs and exposes replay position", () => {
    const sequenceResult = createRuntimeEventSequence(7);
    if (!sequenceResult.ok) throw new Error(sequenceResult.error.message);
    const sequence = sequenceResult.value;
    expect(sequence.next()).toEqual({ ok: true, value: 7 });
    expect(sequence.next()).toEqual({ ok: true, value: 8 });
    expect(sequence.snapshot()).toBe(9);
  });

  it("reports sequence exhaustion without wrapping", () => {
    const sequenceResult = createRuntimeEventSequence(Number.MAX_SAFE_INTEGER);
    if (!sequenceResult.ok) throw new Error(sequenceResult.error.message);
    const sequence = sequenceResult.value;
    expect(sequence.next()).toEqual({
      ok: false,
      error: {
        kind: "event-sequence-exhausted",
        current: Number.MAX_SAFE_INTEGER,
      },
    });
  });

  it("returns a typed error for an invalid sequence start", () => {
    expect(createRuntimeEventSequence(-1)).toMatchObject({
      ok: false,
      error: { kind: "invalid-event", field: "sequenceId" },
    });
  });

  it("buffers, snapshots, drains and clears without reordering", () => {
    const buffer = new RuntimeEventBuffer();
    buffer.enqueue(event(2));
    buffer.enqueue(event(1));
    expect(buffer.snapshot().map(({ sequenceId }) => sequenceId)).toEqual([
      2, 1,
    ]);
    expect(buffer.drain()).toHaveLength(2);
    expect(buffer.size).toBe(0);
    buffer.enqueue(event(3));
    buffer.clear();
    expect(buffer.snapshot()).toEqual([]);
  });
});
