import { describe, expect, it } from "vitest";
import { ELECTRICITY_EXAMPLE_IDS } from "@physica/physics-electricity";
import { FIELD_EXAMPLE_IDS } from "@physica/physics-fields";
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
  it("contains all 25 topics and validates exactly the Phase 11 set", () => {
    expect(CAMBRIDGE_9702_TOPICS).toHaveLength(25);
    expect(cambridgeCoverageSummary()).toMatchObject({
      topicCount: 25,
      byStatus: { VALIDATED: 16, IMPLEMENTED: 0, UNIMPLEMENTED: 9 },
      validatedTopicNumbers: [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 18, 19, 20, 21,
      ],
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
    expect(
      [9, 10, 19]
        .flatMap(
          (topicNumber) => cambridgeTopic(topicNumber)!.required.exampleIds,
        )
        .sort(),
    ).toEqual([...ELECTRICITY_EXAMPLE_IDS].sort());
    for (const topicNumber of [9, 10, 19]) {
      const topic = cambridgeTopic(topicNumber)!;
      expect(topic.status).toBe("VALIDATED");
      expect(Object.values(topic.gaps).flat()).toEqual([]);
      expect(topic.required.libraryItemIds.length).toBeGreaterThan(20);
    }
    expect(
      [13, 18, 20, 21]
        .flatMap(
          (topicNumber) => cambridgeTopic(topicNumber)!.required.exampleIds,
        )
        .sort(),
    ).toEqual([...FIELD_EXAMPLE_IDS].sort());
    for (const topicNumber of [13, 18, 20, 21]) {
      const topic = cambridgeTopic(topicNumber)!;
      expect(topic.status).toBe("VALIDATED");
      expect(Object.values(topic.gaps).flat()).toEqual([]);
      expect(topic.required.libraryItemIds.length).toBeGreaterThan(20);
    }
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
