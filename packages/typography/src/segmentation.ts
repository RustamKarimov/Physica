export interface TypographyError {
  readonly kind:
    | "invalid-text"
    | "invalid-progress"
    | "invalid-locale"
    | "segmentation-unavailable";
  readonly message: string;
}

export type TypographyResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: TypographyError };

export interface GraphemePrefix {
  readonly sourceText: string;
  readonly locale?: string;
  readonly segments: readonly string[];
  readonly visibleCount: number;
  readonly visibleText: string;
}

function error(
  kind: TypographyError["kind"],
  message: string,
): TypographyResult<never> {
  return { ok: false, error: Object.freeze({ kind, message }) };
}

export function segmentGraphemes(
  text: string,
  locale?: string,
): TypographyResult<readonly string[]> {
  if (typeof text !== "string")
    return error("invalid-text", "Text must be a string.");
  if (typeof Intl !== "object" || typeof Intl.Segmenter !== "function")
    return error(
      "segmentation-unavailable",
      "The host does not provide Unicode grapheme segmentation.",
    );
  try {
    const segmenter = new Intl.Segmenter(locale, { granularity: "grapheme" });
    return {
      ok: true,
      value: Object.freeze(
        [...segmenter.segment(text)].map((entry) => entry.segment),
      ),
    };
  } catch {
    return error("invalid-locale", "The requested text locale is invalid.");
  }
}

export function writtenGraphemePrefix(
  text: string,
  progress: number,
  locale?: string,
): TypographyResult<GraphemePrefix> {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1)
    return error("invalid-progress", "Writing progress must be in [0, 1].");
  const segmented = segmentGraphemes(text, locale);
  if (!segmented.ok) return segmented;
  const visibleCount =
    progress === 1
      ? segmented.value.length
      : Math.floor(progress * segmented.value.length);
  return {
    ok: true,
    value: Object.freeze({
      sourceText: text,
      ...(locale === undefined ? {} : { locale }),
      segments: segmented.value,
      visibleCount,
      visibleText:
        progress === 1 ? text : segmented.value.slice(0, visibleCount).join(""),
    }),
  };
}
