import { renderToString } from "katex";
import { freezeDeep } from "./internal";
import type {
  EquationModelV1,
  EquationRenderOptions,
  EquationResult,
  RenderedEquation,
} from "./types";

export function renderEquationToMarkup(
  model: EquationModelV1,
  options: EquationRenderOptions = {},
): EquationResult<RenderedEquation> {
  const displayMode = options.displayMode ?? true;
  try {
    const markup = renderToString(model.source.value, {
      displayMode,
      output: "htmlAndMathml",
      throwOnError: true,
      trust: false,
      strict: "error",
      maxExpand: 1000,
      maxSize: 20,
    });
    return {
      ok: true,
      value: freezeDeep({
        sourceLatex: model.source.value,
        markup,
        displayMode,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        kind: "render-failed",
        message:
          error instanceof Error ? error.message : "KaTeX rendering failed.",
      },
    };
  }
}
