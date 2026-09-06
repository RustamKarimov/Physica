import { finiteIssue, invalidField, validField } from "./types";

export function sinusoidalSignal(
  peak: number,
  frequencyHertz: number,
  timeSeconds: number,
  phaseRadians = 0,
) {
  const finite = finiteIssue({
    peak,
    frequencyHertz,
    timeSeconds,
    phaseRadians,
  });
  if (finite) return invalidField(finite);
  if (frequencyHertz <= 0)
    return invalidField({
      severity: "error",
      code: "ac.invalid-frequency",
      message: "Frequency must be positive.",
    });
  return validField({
    instantaneous:
      peak *
      Math.sin(2 * Math.PI * frequencyHertz * timeSeconds + phaseRadians),
    peak,
    rms: Math.abs(peak) / Math.sqrt(2),
    frequencyHertz,
    periodSeconds: 1 / frequencyHertz,
    phaseRadians,
  });
}

export function idealTransformer(
  primaryTurns: number,
  secondaryTurns: number,
  primaryVoltageVolts: number,
  primaryCurrentAmperes: number,
) {
  const finite = finiteIssue({
    primaryTurns,
    secondaryTurns,
    primaryVoltageVolts,
    primaryCurrentAmperes,
  });
  if (finite) return invalidField(finite);
  if (
    !Number.isSafeInteger(primaryTurns) ||
    !Number.isSafeInteger(secondaryTurns) ||
    primaryTurns < 1 ||
    secondaryTurns < 1
  )
    return invalidField({
      severity: "error",
      code: "ac.invalid-transformer",
      message: "Transformer turns must be positive integers.",
    });
  const turnsRatio = secondaryTurns / primaryTurns;
  const secondaryVoltageVolts = primaryVoltageVolts * turnsRatio;
  const secondaryCurrentAmperes = primaryCurrentAmperes / turnsRatio;
  return validField({
    turnsRatio,
    secondaryVoltageVolts,
    secondaryCurrentAmperes,
    inputPowerWatts: primaryVoltageVolts * primaryCurrentAmperes,
    outputPowerWatts: secondaryVoltageVolts * secondaryCurrentAmperes,
  });
}

export function transmissionLoss(
  powerWatts: number,
  transmissionVoltageVolts: number,
  lineResistanceOhms: number,
) {
  const finite = finiteIssue({
    powerWatts,
    transmissionVoltageVolts,
    lineResistanceOhms,
  });
  if (finite) return invalidField(finite);
  if (powerWatts < 0 || transmissionVoltageVolts <= 0 || lineResistanceOhms < 0)
    return invalidField({
      severity: "error",
      code: "ac.invalid-transmission",
      message:
        "Power and resistance cannot be negative and voltage must be positive.",
    });
  const currentAmperes = powerWatts / transmissionVoltageVolts;
  return validField({
    currentAmperes,
    lineLossWatts: currentAmperes ** 2 * lineResistanceOhms,
    deliveredPowerWatts: powerWatts - currentAmperes ** 2 * lineResistanceOhms,
  });
}
