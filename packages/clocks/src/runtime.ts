import type { ClockDefinition, ClockId } from "@physica/core-model";
import {
  parseClockDefinition,
  validateClockDefinitions,
  type ClockDomainConfigurationV1,
  type ParsedClockDefinition,
} from "./definitions";

export interface ClockState {
  readonly clockId: ClockId;
  readonly timeSeconds: number;
  readonly rate: number;
  readonly running: boolean;
  readonly revision: number;
}

export interface ClockRuntimeSnapshot {
  readonly states: readonly ClockState[];
}

export type ClockControl =
  | { readonly kind: "run"; readonly clockId: ClockId }
  | { readonly kind: "pause"; readonly clockId: ClockId }
  | {
      readonly kind: "set-rate";
      readonly clockId: ClockId;
      readonly rate: number;
    }
  | {
      readonly kind: "scrub";
      readonly clockId: ClockId;
      readonly timeSeconds: number;
    };

export interface ClockChange {
  readonly clockId: ClockId;
  readonly previousTimeSeconds: number;
  readonly timeSeconds: number;
  readonly previousRevision: number;
  readonly revision: number;
}

export interface ClockAdvanceResult {
  readonly states: readonly ClockState[];
  readonly changes: readonly ClockChange[];
}

export type ClockError =
  | { readonly kind: "invalid-clock-graph"; readonly codes: readonly string[] }
  | { readonly kind: "clock-not-found"; readonly clockId: ClockId }
  | { readonly kind: "invalid-clock-interval"; readonly deltaSeconds: number }
  | { readonly kind: "invalid-clock-control"; readonly message: string }
  | { readonly kind: "linked-clock-scrub"; readonly clockId: ClockId }
  | { readonly kind: "snapshot-mismatch"; readonly message: string };

export type ClockResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ClockError };

function freezeState(state: ClockState): ClockState {
  return Object.freeze({ ...state });
}

function linkActive(
  configuration: ClockDomainConfigurationV1,
  conditions: Readonly<Record<string, boolean>>,
): boolean {
  const link = configuration.link;
  if (!link) return false;
  return (
    link.synchronization === "always" ||
    conditions[link.conditionKey ?? ""] === true
  );
}

export class ClockRuntime {
  private states: Map<ClockId, ClockState>;
  private readonly definitions: readonly ParsedClockDefinition[];
  private readonly byId: ReadonlyMap<ClockId, ParsedClockDefinition>;
  private readonly topological: readonly ClockId[];

  constructor(definitions: readonly ClockDefinition[]) {
    const report = validateClockDefinitions(definitions);
    if (report.hasErrors)
      throw new Error(report.issues.map((issue) => issue.code).join(", "));
    this.definitions = Object.freeze(
      definitions
        .filter((definition) => definition.enabled)
        .map((definition) => {
          const result = parseClockDefinition(definition);
          if (!result.ok)
            throw new Error(
              result.issues.map((issue) => issue.code).join(", "),
            );
          return result.value;
        }),
    );
    this.byId = new Map(
      this.definitions.map((entry) => [entry.definition.id, entry]),
    );
    this.topological = this.createTopologicalOrder();
    this.states = new Map(
      this.definitions.map(({ definition, configuration }) => [
        definition.id,
        freezeState({
          clockId: definition.id,
          timeSeconds: configuration.initialTimeSeconds,
          rate: configuration.initialRate,
          running: !configuration.initiallyPaused,
          revision: 0,
        }),
      ]),
    );
    this.resolveLinkedStates({});
    this.states = new Map(
      [...this.states].map(([id, state]) => [
        id,
        freezeState({ ...state, revision: 0 }),
      ]),
    );
  }

  private createTopologicalOrder(): readonly ClockId[] {
    const result: ClockId[] = [];
    const visited = new Set<ClockId>();
    const visit = (id: ClockId): void => {
      if (visited.has(id)) return;
      const parent = this.byId.get(id)?.configuration.link?.parentClockId;
      if (parent) visit(parent);
      visited.add(id);
      result.push(id);
    };
    this.definitions.forEach((entry) => visit(entry.definition.id));
    return Object.freeze(result);
  }

  getState(clockId: ClockId): ClockState | undefined {
    return this.states.get(clockId);
  }

  getStates(): readonly ClockState[] {
    return Object.freeze(
      this.definitions.map((entry) => this.states.get(entry.definition.id)!),
    );
  }

  private replaceState(
    clockId: ClockId,
    update: Partial<Omit<ClockState, "clockId">>,
  ): void {
    const previous = this.states.get(clockId)!;
    const candidate = { ...previous, ...update };
    const changed =
      candidate.timeSeconds !== previous.timeSeconds ||
      candidate.rate !== previous.rate ||
      candidate.running !== previous.running;
    if (!changed) return;
    this.states.set(
      clockId,
      freezeState({ ...candidate, revision: previous.revision + 1 }),
    );
  }

  private resolveLinkedStates(
    conditions: Readonly<Record<string, boolean>>,
  ): void {
    for (const id of this.topological) {
      const entry = this.byId.get(id)!;
      const link = entry.configuration.link;
      if (!link || !linkActive(entry.configuration, conditions)) continue;
      const parent = this.states.get(link.parentClockId)!;
      this.replaceState(id, {
        timeSeconds:
          link.offsetSeconds + parent.timeSeconds * link.rateMultiplier,
      });
    }
  }

