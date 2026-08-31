import type {
  Brand,
  EquationDefinition,
  EquationId,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  Result,
} from "@physica/core-model";

export type SemanticEquationNodeId = Brand<string, "SemanticEquationNodeId">;

export interface SemanticEquationIdFactory {
  next(): SemanticEquationNodeId;
}

export interface LatexEquationSource {
  readonly kind: "latex";
  readonly value: string;
}

export interface EquationCanonicalizer {
  readonly id: "cortex-js/compute-engine";
  readonly version: "0.120.0";
}

export interface EquationDiagnostic {
  readonly code: string;
  readonly start: number;
  readonly end: number;
  readonly detail?: JsonObject;
}

export interface SemanticEquationAtom {
  readonly id: SemanticEquationNodeId;
  readonly kind: "atom";
  readonly value: JsonPrimitive;
  readonly fingerprint: string;
}

export interface SemanticEquationList {
  readonly id: SemanticEquationNodeId;
  readonly kind: "list";
  readonly items: readonly SemanticEquationNode[];
  readonly fingerprint: string;
}

export interface SemanticEquationRecordEntry {
  readonly key: string;
  readonly value: SemanticEquationNode;
}

export interface SemanticEquationRecord {
  readonly id: SemanticEquationNodeId;
  readonly kind: "record";
  readonly entries: readonly SemanticEquationRecordEntry[];
  readonly fingerprint: string;
}

export type SemanticEquationNode =
  SemanticEquationAtom | SemanticEquationList | SemanticEquationRecord;

export interface EquationModelV1 {
  readonly id: EquationId;
  readonly name: string;
  readonly source: LatexEquationSource;
  readonly canonicalizer: EquationCanonicalizer;
  readonly canonicalMathJson: JsonValue;
  readonly semanticRoot: SemanticEquationNode;
  readonly diagnostics: readonly EquationDiagnostic[];
  readonly metadata?: JsonObject;
}

export interface CreateEquationModelInput {
  readonly id: EquationId;
  readonly name: string;
  readonly latex: string;
  readonly idFactory: SemanticEquationIdFactory;
  readonly metadata?: JsonObject;
}

export interface EditEquationModelInput {
  readonly previous: EquationModelV1;
  readonly latex: string;
  readonly idFactory: SemanticEquationIdFactory;
}

export type EquationError =
  | {
      readonly kind: "invalid-name";
      readonly message: string;
    }
  | {
      readonly kind: "invalid-source";
      readonly message: string;
    }
  | {
      readonly kind: "parse-failed";
      readonly message: string;
      readonly diagnostics: readonly string[];
    }
  | {
      readonly kind: "invalid-canonical-json";
      readonly message: string;
    }
  | {
      readonly kind: "invalid-semantic-node";
      readonly path: string;
      readonly message: string;
    }
  | {
      readonly kind: "invalid-semantic-id";
      readonly path: string;
      readonly value: string;
    }
  | {
      readonly kind: "duplicate-semantic-id";
      readonly path: string;
      readonly value: string;
    }
  | {
      readonly kind: "semantic-canonical-mismatch";
      readonly path: string;
      readonly message: string;
    }
  | {
      readonly kind: "invalid-metadata";
      readonly message: string;
    }
  | {
      readonly kind: "unsupported-equation-envelope";
      readonly typeId: string;
      readonly schemaVersion: number;
    }
  | {
      readonly kind: "invalid-equation-envelope";
      readonly path: string;
      readonly message: string;
    }
  | {
      readonly kind: "render-failed";
      readonly message: string;
    };

export type EquationResult<T> = Result<T, EquationError>;

export interface EquationRenderOptions {
  readonly displayMode?: boolean;
}

export interface RenderedEquation {
  readonly sourceLatex: string;
  readonly markup: string;
  readonly displayMode: boolean;
}

export type PersistedEquationEnvelope = EquationDefinition;
