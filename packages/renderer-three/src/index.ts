import * as THREE from "three";
import {
  createCameraService,
  type CameraDefinition,
  type PickRegion,
  type RenderFrame,
  type RenderPlan,
  type RenderResult,
  type RgbaColor,
  type Vec3,
} from "@physica/renderer-core";

export interface ThreeVectorPlan {
  readonly origin: Vec3;
  readonly end: Vec3;
  readonly direction: Vec3;
  readonly length: number;
  readonly shaftRadius: number;
  readonly headLength: number;
  readonly headRadius: number;
  readonly color: number;
  readonly alpha: number;
}

export interface ThreePlanPayload {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;
  readonly camera: CameraDefinition;
  readonly vectors: readonly ThreeVectorPlan[];
}

export type ThreeRenderPlan = RenderPlan<ThreePlanPayload> & {
  readonly backend: "three";
};

export interface MountedThreePlan {
  dispose(): RenderResult<void>;
}

function colorNumber(color: RgbaColor): number {
  return (
    (Math.round(color.red * 255) << 16) |
    (Math.round(color.green * 255) << 8) |
    Math.round(color.blue * 255)
  );
}

export function createThreeRenderPlan(
  frame: RenderFrame,
): RenderResult<ThreeRenderPlan> {
  const cameraResult = createCameraService(frame.camera);
  if (!cameraResult.ok) return cameraResult;
  const camera = cameraResult.value;
  const vectors: ThreeVectorPlan[] = [];
  const regions: PickRegion[] = [];
  for (const item of frame.items.filter(({ backend }) => backend === "three")) {
    const primitive = item.primitive;
    if (primitive.kind !== "vector-3d")
      return {
        ok: false,
        error: {
          kind: "unsupported-primitive",
          renderId: item.renderId,
          backend: "three",
          primitive: primitive.kind,
        },
      };
    const length = Math.hypot(
      primitive.direction.x,
      primitive.direction.y,
      primitive.direction.z,
    );
    const end = Object.freeze({
      x: primitive.origin.x + primitive.direction.x,
      y: primitive.origin.y + primitive.direction.y,
      z: primitive.origin.z + primitive.direction.z,
    });
    const projectedOrigin = camera.project(primitive.origin);
    const projectedEnd = camera.project(end);
    if (!projectedOrigin.ok) return projectedOrigin;
    if (!projectedEnd.ok) return projectedEnd;
    vectors.push(
      Object.freeze({
        origin: primitive.origin,
        end,
        direction: primitive.direction,
        length,
        shaftRadius: primitive.shaftRadius,
        headLength: Math.min(primitive.headLength, length),
        headRadius: primitive.headRadius,
        color: colorNumber(primitive.color),
        alpha: primitive.color.alpha,
      }),
    );
    regions.push(
      Object.freeze({
        kind: "segment",
        start: projectedOrigin.value.screen,
        end: projectedEnd.value.screen,
        tolerance: Math.max(6, primitive.headRadius * 4),
        renderId: item.renderId,
        representationId: item.representationId,
        ...(item.entityId ? { entityId: item.entityId } : {}),
        backend: "three",
        layer: item.layer,
        zIndex: item.zIndex,
        registrationSequence: item.registrationSequence,
        worldPoint: primitive.origin,
        depth: Math.min(projectedOrigin.value.depth, projectedEnd.value.depth),
      }),
    );
  }
  return {
    ok: true,
    value: Object.freeze({
      backend: "three",
      payload: Object.freeze({
        width: frame.camera.viewport.width,
        height: frame.camera.viewport.height,
        devicePixelRatio: frame.camera.viewport.devicePixelRatio,
        camera: frame.camera,
        vectors: Object.freeze(vectors),
      }),
      pickRegions: Object.freeze(regions),
    }),
  };
}

