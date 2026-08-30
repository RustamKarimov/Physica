import { Application, Graphics } from "pixi.js";
import {
  createCameraService,
  pointInViewport,
  type PickRegion,
  type RenderFrame,
  type RenderPlan,
  type RenderResult,
  type RgbaColor,
} from "@physica/renderer-core";

export interface PixiParticlePlan {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly color: number;
  readonly alpha: number;
}

export interface PixiPlanPayload {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;
  readonly sourceParticleCount: number;
  readonly displayedParticleCount: number;
  readonly particles: readonly PixiParticlePlan[];
}

export type PixiRenderPlan = RenderPlan<PixiPlanPayload> & {
  readonly backend: "pixi";
};

export interface MountedPixiPlan {
  dispose(): RenderResult<void>;
}

function colorNumber(color: RgbaColor): number {
  return (
    (Math.round(color.red * 255) << 16) |
    (Math.round(color.green * 255) << 8) |
    Math.round(color.blue * 255)
  );
}

export function createPixiRenderPlan(
  frame: RenderFrame,
): RenderResult<PixiRenderPlan> {
  const cameraResult = createCameraService(frame.camera);
  if (!cameraResult.ok) return cameraResult;
  const camera = cameraResult.value;
  const particles: PixiParticlePlan[] = [];
  const regions: PickRegion[] = [];
  let sourceParticleCount = 0;
  for (const item of frame.items.filter(({ backend }) => backend === "pixi")) {
    const primitive = item.primitive;
    if (primitive.kind !== "particle-cloud")
      return {
        ok: false,
        error: {
          kind: "unsupported-primitive",
          renderId: item.renderId,
          backend: "pixi",
          primitive: primitive.kind,
        },
      };
    sourceParticleCount += primitive.positions.length;
    const stride = primitive.visualStride ?? 1;
    for (let index = 0; index < primitive.positions.length; index += stride) {
      const world = primitive.positions[index]!;
      const projected = camera.project(world);
      if (!projected.ok) continue;
      if (
        !projected.value.visible ||
        !pointInViewport(
          projected.value.screen,
          frame.camera.viewport,
          primitive.radius,
        )
      )
        continue;
      particles.push(
        Object.freeze({
          x: projected.value.screen.x,
          y: projected.value.screen.y,
          radius: primitive.radius,
          color: colorNumber(primitive.fill),
          alpha: primitive.fill.alpha,
        }),
      );
      regions.push(
        Object.freeze({
          kind: "circle",
          center: projected.value.screen,
          radius: Math.max(primitive.radius, 4),
          renderId: item.renderId,
          representationId: item.representationId,
          ...(item.entityId ? { entityId: item.entityId } : {}),
          backend: "pixi",
          layer: item.layer,
          zIndex: item.zIndex,
          registrationSequence: item.registrationSequence,
          worldPoint: world,
          depth: projected.value.depth,
        }),
      );
    }
  }
  return {
    ok: true,
    value: Object.freeze({
      backend: "pixi",
      payload: Object.freeze({
        width: frame.camera.viewport.width,
        height: frame.camera.viewport.height,
        devicePixelRatio: frame.camera.viewport.devicePixelRatio,
        sourceParticleCount,
        displayedParticleCount: particles.length,
        particles: Object.freeze(particles),
      }),
      pickRegions: Object.freeze(regions),
    }),
  };
}

export async function mountPixiRenderPlan(
  container: HTMLElement,
  plan: PixiRenderPlan,
): Promise<RenderResult<MountedPixiPlan>> {
  try {
    const application = new Application();
    await application.init({
      width: plan.payload.width,
      height: plan.payload.height,
      resolution: plan.payload.devicePixelRatio,
      autoDensity: true,
      antialias: true,
      backgroundAlpha: 0,
      preference: "webgl",
    });
    const graphics = new Graphics();
    for (const particle of plan.payload.particles)
      graphics
        .circle(particle.x, particle.y, particle.radius)
        .fill({ color: particle.color, alpha: particle.alpha });
    application.stage.addChild(graphics);
    container.replaceChildren(application.canvas);
    application.render();
    let disposed = false;
    return {
      ok: true,
      value: Object.freeze({
        dispose(): RenderResult<void> {
          if (disposed) return { ok: true, value: undefined };
          try {
            disposed = true;
            application.destroy(
              { removeView: true },
              { children: true, texture: true, textureSource: true },
            );
            return { ok: true, value: undefined };
          } catch {
            return {
              ok: false,
              error: {
                kind: "adapter-disposal-failed",
                backend: "pixi",
                message: "Pixi adapter disposal failed.",
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
        backend: "pixi",
        message: "Pixi WebGL adapter could not initialize.",
      },
    };
  }
}
