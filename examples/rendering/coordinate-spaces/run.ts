import {
  GalileanFrameTransformProvider,
  ReferenceFrameGraph,
  createDefaultReferenceFrameProviderRegistry,
  educationalScale,
  identityGalileanFrameConfiguration,
  liftPhysical2D,
  projectPhysicalTo2D,
  quaternionFromAxisAngle,
  referenceFrameId,
  vec2,
  vec3,
} from "@physica/mathematics";

const clean = (value: { x: number; y: number; z?: number }) =>
  [value.x, value.y, ...(value.z === undefined ? [] : [value.z])].map(
    (entry) => (Math.abs(entry) < 1e-12 ? 0 : entry),
  );

export function runCoordinateSpaces() {
  const root = referenceFrameId("physica.frame:world");
  const moving = referenceFrameId("physica.frame:moving");
  const rotation = quaternionFromAxisAngle(vec3(0, 0, 1), Math.PI / 2);
  if (!rotation.ok) throw new Error("Rotation fixture failed.");
  const graph = new ReferenceFrameGraph(
    [
      {
        id: root,
        name: "World",
        parentId: null,
        transformTypeId: GalileanFrameTransformProvider.typeId,
        configuration: identityGalileanFrameConfiguration(),
      },
      {
        id: moving,
        name: "Moving",
        parentId: root,
        transformTypeId: GalileanFrameTransformProvider.typeId,
        configuration: {
          originAtEpoch: vec3(10, 0, 0),
          orientationToParent: rotation.value,
          velocityRelativeToParent: vec3(2, 0, 0),
          epochSeconds: 0,
        },
      },
    ],
    createDefaultReferenceFrameProviderRegistry(),
  );
  const world = graph.transformPosition(vec3(1, 0, 0), moving, root, 5);
  if (!world.ok) throw new Error(world.error.kind);
  const roundTrip = graph.transformPosition(world.value, root, moving, 5);
  const projected = projectPhysicalTo2D(liftPhysical2D(vec2(2, 3)));
  const scale = educationalScale({
    physicalScale: 1,
    visualScale: 100,
    scaleMode: "educational",
    notToScaleWarning: true,
  });
  if (!roundTrip.ok || !projected.ok || !scale.ok)
    throw new Error("Coordinate fixture failed.");
  return {
    worldPosition: clean(world.value),
    roundTripPosition: clean(roundTrip.value),
    projected2D: clean(projected.value),
    notToScaleWarning: scale.value.notToScaleWarning,
  };
}