  advance(
    deltaSeconds: number,
    conditions: Readonly<Record<string, boolean>> = {},
  ): ClockResult<ClockAdvanceResult> {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0)
      return {
        ok: false,
        error: { kind: "invalid-clock-interval", deltaSeconds },
      };
    const before = new Map(this.states);
    for (const id of this.topological) {
      const entry = this.byId.get(id)!;
      if (linkActive(entry.configuration, conditions)) continue;
      const state = this.states.get(id)!;
      if (state.running)
        this.replaceState(id, {
          timeSeconds: state.timeSeconds + deltaSeconds * state.rate,
        });
    }
    this.resolveLinkedStates(conditions);
    return { ok: true, value: this.resultSince(before) };
  }

  applyControl(
    control: ClockControl,
    conditions: Readonly<Record<string, boolean>> = {},
  ): ClockResult<ClockAdvanceResult> {
    const current = this.states.get(control.clockId);
    if (!current)
      return {
        ok: false,
        error: { kind: "clock-not-found", clockId: control.clockId },
      };
    const before = new Map(this.states);
    if (control.kind === "run")
      this.replaceState(control.clockId, { running: true });
    if (control.kind === "pause")
      this.replaceState(control.clockId, { running: false });
    if (control.kind === "set-rate") {
      if (!Number.isFinite(control.rate))
        return {
          ok: false,
          error: {
            kind: "invalid-clock-control",
            message: "Clock rate must be finite.",
          },
        };
      this.replaceState(control.clockId, { rate: control.rate });
    }
    if (control.kind === "scrub") {
      if (!Number.isFinite(control.timeSeconds))
        return {
          ok: false,
          error: {
            kind: "invalid-clock-control",
            message: "Scrub time must be finite.",
          },
        };
      const configuration = this.byId.get(control.clockId)!.configuration;
      if (linkActive(configuration, conditions))
        return {
          ok: false,
          error: { kind: "linked-clock-scrub", clockId: control.clockId },
        };
      this.replaceState(control.clockId, { timeSeconds: control.timeSeconds });
    }
    this.resolveLinkedStates(conditions);
    return { ok: true, value: this.resultSince(before) };
  }

  snapshot(): ClockRuntimeSnapshot {
    return Object.freeze({
      states: Object.freeze(
        this.getStates().map((state) => freezeState(state)),
      ),
    });
  }

  validateSnapshot(snapshot: ClockRuntimeSnapshot): ClockResult<void> {
    const expected = new Set(this.states.keys());
    const seen = new Set<ClockId>();
    if (
      snapshot.states.length !== expected.size ||
      snapshot.states.some((state) => {
        const invalid = !expected.has(state.clockId) || seen.has(state.clockId);
        seen.add(state.clockId);
        return invalid;
      }) ||
      [...expected].some((clockId) => !seen.has(clockId))
    )
      return {
        ok: false,
        error: {
          kind: "snapshot-mismatch",
          message: "Snapshot clock IDs do not match the runtime graph.",
        },
      };
    if (
      snapshot.states.some(
        (state) =>
          !Number.isFinite(state.timeSeconds) ||
          !Number.isFinite(state.rate) ||
          !Number.isSafeInteger(state.revision) ||
          state.revision < 0 ||
          typeof state.running !== "boolean",
      )
    )
      return {
        ok: false,
        error: {
          kind: "snapshot-mismatch",
          message: "Snapshot contains invalid state values.",
        },
      };
    return { ok: true, value: undefined };
  }

  restore(snapshot: ClockRuntimeSnapshot): ClockResult<ClockAdvanceResult> {
    const validation = this.validateSnapshot(snapshot);
    if (!validation.ok) return validation;
    const before = new Map(this.states);
    this.states = new Map(
      snapshot.states.map((state) => [state.clockId, freezeState(state)]),
    );
    return { ok: true, value: this.resultSince(before) };
  }

  private resultSince(
    before: ReadonlyMap<ClockId, ClockState>,
  ): ClockAdvanceResult {
    const states = this.getStates();
    const changes = states
      .filter((state) => {
        const previous = before.get(state.clockId);
        return (
          previous === undefined ||
          state.timeSeconds !== previous.timeSeconds ||
          state.rate !== previous.rate ||
          state.running !== previous.running ||
          state.revision !== previous.revision
        );
      })
      .map((state) => {
        const previous = before.get(state.clockId)!;
        return Object.freeze({
          clockId: state.clockId,
          previousTimeSeconds: previous.timeSeconds,
          timeSeconds: state.timeSeconds,
          previousRevision: previous.revision,
          revision: state.revision,
        });
      });
    return Object.freeze({ states, changes: Object.freeze(changes) });
  }
}

export function createClockRuntime(
  definitions: readonly ClockDefinition[],
): ClockResult<ClockRuntime> {
  const report = validateClockDefinitions(definitions);
  if (report.hasErrors)
    return {
      ok: false,
      error: {
        kind: "invalid-clock-graph",
        codes: report.issues.map((issue) => issue.code),
      },
    };
  return { ok: true, value: new ClockRuntime(definitions) };
}
