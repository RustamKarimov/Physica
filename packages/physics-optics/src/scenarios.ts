import {
  doubleSlitIntensity,
  gratingIntensity,
  singleSlitIntensity,
  twoPointSourceIntensity,
} from "./diffraction";
import { malusLaw, refractRay, thinLensImage } from "./ray-optics";
import { validOptics, type OpticsResult } from "./types";

export const OPTICS_EXAMPLE_IDS = Object.freeze([
  "two-source-interference",
  "single-slit",
  "double-slit",
  "geometrical-optics-overview",
  "physical-optics-overview",
] as const);
export type OpticsExampleId = (typeof OPTICS_EXAMPLE_IDS)[number];

export interface OpticsScenario {
  readonly id: OpticsExampleId;
  readonly topic:
    8 | "extended-geometrical-optics" | "extended-physical-optics";
  readonly title: string;
  readonly question: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly result: unknown;
  readonly representations: readonly string[];
  readonly assumptions: readonly string[];
}

function unwrap<T>(result: OpticsResult<T>): Readonly<T> {
  if (!result.ok) throw new Error(result.issues[0]?.message);
  return result.value;
}
function canonical<T>(value: T): T {
  if (typeof value === "number") {
    const rounded = Number(value.toFixed(10));
    return (Object.is(rounded, -0) ? 0 : rounded) as T;
  }
  if (Array.isArray(value)) return value.map(canonical) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, canonical(child)]),
    ) as T;
  return value;
}

function detail(id: OpticsExampleId): Omit<OpticsScenario, "id"> {
  switch (id) {
    case "two-source-interference":
      return {
        topic: 8,
        title: "Two-source interference",
        question: "How does exact path difference control intensity?",
        parameters: {
          wavelengthMetres: 0.02,
          sourceSeparationMetres: 0.08,
          screenDistanceMetres: 2,
          screenPositionMetres: 0.25,
        },
        result: unwrap(twoPointSourceIntensity(0.02, 0.08, 2, 0.25)),
        representations: ["source geometry", "path ruler", "intensity strip"],
        assumptions: ["coherent point sources", "equal source intensity"],
      };
    case "single-slit":
      return {
        topic: 8,
        title: "Single-slit diffraction",
        question: "How does aperture width set the diffraction envelope?",
        parameters: {
          wavelengthMetres: 600e-9,
          slitWidthMetres: 0.12e-3,
          screenDistanceMetres: 2,
          screenPositionMetres: 0.01,
        },
        result: unwrap(singleSlitIntensity(600e-9, 0.12e-3, 2, 0.01, 1)),
        representations: [
          "slit geometry",
          "screen intensity",
          "diffraction graph",
        ],
        assumptions: ["Fraunhofer far field", "monochromatic scalar wave"],
      };
    case "double-slit": {
      const parameters = {
        wavelengthMetres: 550e-9,
        slitSeparationMetres: 0.3e-3,
        slitWidthMetres: 0.08e-3,
        screenDistanceMetres: 2,
        peakIntensity: 1,
      };
      return {
        topic: 8,
        title: "Double-slit intensity",
        question:
          "How do one aperture record and one model drive both screen and graph?",
        parameters: { ...parameters, screenPositionMetres: 0.004 },
        result: unwrap(doubleSlitIntensity(parameters, 0.004)),
        representations: [
          "double slit",
          "screen strip",
          "intensity graph",
          "fringe ruler",
        ],
        assumptions: [
          "coherent monochromatic sources",
          "Fraunhofer scalar far field",
        ],
      };
    }
    case "geometrical-optics-overview":
      return {
        topic: "extended-geometrical-optics",
        title: "Geometrical optics overview",
        question: "How do boundary and lens rules locate a ray and its image?",
        parameters: {
          incidentIndex: 1,
          transmittedIndex: 1.5,
          incidentAngleRadians: Math.PI / 6,
          focalLengthMetres: 0.2,
          objectDistanceMetres: 0.6,
        },
        result: {
          boundary: unwrap(refractRay(1, 1.5, Math.PI / 6)),
          lens: unwrap(thinLensImage(0.2, 0.6)),
        },
        representations: [
          "normal",
          "incident/refracted rays",
          "principal rays",
          "image marker",
        ],
        assumptions: [
          "thin lens",
          "geometrical rays",
          "paraxial principal-ray construction",
        ],
      };
    case "physical-optics-overview":
      return {
        topic: "extended-physical-optics",
        title: "Physical optics overview",
        question: "How do phase and polarization shape transmitted intensity?",
        parameters: {
          wavelengthMetres: 500e-9,
          slitSpacingMetres: 2e-6,
          sourceCount: 5,
          angleRadians: Math.asin(0.25),
          polarizerAngleRadians: Math.PI / 3,
        },
        result: {
          grating: unwrap(gratingIntensity(500e-9, 2e-6, 5, Math.asin(0.25))),
          polarization: unwrap(malusLaw(1, Math.PI / 3)),
        },
        representations: [
          "multi-slit wavefronts",
          "grating intensity",
          "polarizer axes",
        ],
        assumptions: [
          "finite coherent source array",
          "ideal linear polarizers",
        ],
      };
  }
}

export function runOpticsScenario(id: OpticsExampleId): OpticsScenario {
  const scenario = canonical({ id, ...detail(id) });
  return unwrap(validOptics(scenario)) as OpticsScenario;
}

export const OPTICS_SCENARIOS = Object.freeze(
  OPTICS_EXAMPLE_IDS.map(runOpticsScenario),
);
