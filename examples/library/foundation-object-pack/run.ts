import { createBuiltInPhysicsLibrary } from "@physica/assets";

export function runExample() {
  const catalog = createBuiltInPhysicsLibrary();
  return (() => {
    const required = [
      "Ball",
      "Block",
      "Trolley",
      "Car",
      "Mass",
      "String",
      "Spring",
      "Pulley",
      "Support",
      "Ground / Surface",
      "Ruler",
      "Stopwatch",
      "Vector Arrow",
      "Coordinate Axes",
      "Graph Panel",
      "Equation Panel",
    ];
    const items = catalog.search();
    return {
      id: "foundation-object-pack",
      requiredCount: required.length,
      available: required.every((name) =>
        items.some((item) => item.displayName === name),
      ),
      classCount: new Set(items.map((item) => item.itemClass)).size,
    };
  })();
}
