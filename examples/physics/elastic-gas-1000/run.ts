import { HardParticleSolver } from "@physica/solver-particles";
export function runExample() {
  const particles = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    x: 1 + (i % 40) * 1.1,
    y: 1 + Math.floor(i / 40) * 1.1,
    vx: i % 2 === 0 ? 0.5 : -0.5,
    vy: i % 4 < 2 ? 0.5 : -0.5,
    radius: 0.2,
    mass: 1,
  }));
  const solver = new HardParticleSolver(particles, {
    minX: 0,
    maxX: 50,
    minY: 0,
    maxY: 35,
  });
  const before = solver.observables();
  solver.step(0.02);
  const after = solver.observables();
  return {
    particleCount: solver.snapshot().particles.length,
    kineticEnergyBefore: before.kineticEnergy,
    kineticEnergyAfter: after.kineticEnergy,
    meanSquaredSpeed: after.meanSquaredSpeed,
    collisions: after.collisionCount,
  };
}
