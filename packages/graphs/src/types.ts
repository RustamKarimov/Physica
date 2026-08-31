import type {
  DatasetId,
  GraphDefinition,
  GraphId,
  JsonObject,
} from "@physica/core-model";
import type { CartesianDatasetV1, DataSeriesKey } from "@physica/data";

export type GraphScale = "linear" | "log10";
export type GraphDomainPolicy =
  | { readonly kind: "auto" }
  | {
      readonly kind: "manual";
      readonly minCanonical: number;
      readonly maxCanonical: number;
    };
export interface GraphAxisV1 {
  readonly label: string;
  readonly unitExpression: string;
  readonly scale: GraphScale;
  readonly domain: GraphDomainPolicy;
  readonly tickTarget: number;
}
export interface GraphCurveStyleV1 {
  readonly strokeHex: string;
  readonly lineWidth: number;
  readonly dash?: readonly number[];
}
export interface GraphSeriesBindingV1 {
  readonly datasetId: DatasetId;
  readonly seriesKey: DataSeriesKey;
  readonly style: GraphCurveStyleV1;
}
export interface GraphPointMarkerV1 {
  readonly id: string;
  readonly datasetId: DatasetId;
  readonly seriesKey: DataSeriesKey;
  readonly sampleIndex: number;
  readonly label: string;
  readonly radius: number;
}
export interface GraphAnnotationV1 {
  readonly id: string;
  readonly text: string;
  readonly xCanonical: number;
  readonly yCanonical: number;
}
export interface CartesianGraphV1 {
  readonly id: GraphId;
  readonly name: string;
  readonly xAxis: GraphAxisV1;
  readonly yAxis: GraphAxisV1;
  readonly series: readonly GraphSeriesBindingV1[];
  readonly points: readonly GraphPointMarkerV1[];
  readonly annotations: readonly GraphAnnotationV1[];
  readonly cursor: {
    readonly enabled: boolean;
    readonly mode: "nearest" | "linear-interpolation";
  };
  readonly metadata?: JsonObject;
}
export interface GraphViewport {
  readonly space: "screen-layout";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly padding: {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  };
}
export interface GraphDataCoordinate {
  readonly space: "graph-data";
  readonly xCanonical: number;
  readonly yCanonical: number;
}
export interface GraphLayoutCoordinate {
  readonly space: "screen-layout";
  readonly x: number;
  readonly y: number;
}
export interface ResolvedGraphTick {
  readonly canonicalValue: number;
  readonly displayValue: number;
  readonly label: string;
  readonly position: GraphLayoutCoordinate;
}
export interface ResolvedGraphCurve {
  readonly datasetId: DatasetId;
  readonly seriesKey: DataSeriesKey;
  readonly name: string;
  readonly style: GraphCurveStyleV1;
  readonly source: readonly GraphDataCoordinate[];
  readonly points: readonly GraphLayoutCoordinate[];
}
export interface ResolvedGraphCursorReadout {
  readonly datasetId: DatasetId;
  readonly seriesKey: DataSeriesKey;
  readonly seriesName: string;
  readonly xCanonical: number;
  readonly yCanonical: number;
  readonly xDisplay: string;
  readonly yDisplay: string;
  readonly point: GraphLayoutCoordinate;
}
export interface ResolvedCartesianGraph {
  readonly name: string;
  readonly viewport: GraphViewport;
  readonly plotRect: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly xDomain: readonly [number, number];
  readonly yDomain: readonly [number, number];
  readonly xAxisLabel: string;
  readonly yAxisLabel: string;
  readonly xTicks: readonly ResolvedGraphTick[];
  readonly yTicks: readonly ResolvedGraphTick[];
  readonly curves: readonly ResolvedGraphCurve[];
  readonly points: readonly {
    readonly id: string;
    readonly label: string;
    readonly radius: number;
    readonly source: GraphDataCoordinate;
    readonly point: GraphLayoutCoordinate;
  }[];
  readonly annotations: readonly {
    readonly id: string;
    readonly text: string;
    readonly source: GraphDataCoordinate;
    readonly point: GraphLayoutCoordinate;
  }[];
  readonly cursor?: {
    readonly xCanonical: number;
    readonly xDisplay: string;
    readonly x: number;
    readonly readouts: readonly ResolvedGraphCursorReadout[];
  };
  readonly accessibilitySummary: string;
}
export type GraphError =
  | {
      readonly kind: "invalid-graph";
      readonly path: string;
      readonly message: string;
    }
  | {
      readonly kind: "invalid-unit";
      readonly path: string;
      readonly message: string;
    }
  | {
      readonly kind: "unsupported-graph-envelope";
      readonly typeId: string;
      readonly schemaVersion: number;
    }
  | {
      readonly kind: "invalid-graph-envelope";
      readonly path: string;
      readonly message: string;
    }
  | { readonly kind: "missing-dataset"; readonly datasetId: DatasetId }
  | {
      readonly kind: "missing-series";
      readonly datasetId: DatasetId;
      readonly seriesKey: DataSeriesKey;
    }
  | {
      readonly kind: "incompatible-axis-unit";
      readonly axis: "x" | "y";
      readonly seriesKey: DataSeriesKey;
    }
  | {
      readonly kind: "invalid-log-domain";
      readonly axis: "x" | "y";
      readonly value: number;
    }
  | {
      readonly kind: "invalid-marker";
      readonly markerId: string;
      readonly message: string;
    };
export type GraphResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: GraphError };
export interface ResolveCartesianGraphInput {
  readonly graph: CartesianGraphV1;
  readonly datasets: readonly CartesianDatasetV1[];
  readonly viewport: GraphViewport;
  readonly cursorXCanonical?: number;
}
export type PersistedCartesianGraphEnvelope = GraphDefinition;
