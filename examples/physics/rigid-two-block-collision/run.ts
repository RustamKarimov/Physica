import {
  RapierRigidAdapter,
  createReferenceImpulseBridge,
} from "@physica/solver-rigid";
export function runExample() {
  const solver = new RapierRigidAdapter(createReferenceImpulseBridge());
  solver.initialize([
    {
      id: "left",
      mass: 1,
      radius: 0.5,
      restitution: 1,
      position: -0.6,
      velocity: 1,
    },
    {
      id: "right",
      mass: 1,
      radius: 0.5,
      restitution: 1,
      position: 0.6,
      velocity: -1,
    },
  ]);
  const result = solver.step(0.2);
  return {
    timeSeconds: result.snapshot.timeSeconds,
    velocities: Object.fromEntries(
      result.snapshot.bodies.map((b) => [b.id, b.velocity]),
    ),
    contacts: result.contacts.length,
    totalMomentum: result.snapshot.bodies.reduce((s, b) => s + b.velocity, 0),
  };
}
