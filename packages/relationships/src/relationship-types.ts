import type {
  RelationshipDefinition,
  RelationshipId,
} from "@physica/core-model";
import type { Vec2, Vec3 } from "@physica/mathematics";

export type RelationshipValueKind =
  "scalar" | "boolean" | "text" | "vec2" | "vec3" | "curve2";

export interface ScalarRelationshipValue {
  readonly kind: "scalar";
  readonly value: number;
  readonly unit?: string;
}

export interface BooleanRelationshipValue {
  readonly kind: "boolean";
  readonly value: boolean;
}

export interface TextRelationshipValue {
  readonly kind: "text";
  readonly value: string;
}

export interface Vec2RelationshipValue extends Vec2 {
  readonly kind: "vec2";
  readonly unit?: string;
}

export interface Vec3RelationshipValue extends Vec3 {
  readonly kind: "vec3";
  readonly unit?: string;
}

export interface Curve2Sample {
  readonly parameter: number;
  readonly point: Vec2;
}

export interface Curve2RelationshipValue {
  readonly kind: "curve2";
  readonly samples: readonly Curve2Sample[];
  readonly parameterUnit?: string;
  readonly pointUnit?: string;
}

export type RelationshipValue =
  | ScalarRelationshipValue
  | BooleanRelationshipValue
  | TextRelationshipValue
  | Vec2RelationshipValue
  | Vec3RelationshipValue
  | Curve2RelationshipValue;

export type RelationshipInput =
  | { readonly kind: "external"; readonly key: string }
  | { readonly kind: "relationship"; readonly relationshipId: RelationshipId };

export type DerivedOperator =
  | "add"
  | "subtract"
  | "scale"
  | "magnitude"
  | "component-x"
  | "component-y"
  | "component-z";

export type RelationshipOperation =
  | { readonly kind: "bind"; readonly input: RelationshipInput }
  | {
      readonly kind: "offset";
      readonly input: RelationshipInput;
      readonly offset: RelationshipValue;
    }
  | {
      readonly kind: "attach" | "follow";
      readonly position: RelationshipInput;
      readonly offset?: Vec2RelationshipValue | Vec3RelationshipValue;
    }
  | {
      readonly kind: "tangent" | "normal";
      readonly curve: RelationshipInput;
      readonly parameter: RelationshipInput;
    }
  | {
      readonly kind: "derive";
      readonly operator: DerivedOperator;
      readonly inputs: readonly RelationshipInput[];
    };

export interface RelationshipTarget {
  readonly kind: "derived" | "representation" | "presentation" | "layout";
  readonly property: string;
}

export interface DependencyRelationshipV1 {
  readonly id: RelationshipId;
  readonly name: string;
  readonly operation: RelationshipOperation;
  readonly target: RelationshipTarget;
}

export interface CompiledRelationship {
  readonly definition: DependencyRelationshipV1;
  readonly dependencies: readonly RelationshipId[];
  readonly externalKeys: readonly string[];
}

export interface RelationshipPlan {
  readonly ordered: readonly CompiledRelationship[];
  readonly dependants: ReadonlyMap<RelationshipId, readonly RelationshipId[]>;
}

export interface RelationshipEvaluation {
  readonly values: ReadonlyMap<RelationshipId, RelationshipValue>;
  readonly recomputedIds: readonly RelationshipId[];
}

export type RelationshipErrorCode =
  | "invalid-envelope"
  | "invalid-definition"
  | "invalid-value"
  | "forbidden-authority"
  | "duplicate-relationship"
  | "missing-input"
  | "relationship-cycle"
  | "type-mismatch"
  | "singular-curve";

export interface RelationshipError {
  readonly code: RelationshipErrorCode;
  readonly message: string;
  readonly relationshipId?: RelationshipId;
}

export type RelationshipResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: RelationshipError };

export type RelationshipEnvelope = RelationshipDefinition;
