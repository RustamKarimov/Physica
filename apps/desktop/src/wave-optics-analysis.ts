import {
  doubleSlitIntensity,
  malusLaw,
  refractRay,
  thinLensImage,
  type OpticsResult,
} from "@physica/physics-optics";
import {
  evaluateHarmonicWave,
  evaluateStandingWave,
  type WaveResult,
} from "@physica/physics-waves";
import type { WaveOpticsWorkflowId } from "./wave-optics-workflows";

export interface WaveOpticsAnalysis {
  readonly raw: unknown;
  readonly values: readonly (readonly [string, string])[];
  readonly validation: string;
}

function unwrap<T>(result: WaveResult<T> | OpticsResult<T>): Readonly<T> {
  if (!result.ok)
    throw new Error(result.issues[0]?.message ?? "Invalid configuration.");
  return result.value;
}
export function formatWaveValue(value: number, digits = 3): string {
  return Number(value.toFixed(digits)).toString();
}

export function calculateWaveOptics(
  id: WaveOpticsWorkflowId,
  value: Readonly<Record<"a" | "b" | "c" | "d", number>>,
): WaveOpticsAnalysis {
  if (id === "progressive") {
    const parameters = {
      amplitudeMetres: value.a / 100,
      frequencyHertz: value.b,
      wavelengthMetres: value.c,
      phaseRadians: 0,
      direction: 1 as const,
    };
    const samples = Array.from({ length: 101 }, (_, index) => {
      const x = (4 * index) / 100;
      return { x, state: unwrap(evaluateHarmonicWave(parameters, x, value.d)) };
    });
    const probe = samples[50]!.state;
    return {
      raw: { parameters, samples, probe },
      values: [
        [
          "Pattern speed",
          `${formatWaveValue(probe.patternSpeedMetresPerSecond)} m s⁻¹`,
        ],
        [
          "Probe displacement",
          `${formatWaveValue(probe.displacementMetres * 100)} cm`,
        ],
        [
          "Particle velocity",
          `${formatWaveValue(probe.particleVelocityMetresPerSecond)} m s⁻¹`,
        ],
        ["Phase at probe", `${formatWaveValue(probe.phaseRadians)} rad`],
      ],
      validation:
        "Pattern speed and local particle velocity are distinct observables from one harmonic state.",
    };
  }
  if (id === "standing") {
    const parameters = {
      componentAmplitudeMetres: value.a / 100,
      frequencyHertz: value.b,
      wavelengthMetres: value.c,
      phaseRadians: 0,
      lengthMetres: 2,
    };
    const samples = Array.from({ length: 101 }, (_, index) => {
      const x = (2 * index) / 100;
      return { x, state: unwrap(evaluateStandingWave(parameters, x, value.d)) };
    });
    const state = samples[25]!.state;
    return {
      raw: { parameters, samples, state },
      values: [
        ["Node count", String(state.nodePositionsMetres.length)],
        ["Antinode count", String(state.antinodePositionsMetres.length)],
        [
          "Maximum envelope",
          `${formatWaveValue(2 * parameters.componentAmplitudeMetres * 100)} cm`,
        ],
      ],
      validation:
        "Nodes and antinodes are derived from the same counter-propagating-wave parameters.",
    };
  }
  if (id === "double-slit") {
    const parameters = {
      wavelengthMetres: value.a * 1e-9,
      slitSeparationMetres: value.b * 1e-3,
      slitWidthMetres: value.c * 1e-3,
      screenDistanceMetres: value.d,
      peakIntensity: 1,
    };
    const samples = Array.from({ length: 121 }, (_, index) => {
      const screenPositionMetres = (index - 60) * 0.0005;
      return {
        screenPositionMetres,
        state: unwrap(doubleSlitIntensity(parameters, screenPositionMetres)),
      };
    });
    const centre = samples[60]!.state;
    return {
      raw: { parameters, samples, centre },
      values: [
        [
          "Fringe spacing",
          `${formatWaveValue(centre.approximateFringeSpacingMetres * 1000)} mm`,
        ],
        ["Central intensity", formatWaveValue(centre.normalizedIntensity)],
        [
          "Central path difference",
          `${formatWaveValue(centre.pathDifferenceMetres)} m`,
        ],
      ],
      validation:
        "Screen strip and graph are the same bounded sample set from one aperture record.",
    };
  }
  if (id === "ray-lens") {
    const boundary = unwrap(refractRay(1, value.b, (value.a * Math.PI) / 180));
    const lens = unwrap(thinLensImage(0.2, value.c));
    return {
      raw: { boundary, lens, incidentAngleRadians: (value.a * Math.PI) / 180 },
      values: [
        [
          "Refracted angle",
          `${formatWaveValue((boundary.refractedAngleRadians! * 180) / Math.PI)}°`,
        ],
        ["Image distance", `${formatWaveValue(lens.imageDistanceMetres)} m`],
        ["Magnification", formatWaveValue(lens.magnification)],
        ["Image", lens.imageKind],
      ],
      validation:
        "Snell and thin-lens sign conventions are explicit; rays are schematic, not field trajectories.",
    };
  }
  const polarization = unwrap(malusLaw(value.a, (value.b * Math.PI) / 180));
  return {
    raw: { polarization, angleRadians: (value.b * Math.PI) / 180 },
    values: [
      [
        "Transmission",
        `${formatWaveValue(polarization.transmissionFraction * 100)}%`,
      ],
      [
        "Output intensity",
        `${formatWaveValue(polarization.transmittedIntensity)} W m⁻²`,
      ],
      ["Relative angle", `${formatWaveValue(value.b)}°`],
    ],
    validation:
      "Intensity follows Malus law for declared ideal linear polarizers.",
  };
}
