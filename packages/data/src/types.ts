import type {
  ClockId,
  DatasetDefinition,
  DatasetId,
  JsonObject,
  ObservableId,
} from "@physica/core-model";

declare const dataSeriesKeyBrand: unique symbol;
export type DataSeriesKey = string & {
  readonly [dataSeriesKeyBrand]: "DataSeriesKey";
};

export interface DataAxisMetadataV1 {
  readonly label: string;
  readonly symbol: string;
  readonly unitExpression: string;
}

export interface CartesianSampleV1 {
  readonly xCanonical: number;
  readonly yCanonical: number;
}

export interface CartesianDataSeriesV1 {
  readonly key: DataSeriesKey;
  readonly name: string;
  readonly x: DataAxisMetadataV1;
  readonly y: DataAxisMetadataV1;
  readonly samples: readonly CartesianSampleV1[];
  readonly metadata?: JsonObject;
}

export type DataProvenanceSourceKind =
  "imported" | "simulated" | "measured" | "derived";

export interface DataProvenanceV1 {
  readonly sourceKind: DataProvenanceSourceKind;
  readonly sourceDescription: string;
  readonly clockId?: ClockId;
  readonly observableId?: ObservableId;
  readonly samplingMethod?: string;
  readonly modelId?: string;
  readonly modelVersion?: string;
  readonly transformations?: readonly string[];
  readonly metadata?: JsonObject;
  readonly additionalFields?: JsonObject;
}

export interface CartesianDatasetV1 {
  readonly id: DatasetId;
  readonly name: string;
  readonly series: readonly CartesianDataSeriesV1[];
  readonly provenance: DataProvenanceV1;
  readonly metadata?: JsonObject;
}

export type CreateCartesianDatasetInput = CartesianDatasetV1;

export interface FixedIntervalAcquisitionBindingV1 {
  readonly sourceObservableId: ObservableId;
  readonly clockId: ClockId;
  readonly targetSeriesKey: DataSeriesKey;
  readonly startTimeSeconds: number;
  readonly sampleIntervalSeconds: number;
}

export interface AcquisitionWindowResult {
  readonly samples: readonly CartesianSampleV1[];
  readonly lastSampleIndex: number;
}

export type DataError =
  | {
      readonly kind: "invalid-dataset";
      readonly path: string;
      readonly message: string;
    }
  | { readonly kind: "invalid-series-key"; readonly value: string }
  | {
      readonly kind: "invalid-unit";
      readonly path: string;
      readonly message: string;
    }
  | {
      readonly kind: "unsupported-dataset-envelope";
      readonly typeId: string;
      readonly schemaVersion: number;
    }
  | {
      readonly kind: "invalid-dataset-envelope";
      readonly path: string;
      readonly message: string;
    }
  | {
      readonly kind: "invalid-acquisition";
      readonly path: string;
      readonly message: string;
    }
  | {
      readonly kind: "acquisition-backward-time";
      readonly previousTimeSeconds: number;
      readonly targetTimeSeconds: number;
    }
  | { readonly kind: "acquisition-sample-limit"; readonly count: number }
  | {
      readonly kind: "observable-evaluation-failed";
      readonly timeSeconds: number;
      readonly message: string;
    };

export type DataResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: DataError };

export type PersistedCartesianDatasetEnvelope = DatasetDefinition;
