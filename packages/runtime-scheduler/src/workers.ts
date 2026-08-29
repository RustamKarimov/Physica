import type { SchedulerResult } from "./errors";

export interface OrderedWorkerRequest<TInput> {
  readonly order: number;
  readonly input: TInput;
}

export interface OrderedWorkerResult<TOutput> {
  readonly order: number;
  readonly output: TOutput;
}

export async function collectOrderedWorkerResults<TInput, TOutput>(
  requests: readonly OrderedWorkerRequest<TInput>[],
  worker: (
    request: OrderedWorkerRequest<TInput>,
  ) => Promise<OrderedWorkerResult<TOutput>>,
): Promise<SchedulerResult<readonly OrderedWorkerResult<TOutput>[]>> {
  const requested = new Set<number>();
  for (const { order } of requests) {
    if (!Number.isSafeInteger(order) || requested.has(order))
      return {
        ok: false,
        error: { kind: "invalid-worker-result-order", order },
      };
    requested.add(order);
  }
  const results = await Promise.all(requests.map(worker));
  const returned = new Set<number>();
  for (const { order } of results) {
    if (!requested.has(order) || returned.has(order))
      return {
        ok: false,
        error: { kind: "invalid-worker-result-order", order },
      };
    returned.add(order);
  }
  return {
    ok: true,
    value: Object.freeze([...results].sort((a, b) => a.order - b.order)),
  };
}
