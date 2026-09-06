import {
  circularOrbit,
  electricFieldAt,
  electricPotentialAt,
  forceOnCurrent,
  gravitationalFieldAt,
  gravitationalPotentialAt,
  idealTransformer,
  inducedEmf,
  sinusoidalSignal,
  transmissionLoss,
  uniformPlateField,
  advanceChargedParticleInUniformElectricField,
  vec3,
} from "@physica/physics-fields";
import type { FieldControlKey, FieldWorkflowId } from "./field-workflows";

export interface FieldAnalysis {
  readonly values: readonly (readonly [string, string])[];
  readonly validation: string;
  readonly graph: readonly {
    readonly x: number;
    readonly y: number;
    readonly secondary?: number;
  }[];
  readonly state: Readonly<Record<string, number>>;
}

function unwrap<T>(
  result:
    | { readonly ok: true; readonly value: T }
    | {
        readonly ok: false;
        readonly issues: readonly { readonly message: string }[];
      },
): T {
  if (!result.ok) throw new Error(result.issues[0]?.message);
  return result.value;
}

export function formatFieldValue(value: number): string {
  if (
    Math.abs(value) > 0 &&
    (Math.abs(value) < 0.001 || Math.abs(value) >= 10_000)
  )
    return value.toExponential(3);
  return Number(value.toFixed(4)).toString();
}
const f = (value: number, unit: string) => `${formatFieldValue(value)} ${unit}`;
const earthMass = 5.972e24;

