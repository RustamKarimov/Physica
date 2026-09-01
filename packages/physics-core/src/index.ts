export type ModelCategory = "analytical" | "numerical" | "stochastic";
export type ModelIssueSeverity = "error" | "warning";
export interface ModelIssue {
  readonly severity: ModelIssueSeverity;
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}
export interface ModelValidation {
  readonly valid: boolean;
  readonly issues: readonly ModelIssue[];
}
export interface ModelProvenance {
  readonly modelId: string;
  readonly version: string;
  readonly category: ModelCategory;
  readonly deterministic: boolean;
  readonly assumptions: readonly string[];
  readonly validityConditions: readonly string[];
  readonly approximationLevel: "exact" | "educational" | "numerical";
  readonly curriculumTags: readonly string[];
  readonly referenceNotes: readonly string[];
}
export interface SolverPolicy {
  readonly solverTypeId: string;
  readonly recommendedMethod: string;
  readonly absoluteTolerance?: number;
  readonly relativeTolerance?: number;
}
export interface SolverAdapterDescriptor {
  readonly solverTypeId: string;
  readonly supportedStateTypes: readonly string[];
  readonly supportedDimensions: readonly number[];
  readonly determinismPolicy: "strict" | "seeded";
  readonly checkpointCapability: "none" | "snapshot";
  readonly workerCapability: "main-thread" | "worker-compatible";
  readonly precisionPolicy: string;
  readonly inputSchema: string;
  readonly outputSchema: string;
}
export interface SolverAdapterDescriptor {
  readonly solverTypeId: string;
  readonly supportedStateTypes: readonly string[];
  readonly supportedDimensions: readonly number[];
  readonly determinismPolicy: "strict" | "seeded";
  readonly checkpointCapability: "none" | "snapshot";
  readonly workerCapability: "main-thread" | "worker-compatible";
  readonly precisionPolicy: string;
  readonly inputSchema: string;
  readonly outputSchema: string;
}
export interface ModelEvent<T = unknown> {
  readonly timestampSeconds: number;
  readonly priority: number;
  readonly sequenceId: number;
  readonly eventType: string;
  readonly payload: T;
}
export interface ModelStepContext {
  readonly timeSeconds: number;
  readonly deltaSeconds: number;
}
export interface PhysicalModelContract<P, S, O, E = unknown> {
  readonly provenance: ModelProvenance;
  readonly stateChannels: readonly string[];
  readonly observableIds: readonly string[];
  readonly solverPolicy: SolverPolicy;
  initialize?(parameters: Readonly<P>): void;
  validateParameters(parameters: Readonly<P>): ModelValidation;
  createInitialState(parameters: Readonly<P>): S;
  evaluate?(parameters: Readonly<P>, timeSeconds: number): S;
  step?(
    state: Readonly<S>,
    parameters: Readonly<P>,
    context: ModelStepContext,
  ): S;
  emitEvents(
    previous: Readonly<S>,
    current: Readonly<S>,
    context: ModelStepContext,
  ): readonly ModelEvent<E>[];
  computeObservables(state: Readonly<S>, parameters: Readonly<P>): O;
  validateState(state: Readonly<S>, parameters: Readonly<P>): ModelValidation;
  reset?(state: Readonly<S>): void;
}
export type ModelRuntimeError =
  | { readonly kind: "invalid-contract"; readonly message: string }
  | {
      readonly kind: "invalid-parameters";
      readonly validation: ModelValidation;
    }
  | { readonly kind: "invalid-state"; readonly validation: ModelValidation }
  | { readonly kind: "invalid-time"; readonly message: string };
export type ModelResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ModelRuntimeError };
export interface ModelRuntimeFrame<S, O, E> {
  readonly state: Readonly<S>;
  readonly observables: Readonly<O>;
  readonly events: readonly ModelEvent<E>[];
  readonly timeSeconds: number;
}

