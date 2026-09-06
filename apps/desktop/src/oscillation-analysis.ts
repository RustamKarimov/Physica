import {
  drivenSteadyResponse,
  evaluateCoupledOscillators,
  evaluateDrivenOscillatorFrame,
  evaluateSmallAnglePendulum,
  resonanceCurve,
  sampleShm,
  stepDrivenOscillator,
} from "@physica/physics-mechanics";
import type {
  OscillationControlKey,
  OscillationWorkflowId,
} from "./oscillation-workflows";

export interface OscillationGraphPoint {
  readonly time: number;
  readonly displacement: number;
  readonly velocity: number;
  readonly acceleration: number;
  readonly kineticEnergy: number;
  readonly potentialEnergy: number;
  readonly totalEnergy: number;
}

export interface OscillationAnalysis {
  readonly values: readonly (readonly [string, string])[];
  readonly validation: string;
  readonly graph: readonly OscillationGraphPoint[];
  readonly resonance: readonly Readonly<{
    frequency: number;
    amplitude: number;
    phase: number;
  }>[];
  readonly currentGraphIndex: number;
  readonly state: Readonly<Record<string, number>>;
}

function unwrap<T>(
  result:
    | { readonly ok: true; readonly value: Readonly<T> }
    | {
        readonly ok: false;
        readonly issues: readonly { readonly message: string }[];
      },
): Readonly<T> {
  if (!result.ok) throw new Error(result.issues[0]?.message);
  return result.value;
}

export function formatOscillationValue(value: number): string {
  if (
    Math.abs(value) > 0 &&
    (Math.abs(value) < 0.001 || Math.abs(value) >= 10_000)
  )
    return value.toExponential(3);
  return Number(value.toFixed(4)).toString();
}
const f = (value: number, unit: string) =>
  formatOscillationValue(value) + (unit ? " " + unit : "");

