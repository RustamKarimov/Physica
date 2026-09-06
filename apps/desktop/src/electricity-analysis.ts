import {
  chargeTransfer,
  componentCharacteristic,
  internalResistanceState,
  ohmicState,
  potentialDividerState,
  rcTransientState,
  resistivityState,
  solveElectricalNetwork,
} from "@physica/physics-electricity";
import type {
  ElectricityControlKey,
  ElectricityWorkflowId,
} from "./electricity-workflows";

export interface ElectricityAnalysis {
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
    | { readonly ok: true; readonly value: Readonly<T> }
    | {
        readonly ok: false;
        readonly issues: readonly { readonly message: string }[];
      },
): Readonly<T> {
  if (!result.ok) throw new Error(result.issues[0]?.message);
  return result.value;
}
export function formatElectricityValue(value: number): string {
  if (
    Math.abs(value) > 0 &&
    (Math.abs(value) < 0.001 || Math.abs(value) >= 10_000)
  )
    return value.toExponential(3);
  return Number(value.toFixed(4)).toString();
}
function f(value: number, unit: string) {
  return `${formatElectricityValue(value)} ${unit}`;
}

export function calculateElectricity(
  id: ElectricityWorkflowId,
  controls: Readonly<Record<ElectricityControlKey, number>>,
): ElectricityAnalysis {
  if (id === "charge-current") {
    const state = unwrap(chargeTransfer(controls.a, controls.b));
    return {
      values: [
        ["Transferred charge", f(state.transferredChargeCoulombs, "C")],
        ["Current", f(state.currentAmps, "A")],
        ["Direction", state.conventionalDirection],
      ],
      validation: "Q = It evaluated with signed conventional current.",
      graph: Array.from({ length: 41 }, (_, index) => {
        const x = (controls.b * index) / 40;
        return { x, y: controls.a * x };
      }),
      state: {
        charge: state.transferredChargeCoulombs,
        current: state.currentAmps,
      },
    };
  }
  if (id === "iv") {
    const ohmic = unwrap(
      componentCharacteristic("ohmic", controls.a, controls.b),
    );
    const filament = unwrap(
      componentCharacteristic("filament", controls.a, controls.b),
    );
    return {
      values: [
        ["Ohmic current", f(ohmic.currentAmps, "A")],
        ["Filament current", f(filament.currentAmps, "A")],
        ["Filament effective R", f(filament.effectiveResistanceOhms, "Ω")],
      ],
      validation:
        "Curves are static constitutive laws; no hidden thermal time state.",
      graph: Array.from({ length: 49 }, (_, index) => {
        const x = -12 + index * 0.5;
        return {
          x,
          y: unwrap(componentCharacteristic("ohmic", x, controls.b))
            .currentAmps,
          secondary: unwrap(componentCharacteristic("filament", x, controls.b))
            .currentAmps,
        };
      }),
      state: {
        voltage: controls.a,
        current: filament.currentAmps,
        resistance: filament.effectiveResistanceOhms,
      },
    };
  }
  if (id === "resistivity-power") {
    const geometry = unwrap(
      resistivityState(controls.a * 1e-9, controls.b, controls.c * 1e-6),
    );
    const electrical = unwrap(ohmicState(controls.d, geometry.resistanceOhms));
    return {
      values: [
        ["Resistance", f(geometry.resistanceOhms, "Ω")],
        ["Current", f(electrical.currentAmps, "A")],
        ["Power", f(electrical.powerWatts, "W")],
      ],
      validation:
        "Uniform geometry and all three ohmic power identities agree.",
      graph: Array.from({ length: 41 }, (_, index) => ({
        x: (controls.d * index) / 40,
        y: (controls.d * index) / 40 / geometry.resistanceOhms,
      })),
      state: {
        resistance: geometry.resistanceOhms,
        current: electrical.currentAmps,
        power: electrical.powerWatts,
      },
    };
  }
  if (id === "network") {
    const solved = unwrap(
      solveElectricalNetwork({
        nodes: ["ground", "supply", "junction"],
        groundNode: "ground",
        branches: [
          {
            id: "series",
            fromNode: "supply",
            toNode: "junction",
            resistanceOhms: controls.b,
          },
          {
            id: "branch-a",
            fromNode: "junction",
            toNode: "ground",
            resistanceOhms: controls.c,
          },
          ...(controls.e >= 0.5
            ? [
                {
                  id: "branch-b",
                  fromNode: "junction",
                  toNode: "ground",
                  resistanceOhms: controls.d,
                },
              ]
            : []),
        ],
        sources: [
          {
            id: "cell",
            positiveNode: "supply",
            negativeNode: "ground",
            emfVolts: controls.a,
          },
        ],
      }),
    );
    return {
      values: [
        ["Series current", f(solved.branchCurrentsAmps.series!, "A")],
        ["Branch A current", f(solved.branchCurrentsAmps["branch-a"]!, "A")],
        [
          "Branch B current",
          controls.e >= 0.5
            ? f(solved.branchCurrentsAmps["branch-b"]!, "A")
            : "open switch",
        ],
        ["Junction potential", f(solved.nodePotentialsVolts.junction!, "V")],
      ],
      validation: `KCL ${solved.maximumKclResidualAmps.toExponential(1)} A · KVL ${solved.maximumKvlResidualVolts.toExponential(1)} V`,
      graph: [],
      state: {
        source: controls.a,
        junction: solved.nodePotentialsVolts.junction!,
        seriesCurrent: solved.branchCurrentsAmps.series!,
        currentA: solved.branchCurrentsAmps["branch-a"]!,
        currentB: solved.branchCurrentsAmps["branch-b"] ?? 0,
        switchClosed: controls.e >= 0.5 ? 1 : 0,
      },
    };
  }
  if (id === "internal-divider") {
    const cell = unwrap(
      internalResistanceState(controls.a, controls.b, controls.c),
    );
    const total = 10_000;
    const lower = (controls.d / 100) * total;
    const divider = unwrap(
      potentialDividerState(
        cell.terminalPotentialDifferenceVolts,
        total - lower,
        lower,
      ),
    );
    return {
      values: [
        ["Circuit current", f(cell.currentAmps, "A")],
        ["Terminal p.d.", f(cell.terminalPotentialDifferenceVolts, "V")],
        ["Lost volts", f(cell.lostVolts, "V")],
        ["Divider output", f(divider.outputVoltageVolts, "V")],
      ],
      validation:
        "E = terminal p.d. + lost volts; divider is observed without loading.",
      graph: [],
      state: {
        emf: controls.a,
        terminal: cell.terminalPotentialDifferenceVolts,
        lost: cell.lostVolts,
        output: divider.outputVoltageVolts,
        fraction: controls.d / 100,
      },
    };
  }
  const parameters = {
    sourceVoltageVolts: controls.a,
    resistanceOhms: controls.b * 1000,
    capacitanceFarads: controls.c * 1e-6,
    initialVoltageVolts: 0,
  };
  const state = unwrap(rcTransientState(parameters, controls.d));
  const end = Math.max(controls.d, state.timeConstantSeconds * 5, 0.1);
  return {
    values: [
      ["Time constant", f(state.timeConstantSeconds, "s")],
      ["Capacitor voltage", f(state.voltageVolts, "V")],
      ["Charge", f(state.chargeCoulombs, "C")],
      ["Current", f(state.currentAmps, "A")],
      ["Stored energy", f(state.energyJoules, "J")],
    ],
    validation: "Exact analytical RC state sampled at the named-clock time.",
    graph: Array.from({ length: 101 }, (_, index) => {
      const x = (end * index) / 100;
      const sample = unwrap(rcTransientState(parameters, x));
      return {
        x,
        y: sample.voltageVolts,
        secondary: sample.currentAmps * controls.b * 1000,
      };
    }),
    state: {
      source: controls.a,
      voltage: state.voltageVolts,
      charge: state.chargeCoulombs,
      current: state.currentAmps,
      fraction: state.completionFraction,
      time: controls.d,
      tau: state.timeConstantSeconds,
    },
  };
}
