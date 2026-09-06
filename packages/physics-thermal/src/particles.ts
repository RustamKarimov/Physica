import {
  HardParticleSolver,
  type Particle,
  type ParticleBounds,
  type ParticleSnapshot,
} from "@physica/solver-particles";
import { BOLTZMANN_CONSTANT } from "./gas";
import {
  invalidThermal,
  thermalIssue,
  validThermal,
  type ThermalResult,
} from "./types";

export interface TeachingGasOptions {
  readonly particleCount: number;
  readonly temperatureKelvin: number;
  readonly particleMassKilograms: number;
  readonly particleRadiusMetres: number;
  readonly bounds: ParticleBounds;
  readonly seed: number;
  readonly brownianTracer?: {
    readonly radiusMetres: number;
    readonly massKilograms: number;
  };
}

export interface SpeedBin {
  readonly minimumMetresPerSecond: number;
  readonly maximumMetresPerSecond: number;
  readonly count: number;
}

export interface TeachingGasFrame {
  readonly snapshot: ParticleSnapshot;
  readonly kineticEnergyJoules: number;
  readonly momentumKilogramMetresPerSecond: Readonly<{
    x: number;
    y: number;
  }>;
  readonly meanSquaredSpeed: number;
  readonly equivalentTemperatureKelvin: number;
  readonly wallCollisionRatePerSecond: number;
  readonly wallImpulseRateNewtons: number;
  readonly speedHistogram: readonly SpeedBin[];
  readonly brownianPosition?: Readonly<{ x: number; y: number }>;
  readonly modelDisclosure: string;
}

function randomGenerator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function validateOptions(options: TeachingGasOptions): ThermalResult<void> {
  const values = [
    options.particleCount,
    options.temperatureKelvin,
    options.particleMassKilograms,
    options.particleRadiusMetres,
    options.bounds.minX,
    options.bounds.maxX,
    options.bounds.minY,
    options.bounds.maxY,
    options.seed,
  ];
  if (
    values.some((value) => !Number.isFinite(value)) ||
    !Number.isSafeInteger(options.particleCount) ||
    options.particleCount < 2 ||
    options.particleCount > 128 ||
    options.temperatureKelvin <= 0 ||
    options.particleMassKilograms <= 0 ||
    options.particleRadiusMetres <= 0 ||
    options.bounds.minX >= options.bounds.maxX ||
    options.bounds.minY >= options.bounds.maxY ||
    !Number.isSafeInteger(options.seed)
  )
    return invalidThermal(
      thermalIssue(
        "thermal.invalid-particle-gas",
        "Particle gas needs 2–128 particles, positive temperature, mass and radius, valid bounds and an integer seed.",
      ),
    );
  const tracer = options.brownianTracer;
  if (
    tracer &&
    (!Number.isFinite(tracer.radiusMetres) ||
      !Number.isFinite(tracer.massKilograms) ||
      tracer.radiusMetres <= options.particleRadiusMetres ||
      tracer.massKilograms <= options.particleMassKilograms)
  )
    return invalidThermal(
      thermalIssue(
        "thermal.invalid-brownian-tracer",
        "A Brownian tracer must be larger and heavier than a gas particle.",
      ),
    );
  return validThermal(undefined);
}

function initialParticles(
  options: TeachingGasOptions,
): ThermalResult<Particle[]> {
  const validation = validateOptions(options);
  if (!validation.ok) return validation;
  const random = randomGenerator(options.seed);
  const width = options.bounds.maxX - options.bounds.minX;
  const height = options.bounds.maxY - options.bounds.minY;
  const tracer = options.brownianTracer;
  const tracerX = (options.bounds.minX + options.bounds.maxX) / 2;
  const tracerY = (options.bounds.minY + options.bounds.maxY) / 2;
  const columns = Math.ceil(
    Math.sqrt((options.particleCount * width) / height),
  );
  const rows = Math.ceil(options.particleCount / columns) + 2;
  const candidates: { x: number; y: number }[] = [];
  for (let row = 0; row < rows + 2; row += 1)
    for (let column = 0; column < columns + 2; column += 1) {
      const x = options.bounds.minX + ((column + 0.5) / (columns + 2)) * width;
      const y = options.bounds.minY + ((row + 0.5) / (rows + 2)) * height;
      if (
        !tracer ||
        Math.hypot(x - tracerX, y - tracerY) >
          tracer.radiusMetres + options.particleRadiusMetres * 1.25
      )
        candidates.push({ x, y });
    }
  if (candidates.length < options.particleCount)
    return invalidThermal(
      thermalIssue(
        "thermal.particle-packing",
        "The requested gas and tracer do not fit the teaching container.",
      ),
    );
  const speed = Math.sqrt(
    (3 * BOLTZMANN_CONSTANT * options.temperatureKelvin) /
      options.particleMassKilograms,
  );
  const particles = candidates
    .slice(0, options.particleCount)
    .map((point, id) => {
      const angle = 2 * Math.PI * random();
      return {
        id,
        ...point,
        vx: speed * Math.cos(angle),
        vy: speed * Math.sin(angle),
        radius: options.particleRadiusMetres,
        mass: options.particleMassKilograms,
      };
    });
  const momentum = particles.reduce(
    (sum, particle) => ({
      x: sum.x + particle.mass * particle.vx,
      y: sum.y + particle.mass * particle.vy,
    }),
    { x: 0, y: 0 },
  );
  const totalMass = particles.reduce((sum, particle) => sum + particle.mass, 0);
  for (let index = 0; index < particles.length; index += 1) {
    const particle = particles[index]!;
    particles[index] = {
      ...particle,
      vx: particle.vx - momentum.x / totalMass,
      vy: particle.vy - momentum.y / totalMass,
    };
  }
  const targetEnergy =
    1.5 *
    options.particleCount *
    BOLTZMANN_CONSTANT *
    options.temperatureKelvin;
  const centredEnergy = particles.reduce(
    (sum, particle) =>
      sum +
      0.5 *
        particle.mass *
        (particle.vx * particle.vx + particle.vy * particle.vy),
    0,
  );
  const scale = Math.sqrt(targetEnergy / centredEnergy);
  for (let index = 0; index < particles.length; index += 1) {
    const particle = particles[index]!;
    particles[index] = {
      ...particle,
      vx: particle.vx * scale,
      vy: particle.vy * scale,
    };
  }
  if (tracer)
    particles.push({
      id: options.particleCount,
      x: tracerX,
      y: tracerY,
      vx: 0,
      vy: 0,
      radius: tracer.radiusMetres,
      mass: tracer.massKilograms,
    });
  return validThermal(particles) as ThermalResult<Particle[]>;
}

