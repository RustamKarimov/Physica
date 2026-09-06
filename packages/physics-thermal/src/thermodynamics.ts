import { MOLAR_GAS_CONSTANT, solveIdealGas, type IdealGasState } from "./gas";
import {
  finiteThermalIssue,
  invalidThermal,
  thermalIssue,
  validThermal,
  type ThermalResult,
} from "./types";

export interface ThermodynamicState {
  readonly pressurePascals: number;
  readonly volumeCubicMetres: number;
  readonly temperatureKelvin: number;
  readonly amountMoles: number;
}

export type ThermodynamicProcessType =
  | "constant-volume"
  | "constant-pressure"
  | "isothermal"
  | "piecewise"
  | "cycle";

export interface ProcessPoint {
  readonly pressurePascals: number;
  readonly volumeCubicMetres: number;
  readonly temperatureKelvin: number;
}

export interface ThermodynamicProcess {
  readonly type: ThermodynamicProcessType;
  readonly initial: ThermodynamicState;
  readonly final: ThermodynamicState;
  readonly points: readonly ProcessPoint[];
  readonly workByGasJoules: number;
  readonly heatIntoGasJoules: number;
  readonly internalEnergyChangeJoules: number;
  readonly areaSegments: readonly Readonly<{
    fromVolumeCubicMetres: number;
    toVolumeCubicMetres: number;
    averagePressurePascals: number;
    signedWorkJoules: number;
  }>[];
  readonly signConvention: "deltaU = Q - W_by";
  readonly modelDisclosure: string;
}

function validatedState(
  state: ThermodynamicState,
): ThermalResult<ThermodynamicState> {
  const finite = finiteThermalIssue({ ...state });
  if (finite) return invalidThermal(finite);
  if (
    state.pressurePascals <= 0 ||
    state.volumeCubicMetres <= 0 ||
    state.temperatureKelvin <= 0 ||
    state.amountMoles <= 0
  )
    return invalidThermal(
      thermalIssue(
        "thermal.invalid-thermodynamic-state",
        "Pressure, volume, absolute temperature and amount must be positive.",
      ),
    );
  const identity =
    state.amountMoles * MOLAR_GAS_CONSTANT * state.temperatureKelvin;
  if (
    Math.abs(state.pressurePascals * state.volumeCubicMetres - identity) >
    Math.max(1e-9, Math.abs(identity) * 1e-9)
  )
    return invalidThermal(
      thermalIssue(
        "thermal.inconsistent-ideal-gas-state",
        "Thermodynamic state must satisfy pV=nRT.",
      ),
    );
  return validThermal(state);
}

function stateFromGas(state: IdealGasState): ThermodynamicState {
  return {
    pressurePascals: state.pressurePascals,
    volumeCubicMetres: state.volumeCubicMetres,
    temperatureKelvin: state.temperatureKelvin,
    amountMoles: state.amountMoles,
  };
}

function internalEnergy(state: ThermodynamicState): number {
  return 1.5 * state.amountMoles * MOLAR_GAS_CONSTANT * state.temperatureKelvin;
}

function assemble(
  type: ThermodynamicProcessType,
  initial: ThermodynamicState,
  final: ThermodynamicState,
  points: readonly ProcessPoint[],
  workByGasJoules: number,
  disclosure: string,
  segmentWork?: (previous: ProcessPoint, point: ProcessPoint) => number,
): ThermodynamicProcess {
  const internalEnergyChangeJoules =
    internalEnergy(final) - internalEnergy(initial);
  const areaSegments = points.slice(1).map((point, index) => {
    const previous = points[index]!;
    const volumeChange = point.volumeCubicMetres - previous.volumeCubicMetres;
    const signedWorkJoules = segmentWork
      ? segmentWork(previous, point)
      : 0.5 * (previous.pressurePascals + point.pressurePascals) * volumeChange;
    const averagePressurePascals =
      volumeChange === 0
        ? (previous.pressurePascals + point.pressurePascals) / 2
        : signedWorkJoules / volumeChange;
    return {
      fromVolumeCubicMetres: previous.volumeCubicMetres,
      toVolumeCubicMetres: point.volumeCubicMetres,
      averagePressurePascals,
      signedWorkJoules,
    };
  });
  return {
    type,
    initial,
    final,
    points,
    workByGasJoules,
    heatIntoGasJoules: internalEnergyChangeJoules + workByGasJoules,
    internalEnergyChangeJoules,
    areaSegments,
    signConvention: "deltaU = Q - W_by",
    modelDisclosure: disclosure,
  };
}

export function constantVolumeProcess(
  initial: ThermodynamicState,
  finalTemperatureKelvin: number,
): ThermalResult<ThermodynamicProcess> {
  const valid = validatedState(initial);
  if (!valid.ok) return valid;
  const gas = solveIdealGas(
    {
      volumeCubicMetres: initial.volumeCubicMetres,
      temperatureKelvin: finalTemperatureKelvin,
      amountMoles: initial.amountMoles,
    },
    "pressurePascals",
  );
  if (!gas.ok) return gas;
  const final = stateFromGas(gas.value);
  return validThermal(
    assemble(
      "constant-volume",
      initial,
      final,
      [{ ...initial }, { ...final }],
      0,
      "Monatomic ideal gas heated or cooled at fixed volume.",
    ),
  );
}

