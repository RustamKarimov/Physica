import type { SolverAdapterDescriptor } from "@physica/physics-core";
export const SOLVER_DESCRIPTOR: SolverAdapterDescriptor = Object.freeze({
  solverTypeId: "physica:solver/rapier-adapter-v1",
  supportedStateTypes: ["rigid-body", "contact"],
  supportedDimensions: [2, 3],
  determinismPolicy: "strict",
  checkpointCapability: "snapshot",
  workerCapability: "worker-compatible",
  precisionPolicy: "backend floating-point with semantic snapshots",
  inputSchema: "physica:rigid-world-v1",
  outputSchema: "physica:rigid-snapshot-v1",
});
export interface RigidBodyDefinition {
  readonly id: string;
  readonly mass: number;
  readonly radius: number;
  readonly restitution: number;
  readonly position: number;
  readonly velocity: number;
}
export interface RigidBodyState {
  readonly id: string;
  readonly position: number;
  readonly velocity: number;
}
export interface RigidSnapshot {
  readonly timeSeconds: number;
  readonly bodies: readonly RigidBodyState[];
}
export interface RigidContact {
  readonly bodyA: string;
  readonly bodyB: string;
  readonly impulse: number;
}
export interface RapierBridge {
  initialize(bodies: readonly RigidBodyDefinition[]): void;
  step(deltaSeconds: number): readonly RigidContact[];
  snapshot(timeSeconds: number): RigidSnapshot;
  restore(snapshot: RigidSnapshot): void;
}
export class RapierRigidAdapter {
  private timeSeconds = 0;
  constructor(private readonly bridge: RapierBridge) {}
  initialize(bodies: readonly RigidBodyDefinition[]): RigidSnapshot {
    validateBodies(bodies);
    this.timeSeconds = 0;
    this.bridge.initialize(bodies);
    return this.bridge.snapshot(0);
  }
  step(deltaSeconds: number) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0)
      throw new RangeError("Rigid step must be finite and positive.");
    const contacts = this.bridge.step(deltaSeconds);
    this.timeSeconds += deltaSeconds;
    return Object.freeze({
      snapshot: this.bridge.snapshot(this.timeSeconds),
      contacts: Object.freeze([...contacts]),
    });
  }
  snapshot(): RigidSnapshot {
    return this.bridge.snapshot(this.timeSeconds);
  }
  restore(snapshot: RigidSnapshot): void {
    if (!Number.isFinite(snapshot.timeSeconds) || snapshot.timeSeconds < 0)
      throw new RangeError("Rigid snapshot time is invalid.");
    this.bridge.restore(snapshot);
    this.timeSeconds = snapshot.timeSeconds;
  }
}
function validateBodies(bodies: readonly RigidBodyDefinition[]): void {
  const ids = new Set<string>();
  for (const body of bodies) {
    if (
      !body.id ||
      ids.has(body.id) ||
      ![
        body.mass,
        body.radius,
        body.restitution,
        body.position,
        body.velocity,
      ].every(Number.isFinite) ||
      body.mass <= 0 ||
      body.radius <= 0 ||
      body.restitution < 0 ||
      body.restitution > 1
    )
      throw new RangeError(
        "Rigid body definitions require unique IDs and valid finite physical values.",
      );
    ids.add(body.id);
  }
}
export function createReferenceImpulseBridge(): RapierBridge {
  let definitions = new Map<string, RigidBodyDefinition>();
  let states: RigidBodyState[] = [];
  return {
    initialize(bodies) {
      definitions = new Map(bodies.map((body) => [body.id, body]));
      states = bodies.map(({ id, position, velocity }) => ({
        id,
        position,
        velocity,
      }));
    },
    step(dt) {
      states = states.map((body) => ({
        ...body,
        position: body.position + body.velocity * dt,
      }));
      const contacts: RigidContact[] = [];
      for (let i = 0; i < states.length; i += 1)
        for (let j = i + 1; j < states.length; j += 1) {
          const a = states[i]!;
          const b = states[j]!;
          const da = definitions.get(a.id)!;
          const db = definitions.get(b.id)!;
          if (Math.abs(b.position - a.position) > da.radius + db.radius)
            continue;
          const normal = b.position >= a.position ? 1 : -1;
          const relative = (b.velocity - a.velocity) * normal;
          if (relative >= 0) continue;
          const restitution = Math.min(da.restitution, db.restitution);
          const impulse =
            (-(1 + restitution) * relative) / (1 / da.mass + 1 / db.mass);
          states[i] = {
            ...a,
            velocity: a.velocity - (impulse * normal) / da.mass,
          };
          states[j] = {
            ...b,
            velocity: b.velocity + (impulse * normal) / db.mass,
          };
          contacts.push(Object.freeze({ bodyA: a.id, bodyB: b.id, impulse }));
        }
      return Object.freeze(contacts);
    },
    snapshot(timeSeconds) {
      return Object.freeze({
        timeSeconds,
        bodies: Object.freeze(
          states
            .map((body) => Object.freeze({ ...body }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        ),
      });
    },
    restore(snapshot) {
      states = snapshot.bodies.map((body) => ({ ...body }));
    },
  };
}
