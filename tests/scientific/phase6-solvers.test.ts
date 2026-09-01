import { describe, expect, it } from "vitest";
import {
  PhysicalModelRuntime,
  invalidModel,
  validModel,
  type PhysicalModelContract,
} from "../../packages/physics-core/src/index";
import { constantAcceleration1D } from "../../packages/solver-analytical/src/index";
import {
  findBracketedRoot,
  solveLinearSystem,
} from "../../packages/solver-algebraic/src/index";
import {
  OrderedComputeQueue,
  type ComputeBackend,
} from "../../packages/compute-backend/src/index";
import {
  rk4,
  rk45Adaptive,
  semiImplicitEuler,
  velocityVerlet,
} from "../../packages/solver-ode/src/index";
import {
  RapierRigidAdapter,
  createReferenceImpulseBridge,
} from "../../packages/solver-rigid/src/index";
import { HardParticleSolver } from "../../packages/solver-particles/src/index";
import {
  scalarGrid1D,
  stepWaveEquation1D,
} from "../../packages/solver-grid/src/index";
import {
  refract,
  reflect,
  traceInterfaces,
} from "../../packages/solver-rays/src/index";
import {
  solveDcCircuit,
  stepRcTransient,
} from "../../packages/solver-circuits/src/index";
import {
  SeededRandom,
  monteCarlo,
  scheduleExponentialEvents,
} from "../../packages/solver-stochastic/src/index";
import {
  backProject,
  forwardProject,
  scalarImage,
} from "../../packages/solver-reconstruction/src/index";

describe("Phase 6 universal physics runtime", () => {
  it("validates, advances, orders events, observes, and resets a model", () => {
    const contract: PhysicalModelContract<
      { speed: number },
      { x: number },
      { x: number },
      null
    > = {
      provenance: {
        modelId: "test:model",
        version: "1",
        category: "analytical",
        deterministic: true,
        assumptions: [],
        validityConditions: [],
        approximationLevel: "exact",
        curriculumTags: [],
        referenceNotes: [],
      },
      stateChannels: ["x"],
      observableIds: ["x"],
      solverPolicy: {
        solverTypeId: "physica:solver/analytical-v1",
        recommendedMethod: "exact",
      },
      validateParameters: (p) =>
        p.speed >= 0
          ? validModel()
          : invalidModel({
              severity: "error",
              code: "speed",
              message: "Speed must be non-negative.",
            }),
      createInitialState: () => ({ x: 0 }),
      evaluate: (p, t) => ({ x: p.speed * t }),
      emitEvents: (_a, _b, c) => [
        {
          timestampSeconds: c.timeSeconds,
          priority: 2,
          sequenceId: 1,
          eventType: "later",
          payload: null,
        },
        {
          timestampSeconds: c.timeSeconds,
          priority: 1,
          sequenceId: 2,
          eventType: "earlier",
          payload: null,
        },
      ],
      computeObservables: (s) => ({ x: s.x }),
      validateState: (s) =>
        Number.isFinite(s.x)
          ? validModel()
          : invalidModel({
              severity: "error",
              code: "state",
              message: "State must be finite.",
            }),
    };
    const created = PhysicalModelRuntime.initialize(contract, { speed: 2 });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const advanced = created.value.advanceTo(3);
    expect(advanced.ok).toBe(true);
    if (!advanced.ok) return;
    expect(advanced.value.state.x).toBe(6);
    expect(advanced.value.events.map((e) => e.eventType)).toEqual([
      "earlier",
      "later",
    ]);
    expect(created.value.reset().state.x).toBe(0);
  });
  it("rejects invalid parameters without throwing", () => {
    const contract: PhysicalModelContract<
      { x: number },
      { x: number },
      { x: number }
    > = {
      provenance: {
        modelId: "test:model",
        version: "1",
        category: "analytical",
        deterministic: true,
        assumptions: [],
        validityConditions: [],
        approximationLevel: "exact",
        curriculumTags: [],
        referenceNotes: [],
      },
      stateChannels: ["x"],
      observableIds: ["x"],
      solverPolicy: { solverTypeId: "test:solver", recommendedMethod: "x" },
      validateParameters: () =>
        invalidModel({ severity: "error", code: "bad", message: "bad" }),
      createInitialState: (p) => p,
      evaluate: (p) => p,
      emitEvents: () => [],
      computeObservables: (s) => s,
      validateState: () => validModel(),
    };
    expect(PhysicalModelRuntime.initialize(contract, { x: 1 })).toMatchObject({
      ok: false,
      error: { kind: "invalid-parameters" },
    });
  });
});

