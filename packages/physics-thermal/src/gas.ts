import {
  finiteThermalIssue,
  invalidThermal,
  thermalIssue,
  validThermal,
  type ThermalResult,
} from "./types";

export const MOLAR_GAS_CONSTANT = 8.31446261815324;
export const BOLTZMANN_CONSTANT = 1.380649e-23;

export interface IdealGasState {
  readonly pressurePascals: number;
  readonly volumeCubicMetres: number;
  readonly temperatureKelvin: number;
  readonly amountMoles: number;
  readonly pVJoules: number;
  readonly nRTJoules: number;
  readonly meanTranslationalKineticEnergyJoules: number;
  readonly modelDisclosure: string;
}

export type IdealGasUnknown =
  "pressurePascals" | "volumeCubicMetres" | "temperatureKelvin" | "amountMoles";

export function solveIdealGas(
  known: Partial<Record<IdealGasUnknown, number>>,
  unknown: IdealGasUnknown,
): ThermalResult<IdealGasState> {
  const keys: IdealGasUnknown[] = [
    "pressurePascals",
    "volumeCubicMetres",
    "temperatureKelvin",
    "amountMoles",
  ];
  const supplied = keys.filter((key) => key !== unknown);
  if (
    supplied.some(
      (key) => !Number.isFinite(known[key]) || (known[key] as number) <= 0,
    )
  )
    return invalidThermal(
      thermalIssue(
        "thermal.invalid-gas-state",
        "The three known ideal-gas quantities must be finite and positive.",
      ),
    );
  const p = known.pressurePascals;
  const v = known.volumeCubicMetres;
  const t = known.temperatureKelvin;
  const n = known.amountMoles;
  const solved =
    unknown === "pressurePascals"
      ? ((n as number) * MOLAR_GAS_CONSTANT * (t as number)) / (v as number)
      : unknown === "volumeCubicMetres"
        ? ((n as number) * MOLAR_GAS_CONSTANT * (t as number)) / (p as number)
        : unknown === "temperatureKelvin"
          ? ((p as number) * (v as number)) /
            ((n as number) * MOLAR_GAS_CONSTANT)
          : ((p as number) * (v as number)) /
            (MOLAR_GAS_CONSTANT * (t as number));
  const values = { ...known, [unknown]: solved } as Record<
    IdealGasUnknown,
    number
  >;
  return validThermal({
    ...values,
    pVJoules: values.pressurePascals * values.volumeCubicMetres,
    nRTJoules:
      values.amountMoles * MOLAR_GAS_CONSTANT * values.temperatureKelvin,
    meanTranslationalKineticEnergyJoules:
      1.5 * BOLTZMANN_CONSTANT * values.temperatureKelvin,
    modelDisclosure:
      "Analytical ideal gas: point particles, negligible intermolecular forces and thermal equilibrium.",
  });
}

export interface GasChange {
  readonly initial: IdealGasState;
  readonly final: IdealGasState;
  readonly pressureRatio: number;
  readonly volumeRatio: number;
  readonly temperatureRatio: number;
  readonly velocityScaleFactor: number;
}

export function compareGasStates(
  initial: IdealGasState,
  final: IdealGasState,
): ThermalResult<GasChange> {
  const finite = finiteThermalIssue({
    initialPressure: initial.pressurePascals,
    finalPressure: final.pressurePascals,
  });
  if (finite) return invalidThermal(finite);
  if (
    initial.pressurePascals <= 0 ||
    initial.volumeCubicMetres <= 0 ||
    initial.temperatureKelvin <= 0 ||
    final.pressurePascals <= 0 ||
    final.volumeCubicMetres <= 0 ||
    final.temperatureKelvin <= 0
  )
    return invalidThermal(
      thermalIssue(
        "thermal.invalid-gas-comparison",
        "Compared gas states must use positive pressure, volume and absolute temperature.",
      ),
    );
  return validThermal({
    initial,
    final,
    pressureRatio: final.pressurePascals / initial.pressurePascals,
    volumeRatio: final.volumeCubicMetres / initial.volumeCubicMetres,
    temperatureRatio: final.temperatureKelvin / initial.temperatureKelvin,
    velocityScaleFactor: Math.sqrt(
      final.temperatureKelvin / initial.temperatureKelvin,
    ),
  });
}
