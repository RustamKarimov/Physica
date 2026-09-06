import {
  finiteThermalIssue,
  invalidThermal,
  thermalIssue,
  validThermal,
  type ThermalResult,
} from "./types";

export const CELSIUS_ZERO_KELVIN = 273.15;

export interface TemperaturePair {
  readonly kelvin: number;
  readonly celsius: number;
}

export function fromCelsius(celsius: number): ThermalResult<TemperaturePair> {
  const finite = finiteThermalIssue({ celsius });
  if (finite) return invalidThermal(finite);
  const kelvin = celsius + CELSIUS_ZERO_KELVIN;
  if (kelvin < 0)
    return invalidThermal(
      thermalIssue(
        "thermal.below-absolute-zero",
        "Temperature cannot be below absolute zero.",
        "celsius",
      ),
    );
  return validThermal({ kelvin, celsius });
}

export function fromKelvin(kelvin: number): ThermalResult<TemperaturePair> {
  const finite = finiteThermalIssue({ kelvin });
  if (finite) return invalidThermal(finite);
  if (kelvin < 0)
    return invalidThermal(
      thermalIssue(
        "thermal.negative-kelvin",
        "Absolute temperature must be non-negative.",
        "kelvin",
      ),
    );
  return validThermal({ kelvin, celsius: kelvin - CELSIUS_ZERO_KELVIN });
}

export interface ThermometricCalibration {
  readonly icePointProperty: number;
  readonly steamPointProperty: number;
  readonly measuredProperty: number;
  readonly celsius: number;
  readonly kelvin: number;
  readonly fractionBetweenFixedPoints: number;
}

export function calibrateThermometricProperty(
  icePointProperty: number,
  steamPointProperty: number,
  measuredProperty: number,
): ThermalResult<ThermometricCalibration> {
  const finite = finiteThermalIssue({
    icePointProperty,
    steamPointProperty,
    measuredProperty,
  });
  if (finite) return invalidThermal(finite);
  if (steamPointProperty === icePointProperty)
    return invalidThermal(
      thermalIssue(
        "thermal.degenerate-calibration",
        "Fixed-point properties must be different.",
        "steamPointProperty",
      ),
    );
  const fractionBetweenFixedPoints =
    (measuredProperty - icePointProperty) /
    (steamPointProperty - icePointProperty);
  const celsius = 100 * fractionBetweenFixedPoints;
  const converted = fromCelsius(celsius);
  if (!converted.ok) return converted;
  return validThermal({
    icePointProperty,
    steamPointProperty,
    measuredProperty,
    celsius,
    kelvin: converted.value.kelvin,
    fractionBetweenFixedPoints,
  });
}

export interface ThermalContactState {
  readonly timeSeconds: number;
  readonly bodyATemperatureKelvin: number;
  readonly bodyBTemperatureKelvin: number;
  readonly equilibriumTemperatureKelvin: number;
  readonly temperatureDifferenceKelvin: number;
  readonly totalThermalEnergyJoules: number;
}

export interface ThermalContactParameters {
  readonly bodyAInitialKelvin: number;
  readonly bodyBInitialKelvin: number;
  readonly bodyAHeatCapacityJoulesPerKelvin: number;
  readonly bodyBHeatCapacityJoulesPerKelvin: number;
  readonly conductanceWattsPerKelvin: number;
}

export function thermalContactAt(
  parameters: ThermalContactParameters,
  timeSeconds: number,
): ThermalResult<ThermalContactState> {
  const finite = finiteThermalIssue({ ...parameters, timeSeconds });
  if (finite) return invalidThermal(finite);
  if (
    parameters.bodyAInitialKelvin < 0 ||
    parameters.bodyBInitialKelvin < 0 ||
    parameters.bodyAHeatCapacityJoulesPerKelvin <= 0 ||
    parameters.bodyBHeatCapacityJoulesPerKelvin <= 0 ||
    parameters.conductanceWattsPerKelvin < 0 ||
    timeSeconds < 0
  )
    return invalidThermal(
      thermalIssue(
        "thermal.invalid-contact",
        "Temperatures, time and conductance must be non-negative and heat capacities positive.",
      ),
    );
  const ca = parameters.bodyAHeatCapacityJoulesPerKelvin;
  const cb = parameters.bodyBHeatCapacityJoulesPerKelvin;
  const equilibriumTemperatureKelvin =
    (ca * parameters.bodyAInitialKelvin + cb * parameters.bodyBInitialKelvin) /
    (ca + cb);
  const decayRate = parameters.conductanceWattsPerKelvin * (1 / ca + 1 / cb);
  const difference =
    (parameters.bodyAInitialKelvin - parameters.bodyBInitialKelvin) *
    Math.exp(-decayRate * timeSeconds);
  const bodyATemperatureKelvin =
    equilibriumTemperatureKelvin + (cb / (ca + cb)) * difference;
  const bodyBTemperatureKelvin =
    equilibriumTemperatureKelvin - (ca / (ca + cb)) * difference;
  return validThermal({
    timeSeconds,
    bodyATemperatureKelvin,
    bodyBTemperatureKelvin,
    equilibriumTemperatureKelvin,
    temperatureDifferenceKelvin:
      bodyATemperatureKelvin - bodyBTemperatureKelvin,
    totalThermalEnergyJoules:
      ca * bodyATemperatureKelvin + cb * bodyBTemperatureKelvin,
  });
}
