import { describe, expect, it } from "vitest";
import { segmentGraphemes, writtenGraphemePrefix } from "../src";

describe("Unicode-safe label writing", () => {
  it("does not split combining marks or emoji ZWJ sequences", () => {
    const text = "e\u0301⚛️👩‍🔬";
    expect(segmentGraphemes(text, "en")).toEqual({
      ok: true,
      value: ["e\u0301", "⚛️", "👩‍🔬"],
    });
    expect(writtenGraphemePrefix(text, 2 / 3, "en")).toMatchObject({
      ok: true,
      value: {
        visibleCount: 2,
        visibleText: "e\u0301⚛️",
        sourceText: text,
      },
    });
    expect(writtenGraphemePrefix(text, 1, "en")).toMatchObject({
      ok: true,
      value: { visibleText: text },
    });
  });

  it("preserves logical RTL order and handles empty text", () => {
    expect(writtenGraphemePrefix("قوة", 2 / 3, "ar")).toMatchObject({
      ok: true,
      value: { visibleText: "قو", visibleCount: 2 },
    });
    expect(writtenGraphemePrefix("", 0.5)).toMatchObject({
      ok: true,
      value: { segments: [], visibleText: "", visibleCount: 0 },
    });
  });

  it("returns typed errors for invalid progress and locale", () => {
    expect(writtenGraphemePrefix("force", Number.NaN)).toMatchObject({
      ok: false,
      error: { kind: "invalid-progress" },
    });
    expect(segmentGraphemes("force", "not_a_locale")).toMatchObject({
      ok: false,
      error: { kind: "invalid-locale" },
    });
  });
});