export function calculateFieldWorkflow(
  id: FieldWorkflowId,
  controls: Readonly<Record<FieldControlKey, number>>,
): FieldAnalysis {
  if (id === "gravity") {
    const source = {
      id: "earth",
      massKilograms: controls.a * earthMass,
      positionMetres: vec3(0, 0, 0),
    };
    const radius = controls.b * 1e6;
    const field = unwrap(gravitationalFieldAt([source], vec3(radius, 0, 0)));
    const potential = unwrap(
      gravitationalPotentialAt([source], vec3(radius, 0, 0)),
    );
    return {
      values: [
        ["Field magnitude", f(Math.abs(field.x), "N kg⁻¹")],
        ["Potential", f(potential, "J kg⁻¹")],
        ["Direction", "toward source ←"],
      ],
      validation:
        "Inverse-square field and scalar potential derive from the same source.",
      graph: Array.from({ length: 61 }, (_, index) => {
        const r = 6.4e6 + index * 0.55e6;
        return {
          x: r,
          y: Math.abs(unwrap(gravitationalFieldAt([source], vec3(r, 0, 0))).x),
        };
      }),
      state: { sourceSign: -1, field: field.x, potential, radius },
    };
  }
  if (id === "orbit") {
    const orbit = unwrap(
      circularOrbit(earthMass, controls.a * 1e6, controls.b),
    );
    return {
      values: [
        ["Orbital speed", f(orbit.speedMetresPerSecond, "m s⁻¹")],
        ["Period", f(orbit.periodSeconds / 3600, "h")],
        ["Total energy", f(orbit.totalEnergyJoules, "J")],
        ["Escape speed", f(orbit.escapeSpeedMetresPerSecond, "m s⁻¹")],
      ],
      validation:
        "Centripetal acceleration is supplied by the same Newtonian field.",
      graph: Array.from({ length: 81 }, (_, index) => {
        const angle = (2 * Math.PI * index) / 80;
        return { x: Math.cos(angle), y: Math.sin(angle) };
      }),
      state: {
        radius: controls.a,
        speed: orbit.speedMetresPerSecond,
        energy: orbit.totalEnergyJoules,
      },
    };
  }
  if (id === "electric-field") {
    const source = {
      id: "charge",
      chargeCoulombs: controls.a * 1e-9,
      positionMetres: vec3(0, 0, 0),
    };
    const field = unwrap(electricFieldAt([source], vec3(controls.b, 0, 0)));
    const potential = unwrap(
      electricPotentialAt([source], vec3(controls.b, 0, 0)),
    );
    return {
      values: [
        ["Electric field", f(field.x, "N C⁻¹")],
        ["Potential", f(potential, "V")],
        [
          "Direction",
          controls.a >= 0 ? "away from + source →" : "toward − source ←",
        ],
      ],
      validation: "E and V share one signed point-charge source.",
      graph: Array.from({ length: 61 }, (_, index) => {
        const r = 0.05 + index * 0.015;
        return {
          x: r,
          y: unwrap(electricPotentialAt([source], vec3(r, 0, 0))),
        };
      }),
      state: {
        sourceSign: Math.sign(controls.a),
        field: field.x,
        potential,
        radius: controls.b,
      },
    };
  }
  if (id === "particle") {
    const field = unwrap(
      uniformPlateField(controls.a, controls.b / 100),
    ).vectorNewtonsPerCoulomb;
    const duration = controls.d * 1e-9;
    const state = unwrap(
      advanceChargedParticleInUniformElectricField(
        {
          positionMetres: vec3(0, 0, 0),
          velocityMetresPerSecond: vec3(controls.c * 1e7, 0, 0),
          timeSeconds: 0,
        },
        -1.602176634e-19,
        9.1093837e-31,
        field,
        duration,
      ),
    );
    const acceleration = (-1.602176634e-19 * field.y) / 9.1093837e-31;
    return {
      values: [
        ["Field", f(field.y, "N C⁻¹")],
        ["Horizontal travel", f(state.positionMetres.x, "m")],
        ["Vertical deflection", f(state.positionMetres.y, "m")],
        ["Acceleration", f(acceleration, "m s⁻²")],
      ],
      validation:
        "Trajectory, force and plate field share one RK4-evaluated state.",
      graph: Array.from({ length: 61 }, (_, index) => {
        const t = (duration * index) / 60;
        return { x: controls.c * 1e7 * t, y: 0.5 * acceleration * t ** 2 };
      }),
      state: {
        field: field.y,
        x: state.positionMetres.x,
        y: state.positionMetres.y,
        sourceSign: -1,
      },
    };
  }
  if (id === "magnetic-force") {
    const force = unwrap(
      forceOnCurrent(
        controls.a,
        controls.b,
        controls.c,
        (controls.d * Math.PI) / 180,
      ),
    );
    return {
      values: [
        ["Wire force", f(force, "N")],
        [
          "Direction",
          force >= 0 ? "labelled + normal ⊙" : "labelled − normal ⊗",
        ],
        ["Angle", f(controls.d, "°")],
      ],
      validation:
        "Force sign and direction follow conventional current and B orientation.",
      graph: Array.from({ length: 181 }, (_, angle) => ({
        x: angle,
        y: unwrap(
          forceOnCurrent(
            controls.a,
            controls.b,
            controls.c,
            (angle * Math.PI) / 180,
          ),
        ),
      })),
      state: {
        field: controls.a,
        current: controls.b,
        force,
        angle: controls.d,
      },
    };
  }
  if (id === "induction") {
    const emf = unwrap(
      inducedEmf(Math.round(controls.a), 0, controls.b * 1e-3, controls.c),
    );
    return {
      values: [
        ["Induced emf", f(emf, "V")],
        ["Flux-linkage change", f(controls.a * controls.b * 1e-3, "Wb turns")],
        [
          "Lenz polarity",
          emf <= 0 ? "opposes increase −" : "opposes decrease +",
        ],
      ],
      validation:
        "The minus sign is preserved as physical polarity, not decorative animation.",
      graph: Array.from({ length: 41 }, (_, index) => ({
        x: (controls.c * index) / 40,
        y: emf,
      })),
      state: {
        turns: controls.a,
        fluxChange: controls.b * 1e-3,
        emf,
        sourceSign: Math.sign(emf),
      },
    };
  }
  if (id === "ac") {
    const time = controls.c / 1000;
    const signal = unwrap(sinusoidalSignal(controls.a, controls.b, time));
    return {
      values: [
        ["Instantaneous voltage", f(signal.instantaneous, "V")],
        ["Peak voltage", f(signal.peak, "V")],
        ["RMS voltage", f(signal.rms, "V")],
        ["Period", f(signal.periodSeconds * 1000, "ms")],
      ],
      validation:
        "Waveform cursor and RMS marker derive from one named-clock sinusoid.",
      graph: Array.from({ length: 101 }, (_, index) => {
        const t = (2 * signal.periodSeconds * index) / 100;
        return {
          x: t,
          y: unwrap(sinusoidalSignal(controls.a, controls.b, t)).instantaneous,
          secondary: signal.rms,
        };
      }),
      state: {
        time,
        instantaneous: signal.instantaneous,
        rms: signal.rms,
        phase: 2 * Math.PI * controls.b * time,
      },
    };
  }
  const transformer = unwrap(
    idealTransformer(
      Math.round(controls.a),
      Math.round(controls.b),
      controls.c,
      controls.d,
    ),
  );
  const transmission = unwrap(
    transmissionLoss(
      transformer.outputPowerWatts,
      Math.abs(transformer.secondaryVoltageVolts),
      4,
    ),
  );
  return {
    values: [
      ["Turns ratio", f(transformer.turnsRatio, "")],
      ["Secondary voltage", f(transformer.secondaryVoltageVolts, "V")],
      ["Secondary current", f(transformer.secondaryCurrentAmperes, "A")],
      ["Ideal power", f(transformer.outputPowerWatts, "W")],
      ["Line loss", f(transmission.lineLossWatts, "W")],
    ],
    validation:
      "Ideal input/output power agrees; line heating is shown separately.",
    graph: [],
    state: {
      ratio: transformer.turnsRatio,
      primary: controls.c,
      secondary: transformer.secondaryVoltageVolts,
      current: transformer.secondaryCurrentAmperes,
      power: transformer.outputPowerWatts,
      loss: transmission.lineLossWatts,
    },
  };
}
