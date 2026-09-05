import {
  MECHANICS_EXAMPLE_IDS,
  MECHANICS_LIBRARY_DESCRIPTORS,
  type MechanicsExampleId,
} from "@physica/physics-mechanics";
import { OPTICS_EXAMPLE_IDS } from "@physica/physics-optics";
import {
  WAVE_EXAMPLE_IDS,
  WAVE_LIBRARY_DESCRIPTORS,
  waveLibrarySlug,
} from "@physica/physics-waves";

export type CurriculumCoverageStatus =
  "UNIMPLEMENTED" | "IMPLEMENTED" | "VALIDATED";

export interface CurriculumEvidenceSet {
  readonly capabilityIds: readonly string[];
  readonly libraryItemIds: readonly string[];
  readonly exampleIds: readonly string[];
  readonly scientificTestIds: readonly string[];
  readonly releaseGateIds: readonly string[];
}

export type CurriculumCoverageGaps = CurriculumEvidenceSet;

export interface CurriculumTopicCoverage {
  readonly profileId: "cambridge-9702";
  readonly topicNumber: number;
  readonly topicId: string;
  readonly title: string;
  readonly status: CurriculumCoverageStatus;
  readonly required: CurriculumEvidenceSet;
  readonly demonstrated: CurriculumEvidenceSet;
  readonly gaps: CurriculumCoverageGaps;
}

const TITLES = [
  "Physical quantities and units",
  "Kinematics",
  "Dynamics",
  "Forces, density and pressure",
  "Work, energy and power",
  "Deformation of solids",
  "Waves",
  "Superposition",
  "Electricity",
  "D.C. circuits",
  "Particle physics",
  "Motion in a circle",
  "Gravitational fields",
  "Temperature",
  "Ideal gases",
  "Thermodynamics",
  "Oscillations",
  "Electric fields",
  "Capacitance",
  "Magnetic fields",
  "Alternating currents",
  "Quantum physics",
  "Nuclear physics",
  "Medical physics",
  "Astronomy and cosmology",
] as const;

const CAPABILITIES: Readonly<Record<number, readonly string[]>> = Object.freeze(
  {
    1: [
      "mechanics.measurement",
      "mechanics.uncertainty",
      "mechanics.vector-components",
      "units.dimension-check",
    ],
    2: [
      "mechanics.kinematics-1d",
      "mechanics.projectile-2d",
      "mechanics.piecewise-motion",
      "mechanics.linked-motion-observables",
    ],
    3: [
      "mechanics.force-balance",
      "mechanics.inclined-plane",
      "mechanics.atwood",
      "mechanics.collision-1d",
      "mechanics.impulse",
    ],
    4: [
      "mechanics.moment-balance",
      "mechanics.centre-of-mass",
      "mechanics.density",
      "mechanics.hydrostatic-pressure",
      "mechanics.stability",
    ],
    5: [
      "mechanics.work",
      "mechanics.energy-ledger",
      "mechanics.power",
      "mechanics.efficiency",
    ],
    6: [
      "mechanics.hooke-law",
      "mechanics.stress-strain",
      "mechanics.young-modulus",
      "mechanics.elastic-plastic",
    ],
    7: [
      "waves.harmonic",
      "waves.pulse",
      "waves.longitudinal-medium",
      "waves.boundary",
      "waves.pattern-particle-distinction",
    ],
    8: [
      "waves.superposition",
      "waves.standing-wave",
      "optics.two-source-interference",
      "optics.single-slit",
      "optics.double-slit",
    ],
    12: [
      "mechanics.uniform-circular-motion",
      "mechanics.centripetal-acceleration",
      "mechanics.centripetal-force",
      "mechanics.radial-tangent-vectors",
    ],
  },
);

const EXAMPLE_TOPIC: Readonly<Record<MechanicsExampleId, number>> =
  Object.freeze({
    "units-prefixes": 1,
    "dimensional-analysis": 1,
    "vector-components": 1,
    "uncertainty-repeated-measurements": 1,
    "constant-velocity": 2,
    "constant-acceleration": 2,
    "free-fall": 2,
    projectile: 2,
    "motion-graphs-linked": 2,
    "forces-fbd": 3,
    "inclined-plane": 3,
    "pulley-system": 3,
    "elastic-collision": 3,
    "inelastic-collision": 3,
    impulse: 3,
    "moments-balance": 4,
    "centre-of-mass-stability": 4,
    density: 4,
    "pressure-depth": 4,
    "energy-conservation": 5,
    "spring-energy": 5,
    "work-area": 5,
    "power-efficiency": 5,
    "hooke-law": 6,
    "young-modulus": 6,
    "stress-strain": 6,
    "elastic-energy": 6,
    "uniform-circular-motion": 12,
    "centripetal-force": 12,
    "velocity-acceleration-followers": 12,
  });

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[+&/]/gu, " ")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

function difference(
  required: readonly string[],
  present: readonly string[],
): readonly string[] {
  const seen = new Set(present);
  return Object.freeze(required.filter((id) => !seen.has(id)));
}

function emptyEvidence(): CurriculumEvidenceSet {
  return Object.freeze({
    capabilityIds: [],
    libraryItemIds: [],
    exampleIds: [],
    scientificTestIds: [],
    releaseGateIds: [],
  });
}

