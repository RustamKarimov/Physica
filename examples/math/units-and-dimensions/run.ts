import { canonicalStringify } from "@physica/serialization";
import {
  addQuantity,
  createDefaultUnitRegistry,
  createQuantity,
  dimensionExponents,
} from "@physica/units";

export function runUnitsAndDimensions() {
  const registry = createDefaultUnitRegistry();
  const distance = createQuantity(1.5, "km", registry);
  const temperature = createQuantity(20, "°C", registry);
  const forceUnit = registry.parse("N");
  const energyUnit = registry.parse("J");
  const angle = createQuantity(90, "°", registry);
  const first = createQuantity(10, "m", registry, {
    uncertainty: { kind: "absolute-display", value: 0.3 },
  });
  const second = createQuantity(20, "m", registry, {
    uncertainty: { kind: "absolute-display", value: 0.4 },
  });
  if (
    !distance.ok ||
    !temperature.ok ||
    !forceUnit.ok ||
    !energyUnit.ok ||
    !angle.ok ||
    !first.ok ||
    !second.ok
  )
    throw new Error("Example fixture failed.");
  const sum = addQuantity(first.value, second.value);
  if (!sum.ok || sum.value.uncertainty?.kind !== "absolute")
    throw new Error("Uncertainty example failed.");
  const firstJson = canonicalStringify(distance.value);
  const secondJson = canonicalStringify({ ...distance.value });
  return {
    kilometreInMetres: distance.value.canonicalValue,
    celsiusInKelvin: temperature.value.canonicalValue,
    forceDimension: dimensionExponents(forceUnit.value.dimension),
    energyDimension: dimensionExponents(energyUnit.value.dimension),
    angleSemanticKind: angle.value.semanticKind,
    combinedUncertaintyMetres: sum.value.uncertainty.canonicalValue,
    canonicalJsonStable:
      firstJson.ok && secondJson.ok && firstJson.value === secondJson.value,
  };
}
