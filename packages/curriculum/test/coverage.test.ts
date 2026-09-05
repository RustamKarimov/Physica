import { describe, expect, it } from "vitest";
import { MECHANICS_EXAMPLE_IDS } from "@physica/physics-mechanics";
import {
  CAMBRIDGE_9702_TOPICS,
  cambridgeCoverageSummary,
  cambridgeTopic,
  evaluateCurriculumCoverage,
} from "../src";

describe("Cambridge 9702 explicit coverage", () => {
  it("contains all 25 topics and validates exactly the Phase 8 set", () => {
    expect(CAMBRIDGE_9702_TOPICS).toHaveLength(25);
    expect(cambridgeCoverageSummary()).toMatchObject({
      topicCount: 25,
      byStatus: { VALIDATED: 7, IMPLEMENTED: 0, UNIMPLEMENTED: 18 },
      validatedTopicNumbers: [1, 2, 3, 4, 5, 6, 12],
    });
    for (const topicNumber of [1, 2, 3, 4, 5, 6, 12]) {
      const topic = cambridgeTopic(topicNumber)!;
      expect(topic.status).toBe("VALIDATED");
      expect(Object.values(topic.gaps).flat()).toEqual([]);
      expect(topic.required.scientificTestIds).toHaveLength(2);
    }
    expect(
      CAMBRIDGE_9702_TOPICS.filter((topic) => topic.status === "VALIDATED")
        .flatMap((topic) => topic.required.exampleIds)
        .sort(),
    ).toEqual([...MECHANICS_EXAMPLE_IDS].sort());
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
