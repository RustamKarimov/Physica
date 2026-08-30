import {
  REGISTERED_TYPE_ID_PATTERN,
  type Brand,
  type EntityId,
  type RepresentationId,
  type SceneId,
} from "@physica/core-model";
import type { Vec2, Vec3 } from "@physica/mathematics";
import type { RenderResult } from "./errors";

export type { Vec2, Vec3 } from "@physica/mathematics";

export type RenderItemId = Brand<string, "RenderItemId">;
export type RendererBackend = "svg" | "pixi" | "three";
export type RenderLayer =
  | "background"
  | "world-3d"
  | "world-raster"
  | "world-vector"
  | "annotation"
  | "overlay";

export const RENDER_LAYER_ORDER: Readonly<Record<RenderLayer, number>> =
  Object.freeze({
    background: 0,
    "world-3d": 1,
    "world-raster": 2,
    "world-vector": 3,
    annotation: 4,
    overlay: 5,
  });

export interface RgbaColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;
}

export interface PresentationTransform2D {
  readonly translation: Vec2;
  readonly rotationRadians: number;
  readonly scale: Vec2;
}

interface CameraDefinitionBase {
  readonly viewport: Viewport;
  readonly position: Vec3;
  readonly target: Vec3;
  readonly up: Vec3;
  readonly near: number;
  readonly far: number;
  readonly presentationTransform?: PresentationTransform2D;
}

export interface OrthographicCameraDefinition extends CameraDefinitionBase {
  readonly kind: "orthographic";
  readonly verticalSpan: number;
}

export interface PerspectiveCameraDefinition extends CameraDefinitionBase {
  readonly kind: "perspective";
  readonly verticalFieldOfViewRadians: number;
}

export type CameraDefinition =
  OrthographicCameraDefinition | PerspectiveCameraDefinition;

export interface CameraBasis {
  readonly right: Vec3;
  readonly up: Vec3;
  readonly forward: Vec3;
}

export interface ProjectedPoint {
  readonly screen: Vec2;
  readonly normalizedDevice: Vec3;
  readonly depth: number;
  readonly visible: boolean;
}

export interface ScreenRay {
  readonly origin: Vec3;
  readonly direction: Vec3;
}

export interface BackgroundPrimitive {
  readonly kind: "background";
  readonly color: RgbaColor;
}

export interface Line2DPrimitive {
  readonly kind: "line-2d";
  readonly start: Vec3;
  readonly end: Vec3;
  readonly stroke: RgbaColor;
  readonly strokeWidth: number;
}

export interface Arrow2DPrimitive {
  readonly kind: "arrow-2d";
  readonly start: Vec3;
  readonly end: Vec3;
  readonly stroke: RgbaColor;
  readonly strokeWidth: number;
  readonly headLength: number;
  readonly headWidth: number;
}

export interface Circle2DPrimitive {
  readonly kind: "circle-2d";
  readonly center: Vec3;
  readonly radius: number;
  readonly fill: RgbaColor;
  readonly stroke?: RgbaColor;
  readonly strokeWidth?: number;
}

export interface Polyline2DPrimitive {
  readonly kind: "polyline-2d";
  readonly points: readonly Vec3[];
  readonly stroke: RgbaColor;
  readonly strokeWidth: number;
  readonly closed: boolean;
}

export interface ParticleCloudPrimitive {
  readonly kind: "particle-cloud";
  readonly positions: readonly Vec3[];
  readonly radius: number;
  readonly fill: RgbaColor;
  readonly visualStride?: number;
}

export interface Vector3DPrimitive {
  readonly kind: "vector-3d";
  readonly origin: Vec3;
  readonly direction: Vec3;
  readonly color: RgbaColor;
  readonly shaftRadius: number;
  readonly headLength: number;
  readonly headRadius: number;
}

export type RenderPrimitive =
  | BackgroundPrimitive
  | Line2DPrimitive
  | Arrow2DPrimitive
  | Circle2DPrimitive
  | Polyline2DPrimitive
  | ParticleCloudPrimitive
  | Vector3DPrimitive;

export interface RenderItem {
  readonly renderId: RenderItemId;
  readonly representationId: RepresentationId;
  readonly entityId?: EntityId;
  readonly backend: RendererBackend;
  readonly layer: RenderLayer;
  readonly zIndex: number;
  readonly registrationSequence: number;
  readonly primitive: RenderPrimitive;
}

export interface RenderFrame {
  readonly schemaVersion: 1;
  readonly sceneId: SceneId;
  readonly sourceRevision: number;
  readonly camera: CameraDefinition;
  readonly items: readonly RenderItem[];
}

export interface RenderFrameInput {
  readonly sceneId: SceneId;
  readonly sourceRevision: number;
  readonly camera: CameraDefinition;
  readonly items: readonly RenderItem[];
}

interface PickRegionBase {
  readonly renderId: RenderItemId;
  readonly representationId: RepresentationId;
  readonly entityId?: EntityId;
  readonly backend: RendererBackend;
  readonly layer: RenderLayer;
  readonly zIndex: number;
  readonly registrationSequence: number;
  readonly worldPoint?: Vec3;
  readonly depth?: number;
}

export interface CirclePickRegion extends PickRegionBase {
  readonly kind: "circle";
  readonly center: Vec2;
  readonly radius: number;
}

export interface SegmentPickRegion extends PickRegionBase {
  readonly kind: "segment";
  readonly start: Vec2;
  readonly end: Vec2;
  readonly tolerance: number;
}

export interface RectanglePickRegion extends PickRegionBase {
  readonly kind: "rectangle";
  readonly minimum: Vec2;
  readonly maximum: Vec2;
}

export interface PolygonPickRegion extends PickRegionBase {
  readonly kind: "polygon";
  readonly points: readonly Vec2[];
}

export type PickRegion =
  | CirclePickRegion
  | SegmentPickRegion
  | RectanglePickRegion
  | PolygonPickRegion;

export interface RenderPlan<TPayload> {
  readonly backend: RendererBackend;
  readonly payload: TPayload;
  readonly pickRegions: readonly PickRegion[];
}

export function renderItemId(value: string): RenderResult<RenderItemId> {
  return REGISTERED_TYPE_ID_PATTERN.test(value)
    ? { ok: true, value: value as RenderItemId }
    : { ok: false, error: { kind: "invalid-render-id", value } };
}

export function rgba(
  red: number,
  green: number,
  blue: number,
  alpha = 1,
): RgbaColor {
  return Object.freeze({ red, green, blue, alpha });
}