export function constantPressureProcess(
  initial: ThermodynamicState,
  finalTemperatureKelvin: number,
): ThermalResult<ThermodynamicProcess> {
  const valid = validatedState(initial);
  if (!valid.ok) return valid;
  const gas = solveIdealGas(
    {
      pressurePascals: initial.pressurePascals,
      temperatureKelvin: finalTemperatureKelvin,
      amountMoles: initial.amountMoles,
    },
    "volumeCubicMetres",
  );
  if (!gas.ok) return gas;
  const final = stateFromGas(gas.value);
  const work =
    initial.pressurePascals *
    (final.volumeCubicMetres - initial.volumeCubicMetres);
  return validThermal(
    assemble(
      "constant-pressure",
      initial,
      final,
      [{ ...initial }, { ...final }],
      work,
      "Monatomic ideal gas under a constant external pressure.",
    ),
  );
}

export function isothermalProcess(
  initial: ThermodynamicState,
  finalVolumeCubicMetres: number,
  sampleCount = 16,
): ThermalResult<ThermodynamicProcess> {
  const valid = validatedState(initial);
  if (!valid.ok) return valid;
  if (
    !Number.isFinite(finalVolumeCubicMetres) ||
    finalVolumeCubicMetres <= 0 ||
    !Number.isSafeInteger(sampleCount) ||
    sampleCount < 2 ||
    sampleCount > 256
  )
    return invalidThermal(
      thermalIssue(
        "thermal.invalid-isothermal-path",
        "Final volume must be positive and sampling must contain 2–256 points.",
      ),
    );
  const gas = solveIdealGas(
    {
      volumeCubicMetres: finalVolumeCubicMetres,
      temperatureKelvin: initial.temperatureKelvin,
      amountMoles: initial.amountMoles,
    },
    "pressurePascals",
  );
  if (!gas.ok) return gas;
  const final = stateFromGas(gas.value);
  const points = Array.from({ length: sampleCount }, (_, index) => {
    const fraction = index / (sampleCount - 1);
    const volume =
      initial.volumeCubicMetres +
      fraction * (finalVolumeCubicMetres - initial.volumeCubicMetres);
    return {
      volumeCubicMetres: volume,
      pressurePascals:
        (initial.amountMoles * MOLAR_GAS_CONSTANT * initial.temperatureKelvin) /
        volume,
      temperatureKelvin: initial.temperatureKelvin,
    };
  });
  const work =
    initial.amountMoles *
    MOLAR_GAS_CONSTANT *
    initial.temperatureKelvin *
    Math.log(finalVolumeCubicMetres / initial.volumeCubicMetres);
  return validThermal(
    assemble(
      "isothermal",
      initial,
      final,
      points,
      work,
      "Quasi-static ideal-gas isothermal path with an exact logarithmic work integral.",
      (previous, point) =>
        initial.amountMoles *
        MOLAR_GAS_CONSTANT *
        initial.temperatureKelvin *
        Math.log(point.volumeCubicMetres / previous.volumeCubicMetres),
    ),
  );
}

export function piecewiseProcess(
  amountMoles: number,
  points: readonly ProcessPoint[],
  closedCycle = false,
): ThermalResult<ThermodynamicProcess> {
  if (
    !Number.isFinite(amountMoles) ||
    amountMoles <= 0 ||
    points.length < 2 ||
    points.some(
      (point) =>
        !Object.values(point).every(Number.isFinite) ||
        point.pressurePascals <= 0 ||
        point.volumeCubicMetres <= 0 ||
        point.temperatureKelvin <= 0 ||
        Math.abs(
          point.pressurePascals * point.volumeCubicMetres -
            amountMoles * MOLAR_GAS_CONSTANT * point.temperatureKelvin,
        ) >
          Math.max(
            1e-9,
            amountMoles * MOLAR_GAS_CONSTANT * point.temperatureKelvin * 1e-9,
          ),
    )
  )
    return invalidThermal(
      thermalIssue(
        "thermal.invalid-process-path",
        "Every process point must be a finite, positive and consistent ideal-gas state.",
      ),
    );
  const first = points[0]!;
  const last = points.at(-1)!;
  const alreadyClosed =
    first.pressurePascals === last.pressurePascals &&
    first.volumeCubicMetres === last.volumeCubicMetres &&
    first.temperatureKelvin === last.temperatureKelvin;
  const path = closedCycle
    ? [...points, ...(alreadyClosed ? [] : [first])]
    : [...points];
  const work = path.slice(1).reduce((sum, point, index) => {
    const previous = path[index]!;
    return (
      sum +
      0.5 *
        (previous.pressurePascals + point.pressurePascals) *
        (point.volumeCubicMetres - previous.volumeCubicMetres)
    );
  }, 0);
  const initial = { ...path[0]!, amountMoles };
  const final = { ...path.at(-1)!, amountMoles };
  return validThermal(
    assemble(
      closedCycle ? "cycle" : "piecewise",
      initial,
      final,
      path,
      work,
      "Piecewise-linear P–V path using a deterministic signed trapezoidal work integral.",
    ),
  );
}
