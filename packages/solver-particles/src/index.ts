import type { SolverAdapterDescriptor } from "@physica/physics-core";
export const SOLVER_DESCRIPTOR: SolverAdapterDescriptor = Object.freeze({
  solverTypeId: "physica:solver/particles-v1",
  supportedStateTypes: ["particle-array", "spatial-hash"],
  supportedDimensions: [2],
  determinismPolicy: "strict",
  checkpointCapability: "snapshot",
  workerCapability: "worker-compatible",
  precisionPolicy: "fixed-step floating-point",
  inputSchema: "physica:particle-world-v1",
  outputSchema: "physica:particle-snapshot-v1",
});
export interface Particle {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly radius: number;
  readonly mass: number;
}
export interface ParticleBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}
export interface ParticleSnapshot {
  readonly timeSeconds: number;
  readonly particles: readonly Particle[];
  readonly collisionCount: number;
}
export interface ParticleObservables {
  readonly kineticEnergy: number;
  readonly meanSquaredSpeed: number;
  readonly collisionCount: number;
}
export class HardParticleSolver {
  private particles: Particle[];
  private timeSeconds = 0;
  private collisionCount = 0;
  constructor(
    initial: readonly Particle[],
    private readonly bounds: ParticleBounds,
    private readonly restitution = 1,
  ) {
    if (
      initial.length === 0 ||
      ![bounds.minX, bounds.maxX, bounds.minY, bounds.maxY, restitution].every(
        Number.isFinite,
      ) ||
      bounds.minX >= bounds.maxX ||
      bounds.minY >= bounds.maxY ||
      restitution < 0 ||
      restitution > 1
    )
      throw new RangeError("Particle solver configuration is invalid.");
    this.particles = initial.map((p) => {
      if (
        ![p.x, p.y, p.vx, p.vy, p.radius, p.mass].every(Number.isFinite) ||
        p.radius <= 0 ||
        p.mass <= 0
      )
        throw new RangeError("Particle values are invalid.");
      return { ...p };
    });
  }
  step(dt: number): ParticleSnapshot {
    if (!Number.isFinite(dt) || dt <= 0)
      throw new RangeError("Particle step must be positive.");
    this.particles = this.particles.map((p) => {
      let x = p.x + p.vx * dt;
      let y = p.y + p.vy * dt;
      let vx = p.vx;
      let vy = p.vy;
      if (x - p.radius < this.bounds.minX) {
        x = this.bounds.minX + p.radius;
        vx = Math.abs(vx) * this.restitution;
        this.collisionCount += 1;
      }
      if (x + p.radius > this.bounds.maxX) {
        x = this.bounds.maxX - p.radius;
        vx = -Math.abs(vx) * this.restitution;
        this.collisionCount += 1;
      }
      if (y - p.radius < this.bounds.minY) {
        y = this.bounds.minY + p.radius;
        vy = Math.abs(vy) * this.restitution;
        this.collisionCount += 1;
      }
      if (y + p.radius > this.bounds.maxY) {
        y = this.bounds.maxY - p.radius;
        vy = -Math.abs(vy) * this.restitution;
        this.collisionCount += 1;
      }
      return { ...p, x, y, vx, vy };
    });
    this.resolvePairs();
    this.timeSeconds += dt;
    return this.snapshot();
  }
  private resolvePairs(): void {
    const maxDiameter = Math.max(...this.particles.map((p) => p.radius * 2));
    const cells = new Map<string, number[]>();
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i]!;
      const key =
        Math.floor(p.x / maxDiameter) + ":" + Math.floor(p.y / maxDiameter);
      const cell = cells.get(key) ?? [];
      cell.push(i);
      cells.set(key, cell);
    }
    const checked = new Set<string>();
    for (const [key, indices] of cells) {
      const [cx, cy] = key.split(":").map(Number) as [number, number];
      for (let dx = -1; dx <= 1; dx += 1)
        for (let dy = -1; dy <= 1; dy += 1)
          for (const i of indices)
            for (const j of cells.get(cx + dx + ":" + (cy + dy)) ?? []) {
              if (i >= j) continue;
              const pair = i + ":" + j;
              if (checked.has(pair)) continue;
              checked.add(pair);
              this.resolvePair(i, j);
            }
    }
  }
  private resolvePair(i: number, j: number): void {
    const a = this.particles[i]!;
    const b = this.particles[j]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.hypot(dx, dy);
    const target = a.radius + b.radius;
    if (distance >= target || distance === 0) return;
    const nx = dx / distance;
    const ny = dy / distance;
    const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (relative >= 0) return;
    const impulse =
      (-(1 + this.restitution) * relative) / (1 / a.mass + 1 / b.mass);
    this.particles[i] = {
      ...a,
      vx: a.vx - (impulse * nx) / a.mass,
      vy: a.vy - (impulse * ny) / a.mass,
    };
    this.particles[j] = {
      ...b,
      vx: b.vx + (impulse * nx) / b.mass,
      vy: b.vy + (impulse * ny) / b.mass,
    };
    this.collisionCount += 1;
  }
  snapshot(): ParticleSnapshot {
    return Object.freeze({
      timeSeconds: this.timeSeconds,
      particles: Object.freeze(
        this.particles
          .map((p) => Object.freeze({ ...p }))
          .sort((a, b) => a.id - b.id),
      ),
      collisionCount: this.collisionCount,
    });
  }
  restore(snapshot: ParticleSnapshot): void {
    if (
      !Number.isSafeInteger(snapshot.collisionCount) ||
      snapshot.collisionCount < 0
    )
      throw new RangeError("Particle snapshot diagnostics are invalid.");
    this.timeSeconds = snapshot.timeSeconds;
    this.particles = snapshot.particles.map((p) => ({ ...p }));
    this.collisionCount = snapshot.collisionCount;
  }
  observables(): ParticleObservables {
    const kineticEnergy = this.particles.reduce(
      (s, p) => s + 0.5 * p.mass * (p.vx * p.vx + p.vy * p.vy),
      0,
    );
    return Object.freeze({
      kineticEnergy,
      meanSquaredSpeed:
        this.particles.reduce((s, p) => s + p.vx * p.vx + p.vy * p.vy, 0) /
        this.particles.length,
      collisionCount: this.collisionCount,
    });
  }
}
