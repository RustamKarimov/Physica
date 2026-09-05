import { evaluateSuperposition, evaluateStandingWave } from "./superposition";
import { deepFreeze, type WaveResult } from "./types";
import {
  evaluateGaussianPulse,
  evaluateHarmonicWave,
  evaluateLongitudinalParticle,
  waveBoundaryCoefficients,
  type HarmonicWaveParameters,
} from "./waves";

export const WAVE_EXAMPLE_IDS = Object.freeze([
  "progressive-wave",
  "longitudinal-wave",
  "pulse-reflection",
  "wave-parameters",
  "superposition",
  "standing-wave",
] as const);
export type WaveExampleId = (typeof WAVE_EXAMPLE_IDS)[number];

export interface WaveScenario {
  readonly id: WaveExampleId;
  readonly topic: 7 | 8;
  readonly title: string;
  readonly question: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly result: unknown;
  readonly representations: readonly string[];
  readonly assumptions: readonly string[];
}

function unwrap<T>(result: WaveResult<T>): Readonly<T> {
  if (!result.ok) throw new Error(result.issues[0]?.message);
  return result.value;
}
function canonical<T>(value: T): T {
  if (typeof value === "number") {
    const rounded = Number(value.toFixed(8));
    return (Object.is(rounded, -0) ? 0 : rounded) as T;
  }
  if (Array.isArray(value)) return value.map(canonical) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, canonical(child)]),
    ) as T;
  return value;
}

const HARMONIC: HarmonicWaveParameters = Object.freeze({
  amplitudeMetres: 0.04,
  frequencyHertz: 2,
  wavelengthMetres: 1.5,
  phaseRadians: 0,
  direction: 1,
});

function detail(id: WaveExampleId): Omit<WaveScenario, "id"> {
  switch (id) {
    case "progressive-wave":
      return {
        topic: 7,
        title: "Progressive transverse wave",
        question:
          "How does phase travel while medium particles oscillate locally?",
        parameters: { ...HARMONIC, positionMetres: 0.4, timeSeconds: 0.3 },
        result: unwrap(evaluateHarmonicWave(HARMONIC, 0.4, 0.3)),
        representations: ["waveform", "phase marker", "particle-motion arrow"],
        assumptions: [
          "linear non-dispersive medium",
          "scalar transverse displacement",
        ],
      };
    case "longitudinal-wave":
      return {
        topic: 7,
        title: "Longitudinal compression wave",
        question: "How is particle motion distinguished from pattern motion?",
        parameters: {
          ...HARMONIC,
          equilibriumPositionMetres: 0.75,
          timeSeconds: 0.2,
        },
        result: unwrap(evaluateLongitudinalParticle(HARMONIC, 0.75, 0.2)),
        representations: [
          "particle row",
          "compression bands",
          "direction labels",
        ],
        assumptions: [
          "small longitudinal displacement",
          "no bulk material transport",
        ],
      };
    case "pulse-reflection":
      return {
        topic: 7,
        title: "Pulse reflection at a boundary",
        question:
          "How does an impedance change divide reflected and transmitted energy?",
        parameters: { incidentImpedance: 2, transmittedImpedance: 5 },
        result: {
          coefficients: unwrap(waveBoundaryCoefficients(2, 5)),
          incidentPulse: unwrap(
            evaluateGaussianPulse(
              {
                amplitudeMetres: 0.05,
                widthMetres: 0.2,
                initialCentreMetres: 0,
                speedMetresPerSecond: 3,
                direction: 1,
              },
              0.6,
              0.2,
            ),
          ),
        },
        representations: [
          "incident pulse",
          "reflected pulse",
          "transmitted pulse",
        ],
        assumptions: [
          "lossless ideal boundary",
          "one-dimensional scalar pulse",
        ],
      };
    case "wave-parameters":
      return {
        topic: 7,
        title: "Wave parameters",
        question: "How do frequency and wavelength set the pattern speed?",
        parameters: { frequencyHertz: 12, wavelengthMetres: 0.25 },
        result: unwrap(
          evaluateHarmonicWave(
            { ...HARMONIC, frequencyHertz: 12, wavelengthMetres: 0.25 },
            0,
            0,
          ),
        ),
        representations: [
          "wavelength ruler",
          "period marker",
          "waveform graph",
        ],
        assumptions: ["uniform wave speed", "single-frequency source"],
      };
    case "superposition": {
      const first = { ...HARMONIC, phaseRadians: 0 };
      const second = { ...HARMONIC, phaseRadians: Math.PI / 2 };
      return {
        topic: 8,
        title: "Two-wave superposition",
        question: "How do component displacements form one resultant?",
        parameters: { first, second, positionMetres: 0.2, timeSeconds: 0.1 },
        result: unwrap(evaluateSuperposition([first, second], 0.2, 0.1)),
        representations: ["component waves", "resultant wave"],
        assumptions: ["linear medium", "signed displacement addition"],
      };
    }
    case "standing-wave":
      return {
        topic: 8,
        title: "Standing wave",
        question:
          "Where do equal counter-propagating waves create nodes and antinodes?",
        parameters: {
          componentAmplitudeMetres: 0.03,
          frequencyHertz: 2,
          wavelengthMetres: 1,
          lengthMetres: 2,
          positionMetres: 0.25,
          timeSeconds: 0,
        },
        result: unwrap(
          evaluateStandingWave(
            {
              componentAmplitudeMetres: 0.03,
              frequencyHertz: 2,
              wavelengthMetres: 1,
              phaseRadians: 0,
              lengthMetres: 2,
            },
            0.25,
            0,
          ),
        ),
        representations: [
          "standing-wave envelope",
          "node markers",
          "antinode markers",
        ],
        assumptions: [
          "equal amplitude and frequency",
          "opposite propagation directions",
        ],
      };
  }
}

export function runWaveScenario(id: WaveExampleId): WaveScenario {
  return deepFreeze(canonical({ id, ...detail(id) })) as WaveScenario;
}

export const WAVE_SCENARIOS = Object.freeze(
  WAVE_EXAMPLE_IDS.map(runWaveScenario),
);
