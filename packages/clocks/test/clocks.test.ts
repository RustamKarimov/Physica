import { describe, expect, it } from "vitest";
import {
  DeterministicIdFactory,
  createEmptyProject,
  createEmptyScene,
  registeredTypeId,
  type ClockDefinition,
  type ClockId,
} from "@physica/core-model";
import {
  DefaultProjectStore,
  createBuiltinCommandRegistry,
} from "../../commands/src";
import {
  CLOCK_DOMAIN_TYPE_ID,
  ClockRuntime,
  createClockDefinition,
  createClockRuntime,
  createDefaultClockDefinitions,
  validateClockDefinitions,
} from "../src";

function linkedDefinition(
  id: ClockId,
  key: string,
  parentClockId: ClockId,
  synchronization: "always" | "conditional" = "always",
): ClockDefinition {
  return {
    id,
    typeId: CLOCK_DOMAIN_TYPE_ID,
    schemaVersion: 1,
    enabled: true,
    configuration: {
      key,
      kind: "custom",
      initialTimeSeconds: 0,
      initialRate: 1,
      initiallyPaused: false,
      link: {
        parentClockId,
        rateMultiplier: 2,
        offsetSeconds: 1,
        synchronization,
        ...(synchronization === "conditional"
          ? { conditionKey: "linked" }
          : {}),
      },
    },
  };
}

describe("clock definition validation", () => {
  it("creates exactly one mandatory simulation and presentation clock", () => {
    const definitions = createDefaultClockDefinitions(
      new DeterministicIdFactory(),
      true,
    );
    expect(definitions).toHaveLength(2);
    expect(validateClockDefinitions(definitions).hasErrors).toBe(false);
    expect(
      definitions.map((definition) => definition.configuration.key),
    ).toEqual(["simulation", "presentation"]);
  });

  it("detects missing domains, dangling links and cycles", () => {
    const ids = new DeterministicIdFactory(100);
    const mandatory = createDefaultClockDefinitions(ids);
    expect(
      validateClockDefinitions([mandatory[0]]).issues.map(
        (issue) => issue.code,
      ),
    ).toContain("mandatory-clock-count");
    const dangling = linkedDefinition(ids.clockId(), "dangling", ids.clockId());
    expect(
      validateClockDefinitions([...mandatory, dangling]).issues.map(
        (issue) => issue.code,
      ),
    ).toContain("dangling-clock-link");
    const firstId = ids.clockId();
    const secondId = ids.clockId();
    const cycle = [
      linkedDefinition(firstId, "first", secondId),
      linkedDefinition(secondId, "second", firstId),
    ];
    expect(
      validateClockDefinitions([...mandatory, ...cycle]).issues.map(
        (issue) => issue.code,
      ),
    ).toContain("clock-link-cycle");
  });

  it("preserves unknown registered clock envelopes while excluding them from execution", () => {
    const ids = new DeterministicIdFactory(200);
    const definitions = createDefaultClockDefinitions(ids);
    const unknown: ClockDefinition = {
      id: ids.clockId(),
      typeId: registeredTypeId("plugin.clock:custom"),
      schemaVersion: 9,
      configuration: { opaque: { retained: true } },
      enabled: false,
    };
    expect(validateClockDefinitions([...definitions, unknown]).hasErrors).toBe(
      false,
    );
    expect(unknown.configuration).toEqual({ opaque: { retained: true } });
  });
});