export function calculateOscillationWorkflow(
  id: OscillationWorkflowId,
  controls: Readonly<Record<OscillationControlKey, number>>,
): OscillationAnalysis {
  if (id === "shm") {
    const parameters = {
      amplitudeMetres: controls.a / 100,
      angularFrequencyRadiansPerSecond: controls.b,
      phaseRadians: 0,
      massKilograms: controls.c,
    };
    const samples = unwrap(sampleShm(parameters, 10, 201));
    const currentGraphIndex = Math.round(controls.d / 0.05);
    const state = samples[currentGraphIndex]!;
    return {
      values: [
        ["Displacement x", f(state.displacementMetres, "m")],
        ["Velocity v", f(state.velocityMetresPerSecond, "m s⁻¹")],
        [
          "Acceleration a",
          f(state.accelerationMetresPerSecondSquared, "m s⁻²"),
        ],
        ["Restoring force F", f(state.forceNewtons, "N")],
        ["Total energy", f(state.totalEnergyJoules, "J")],
      ],
      validation:
        "Mass, x/v/a/F vectors, energy bars and graph followers share this exact named-time sample.",
      graph: samples.map((sample) => ({
        time: sample.timeSeconds,
        displacement: sample.displacementMetres,
        velocity: sample.velocityMetresPerSecond,
        acceleration: sample.accelerationMetresPerSecondSquared,
        kineticEnergy: sample.kineticEnergyJoules,
        potentialEnergy: sample.potentialEnergyJoules,
        totalEnergy: sample.totalEnergyJoules,
      })),
      resonance: [],
      currentGraphIndex,
      state: {
        time: state.timeSeconds,
        amplitude: parameters.amplitudeMetres,
        displacement: state.displacementMetres,
        velocity: state.velocityMetresPerSecond,
        acceleration: state.accelerationMetresPerSecondSquared,
        force: state.forceNewtons,
        kineticEnergy: state.kineticEnergyJoules,
        potentialEnergy: state.potentialEnergyJoules,
        totalEnergy: state.totalEnergyJoules,
        phase: state.phaseRadians,
      },
    };
  }
  if (id === "pendulum") {
    const parameters = {
      lengthMetres: controls.a,
      angularAmplitudeRadians: (controls.b * Math.PI) / 180,
      gravitationalAccelerationMetresPerSecondSquared: 9.81,
      massKilograms: controls.c,
    };
    const state = unwrap(evaluateSmallAnglePendulum(parameters, controls.d));
    const samples = Array.from({ length: 201 }, (_, index) =>
      unwrap(evaluateSmallAnglePendulum(parameters, index * 0.05)),
    );
    return {
      values: [
        ["Angle", f((state.angleRadians * 180) / Math.PI, "°")],
        ["Arc displacement", f(state.arcDisplacementMetres, "m")],
        ["Period", f(state.periodSeconds, "s")],
        [
          "Angular frequency",
          f(state.angularFrequencyRadiansPerSecond, "rad s⁻¹"),
        ],
      ],
      validation:
        "Angle, bob position, energy and period share one disclosed small-angle model.",
      graph: samples.map((sample) => ({
        time: sample.timeSeconds,
        displacement: sample.arcDisplacementMetres,
        velocity: sample.angularVelocityRadiansPerSecond * controls.a,
        acceleration:
          -(sample.angularFrequencyRadiansPerSecond ** 2) *
          sample.arcDisplacementMetres,
        kineticEnergy: sample.kineticEnergyJoules,
        potentialEnergy: sample.smallAnglePotentialEnergyJoules,
        totalEnergy:
          sample.kineticEnergyJoules + sample.smallAnglePotentialEnergyJoules,
      })),
      resonance: [],
      currentGraphIndex: Math.round(controls.d / 0.05),
      state: {
        time: state.timeSeconds,
        angle: state.angleRadians,
        displacement: state.arcDisplacementMetres,
        period: state.periodSeconds,
        kineticEnergy: state.kineticEnergyJoules,
        potentialEnergy: state.smallAnglePotentialEnergyJoules,
      },
    };
  }
  if (id === "damping") {
    const parameters = {
      massKilograms: 1,
      springConstantNewtonsPerMetre: controls.b,
      dampingKilogramsPerSecond: controls.c,
      driveForceAmplitudeNewtons: 0,
      driveAngularFrequencyRadiansPerSecond: 0,
    };
    let state = {
      timeSeconds: 0,
      displacementMetres: controls.a / 100,
      velocityMetresPerSecond: 0,
    };
    const graph: OscillationGraphPoint[] = [];
    const steps = Math.round(controls.d / 0.01);
    for (let index = 1; index <= steps; index += 1) {
      const frame = unwrap(stepDrivenOscillator(state, parameters, 0.01));
      state = frame;
      if (index === 1 || index % 10 === 0 || index === steps)
        graph.push({
          time: frame.timeSeconds,
          displacement: frame.displacementMetres,
          velocity: frame.velocityMetresPerSecond,
          acceleration: frame.accelerationMetresPerSecondSquared,
          kineticEnergy: frame.kineticEnergyJoules,
          potentialEnergy: frame.potentialEnergyJoules,
          totalEnergy: frame.mechanicalEnergyJoules,
        });
    }
    const final = unwrap(evaluateDrivenOscillatorFrame(state, parameters));
    return {
      values: [
        ["Displacement", f(final.displacementMetres, "m")],
        ["Velocity", f(final.velocityMetresPerSecond, "m s⁻¹")],
        ["Mechanical energy", f(final.mechanicalEnergyJoules, "J")],
        ["Dissipated power", f(final.dissipatedPowerWatts, "W")],
      ],
      validation:
        "ODE state, envelope and energy derive from one fixed-step damped trajectory.",
      graph,
      resonance: [],
      currentGraphIndex: graph.length - 1,
      state: {
        time: state.timeSeconds,
        displacement: final.displacementMetres,
        velocity: final.velocityMetresPerSecond,
        energy: final.mechanicalEnergyJoules,
        damping: controls.c,
      },
    };
  }
  if (id === "resonance") {
    const parameters = {
      massKilograms: 1,
      springConstantNewtonsPerMetre: controls.c,
      dampingKilogramsPerSecond: controls.b,
      driveForceAmplitudeNewtons: controls.d,
    };
    const selected = unwrap(
      drivenSteadyResponse({
        ...parameters,
        driveAngularFrequencyRadiansPerSecond: controls.a,
      }),
    );
    const curve = unwrap(resonanceCurve(parameters, 0, 12, 121));
    const resonance = curve.map((point) => ({
      frequency: point.drivingAngularFrequencyRadiansPerSecond,
      amplitude: point.amplitudeMetres,
      phase: point.phaseLagRadians,
    }));
    const currentGraphIndex = Math.round(controls.a / 0.1);
    return {
      values: [
        ["Response amplitude", f(selected.amplitudeMetres, "m")],
        ["Phase lag", f((selected.phaseLagRadians * 180) / Math.PI, "°")],
        [
          "Natural frequency",
          f(selected.naturalAngularFrequencyRadiansPerSecond, "rad s⁻¹"),
        ],
        ["Damping ratio", f(selected.dampingRatio, "")],
      ],
      validation:
        "Selected response, phase marker and curve share the linear driven-response model.",
      graph: [],
      resonance,
      currentGraphIndex,
      state: {
        driveFrequency: controls.a,
        amplitude: selected.amplitudeMetres,
        phase: selected.phaseLagRadians,
        naturalFrequency: selected.naturalAngularFrequencyRadiansPerSecond,
        dampingRatio: selected.dampingRatio,
      },
    };
  }
  const parameters = {
    massKilograms: 1,
    groundingSpringConstantNewtonsPerMetre: 9,
    couplingSpringConstantNewtonsPerMetre: controls.c,
    symmetricAmplitudeMetres: controls.a / 100,
    antisymmetricAmplitudeMetres: controls.b / 100,
  };
  const state = unwrap(evaluateCoupledOscillators(parameters, controls.d));
  const samples = Array.from({ length: 201 }, (_, index) =>
    unwrap(evaluateCoupledOscillators(parameters, index * 0.05)),
  );
  return {
    values: [
      ["Mass A displacement", f(state.firstDisplacementMetres, "m")],
      ["Mass B displacement", f(state.secondDisplacementMetres, "m")],
      [
        "Symmetric frequency",
        f(state.symmetricAngularFrequencyRadiansPerSecond, "rad s⁻¹"),
      ],
      [
        "Antisymmetric frequency",
        f(state.antisymmetricAngularFrequencyRadiansPerSecond, "rad s⁻¹"),
      ],
    ],
    validation:
      "One coupled model owns both mass positions and both normal-mode phases.",
    graph: samples.map((sample) => ({
      time: sample.timeSeconds,
      displacement: sample.firstDisplacementMetres,
      velocity: sample.secondDisplacementMetres,
      acceleration: 0,
      kineticEnergy: 0,
      potentialEnergy: 0,
      totalEnergy: 0,
    })),
    resonance: [],
    currentGraphIndex: Math.round(controls.d / 0.05),
    state: {
      time: state.timeSeconds,
      first: state.firstDisplacementMetres,
      second: state.secondDisplacementMetres,
      symmetricFrequency: state.symmetricAngularFrequencyRadiansPerSecond,
      antisymmetricFrequency:
        state.antisymmetricAngularFrequencyRadiansPerSecond,
    },
  };
}