describe("Phase 6 numerical services", () => {
  it("matches exact constant acceleration", () =>
    expect(constantAcceleration1D(0, 10, -10, 1)).toEqual({
      position: 5,
      velocity: 0,
      acceleration: -10,
    }));
  it("solves roots and pivoted linear systems", () => {
    expect(findBracketedRoot((x) => x * x - 2, 0, 2).value).toBeCloseTo(
      Math.SQRT2,
      10,
    );
    expect(
      solveLinearSystem(
        [
          [2, 1],
          [1, -1],
        ],
        [5, 1],
      ).value,
    ).toEqual([2, 1]);
  });
  it("publishes compute results in submission order", async () => {
    const released = new Map<string, (value: number) => void>();
    const backend: ComputeBackend<number, number> = {
      backendTypeId: "test",
      workerCapable: true,
      submit: (r) =>
        new Promise((resolve) =>
          released.set(r.jobId, (value) => resolve({ jobId: r.jobId, value })),
        ),
    };
    const queue = new OrderedComputeQueue(backend);
    const order: string[] = [];
    const first = queue.submit(1).then((r) => order.push(r.jobId));
    const second = queue.submit(2).then((r) => order.push(r.jobId));
    released.get("job-1")!(2);
    await Promise.resolve();
    expect(order).toEqual([]);
    released.get("job-0")!(1);
    await Promise.all([first, second]);
    expect(order).toEqual(["job-0", "job-1"]);
  });
  it("publishes backend failures in sequence without hanging later jobs", async () => {
    const backend: ComputeBackend<number, number> = {
      backendTypeId: "test",
      workerCapable: true,
      submit: async (r) => {
        if (r.jobId === "job-0") throw new Error("failed");
        return { jobId: r.jobId, value: r.payload };
      },
    };
    const queue = new OrderedComputeQueue(backend);
    const first = queue.submit(1);
    const second = queue.submit(2);
    await expect(first).rejects.toThrow("failed");
    await expect(second).resolves.toMatchObject({ jobId: "job-1", value: 2 });
  });
  it("integrates a harmonic oscillator with all four ODE methods", () => {
    const acceleration = (_t: number, p: readonly number[]) => [-p[0]!];
    expect(
      semiImplicitEuler([1], [0], acceleration, 0, 0.01).position[0],
    ).toBeCloseTo(0.9999);
    expect(
      velocityVerlet([1], [0], acceleration, 0, 0.01).position[0],
    ).toBeCloseTo(0.99995);
    const derivative = (_t: number, s: readonly number[]) => [s[1]!, -s[0]!];
    expect(rk4(derivative, [1, 0], 0, 0.1).state[0]).toBeCloseTo(
      Math.cos(0.1),
      5,
    );
    const adaptive = rk45Adaptive(derivative, [1, 0], 0, Math.PI / 2);
    expect(adaptive.converged).toBe(true);
    expect(adaptive.state[0]).toBeCloseTo(0, 6);
    expect(adaptive.state[1]).toBeCloseTo(-1, 6);
  });
});

