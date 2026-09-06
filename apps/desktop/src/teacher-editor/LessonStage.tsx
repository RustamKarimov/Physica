import type {
  EntityDefinition,
  EntityId,
  SceneDefinition,
} from "@physica/core-model";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ObjectGlyph } from "./ObjectGlyph";
import { entityStagePosition, type StagePosition } from "./stage-layout";

export function LessonStage({
  scene,
  selectedId,
  mode = "preview",
  positionOverrides,
  onSelect,
  onMove,
}: {
  readonly scene: SceneDefinition;
  readonly selectedId?: EntityId | undefined;
  readonly mode?: "layout" | "physics" | "preview";
  readonly positionOverrides?: Readonly<Record<string, StagePosition>>;
  readonly onSelect?: (entityId: EntityId) => void;
  readonly onMove?: (
    entityId: EntityId,
    position: StagePosition,
    commit: boolean,
  ) => void;
}) {
  function pointerPosition(event: ReactPointerEvent<HTMLButtonElement>) {
    const stage = event.currentTarget.parentElement!;
    const bounds = stage.getBoundingClientRect();
    return {
      x: Math.min(Math.max(event.clientX - bounds.left, 55), bounds.width - 55),
      y: Math.min(Math.max(event.clientY - bounds.top, 50), bounds.height - 45),
    };
  }

  return (
    <div className={"lesson-stage " + mode}>
      <div className="lesson-stage-grid" />
      <div className="lesson-stage-title">
        <span>SCENE</span>
        <b>{scene.name}</b>
      </div>
      {scene.entityDefinitions.map((entity, index) => {
        const position =
          positionOverrides?.[entity.id] ?? entityStagePosition(entity, index);
        return (
          <button
            type="button"
            key={entity.id}
            className={
              "lesson-object " +
              objectKind(entity) +
              (selectedId === entity.id ? " selected" : "")
            }
            style={{ left: position.x, top: position.y }}
            disabled={mode === "preview"}
            aria-label={entity.name}
            onPointerDown={(event) => {
              if (mode === "preview") return;
              event.currentTarget.setPointerCapture(event.pointerId);
              onSelect?.(entity.id);
            }}
            onPointerMove={(event) => {
              if (
                mode === "preview" ||
                !event.currentTarget.hasPointerCapture(event.pointerId)
              )
                return;
              onMove?.(entity.id, pointerPosition(event), false);
            }}
            onPointerUp={(event) => {
              if (mode === "preview") return;
              onMove?.(entity.id, pointerPosition(event), true);
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
          >
            <ObjectVisual entity={entity} />
            <span className="lesson-object-name">{entity.name}</span>
          </button>
        );
      })}
      {scene.entityDefinitions.length === 0 && (
        <div className="lesson-stage-empty">
          <b>This scene is ready for your explanation.</b>
          <span>
            Add apparatus, text, equations or graphs from the Library.
          </span>
        </div>
      )}
    </div>
  );
}

function objectKind(entity: EntityDefinition): string {
  const componentType = entity.componentInstances[0]?.componentTypeId ?? "";
  const name = entity.name.toLowerCase();
  if (componentType.includes("text-block")) return "text";
  if (name.includes("equation")) return "equation";
  if (name.includes("graph")) return "graph";
  if (name.includes("axes")) return "axes";
  return "apparatus";
}

function ObjectVisual({ entity }: { readonly entity: EntityDefinition }) {
  const kind = objectKind(entity);
  const content = entity.visualDefaults?.content;
  if (kind === "text")
    return (
      <div className="lesson-text-card">
        <small>
          {String(
            entity.componentInstances[0]?.configuration.preset ?? "Explanation",
          )}
        </small>
        <p>
          {typeof content === "string"
            ? content
            : "Add the teaching explanation for this scene."}
        </p>
      </div>
    );
  if (kind === "equation")
    return (
      <div className="lesson-equation-card">
        <small>RELATIONSHIP</small>
        <strong>{typeof content === "string" ? content : "F = ma"}</strong>
      </div>
    );
  if (kind === "graph")
    return (
      <svg className="lesson-graph" viewBox="0 0 180 112" aria-hidden="true">
        <path
          d="M25 12v78h140"
          fill="none"
          stroke="currentColor"
          opacity=".45"
        />
        <path
          d="M28 84 C55 80 60 64 82 62 S112 42 128 38 S146 20 162 17"
          fill="none"
          stroke="#ef745e"
          strokeWidth="4"
        />
        <text x="145" y="105">
          time
        </text>
        <text x="4" y="18">
          value
        </text>
      </svg>
    );
  if (kind === "axes")
    return (
      <svg className="lesson-axes" viewBox="0 0 170 110" aria-hidden="true">
        <path d="M18 88h140M48 103V10" stroke="currentColor" strokeWidth="2" />
        <path d="m158 88-9-5v10zm-110-78-5 9h10z" fill="currentColor" />
        <text x="151" y="103">
          x
        </text>
        <text x="33" y="18">
          y
        </text>
      </svg>
    );
  return <ObjectGlyph name={entity.name} />;
}