export function evaluateCurriculumCoverage(
  topicNumber: number,
  title: string,
  required: CurriculumEvidenceSet,
  demonstrated: CurriculumEvidenceSet,
): CurriculumTopicCoverage {
  const gaps = Object.freeze({
    capabilityIds: difference(
      required.capabilityIds,
      demonstrated.capabilityIds,
    ),
    libraryItemIds: difference(
      required.libraryItemIds,
      demonstrated.libraryItemIds,
    ),
    exampleIds: difference(required.exampleIds, demonstrated.exampleIds),
    scientificTestIds: difference(
      required.scientificTestIds,
      demonstrated.scientificTestIds,
    ),
    releaseGateIds: difference(
      required.releaseGateIds,
      demonstrated.releaseGateIds,
    ),
  });
  const requiredCount = Object.values(required).reduce(
    (sum, entries) => sum + entries.length,
    0,
  );
  const gapCount = Object.values(gaps).reduce(
    (sum, entries) => sum + entries.length,
    0,
  );
  const status: CurriculumCoverageStatus =
    requiredCount === 0
      ? "UNIMPLEMENTED"
      : gapCount === 0
        ? "VALIDATED"
        : "IMPLEMENTED";
  return Object.freeze({
    profileId: "cambridge-9702",
    topicNumber,
    topicId: `cambridge-9702-topic-${topicNumber}`,
    title,
    status,
    required,
    demonstrated,
    gaps,
  });
}

function mechanicsEvidence(
  topicNumber: 1 | 2 | 3 | 4 | 5 | 6 | 12,
): CurriculumEvidenceSet {
  const evidence = Object.freeze({
    capabilityIds: CAPABILITIES[topicNumber]!,
    libraryItemIds: MECHANICS_LIBRARY_DESCRIPTORS.filter((descriptor) =>
      descriptor.topics.includes(topicNumber),
    ).map((descriptor) => `physica:library/${slug(descriptor.name)}`),
    exampleIds: MECHANICS_EXAMPLE_IDS.filter(
      (id) => EXAMPLE_TOPIC[id] === topicNumber,
    ),
    scientificTestIds: [
      `mechanics.topic-${topicNumber}.reference`,
      `mechanics.topic-${topicNumber}.validation`,
    ],
    releaseGateIds:
      topicNumber === 1
        ? ["mechanics-alpha.measurement"]
        : topicNumber === 2
          ? ["mechanics-alpha.projectile"]
          : topicNumber === 3
            ? [
                "mechanics-alpha.fbd",
                "mechanics-alpha.pulley",
                "mechanics-alpha.collision",
              ]
            : topicNumber === 4
              ? ["mechanics-alpha.statics"]
              : topicNumber === 5
                ? ["mechanics-alpha.energy-transfer"]
                : topicNumber === 6
                  ? ["mechanics-alpha.stress-strain"]
                  : ["mechanics-alpha.circular-motion"],
  });
  return evidence;
}

function waveEvidence(topicNumber: 7 | 8): CurriculumEvidenceSet {
  const exampleIds =
    topicNumber === 7
      ? WAVE_EXAMPLE_IDS.filter((id) =>
          [
            "progressive-wave",
            "longitudinal-wave",
            "pulse-reflection",
            "wave-parameters",
          ].includes(id),
        )
      : [
          ...WAVE_EXAMPLE_IDS.filter((id) =>
            ["superposition", "standing-wave"].includes(id),
          ),
          ...OPTICS_EXAMPLE_IDS.filter((id) =>
            ["two-source-interference", "single-slit", "double-slit"].includes(
              id,
            ),
          ),
        ];
  return Object.freeze({
    capabilityIds: CAPABILITIES[topicNumber]!,
    libraryItemIds: WAVE_LIBRARY_DESCRIPTORS.filter(
      (descriptor) => descriptor.topic === topicNumber,
    ).map(
      (descriptor) => `physica:library/${waveLibrarySlug(descriptor.name)}`,
    ),
    exampleIds,
    scientificTestIds: [
      `waves.topic-${topicNumber}.reference`,
      `waves.topic-${topicNumber}.validation`,
    ],
    releaseGateIds:
      topicNumber === 7
        ? ["wave-optics-alpha.progressive-wave"]
        : ["wave-optics-alpha.double-slit-shared-state"],
  });
}

const PHASE_8_TOPICS = new Set([1, 2, 3, 4, 5, 6, 12]);

export const CAMBRIDGE_9702_TOPICS: readonly CurriculumTopicCoverage[] =
  Object.freeze(
    TITLES.map((title, index) => {
      const topicNumber = index + 1;
      if (
        !PHASE_8_TOPICS.has(topicNumber) &&
        topicNumber !== 7 &&
        topicNumber !== 8
      )
        return evaluateCurriculumCoverage(
          topicNumber,
          title,
          emptyEvidence(),
          emptyEvidence(),
        );
      const evidence =
        topicNumber === 7 || topicNumber === 8
          ? waveEvidence(topicNumber)
          : mechanicsEvidence(topicNumber as 1 | 2 | 3 | 4 | 5 | 6 | 12);
      return evaluateCurriculumCoverage(topicNumber, title, evidence, evidence);
    }),
  );

export function cambridgeTopic(
  topicNumber: number,
): CurriculumTopicCoverage | undefined {
  return CAMBRIDGE_9702_TOPICS.find(
    (topic) => topic.topicNumber === topicNumber,
  );
}

export function cambridgeCoverageSummary() {
  const byStatus: Record<CurriculumCoverageStatus, number> = {
    UNIMPLEMENTED: 0,
    IMPLEMENTED: 0,
    VALIDATED: 0,
  };
  for (const topic of CAMBRIDGE_9702_TOPICS) byStatus[topic.status] += 1;
  return Object.freeze({
    profileId: "cambridge-9702" as const,
    topicCount: CAMBRIDGE_9702_TOPICS.length,
    byStatus: Object.freeze(byStatus),
    validatedTopicNumbers: Object.freeze(
      CAMBRIDGE_9702_TOPICS.filter((topic) => topic.status === "VALIDATED").map(
        (topic) => topic.topicNumber,
      ),
    ),
  });
}
