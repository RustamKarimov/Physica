import type {
  PresentationTransitionId,
  RegisteredTypeId,
  SceneId,
} from "./ids";
import type { JsonObject } from "./json";
import type { ExtensionMap } from "./metadata";

export interface PresentationFlow {
  readonly entrySceneId: SceneId | null;
  readonly sceneOrder: readonly SceneId[];
  readonly transitions: readonly PresentationTransition[];
  readonly extensions?: ExtensionMap;
}

export type PresentationTrigger =
  | { readonly kind: "next" }
  | { readonly kind: "previous" }
  | { readonly kind: "choice"; readonly choiceId: string }
  | { readonly kind: "event"; readonly eventKey: string };

export interface PresentationTransition {
  readonly id: PresentationTransitionId;
  readonly fromSceneId: SceneId;
  readonly toSceneId: SceneId;
  readonly trigger: PresentationTrigger;
  readonly transitionTypeId?: RegisteredTypeId;
  readonly configuration?: JsonObject;
  readonly priority?: number;
  readonly extensions?: ExtensionMap;
}
