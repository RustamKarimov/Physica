import type { EntityDefinition } from "@physica/core-model";

export interface StagePosition {
  readonly x: number;
  readonly y: number;
}

export function entityStagePosition(
  entity: EntityDefinition,
  index: number,
): StagePosition {
  const x = entity.visualDefaults?.x;
  const y = entity.visualDefaults?.y;
  return {
    x: typeof x === "number" ? x : 150 + (index % 4) * 145,
    y: typeof y === "number" ? y : 125 + Math.floor(index / 4) * 120,
  };
}
