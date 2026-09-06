import {
  electricityIssue,
  invalidElectricity,
  validElectricity,
  type ElectricityResult,
} from "./types";

export const VACUUM_PERMITTIVITY_FARADS_PER_METRE = 8.854_187_812_8e-12;

export interface CapacitorState {
  readonly capacitanceFarads: number;
  readonly voltageVolts: number;
  readonly chargeCoulombs: number;
  readonly energyJoules: number;
  readonly energyByChargeVoltageJoules: number;
  readonly energyByChargeSquaredJoules: number;
}
export function capacitorState(
  capacitanceFarads: number,
  voltageVolts: number,
): ElectricityResult<CapacitorState> {
  if (
    !Number.isFinite(capacitanceFarads) ||
    !Number.isFinite(voltageVolts) ||
    capacitanceFarads <= 0
  )
    return invalidElectricity(
      electricityIssue(
        "electricity.invalid-capacitor",
        "Capacitance must be positive and all capacitor values finite.",
      ),
    );
  const chargeCoulombs = capacitanceFarads * voltageVolts;
  const energyJoules = 0.5 * capacitanceFarads * voltageVolts ** 2;
  return validElectricity({
    capacitanceFarads,
    voltageVolts,
    chargeCoulombs,
    energyJoules,
    energyByChargeVoltageJoules: 0.5 * chargeCoulombs * voltageVolts,
    energyByChargeSquaredJoules: chargeCoulombs ** 2 / (2 * capacitanceFarads),
  });
}

export function equivalentCapacitance(
  capacitancesFarads: readonly number[],
  connection: "series" | "parallel",
): ElectricityResult<number> {
  if (
    capacitancesFarads.length === 0 ||
    capacitancesFarads.some((value) => !Number.isFinite(value) || value <= 0)
  )
    return invalidElectricity(
      electricityIssue(
        "electricity.invalid-capacitor-network",
        "A capacitor network needs positive finite capacitances.",
      ),
    );
  return validElectricity(
    connection === "parallel"
      ? capacitancesFarads.reduce((sum, value) => sum + value, 0)
      : 1 / capacitancesFarads.reduce((sum, value) => sum + 1 / value, 0),
  );
}

export interface ParallelPlateState {
  readonly areaSquareMetres: number;
  readonly separationMetres: number;
  readonly relativePermittivity: number;
  readonly capacitanceFarads: number;
}
export function parallelPlateCapacitance(
  areaSquareMetres: number,
  separationMetres: number,
  relativePermittivity = 1,
): ElectricityResult<ParallelPlateState> {
  if (
    ![areaSquareMetres, separationMetres, relativePermittivity].every(
      Number.isFinite,
    ) ||
    areaSquareMetres <= 0 ||
    separationMetres <= 0 ||
    relativePermittivity < 1
  )
    return invalidElectricity(
      electricityIssue(
        "electricity.invalid-plate-capacitor",
        "Plate area and separation must be positive; relative permittivity must be at least one.",
      ),
    );
  return validElectricity({
    areaSquareMetres,
    separationMetres,
    relativePermittivity,
    capacitanceFarads:
      (VACUUM_PERMITTIVITY_FARADS_PER_METRE *
        relativePermittivity *
        areaSquareMetres) /
      separationMetres,
  });
}

export interface RcTransientParameters {
  readonly sourceVoltageVolts: number;
  readonly resistanceOhms: number;
  readonly capacitanceFarads: number;
  readonly initialVoltageVolts: number;
}
export interface RcTransientState {
  readonly timeSeconds: number;
  readonly timeConstantSeconds: number;
  readonly voltageVolts: number;
  readonly chargeCoulombs: number;
  readonly currentAmps: number;
  readonly energyJoules: number;
  readonly completionFraction: number;
}
export function rcTransientState(
  parameters: RcTransientParameters,
  timeSeconds: number,
): ElectricityResult<RcTransientState> {
  if (
    ![
      parameters.sourceVoltageVolts,
      parameters.resistanceOhms,
      parameters.capacitanceFarads,
      parameters.initialVoltageVolts,
      timeSeconds,
    ].every(Number.isFinite) ||
    parameters.resistanceOhms <= 0 ||
    parameters.capacitanceFarads <= 0 ||
    timeSeconds < 0
  )
    return invalidElectricity(
      electricityIssue(
        "electricity.invalid-rc-transient",
        "RC values must be finite, R and C positive, and time non-negative.",
      ),
    );
  const timeConstantSeconds =
    parameters.resistanceOhms * parameters.capacitanceFarads;
  const decay = Math.exp(-timeSeconds / timeConstantSeconds);
  const voltageVolts =
    parameters.sourceVoltageVolts +
    (parameters.initialVoltageVolts - parameters.sourceVoltageVolts) * decay;
  const currentAmps =
    ((parameters.sourceVoltageVolts - parameters.initialVoltageVolts) /
      parameters.resistanceOhms) *
    decay;
  return validElectricity({
    timeSeconds,
    timeConstantSeconds,
    voltageVolts,
    chargeCoulombs: parameters.capacitanceFarads * voltageVolts,
    currentAmps,
    energyJoules: 0.5 * parameters.capacitanceFarads * voltageVolts ** 2,
    completionFraction:
      parameters.sourceVoltageVolts === parameters.initialVoltageVolts
        ? 1
        : 1 - decay,
  });
}
