import {
  electricityIssue,
  finiteElectricityInputs,
  invalidElectricity,
  validElectricity,
  type ElectricityResult,
} from "./types";

export interface ChargeTransferState {
  readonly currentAmps: number;
  readonly durationSeconds: number;
  readonly transferredChargeCoulombs: number;
  readonly conventionalDirection: "positive" | "negative" | "stationary";
}

export function chargeTransfer(
  currentAmps: number,
  durationSeconds: number,
): ElectricityResult<ChargeTransferState> {
  const issues = finiteElectricityInputs({ currentAmps, durationSeconds });
  if (durationSeconds < 0)
    issues.push(
      electricityIssue(
        "electricity.negative-duration",
        "Transfer duration cannot be negative.",
        "durationSeconds",
      ),
    );
  if (issues.length > 0) return invalidElectricity(...issues);
  return validElectricity({
    currentAmps,
    durationSeconds,
    transferredChargeCoulombs: currentAmps * durationSeconds,
    conventionalDirection:
      currentAmps > 0
        ? "positive"
        : currentAmps < 0
          ? "negative"
          : "stationary",
  });
}

export interface OhmicState {
  readonly voltageVolts: number;
  readonly resistanceOhms: number;
  readonly currentAmps: number;
  readonly powerWatts: number;
  readonly powerByCurrentSquaredWatts: number;
  readonly powerByVoltageSquaredWatts: number;
}

export function ohmicState(
  voltageVolts: number,
  resistanceOhms: number,
): ElectricityResult<OhmicState> {
  const issues = finiteElectricityInputs({ voltageVolts, resistanceOhms });
  if (resistanceOhms <= 0)
    issues.push(
      electricityIssue(
        "electricity.invalid-resistance",
        "Resistance must be positive.",
        "resistanceOhms",
      ),
    );
  if (issues.length > 0) return invalidElectricity(...issues);
  const currentAmps = voltageVolts / resistanceOhms;
  const powerWatts = voltageVolts * currentAmps;
  return validElectricity({
    voltageVolts,
    resistanceOhms,
    currentAmps,
    powerWatts,
    powerByCurrentSquaredWatts: currentAmps ** 2 * resistanceOhms,
    powerByVoltageSquaredWatts: voltageVolts ** 2 / resistanceOhms,
  });
}

export interface ResistivityState {
  readonly resistivityOhmMetres: number;
  readonly lengthMetres: number;
  readonly crossSectionAreaSquareMetres: number;
  readonly resistanceOhms: number;
}

export function resistivityState(
  resistivityOhmMetres: number,
  lengthMetres: number,
  crossSectionAreaSquareMetres: number,
): ElectricityResult<ResistivityState> {
  const issues = finiteElectricityInputs({
    resistivityOhmMetres,
    lengthMetres,
    crossSectionAreaSquareMetres,
  });
  for (const [path, value] of Object.entries({
    resistivityOhmMetres,
    lengthMetres,
    crossSectionAreaSquareMetres,
  }))
    if (value <= 0)
      issues.push(
        electricityIssue(
          "electricity.invalid-geometry",
          `${path} must be positive.`,
          path,
        ),
      );
  if (issues.length > 0) return invalidElectricity(...issues);
  return validElectricity({
    resistivityOhmMetres,
    lengthMetres,
    crossSectionAreaSquareMetres,
    resistanceOhms:
      (resistivityOhmMetres * lengthMetres) / crossSectionAreaSquareMetres,
  });
}

export type CharacteristicKind = "ohmic" | "filament" | "thermistor" | "ldr";
export interface CharacteristicState {
  readonly kind: CharacteristicKind;
  readonly voltageVolts: number;
  readonly currentAmps: number;
  readonly effectiveResistanceOhms: number;
  readonly approximation: string;
}

export function componentCharacteristic(
  kind: CharacteristicKind,
  voltageVolts: number,
  control = 1,
): ElectricityResult<CharacteristicState> {
  const issues = finiteElectricityInputs({ voltageVolts, control });
  if (control <= 0)
    issues.push(
      electricityIssue(
        "electricity.invalid-component-control",
        "The component control parameter must be positive.",
        "control",
      ),
    );
  if (issues.length > 0) return invalidElectricity(...issues);
  let resistanceOhms: number;
  let approximation: string;
  if (kind === "ohmic") {
    resistanceOhms = 10 * control;
    approximation = "constant resistance at fixed temperature";
  } else if (kind === "filament") {
    resistanceOhms = 6 * control * (1 + 0.08 * Math.abs(voltageVolts));
    approximation = "static temperature-dependent teaching curve";
  } else if (kind === "thermistor") {
    resistanceOhms = 20 * Math.exp(-0.035 * (control - 1) * 25);
    approximation = "NTC exponential parameter at steady temperature";
  } else {
    resistanceOhms = 30 * control ** -0.7;
    approximation = "power-law light-dependent resistance";
  }
  return validElectricity({
    kind,
    voltageVolts,
    currentAmps: voltageVolts / resistanceOhms,
    effectiveResistanceOhms: resistanceOhms,
    approximation,
  });
}
