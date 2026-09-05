import { describe, expect, it } from "vitest";
import { MECHANICS_EXAMPLE_IDS } from "@physica/physics-mechanics";
import { OPTICS_EXAMPLE_IDS } from "@physica/physics-optics";
import { WAVE_EXAMPLE_IDS } from "@physica/physics-waves";
import {
  CAMBRIDGE_9702_TOPICS,
  cambridgeCoverageSummary,
  cambridgeTopic,
  evaluateCurriculumCoverage,
} from "../src";

describe("Cambridge 9702 explicit coverage", () => {
  it("contains all 25 topics and validates exactly the Phase 9 set", () => {
    expect(CAMBRIDGE_9702_TOPICS).toHaveLength(25);
    expect(cambridgeCoverageSummary()).toMatchObject({
      topicCount: 25,
      byStatus: { VALIDATED: 9, IMPLEMENTED: 0, UNIMPLEMENTED: 16 },
      validatedTopicNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 12],
    });
    for (const topicNumber of [1, 2, 3, 4, 5, 6, 12]) {
      const topic = cambridgeTopic(topicNumber)!;
      expect(topic.status).toBe("VALIDATED");
      expect(Object.values(topic.gaps).flat()).toEqual([]);
      expect(topic.required.scientificTestIds).toHaveLength(2);
    }
    for (const topicNumber of [7, 8]) {
      const topic = cambridgeTopic(topicNumber)!;
      expect(topic.status).toBe("VALIDATED");
      expect(Object.values(topic.gaps).flat()).toEqual([]);
    }
    expect(
      CAMBRIDGE_9702_TOPICS.filter((topic) =>
        [1, 2, 3, 4, 5, 6, 12].includes(topic.topicNumber),
      )
        .flatMap((topic) => topic.required.exampleIds)
        .sort(),
    ).toEqual([...MECHANICS_EXAMPLE_IDS].sort());
    expect(
      [7, 8]
        .flatMap(
          (topicNumber) => cambridgeTopic(topicNumber)!.required.exampleIds,
        )
        .sort(),
    ).toEqual(
      [...WAVE_EXAMPLE_IDS, ...OPTICS_EXAMPLE_IDS]
        .filter((id) => !id.endsWith("optics-overview"))
        .sort(),
    );
  });
  it("never infers VALIDATED when one evidence item is absent", () => {
    const required = {
      capabilityIds: ["capability"],
      libraryItemIds: ["library"],
      exampleIds: ["example"],
      scientificTestIds: ["test"],
      releaseGateIds: ["gate"],
    };
    const coverage = evaluateCurriculumCoverage(99, "Test topic", required, {
      ...required,
      exampleIds: [],
    });
    expect(coverage.status).toBe("IMPLEMENTED");
    expect(coverage.gaps.exampleIds).toEqual(["example"]);
  });
});
