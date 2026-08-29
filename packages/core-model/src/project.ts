import type { AssetDefinition } from "./assets";
import type { DatasetDefinition } from "./datasets";
import type { IdFactory, ProjectId } from "./ids";
import { registeredTypeId } from "./ids";
import type {
  CurriculumProfileRef,
  DocumentMetadata,
  ExportPresetDefinition,
  ExtensionMap,
  GlobalVariableDefinition,
  PluginLockEntry,
  RegisteredConfigRef,
} from "./metadata";
import type { PresentationFlow } from "./presentation-flow";
import type { SceneDefinition } from "./scene";

export const CURRENT_PROJECT_SCHEMA_VERSION = 1 as const;

export interface ProjectDocument {
  readonly schemaVersion: typeof CURRENT_PROJECT_SCHEMA_VERSION;
  readonly projectId: ProjectId;
  readonly metadata: DocumentMetadata;
  readonly curriculumProfiles: readonly CurriculumProfileRef[];
  readonly pluginLock: readonly PluginLockEntry[];
  readonly presentationFlow: PresentationFlow;
  readonly scenes: readonly SceneDefinition[];
  readonly assets: readonly AssetDefinition[];
  readonly datasets: readonly DatasetDefinition[];
  readonly globalVariables: readonly GlobalVariableDefinition[];
  readonly styleTheme: RegisteredConfigRef;
  readonly exportPresets: readonly ExportPresetDefinition[];
  readonly extensions?: ExtensionMap;
}

export function createEmptyProject(
  idFactory: IdFactory,
  metadata: DocumentMetadata,
): ProjectDocument {
  return {
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    projectId: idFactory.projectId(),
    metadata,
    curriculumProfiles: [],
    pluginLock: [],
    presentationFlow: {
      entrySceneId: null,
      sceneOrder: [],
      transitions: [],
    },
    scenes: [],
    assets: [],
    datasets: [],
    globalVariables: [],
    styleTheme: {
      typeId: registeredTypeId("physica:theme/default"),
      schemaVersion: 1,
      configuration: {},
    },
    exportPresets: [],
  };
}
