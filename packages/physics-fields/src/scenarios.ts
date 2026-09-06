import { idealTransformer, sinusoidalSignal, transmissionLoss } from "./ac";
import {
  advanceChargedParticleInUniformElectricField,
  electricFieldAt,
  electricPotentialAt,
  uniformPlateField,
} from "./electric";
import { sampleVectorField, traceFieldLine } from "./fields";
import {
  circularOrbit,
  gravitationalFieldAt,
  gravitationalPotentialAt,
} from "./gravity";
import {
  forceOnCurrent,
  inducedEmf,
  longSolenoidField,
  magneticCircularMotion,
  magneticFlux,
} from "./magnetic";
import { deepFreeze, vec3, type FieldResult } from "./types";

export const FIELD_EXAMPLE_IDS = Object.freeze([
  "gravity-field",
  "two-mass-zero-point",
  "gravitational-potential",
  "circular-orbit",
  "point-charge-field",
  "two-charge-field",
  "electric-potential",
  "charged-particle-plates",
  "force-on-current",
  "charged-particle-b",
  "solenoid-field",
  "electromagnetic-induction",
  "ac-waveform-rms",
  "transformer",
  "power-transmission",
] as const);

export type FieldExampleId = (typeof FIELD_EXAMPLE_IDS)[number];
export type FieldTopic = 13 | 18 | 20 | 21;

export interface FieldScenario {
  readonly id: FieldExampleId;
  readonly topic: FieldTopic;
  readonly title: string;
  readonly question: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly result: unknown;
  readonly representations: readonly string[];
  readonly assumptions: readonly string[];
}

function unwrap<T>(result: FieldResult<T>): T {
  if (!result.ok) throw new Error(result.issues[0]?.message);
  return result.value as T;
}

