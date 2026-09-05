export type PhysScriptScalar = string | number | boolean;

export interface PhysScriptProgram {
  readonly version: 1;
  readonly scene: string;
  readonly statements: readonly PhysScriptStatement[];
}

export type PhysScriptStatement =
  | {
      readonly kind: "model";
      readonly alias: string;
      readonly registeredTypeId: string;
    }
  | {
      readonly kind: "set";
      readonly target: string;
      readonly property: string;
      readonly value: PhysScriptScalar;
      readonly unit?: string;
    }
  | {
      readonly kind: "show";
      readonly representationTypeId: string;
      readonly target: string;
    }
  | {
      readonly kind: "graph";
      readonly target: string;
      readonly observable: string;
      readonly against: string;
    }
  | { readonly kind: "step"; readonly label: string }
  | {
      readonly kind: "pause-when";
      readonly target: string;
      readonly observable: string;
      readonly value: number;
      readonly unit?: string;
    }
  | {
      readonly kind: "transform-equation";
      readonly source: string;
      readonly target: string;
    };

export interface PhysScriptIssue {
  readonly code:
    | "missing-header"
    | "unsupported-version"
    | "missing-scene"
    | "syntax-error"
    | "duplicate-model"
    | "invalid-type-id"
    | "unknown-model";
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly line: number;
  readonly column: number;
}

export interface PhysScriptParseResult {
  readonly program?: PhysScriptProgram;
  readonly issues: readonly PhysScriptIssue[];
}

export type PhysScriptCommandIntent =
  | {
      readonly type: "add-model";
      readonly order: number;
      readonly payload: {
        readonly alias: string;
        readonly registeredTypeId: string;
      };
    }
  | {
      readonly type: "set-property";
      readonly order: number;
      readonly payload: {
        readonly target: string;
        readonly property: string;
        readonly value: PhysScriptScalar;
        readonly unit?: string;
      };
    }
  | {
      readonly type: "add-representation";
      readonly order: number;
      readonly payload: {
        readonly representationTypeId: string;
        readonly target: string;
      };
    }
  | {
      readonly type: "add-graph";
      readonly order: number;
      readonly payload: {
        readonly target: string;
        readonly observable: string;
        readonly against: string;
      };
    }
  | {
      readonly type: "add-step";
      readonly order: number;
      readonly payload: { readonly label: string };
    }
  | {
      readonly type: "add-pause-condition";
      readonly order: number;
      readonly payload: {
        readonly target: string;
        readonly observable: string;
        readonly value: number;
        readonly unit?: string;
      };
    }
  | {
      readonly type: "add-equation-transform";
      readonly order: number;
      readonly payload: {
        readonly source: string;
        readonly target: string;
      };
    };

export interface PhysScriptCommandPlan {
  readonly version: 1;
  readonly scene: string;
  readonly intents: readonly PhysScriptCommandIntent[];
}
