import {
  drivenSteadyResponse,
  evaluateShm,
  evaluateSmallAnglePendulum,
  resonanceCurve,
  sampleShm,
  stepDrivenOscillator,
  type OscillatorTransientFrame,
} from "./oscillations";
import { deepFreeze, type MechanicsResult } from "./types";

export const OSCILLATION_EXAMPLE_IDS = Object.freeze([
  "shm-linked-views",
  "pendulum-shm",
  "damped-oscillator",
  "resonance",
] as const);

export type OscillationExampleId = (typeof OSCILLATION_EXAMPLE_IDS)[number];

export interface OscillationScenario {
  readonly id: OscillationExampleId;
  readonly topic: 17;
  readonly title: string;
  readonly question: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly result: unknown;
  readonly representations: readonly string[];
  readonly assumptions: readonly string[];
}

function unwrap<T>(result: MechanicsResult<T>): Readonly<T> {
  if (!result.ok) throw new Error(result.issues[0]?.message);
  return result.value;
}

function details(id: OscillationExampleId): Omit<OscillationScenario, "id"> {
  switch (id) {
    case "shm-linked-views": {
      const parameters = {
        amplitudeMetres: 0.12,
        angularFrequencyRadiansPerSecond: 4,
        phaseRadians: 0.3,
        massKilograms: 0.5,
      };
      const state = unwrap(evaluateShm(parameters, 0.7));
      return {
        topic: 17,
        title: "Synchronized SHM views",
        question:
          "How do position, derivatives, force and energy remain synchronized while scrubbing?",
        parameters: { ...parameters, scrubTimeSeconds: 0.7 },
        result: {
          state,
          graphSamples: unwrap(
            sampleShm(parameters, 2 * state.periodSeconds, 65),
          ),
        },
        representations: [
          "mass and spring",
          "x/v/a/force followers",
          "linked time graphs",
          "energy bars",
        ],
        assumptions: ["linear restoring force", "no damping", "constant mass"],
      };
    }
    case "pendulum-shm": {
      const parameters = {
        lengthMetres: 1.2,
        angularAmplitudeRadians: 0.12,
        gravitationalAccelerationMetresPerSecondSquared: 9.81,
        massKilograms: 0.2,
      };
      return {
        topic: 17,
        title: "Small-angle pendulum",
        question: "When does a pendulum behave as simple harmonic motion?",
        parameters: { ...parameters, timeSeconds: 0.8 },
        result: unwrap(evaluateSmallAnglePendulum(parameters, 0.8)),
        representations: [
          "pendulum",
          "equilibrium and extremes",
          "angular displacement",
          "energy exchange",
        ],
        assumptions: [
          "small angular amplitude",
          "point bob",
          "rigid massless string",
        ],
      };
    }
    case "damped-oscillator": {
      const parameters = {
        massKilograms: 1,
        springConstantNewtonsPerMetre: 16,
        dampingKilogramsPerSecond: 0.8,
        driveForceAmplitudeNewtons: 0,
        driveAngularFrequencyRadiansPerSecond: 0,
      };
      let state: OscillatorTransientFrame = {
        timeSeconds: 0,
        displacementMetres: 0.2,
        velocityMetresPerSecond: 0,
        accelerationMetresPerSecondSquared: -3.2,
        restoringForceNewtons: -3.2,
        dampingForceNewtons: 0,
        drivingForceNewtons: 0,
        kineticEnergyJoules: 0,
        potentialEnergyJoules: 0.32,
        mechanicalEnergyJoules: 0.32,
        dissipatedPowerWatts: 0,
      };
      const energyTrace = [{ timeSeconds: 0, energyJoules: 0.32 }];
      for (let index = 1; index <= 400; index += 1) {
        state = unwrap(stepDrivenOscillator(state, parameters, 0.01));
        if (index % 40 === 0)
          energyTrace.push({
            timeSeconds: state.timeSeconds,
            energyJoules: state.mechanicalEnergyJoules,
          });
      }
      return {
        topic: 17,
        title: "Damped oscillator",
        question:
          "How does viscous damping reduce amplitude and mechanical energy?",
        parameters: {
          ...parameters,
          initialDisplacementMetres: 0.2,
          durationSeconds: 4,
        },
        result: { finalState: state, energyTrace },
        representations: [
          "mass-spring-damper",
          "damping envelope",
          "energy graph",
        ],
        assumptions: ["linear spring", "viscous damping", "fixed-step RK4"],
      };
    }
    case "resonance": {
      const parameters = {
        massKilograms: 1,
        springConstantNewtonsPerMetre: 25,
        dampingKilogramsPerSecond: 1.2,
        driveForceAmplitudeNewtons: 2,
      };
      return {
        topic: 17,
        title: "Driven resonance",
        question:
          "How do driving frequency and damping control amplitude and phase lag?",
        parameters: {
          ...parameters,
          selectedAngularFrequencyRadiansPerSecond: 5,
        },
        result: {
          selected: unwrap(
            drivenSteadyResponse({
              ...parameters,
              driveAngularFrequencyRadiansPerSecond: 5,
            }),
          ),
          curve: unwrap(resonanceCurve(parameters, 0, 10, 81)),
        },
        representations: [
          "driven spring",
          "resonance curve",
          "phase indicator",
          "driving-force marker",
        ],
        assumptions: ["linear steady-state response", "viscous damping"],
      };
    }
  }
}

export function runOscillationScenario(
  id: OscillationExampleId,
): OscillationScenario {
  return deepFreeze({ id, ...details(id) }) as OscillationScenario;
}

export const OSCILLATION_SCENARIOS = Object.freeze(
  OSCILLATION_EXAMPLE_IDS.map(runOscillationScenario),
);
