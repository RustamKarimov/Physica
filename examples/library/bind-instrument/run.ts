import { createBuiltInPhysicsLibrary } from "@physica/assets";

export function runExample() {
  const catalog = createBuiltInPhysicsLibrary();
  return (() => {
    const item = catalog.search({
      text: "stopwatch",
      itemClasses: ["instrument"],
    })[0]!;
    if (item.creation.kind !== "instrument")
      throw new Error("Stopwatch instrument missing.");
    const instrument = catalog.registries.instruments.get(
      item.creation.definitionId,
    )!;
    return {
      id: "bind-instrument",
      item: item.displayName,
      observableKinds: instrument.observableKinds,
      allowIncompleteAuthoring: instrument.allowIncompleteAuthoring,
    };
  })();
}