function histogram(
  particles: readonly Particle[],
  bins = 6,
): readonly SpeedBin[] {
  const speeds = particles.map((particle) =>
    Math.hypot(particle.vx, particle.vy),
  );
  const maximum = Math.max(...speeds, Number.EPSILON);
  return Object.freeze(
    Array.from({ length: bins }, (_, index) => {
      const minimumMetresPerSecond = (index / bins) * maximum;
      const maximumMetresPerSecond = ((index + 1) / bins) * maximum;
      return Object.freeze({
        minimumMetresPerSecond,
        maximumMetresPerSecond,
        count: speeds.filter(
          (speed) =>
            speed >= minimumMetresPerSecond &&
            (index === bins - 1
              ? speed <= maximumMetresPerSecond
              : speed < maximumMetresPerSecond),
        ).length,
      });
    }),
  );
}

export class TeachingGasSimulation {
  private readonly solver: HardParticleSolver;

  private constructor(
    private readonly options: TeachingGasOptions,
    particles: readonly Particle[],
  ) {
    this.solver = new HardParticleSolver(particles, options.bounds, 1);
  }

  static create(
    options: TeachingGasOptions,
  ): ThermalResult<TeachingGasSimulation> {
    const particles = initialParticles(options);
    return particles.ok
      ? { ok: true, value: new TeachingGasSimulation(options, particles.value) }
      : particles;
  }

  step(deltaSeconds: number): ThermalResult<TeachingGasFrame> {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0)
      return invalidThermal(
        thermalIssue(
          "thermal.invalid-particle-step",
          "Particle simulation step must be finite and positive.",
          "deltaSeconds",
        ),
      );
    const snapshot = this.solver.step(deltaSeconds);
    const diagnostics = this.solver.stepDiagnostics();
    return validThermal(
      this.frame(
        snapshot,
        diagnostics.wallCollisionCount / deltaSeconds,
        diagnostics.wallImpulseKilogramMetresPerSecond / deltaSeconds,
      ),
    );
  }

  snapshot(): TeachingGasFrame {
    return this.frame(this.solver.snapshot(), 0);
  }

  restore(snapshot: ParticleSnapshot): void {
    this.solver.restore(snapshot);
  }

  private frame(
    snapshot: ParticleSnapshot,
    wallCollisionRatePerSecond: number,
    wallImpulseRateNewtons = 0,
  ): TeachingGasFrame {
    const observables = this.solver.observables();
    const momentum = snapshot.particles.reduce(
      (sum, particle) => ({
        x: sum.x + particle.mass * particle.vx,
        y: sum.y + particle.mass * particle.vy,
      }),
      { x: 0, y: 0 },
    );
    const gasParticles = snapshot.particles.filter(
      (particle) => particle.id < this.options.particleCount,
    );
    const gasKineticEnergy = gasParticles.reduce(
      (sum, particle) =>
        sum + 0.5 * particle.mass * (particle.vx ** 2 + particle.vy ** 2),
      0,
    );
    const brownian = snapshot.particles.find(
      (particle) => particle.id === this.options.particleCount,
    );
    return {
      snapshot,
      kineticEnergyJoules: observables.kineticEnergy,
      momentumKilogramMetresPerSecond: Object.freeze(momentum),
      meanSquaredSpeed: observables.meanSquaredSpeed,
      equivalentTemperatureKelvin:
        gasKineticEnergy / (1.5 * gasParticles.length * BOLTZMANN_CONSTANT),
      wallCollisionRatePerSecond,
      wallImpulseRateNewtons,
      speedHistogram: histogram(gasParticles),
      ...(brownian
        ? { brownianPosition: Object.freeze({ x: brownian.x, y: brownian.y }) }
        : {}),
      modelDisclosure:
        "Seeded 2D elastic hard-disk teaching model; particle sizes and time scale are schematic.",
    };
  }
}