function details(id: FieldExampleId): Omit<FieldScenario, "id"> {
  const earth = {
    id: "earth",
    massKilograms: 5.972e24,
    positionMetres: vec3(0, 0, 0),
  };
  const charge = {
    id: "q",
    chargeCoulombs: 2e-9,
    positionMetres: vec3(0, 0, 0),
  };
  switch (id) {
    case "gravity-field": {
      const probe = vec3(6.371e6, 0, 0);
      const field = unwrap(gravitationalFieldAt([earth], probe));
      const samples = unwrap(
        sampleVectorField(
          (position) => gravitationalFieldAt([earth], position),
          [probe, vec3(0, 6.371e6, 0)],
        ),
      );
      return {
        topic: 13,
        title: "Earth gravitational field",
        question:
          "How do direction and magnitude change around a spherical source?",
        parameters: { sourceMassKilograms: earth.massKilograms, probe },
        result: { field, samples },
        representations: [
          "Earth",
          "field-vector grid",
          "field lines",
          "moving probe",
        ],
        assumptions: [
          "Newtonian point-mass exterior field",
          "Earth treated as spherical",
        ],
      };
    }
    case "two-mass-zero-point": {
      const sources = [
        { id: "left", massKilograms: 4e10, positionMetres: vec3(-3, 0, 0) },
        { id: "right", massKilograms: 4e10, positionMetres: vec3(3, 0, 0) },
      ];
      return {
        topic: 13,
        title: "Two-mass zero-field point",
        question: "Where do equal gravitational contributions cancel?",
        parameters: { sources, probe: vec3(0, 0, 0) },
        result: { field: unwrap(gravitationalFieldAt(sources, vec3(0, 0, 0))) },
        representations: [
          "two masses",
          "opposed field arrows",
          "zero-point marker",
        ],
        assumptions: ["Newtonian point masses", "linear superposition"],
      };
    }
    case "gravitational-potential":
      return {
        topic: 13,
        title: "Gravitational potential",
        question: "How are potential and field connected outside Earth?",
        parameters: { radiusMetres: 7e6 },
        result: {
          potentialJoulesPerKilogram: unwrap(
            gravitationalPotentialAt([earth], vec3(7e6, 0, 0)),
          ),
          fieldNewtonsPerKilogram: unwrap(
            gravitationalFieldAt([earth], vec3(7e6, 0, 0)),
          ),
        },
        representations: [
          "potential curve",
          "equipotential shells",
          "field arrow",
        ],
        assumptions: ["zero potential at infinity", "spherical Earth"],
      };
    case "circular-orbit":
      return {
        topic: 13,
        title: "Circular Earth orbit",
        question: "How do altitude, speed, period and energy remain linked?",
        parameters: { radiusMetres: 6.771e6, satelliteMassKilograms: 1000 },
        result: unwrap(circularOrbit(earth.massKilograms, 6.771e6, 1000)),
        representations: [
          "orbit",
          "velocity vector",
          "energy bars",
          "period clock",
        ],
        assumptions: ["circular Newtonian orbit", "Earth fixed at origin"],
      };
    case "point-charge-field": {
      const probe = vec3(0.25, 0, 0);
      return {
        topic: 18,
        title: "Point-charge field",
        question:
          "How does a positive charge set field direction and magnitude?",
        parameters: { charge, probe },
        result: {
          field: unwrap(electricFieldAt([charge], probe)),
          line: unwrap(
            traceFieldLine(
              (position) => electricFieldAt([charge], position),
              vec3(0.1, 0, 0),
              {
                stepMetres: 0.02,
                maxSteps: 8,
                maximumRadiusMetres: 0.3,
              },
            ),
          ),
        },
        representations: [
          "positive charge",
          "field lines",
          "vector-field probe",
        ],
        assumptions: ["electrostatic point charge", "vacuum"],
      };
    }
    case "two-charge-field": {
      const sources = [
        {
          id: "positive",
          chargeCoulombs: 2e-9,
          positionMetres: vec3(-0.1, 0, 0),
        },
        {
          id: "negative",
          chargeCoulombs: -2e-9,
          positionMetres: vec3(0.1, 0, 0),
        },
      ];
      return {
        topic: 18,
        title: "Two-charge electric field",
        question: "How do vector contributions form a dipole field?",
        parameters: { sources },
        result: {
          fieldAtTop: unwrap(electricFieldAt(sources, vec3(0, 0.1, 0))),
        },
        representations: [
          "positive and negative charge",
          "field lines",
          "vector grid",
        ],
        assumptions: ["electrostatic point charges", "linear superposition"],
      };
    }
    case "electric-potential":
      return {
        topic: 18,
        title: "Electric potential",
        question: "How does potential change with distance from a charge?",
        parameters: { charge, radiusMetres: 0.2 },
        result: {
          potentialVolts: unwrap(
            electricPotentialAt([charge], vec3(0.2, 0, 0)),
          ),
          fieldNewtonsPerCoulomb: unwrap(
            electricFieldAt([charge], vec3(0.2, 0, 0)),
          ),
        },
        representations: [
          "equipotential curves",
          "potential graph",
          "field probe",
        ],
        assumptions: [
          "zero potential at infinity",
          "electrostatic point charge",
        ],
      };
    case "charged-particle-plates": {
      const field = unwrap(
        uniformPlateField(200, 0.05),
      ).vectorNewtonsPerCoulomb;
      const initial = {
        positionMetres: vec3(0, 0, 0),
        velocityMetresPerSecond: vec3(2e7, 0, 0),
        timeSeconds: 0,
      };
      return {
        topic: 18,
        title: "Electron between parallel plates",
        question: "How does a uniform electric field deflect an electron?",
        parameters: {
          voltageVolts: 200,
          separationMetres: 0.05,
          durationSeconds: 1e-9,
        },
        result: unwrap(
          advanceChargedParticleInUniformElectricField(
            initial,
            -1.602176634e-19,
            9.1093837e-31,
            field,
            1e-9,
          ),
        ),
        representations: [
          "parallel plates",
          "electron",
          "force vector",
          "trajectory",
        ],
        assumptions: ["uniform field", "non-relativistic", "gravity neglected"],
      };
    }
    case "force-on-current":
      return {
        topic: 20,
        title: "Force on a current",
        question: "How do B, I, length and orientation set wire force?",
        parameters: {
          fieldTeslas: 0.4,
          currentAmperes: 3,
          lengthMetres: 0.2,
          angleRadians: Math.PI / 2,
        },
        result: {
          forceNewtons: unwrap(forceOnCurrent(0.4, 3, 0.2, Math.PI / 2)),
        },
        representations: [
          "wire",
          "current direction",
          "B field",
          "force vector",
        ],
        assumptions: ["uniform magnetic field", "straight active wire segment"],
      };
    case "charged-particle-b":
      return {
        topic: 20,
        title: "Charged particle in uniform B",
        question:
          "Why does magnetic force curve the path without changing speed?",
        parameters: {
          massKilograms: 1.67262192595e-27,
          speedMetresPerSecond: 2e6,
          chargeCoulombs: 1.602176634e-19,
          fieldTeslas: 0.5,
        },
        result: unwrap(
          magneticCircularMotion(1.67262192595e-27, 2e6, 1.602176634e-19, 0.5),
        ),
        representations: [
          "particle path",
          "velocity vector",
          "force vector",
          "B markers",
        ],
        assumptions: [
          "velocity perpendicular to uniform B",
          "non-relativistic",
        ],
      };
    case "solenoid-field":
      return {
        topic: 20,
        title: "Long-solenoid field",
        question: "How do turns density and current set the interior field?",
        parameters: { turns: 600, currentAmperes: 2, lengthMetres: 0.5 },
        result: { fieldTeslas: unwrap(longSolenoidField(600, 2, 0.5)) },
        representations: [
          "solenoid",
          "current arrows",
          "field lines",
          "Hall probe",
        ],
        assumptions: ["long ideal air-core solenoid", "uniform interior field"],
      };
    case "electromagnetic-induction": {
      const previousFlux = unwrap(magneticFlux(0.2, 0.01, 0));
      const currentFlux = unwrap(magneticFlux(0.5, 0.01, 0));
      return {
        topic: 20,
        title: "Electromagnetic induction",
        question: "How does changing flux linkage determine emf and polarity?",
        parameters: {
          turns: 200,
          previousFluxWebers: previousFlux,
          currentFluxWebers: currentFlux,
          deltaSeconds: 0.1,
        },
        result: {
          previousFlux,
          currentFlux,
          emfVolts: unwrap(inducedEmf(200, previousFlux, currentFlux, 0.1)),
        },
        representations: [
          "coil pair",
          "flux surface",
          "emf graph",
          "polarity arrow",
        ],
        assumptions: [
          "uniform flux through every turn",
          "constant rate over interval",
        ],
      };
    }
    case "ac-waveform-rms":
      return {
        topic: 21,
        title: "AC waveform and RMS",
        question: "How does RMS relate a sinusoid to equivalent heating?",
        parameters: { peakVolts: 325, frequencyHertz: 50, timeSeconds: 0.005 },
        result: unwrap(sinusoidalSignal(325, 50, 0.005)),
        representations: [
          "oscilloscope waveform",
          "RMS marker",
          "direction reversal",
        ],
        assumptions: ["ideal sinusoid", "steady frequency"],
      };
    case "transformer":
      return {
        topic: 21,
        title: "Ideal transformer",
        question:
          "How do turns set voltage, current and conserved ideal power?",
        parameters: {
          primaryTurns: 500,
          secondaryTurns: 100,
          primaryVoltageVolts: 230,
          primaryCurrentAmperes: 1,
        },
        result: unwrap(idealTransformer(500, 100, 230, 1)),
        representations: [
          "transformer core",
          "primary and secondary coils",
          "input/output waveforms",
        ],
        assumptions: ["ideal transformer", "no leakage or resistive loss"],
      };
    case "power-transmission":
      return {
        topic: 21,
        title: "Power transmission",
        question: "Why does stepping voltage up reduce line heating?",
        parameters: { powerWatts: 1e6, lineResistanceOhms: 4 },
        result: {
          lowVoltage: unwrap(transmissionLoss(1e6, 10_000, 4)),
          highVoltage: unwrap(transmissionLoss(1e6, 100_000, 4)),
        },
        representations: [
          "step-up transformer",
          "transmission line",
          "power-flow panel",
        ],
        assumptions: ["fixed transmitted input power", "purely resistive line"],
      };
  }
}

export function runFieldScenario(id: FieldExampleId): FieldScenario {
  return deepFreeze({ id, ...details(id) }) as FieldScenario;
}

export const FIELD_SCENARIOS = Object.freeze(
  FIELD_EXAMPLE_IDS.map(runFieldScenario),
);
