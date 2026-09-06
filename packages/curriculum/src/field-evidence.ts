import {
  FIELD_EXAMPLE_IDS,
  fieldLibraryRequirementIds,
  runFieldScenario,
  type FieldTopic,
} from "@physica/physics-fields";
import type { CurriculumEvidenceSet } from "./index";

const FIELD_CAPABILITIES: Readonly<Record<FieldTopic, readonly string[]>> =
  Object.freeze({
    13: [
      "fields.newtonian-point-mass-gravity",
      "fields.gravitational-potential",
      "fields.superposition",
      "fields.orbital-integrator",
      "fields.circular-orbit",
    ],
    18: [
      "fields.point-charge-electric-field",
      "fields.uniform-electric-field",
      "fields.electric-potential",
      "fields.electric-superposition",
      "fields.charged-particle-dynamics",
      "fields.numerical-potential-extension",
    ],
    20: [
      "fields.magnetic-vector-field",
      "fields.lorentz-force",
      "fields.force-on-current",
      "fields.charged-particle-magnetic-motion",
      "fields.flux-induction",
      "fields.solenoid-approximation",
    ],
    21: [
      "fields.sinusoidal-source",
      "fields.rms",
      "fields.ideal-transformer",
      "fields.periodic-circuit-source",
      "fields.phasor-frequency-extension",
    ],
  });

export function fieldEvidence(topicNumber: FieldTopic): CurriculumEvidenceSet {
  return Object.freeze({
    capabilityIds: FIELD_CAPABILITIES[topicNumber],
    libraryItemIds: fieldLibraryRequirementIds(topicNumber),
    exampleIds: FIELD_EXAMPLE_IDS.filter(
      (id) => runFieldScenario(id).topic === topicNumber,
    ),
    scientificTestIds: [
      `fields.topic-${topicNumber}.reference`,
      `fields.topic-${topicNumber}.validation`,
    ],
    releaseGateIds:
      topicNumber === 13
        ? ["fields-alpha.gravity-shared-state"]
        : topicNumber === 18
          ? ["fields-alpha.electric-shared-state"]
          : topicNumber === 20
            ? ["fields-alpha.magnetic-shared-state"]
            : ["fields-alpha.ac-transformer-shared-state"],
  });
}