function validateContract<P, S, O, E>(
  contract: PhysicalModelContract<P, S, O, E>,
): ModelResult<void> {
  if (!contract.evaluate && !contract.step)
    return {
      ok: false,
      error: {
        kind: "invalid-contract",
        message: "A model must provide evaluate or step.",
      },
    };
  if (contract.evaluate && contract.step)
    return {
      ok: false,
      error: {
        kind: "invalid-contract",
        message:
          "A model must choose analytical evaluation or numerical stepping.",
      },
    };
  if (!contract.provenance.modelId.includes(":"))
    return {
      ok: false,
      error: {
        kind: "invalid-contract",
        message: "Model IDs must be namespaced.",
      },
    };
  return { ok: true, value: undefined };
}
function orderedEvents<E>(
  events: readonly ModelEvent<E>[],
): readonly ModelEvent<E>[] {
  return Object.freeze(
    [...events].sort(
      (a, b) =>
        a.timestampSeconds - b.timestampSeconds ||
        a.priority - b.priority ||
        a.sequenceId - b.sequenceId ||
        a.eventType.localeCompare(b.eventType),
    ),
  );
}
export class PhysicalModelRuntime<P, S, O, E = unknown> {
  private stateValue: S;
  private timeValue = 0;
  private constructor(
    private readonly contract: PhysicalModelContract<P, S, O, E>,
    private readonly parameters: Readonly<P>,
    initialState: S,
  ) {
    this.stateValue = initialState;
  }
  static initialize<P, S, O, E = unknown>(
    contract: PhysicalModelContract<P, S, O, E>,
    parameters: Readonly<P>,
  ): ModelResult<PhysicalModelRuntime<P, S, O, E>> {
    const contractValidation = validateContract(contract);
    if (!contractValidation.ok) return contractValidation;
    contract.initialize?.(parameters);
    const parameterValidation = contract.validateParameters(parameters);
    if (!parameterValidation.valid)
      return {
        ok: false,
        error: { kind: "invalid-parameters", validation: parameterValidation },
      };
    const state = contract.createInitialState(parameters);
    const stateValidation = contract.validateState(state, parameters);
    if (!stateValidation.valid)
      return {
        ok: false,
        error: { kind: "invalid-state", validation: stateValidation },
      };
    return {
      ok: true,
      value: new PhysicalModelRuntime(contract, parameters, state),
    };
  }
  get state(): Readonly<S> {
    return this.stateValue;
  }
  get timeSeconds(): number {
    return this.timeValue;
  }
  frame(): ModelRuntimeFrame<S, O, E> {
    return Object.freeze({
      state: this.stateValue,
      observables: this.contract.computeObservables(
        this.stateValue,
        this.parameters,
      ),
      events: Object.freeze([]),
      timeSeconds: this.timeValue,
    });
  }
  advanceTo(timeSeconds: number): ModelResult<ModelRuntimeFrame<S, O, E>> {
    if (!Number.isFinite(timeSeconds) || timeSeconds < this.timeValue)
      return {
        ok: false,
        error: {
          kind: "invalid-time",
          message: "Model time must be finite and monotonic.",
        },
      };
    const context = Object.freeze({
      timeSeconds,
      deltaSeconds: timeSeconds - this.timeValue,
    });
    const previous = this.stateValue;
    const next = this.contract.evaluate
      ? this.contract.evaluate(this.parameters, timeSeconds)
      : this.contract.step!(previous, this.parameters, context);
    const validation = this.contract.validateState(next, this.parameters);
    if (!validation.valid)
      return { ok: false, error: { kind: "invalid-state", validation } };
    const events = orderedEvents(
      this.contract.emitEvents(previous, next, context),
    );
    this.stateValue = next;
    this.timeValue = timeSeconds;
    return {
      ok: true,
      value: Object.freeze({
        state: next,
        observables: this.contract.computeObservables(next, this.parameters),
        events,
        timeSeconds,
      }),
    };
  }
  reset(): ModelRuntimeFrame<S, O, E> {
    this.contract.reset?.(this.stateValue);
    this.stateValue = this.contract.createInitialState(this.parameters);
    this.timeValue = 0;
    return this.frame();
  }
}
export function validModel(): ModelValidation {
  return Object.freeze({ valid: true, issues: Object.freeze([]) });
}
export function invalidModel(
  ...issues: readonly ModelIssue[]
): ModelValidation {
  return Object.freeze({ valid: false, issues: Object.freeze([...issues]) });
}
