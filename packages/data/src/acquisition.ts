import { isUuidV4 } from "@physica/core-model";
import { freezeDeep } from "./internal";
import type {
  AcquisitionWindowResult,
  DataResult,
  FixedIntervalAcquisitionBindingV1,
} from "./types";

const MAX_SAMPLES_PER_WINDOW = 1_000_000;

function validateBinding(
  binding: FixedIntervalAcquisitionBindingV1,
): DataResult<FixedIntervalAcquisitionBindingV1> {
  if (!isUuidV4(binding.clockId)) {
    return {
      ok: false,
      error: {
        kind: "invalid-acquisition",
        path: "$.clockId",
        message: "Clock ID must be UUID-v4.",
      },
    };
  }
  if (binding.sourceObservableId.trim() === "") {
    return {
      ok: false,
      error: {
        kind: "invalid-acquisition",
        path: "$.sourceObservableId",
        message: "Observable ID must not be empty.",
      },
    };
  }
  if (!Number.isFinite(binding.startTimeSeconds)) {
    return {
      ok: false,
      error: {
        kind: "invalid-acquisition",
        path: "$.startTimeSeconds",
        message: "Start time must be finite.",
      },
    };
  }
  if (
    !Number.isFinite(binding.sampleIntervalSeconds) ||
    binding.sampleIntervalSeconds <= 0
  ) {
    return {
      ok: false,
      error: {
        kind: "invalid-acquisition",
        path: "$.sampleIntervalSeconds",
        message: "Sample interval must be finite and positive.",
      },
    };
  }
  return { ok: true, value: binding };
}

export function sampleAcquisitionWindow(
  binding: FixedIntervalAcquisitionBindingV1,
  previousSampleIndex: number,
  targetTimeSeconds: number,
  evaluateObservable: (timeSeconds: number) => number,
): DataResult<AcquisitionWindowResult> {
  const valid = validateBinding(binding);
  if (!valid.ok) return valid;
  if (!Number.isSafeInteger(previousSampleIndex) || previousSampleIndex < -1) {
    return {
      ok: false,
      error: {
        kind: "invalid-acquisition",
        path: "$.previousSampleIndex",
        message: "Previous index must be -1 or a non-negative safe integer.",
      },
    };
  }
  if (!Number.isFinite(targetTimeSeconds)) {
    return {
      ok: false,
      error: {
        kind: "invalid-acquisition",
        path: "$.targetTimeSeconds",
        message: "Target time must be finite.",
      },
    };
  }
  const previousTime =
    previousSampleIndex < 0
      ? binding.startTimeSeconds
      : binding.startTimeSeconds +
        previousSampleIndex * binding.sampleIntervalSeconds;
  if (previousSampleIndex >= 0 && targetTimeSeconds < previousTime) {
    return {
      ok: false,
      error: {
        kind: "acquisition-backward-time",
        previousTimeSeconds: previousTime,
        targetTimeSeconds,
      },
    };
  }
  const finalIndex = Math.floor(
    (targetTimeSeconds - binding.startTimeSeconds) /
      binding.sampleIntervalSeconds +
      Number.EPSILON * 8,
  );
  if (finalIndex < previousSampleIndex + 1) {
    return {
      ok: true,
      value: freezeDeep({ samples: [], lastSampleIndex: previousSampleIndex }),
    };
  }
  const count = finalIndex - previousSampleIndex;
  if (count > MAX_SAMPLES_PER_WINDOW) {
    return { ok: false, error: { kind: "acquisition-sample-limit", count } };
  }
  const samples = [];
  for (let index = previousSampleIndex + 1; index <= finalIndex; index += 1) {
    const timeSeconds =
      binding.startTimeSeconds + index * binding.sampleIntervalSeconds;
    let value: number;
    try {
      value = evaluateObservable(timeSeconds);
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: "observable-evaluation-failed",
          timeSeconds,
          message:
            error instanceof Error
              ? error.message
              : "Observable evaluation threw.",
        },
      };
    }
    if (!Number.isFinite(value)) {
      return {
        ok: false,
        error: {
          kind: "observable-evaluation-failed",
          timeSeconds,
          message: "Observable returned a non-finite value.",
        },
      };
    }
    samples.push({ xCanonical: timeSeconds, yCanonical: value });
  }
  return {
    ok: true,
    value: freezeDeep({ samples, lastSampleIndex: finalIndex }),
  };
}