describe("Phase 6 specialized adapters", () => {
  it("maps rigid bodies, resolves an elastic collision, and restores snapshots", () => {
    const solver = new RapierRigidAdapter(createReferenceImpulseBridge());
    const initial = solver.initialize([
      {
        id: "a",
        mass: 1,
        radius: 0.5,
        restitution: 1,
        position: -0.6,
        velocity: 1,
      },
      {
        id: "b",
        mass: 1,
        radius: 0.5,
        restitution: 1,
        position: 0.6,
        velocity: -1,
      },
    ]);
    const result = solver.step(0.2);
    expect(result.contacts).toHaveLength(1);
    expect(result.snapshot.bodies.map((b) => b.velocity)).toEqual([-1, 1]);
    solver.restore(initial);
    expect(solver.snapshot()).toEqual(initial);
  });
  it("uses spatial hashing, preserves energy, and restores diagnostics", () => {
    const solver = new HardParticleSolver(
      [
        { id: 0, x: 0.25, y: 2, vx: -1, vy: 0, radius: 0.2, mass: 1 },
        { id: 1, x: 3, y: 2, vx: -1, vy: 0, radius: 0.2, mass: 1 },
      ],
      { minX: 0, maxX: 5, minY: 0, maxY: 5 },
    );
    const before = solver.observables().kineticEnergy;
    const initial = solver.snapshot();
    solver.step(0.1);
    expect(solver.observables().kineticEnergy).toBeCloseTo(before, 10);
    expect(solver.observables().collisionCount).toBe(1);
    solver.restore(initial);
    expect(solver.observables().collisionCount).toBe(0);
  });
  it("advances a stable fixed-boundary wave grid", () => {
    const current = scalarGrid1D([0, 0, 1, 0, 0], 1);
    const result = stepWaveEquation1D(
      { displacement: current, previous: current, timeSeconds: 0 },
      1,
      0.5,
      "fixed",
    );
    expect(result.diagnostic.courantNumber).toBe(0.5);
    expect(result.state.displacement.values[0]).toBe(0);
  });
  it("reflects and refracts rays with Snell's law", () => {
    const transmitted = refract(
      { x: Math.sin(Math.PI / 6), y: -Math.cos(Math.PI / 6) },
      { x: 0, y: 1 },
      1,
      1.5,
    )!;
    expect(Math.asin(Math.abs(transmitted.x))).toBeCloseTo(
      Math.asin(1 / 3),
      10,
    );
    expect(reflect({ x: 1, y: -1 }, { x: 0, y: 1 }).y).toBeGreaterThan(0);
    expect(
      traceInterfaces(
        { origin: { x: 0, y: 1 }, direction: { x: 0.2, y: -1 } },
        [
          {
            id: "glass",
            point: { x: 0, y: 0 },
            normal: { x: 0, y: 1 },
            refractiveIndexBefore: 1,
            refractiveIndexAfter: 1.5,
          },
        ],
      ),
    ).toHaveLength(1);
  });
  it("solves a DC network and exact RC transient", () => {
    const result = solveDcCircuit({
      groundNode: "g",
      resistors: [
        { id: "r1", nodeA: "v", nodeB: "n", resistanceOhms: 100 },
        { id: "r2", nodeA: "n", nodeB: "g", resistanceOhms: 100 },
      ],
      voltageSources: [
        { id: "s", positiveNode: "v", negativeNode: "g", voltageVolts: 10 },
      ],
    });
    expect(result.nodeVoltages.n).toBeCloseTo(5);
    expect(
      stepRcTransient(
        { timeSeconds: 0, capacitorVoltage: 0 },
        10,
        1000,
        0.001,
        1,
      ).capacitorVoltage,
    ).toBeCloseTo(10 * (1 - Math.exp(-1)));
  });
  it("replays seeded stochastic schedules and reports Monte Carlo uncertainty", () => {
    const a = new SeededRandom(42);
    const snapshot = a.snapshot();
    const events = scheduleExponentialEvents(2, 5, a);
    a.restore(snapshot);
    expect(scheduleExponentialEvents(2, 5, a)).toEqual(events);
    const random = new SeededRandom(9);
    const summary = monteCarlo(1000, () => random.next());
    expect(summary.mean).toBeGreaterThan(0.45);
    expect(summary.mean).toBeLessThan(0.55);
    expect(summary.standardError).toBeGreaterThan(0);
  });
  it("forward-projects and back-projects a finite image", () => {
    const image = scalarImage(
      4,
      4,
      [0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0],
    );
    const sinogram = forwardProject(image, {
      anglesRadians: [0, Math.PI / 2],
      detectorCount: 4,
    });
    expect(sinogram.values).toHaveLength(8);
    const reconstructed = backProject(sinogram, 4, 4);
    expect(reconstructed.pixels.every(Number.isFinite)).toBe(true);
    expect(Math.max(...reconstructed.pixels)).toBeGreaterThan(0);
  });
});