function buildCamera(definition: CameraDefinition): THREE.Camera {
  const aspect = definition.viewport.width / definition.viewport.height;
  const camera =
    definition.kind === "perspective"
      ? new THREE.PerspectiveCamera(
          (definition.verticalFieldOfViewRadians * 180) / Math.PI,
          aspect,
          definition.near,
          definition.far,
        )
      : new THREE.OrthographicCamera(
          (-definition.verticalSpan * aspect) / 2,
          (definition.verticalSpan * aspect) / 2,
          definition.verticalSpan / 2,
          -definition.verticalSpan / 2,
          definition.near,
          definition.far,
        );
  camera.position.set(
    definition.position.x,
    definition.position.y,
    definition.position.z,
  );
  camera.up.set(definition.up.x, definition.up.y, definition.up.z);
  camera.lookAt(definition.target.x, definition.target.y, definition.target.z);
  camera.updateProjectionMatrix();
  return camera;
}

export function mountThreeRenderPlan(
  container: HTMLElement,
  plan: ThreeRenderPlan,
): RenderResult<MountedThreePlan> {
  try {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(plan.payload.devicePixelRatio);
    renderer.setSize(plan.payload.width, plan.payload.height, false);
    const presentation = plan.payload.camera.presentationTransform;
    if (presentation) {
      renderer.domElement.style.transformOrigin = "0 0";
      renderer.domElement.style.transform = `translate(${presentation.translation.x}px, ${presentation.translation.y}px) rotate(${presentation.rotationRadians}rad) scale(${presentation.scale.x}, ${presentation.scale.y})`;
    }
    const scene = new THREE.Scene();
    const camera = buildCamera(plan.payload.camera);
    const resources: Array<THREE.BufferGeometry | THREE.Material> = [];
    for (const vector of plan.payload.vectors) {
      const direction = new THREE.Vector3(
        vector.direction.x,
        vector.direction.y,
        vector.direction.z,
      ).normalize();
      const headLength = Math.min(vector.headLength, vector.length);
      const shaftLength = Math.max(0, vector.length - headLength);
      const material = new THREE.MeshBasicMaterial({
        color: vector.color,
        transparent: vector.alpha < 1,
        opacity: vector.alpha,
      });
      resources.push(material);
      const rotation = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction,
      );
      if (shaftLength > 0) {
        const geometry = new THREE.CylinderGeometry(
          vector.shaftRadius,
          vector.shaftRadius,
          shaftLength,
          16,
        );
        resources.push(geometry);
        const shaft = new THREE.Mesh(geometry, material);
        shaft.quaternion.copy(rotation);
        shaft.position
          .set(vector.origin.x, vector.origin.y, vector.origin.z)
          .addScaledVector(direction, shaftLength / 2);
        scene.add(shaft);
      }
      if (headLength > 0) {
        const geometry = new THREE.ConeGeometry(
          vector.headRadius,
          headLength,
          20,
        );
        resources.push(geometry);
        const head = new THREE.Mesh(geometry, material);
        head.quaternion.copy(rotation);
        head.position
          .set(vector.end.x, vector.end.y, vector.end.z)
          .addScaledVector(direction, -headLength / 2);
        scene.add(head);
      }
    }
    container.replaceChildren(renderer.domElement);
    renderer.render(scene, camera);
    let disposed = false;
    return {
      ok: true,
      value: Object.freeze({
        dispose(): RenderResult<void> {
          if (disposed) return { ok: true, value: undefined };
          try {
            disposed = true;
            for (const resource of resources) resource.dispose();
            renderer.dispose();
            renderer.domElement.remove();
            return { ok: true, value: undefined };
          } catch {
            return {
              ok: false,
              error: {
                kind: "adapter-disposal-failed",
                backend: "three",
                message: "Three adapter disposal failed.",
              },
            };
          }
        },
      }),
    };
  } catch {
    return {
      ok: false,
      error: {
        kind: "adapter-initialization-failed",
        backend: "three",
        message: "Three WebGL2 adapter could not initialize.",
      },
    };
  }
}
