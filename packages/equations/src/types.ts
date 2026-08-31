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
    }
  | {
      readonly kind: "invalid-equation-transform";
      readonly path: string;
      readonly message: string;
    }
  | {
      readonly kind: "invalid-correspondence";
      readonly path: string;
      readonly message: string;
    }
  | {
      readonly kind: "invalid-verification";
      readonly path: string;
      readonly message: string;
    }
  | {
      readonly kind: "invalid-substitution";
      readonly path: string;
      readonly message: string;
    }
  | {
      readonly kind: "unsupported-equation-transform-envelope";
      readonly typeId: string;
      readonly schemaVersion: number;
    }
  | {
      readonly kind: "invalid-fragment-layout";
      readonly path: string;
      readonly message: string;
    }
  | {
      readonly kind: "invalid-motion-progress";
      readonly value: number;
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

export type EquationEquivalenceStatus =
  | "VERIFIED_EQUIVALENT"
  | "VERIFIED_SUBSTITUTION"
  | "TEACHER_DECLARED"
  | "UNVERIFIED_PRESENTATION";

export type EquationMatchMethod =
  | "teacher-override"
  | "persistent-id"
  | "symbolic-identity"
  | "structural-identity"
  | "canonical-expression"
  | "glyph-fallback";

export type EquationMatchConfidence = "author" | "high" | "medium" | "low";

export interface EquationTokenCorrespondence {
  readonly sourceNodeId: SemanticEquationNodeId;
  readonly targetNodeId: SemanticEquationNodeId;
  readonly method: EquationMatchMethod;
  readonly confidence: EquationMatchConfidence;
}

export interface EquationCorrespondenceOverride {
  readonly sourceNodeId: SemanticEquationNodeId;
  readonly targetNodeId: SemanticEquationNodeId;
}

export interface EquationGlyphHint {
  readonly nodeId: SemanticEquationNodeId;
  readonly text: string;
}

export interface MatchEquationNodesInput {
  readonly source: EquationModelV1;
  readonly target: EquationModelV1;
  readonly overrides?: readonly EquationCorrespondenceOverride[];
  readonly sourceGlyphs?: readonly EquationGlyphHint[];
  readonly targetGlyphs?: readonly EquationGlyphHint[];
}

export interface EquationMatchPlan {
  readonly correspondence: readonly EquationTokenCorrespondence[];
  readonly sourceOnly: readonly SemanticEquationNodeId[];
  readonly targetOnly: readonly SemanticEquationNodeId[];
}

export type EquationVerificationRequest =
  | { readonly kind: "automatic-equivalence" }
  | {
      readonly kind: "substitution";
      readonly substitutions: JsonObject;
    }
  | {
      readonly kind: "teacher-declared";
      readonly statement: string;
    }
  | {
      readonly kind: "presentation-only";
      readonly reason: string;
    };

export interface EquationVerificationEngineStamp {
  readonly id: "cortex-js/compute-engine";
  readonly version: "0.120.0";
}

export type EquationVerificationMethod =
  | {
      readonly kind: "compute-engine";
      readonly operation: "expression-equality" | "residual-equality";
      readonly outcome: "verified" | "not-established";
      readonly engine: EquationVerificationEngineStamp;
    }
  | {
      readonly kind: "compute-engine-substitution";
      readonly substitutions: JsonObject;
      readonly outcome: "verified" | "not-established";
      readonly engine: EquationVerificationEngineStamp;
    }
  | {
      readonly kind: "teacher-declaration";
      readonly statement: string;
    }
  | {
      readonly kind: "presentation-only";
      readonly reason: string;
    };

export interface EquationVerification {
  readonly status: EquationEquivalenceStatus;
  readonly method: EquationVerificationMethod;
  readonly explanation: string;
}

export interface EquationTransformV1 {
  readonly id: EquationId;
  readonly name: string;
  readonly sourceExpression: EquationModelV1;
  readonly targetExpression: EquationModelV1;
  readonly tokenCorrespondence: readonly EquationTokenCorrespondence[];
  readonly equivalenceStatus: EquationEquivalenceStatus;
  readonly verificationMethod: EquationVerificationMethod;
  readonly verificationExplanation: string;
  readonly metadata?: JsonObject;
}

export interface CreateEquationTransformInput {
  readonly id: EquationId;
  readonly name: string;
  readonly source: EquationModelV1;
  readonly target: EquationModelV1;
  readonly verification: EquationVerificationRequest;
  readonly overrides?: readonly EquationCorrespondenceOverride[];
  readonly sourceGlyphs?: readonly EquationGlyphHint[];
  readonly targetGlyphs?: readonly EquationGlyphHint[];
  readonly metadata?: JsonObject;
}

export interface EquationFragmentLayout {
  readonly nodeId: SemanticEquationNodeId;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface EquationFragmentLayoutSet {
  readonly coordinateSpace: string;
  readonly fragments: readonly EquationFragmentLayout[];
}

export interface EquationMatchedMotion {
  readonly source: EquationFragmentLayout;
  readonly target: EquationFragmentLayout;
  readonly correspondence: EquationTokenCorrespondence;
  readonly inverseTranslateX: number;
  readonly inverseTranslateY: number;
  readonly inverseScaleX: number;
  readonly inverseScaleY: number;
}

export interface EquationMotionPlan {
  readonly coordinateSpace: string;
  readonly status: EquationEquivalenceStatus;
  readonly matched: readonly EquationMatchedMotion[];
  readonly exits: readonly EquationFragmentLayout[];
  readonly entries: readonly EquationFragmentLayout[];
}

export type EquationMotionRole = "matched" | "exit" | "entry";

export interface EquationMotionFragmentFrame {
  readonly nodeId: SemanticEquationNodeId;
  readonly role: EquationMotionRole;
  readonly translateX: number;
  readonly translateY: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly opacity: number;
}

export interface EquationMotionFrame {
  readonly progress: number;
  readonly easedProgress: number;
  readonly status: EquationEquivalenceStatus;
  readonly fragments: readonly EquationMotionFragmentFrame[];
}
