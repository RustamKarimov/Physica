import { CommandRegistry } from "../command-registry";
import { registerLibraryInstantiationCommands } from "../library-instantiation";
import { registerEntityComponentCommands } from "./entity-component-commands";
import { registerSceneCommands } from "./scene-commands";
import { registerSceneContentCommands } from "./scene-content-commands";

export * from "./contract";

export function registerBuiltinCommands(
  registry: CommandRegistry,
): CommandRegistry {
  registerSceneCommands(registry);
  registerEntityComponentCommands(registry);
  registerSceneContentCommands(registry);
  return registerLibraryInstantiationCommands(registry);
}

export function createBuiltinCommandRegistry(): CommandRegistry {
  return registerBuiltinCommands(new CommandRegistry());
}
