export interface ComputeRequest<T> {
  readonly jobId: string;
  readonly payload: Readonly<T>;
}
export interface ComputeResponse<T> {
  readonly jobId: string;
  readonly value: Readonly<T>;
}
export interface ComputeBackend<I, O> {
  readonly backendTypeId: string;
  readonly workerCapable: boolean;
  submit(request: ComputeRequest<I>): Promise<ComputeResponse<O>>;
}
export function createMainThreadBackend<I, O>(
  handler: (payload: Readonly<I>) => O | Promise<O>,
): ComputeBackend<I, O> {
  return Object.freeze({
    backendTypeId: "physica:compute/main-thread-v1",
    workerCapable: false,
    async submit(request: ComputeRequest<I>) {
      return Object.freeze({
        jobId: request.jobId,
        value: await handler(request.payload),
      });
    },
  });
}
export interface ComputeTransport<I, O> {
  dispatch(request: ComputeRequest<I>): Promise<ComputeResponse<O>>;
}
export function createTransportBackend<I, O>(
  transport: ComputeTransport<I, O>,
): ComputeBackend<I, O> {
  return Object.freeze({
    backendTypeId: "physica:compute/worker-transport-v1",
    workerCapable: true,
    submit: (request: ComputeRequest<I>) => transport.dispatch(request),
  });
}
export class OrderedComputeQueue<I, O> {
  private nextSubmission = 0;
  private nextPublication = 0;
  private readonly completed = new Map<
    number,
    | { readonly ok: true; readonly response: ComputeResponse<O> }
    | { readonly ok: false; readonly error: unknown }
  >();
  private readonly waiters = new Map<
    number,
    {
      readonly resolve: (response: ComputeResponse<O>) => void;
      readonly reject: (error: unknown) => void;
    }
  >();
  constructor(private readonly backend: ComputeBackend<I, O>) {}
  submit(payload: Readonly<I>): Promise<ComputeResponse<O>> {
    const sequence = this.nextSubmission++;
    const request = Object.freeze({ jobId: "job-" + sequence, payload });
    const published = new Promise<ComputeResponse<O>>((resolve, reject) =>
      this.waiters.set(sequence, { resolve, reject }),
    );
    void this.backend
      .submit(request)
      .then((response) => {
        if (response.jobId !== request.jobId)
          throw new Error("Compute backend returned the wrong job ID.");
        this.completed.set(sequence, { ok: true, response });
        this.publishReady();
      })
      .catch((error: unknown) => {
        this.completed.set(sequence, { ok: false, error });
        this.publishReady();
      });
    return published;
  }
  private publishReady(): void {
    while (this.completed.has(this.nextPublication)) {
      const result = this.completed.get(this.nextPublication)!;
      this.completed.delete(this.nextPublication);
      const waiter = this.waiters.get(this.nextPublication)!;
      if (result.ok) waiter.resolve(result.response);
      else waiter.reject(result.error);
      this.waiters.delete(this.nextPublication);
      this.nextPublication += 1;
    }
  }
}