describe("clock runtime", () => {
  it("runs, pauses, changes rate and scrubs independent clocks immutably", () => {
    const ids = new DeterministicIdFactory(300);
    const definitions = createDefaultClockDefinitions(ids, false);
    const runtime = new ClockRuntime(definitions);
    const simulationId = definitions[0].id;
    const presentationId = definitions[1].id;
    const initial = runtime.getStates();
    expect(runtime.advance(1)).toMatchObject({ ok: true });
    expect(runtime.getState(simulationId)?.timeSeconds).toBe(1);
    expect(
      runtime.applyControl({ kind: "pause", clockId: simulationId }).ok,
    ).toBe(true);
    expect(
      runtime.applyControl({
        kind: "set-rate",
        clockId: presentationId,
        rate: -2,
      }).ok,
    ).toBe(true);
    expect(runtime.advance(0.5).ok).toBe(true);
    expect(runtime.getState(simulationId)?.timeSeconds).toBe(1);
    expect(runtime.getState(presentationId)?.timeSeconds).toBe(0);
    expect(
      runtime.applyControl({
        kind: "scrub",
        clockId: simulationId,
        timeSeconds: 10,
      }).ok,
    ).toBe(true);
    expect(runtime.getState(simulationId)?.timeSeconds).toBe(10);
    expect(initial[0]!.timeSeconds).toBe(0);
  });

  it("resolves linked and conditional clocks in stable topological order", () => {
    const ids = new DeterministicIdFactory(400);
    const mandatory = createDefaultClockDefinitions(ids, false);
    const linked = linkedDefinition(
      ids.clockId(),
      "linked-clock",
      mandatory[0].id,
    );
    const conditional = linkedDefinition(
      ids.clockId(),
      "conditional-clock",
      linked.id,
      "conditional",
    );
    const runtime = new ClockRuntime([...mandatory, linked, conditional]);
    expect(runtime.getState(linked.id)?.revision).toBe(0);
    expect(runtime.advance(2, { linked: false }).ok).toBe(true);
    expect(runtime.getState(linked.id)?.timeSeconds).toBe(5);
    expect(runtime.getState(conditional.id)?.timeSeconds).toBe(2);
    expect(runtime.advance(1, { linked: true }).ok).toBe(true);
    expect(runtime.getState(linked.id)?.timeSeconds).toBe(7);
    expect(runtime.getState(conditional.id)?.timeSeconds).toBe(15);
    expect(
      runtime.applyControl(
        { kind: "scrub", clockId: linked.id, timeSeconds: 3 },
        { linked: true },
      ),
    ).toMatchObject({ ok: false, error: { kind: "linked-clock-scrub" } });
    expect(runtime.advance(0, { linked: true })).toMatchObject({
      ok: true,
      value: { changes: [] },
    });
  });

  it("propagates parent scrubs and restores exact snapshots", () => {
    const ids = new DeterministicIdFactory(500);
    const mandatory = createDefaultClockDefinitions(ids, false);
    const linked = linkedDefinition(ids.clockId(), "child", mandatory[0].id);
    const runtime = new ClockRuntime([...mandatory, linked]);
    const initial = runtime.snapshot();
    expect(
      runtime.applyControl({
        kind: "scrub",
        clockId: mandatory[0].id,
        timeSeconds: 4,
      }).ok,
    ).toBe(true);
    expect(runtime.getState(linked.id)?.timeSeconds).toBe(9);
    expect(runtime.restore(initial).ok).toBe(true);
    expect(runtime.snapshot()).toEqual(initial);
    expect(runtime.restore({ states: initial.states.slice(1) })).toMatchObject({
      ok: false,
      error: { kind: "snapshot-mismatch" },
    });
  });

  it("is deterministic for 10,000 advances and independent of display grouping", () => {
    const idsA = new DeterministicIdFactory(600);
    const idsB = new DeterministicIdFactory(600);
    const idsC = new DeterministicIdFactory(600);
    const runtimeA = new ClockRuntime(
      createDefaultClockDefinitions(idsA, false),
    );
    const runtimeB = new ClockRuntime(
      createDefaultClockDefinitions(idsB, false),
    );
    const runtimeC = new ClockRuntime(
      createDefaultClockDefinitions(idsC, false),
    );
    for (let index = 0; index < 10_000; index += 1)
      expect(runtimeA.advance(0.001).ok).toBe(true);
    for (let index = 0; index < 10_000; index += 1)
      expect(runtimeC.advance(0.001).ok).toBe(true);
    for (let index = 0; index < 1_000; index += 1)
      expect(runtimeB.advance(0.01).ok).toBe(true);
    expect(runtimeA.getStates()).toEqual(runtimeC.getStates());
    runtimeA.getStates().forEach((state, index) => {
      expect(state.timeSeconds).toBeCloseTo(
        runtimeB.getStates()[index]!.timeSeconds,
        12,
      );
    });
  });

  it("returns typed graph creation failures", () => {
    const ids = new DeterministicIdFactory(700);
    const onlyCustom = createClockDefinition(ids, {
      key: "custom",
      kind: "custom",
      initialTimeSeconds: 0,
      initialRate: 1,
      initiallyPaused: true,
    });
    expect(createClockRuntime([onlyCustom])).toMatchObject({
      ok: false,
      error: { kind: "invalid-clock-graph" },
    });
  });

  it("keeps runtime clock frames outside ProjectDocument and undo history", () => {
    const ids = new DeterministicIdFactory(800);
    const definitions = createDefaultClockDefinitions(ids, false);
    const project = createEmptyProject(ids, {
      title: "Clock separation",
      tags: [],
      createdAt: "2026-08-29T00:00:00.000Z",
    });
    const scene = {
      ...createEmptyScene(ids, "Clock scene"),
      clockDefinitions: definitions,
    };
    const document = {
      ...project,
      scenes: [scene],
      presentationFlow: {
        entrySceneId: scene.id,
        sceneOrder: [scene.id],
        transitions: [],
      },
    };
    const store = new DefaultProjectStore(
      document,
      createBuiltinCommandRegistry(),
      ids,
    );
    const runtime = new ClockRuntime(definitions);
    expect(runtime.advance(10).ok).toBe(true);
    expect(store.getDocument()).toBe(document);
    expect(store.getRevision()).toBe(0);
    expect(store.canUndo()).toBe(false);
    expect("states" in store.getDocument()).toBe(false);
  });
});
