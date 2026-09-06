import {
  THERMAL_EXAMPLE_IDS,
  runThermalScenario,
  thermalLibraryRequirementIds,
  type ThermalTopic,
} from "@physica/physics-thermal";
import type { CurriculumEvidenceSet } from "./index";

const THERMAL_CAPABILITIES: Readonly<Record<ThermalTopic, readonly string[]>> =
  Object.freeze({
    14: [
      "thermal.temperature-scale",
      "thermal.thermometric-calibration",
      "thermal.macroscopic-state",
      "thermal.two-body-equilibrium",
    ],
    15: [
      "thermal.ideal-gas-state",
      "thermal.kinetic-observables",
      "thermal.hard-disk-gas",
      "thermal.seeded-brownian-tracer",
      "thermal.speed-distribution",
    ],
    16: [
      "thermal.thermodynamic-state",
      "thermal.first-law-ledger",
      "thermal.process-path",
      "thermal.pv-work",
      "thermal.cycle-extension",
    ],
  });

export function thermalEvidence(
  topicNumber: ThermalTopic,
): CurriculumEvidenceSet {
  return Object.freeze({
    capabilityIds: THERMAL_CAPABILITIES[topicNumber],
    libraryItemIds: thermalLibraryRequirementIds(topicNumber),
    exampleIds: THERMAL_EXAMPLE_IDS.filter(
      (id) => runThermalScenario(id).topic === topicNumber,
    ),
    scientificTestIds: [
      "thermal.topic-" + topicNumber + ".reference",
      "thermal.topic-" + topicNumber + ".validation",
    ],
    releaseGateIds:
      topicNumber === 14
        ? ["thermal-alpha.temperature-equilibrium-shared-state"]
        : topicNumber === 15
          ? ["thermal-alpha.particle-gas-deterministic-state"]
          : ["thermal-alpha.first-law-pv-shared-state"],
  });
}
