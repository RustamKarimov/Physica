import {
  SMART_MODELS,
  descriptors,
  type MechanicsLibraryDescriptor,
} from "./library-model-descriptors";

const APPARATUS = [
  ...descriptors(
    "prefab",
    1,
    [
      "SI Units Workbench",
      "Vector Components Workbench",
      "Repeated Measurement Table",
      "Uncertainty Comparison Scene",
    ],
    ["workbench", "measurement"],
  ),
  ...descriptors(
    "prefab",
    2,
    [
      "Straight Motion Track",
      "Free-Fall Tower",
      "Projectile Launcher Setup",
      "Ticker-Timer Motion Setup",
      "Motion-Sensor Setup",
      "Two-Body Motion Comparison",
    ],
    ["kinematics", "apparatus"],
  ),
  ...descriptors(
    "prefab",
    3,
    [
      "Inclined Plane + Block",
      "Atwood Machine",
      "Two-Block Pulley System",
      "Collision Track",
      "Newton Third-Law Pair",
      "Impulse Cart Setup",
      "Explosion/Separation Setup",
      "Terminal-Speed Extension Setup",
    ],
    ["dynamics", "apparatus"],
  ),
  ...descriptors(
    "prefab",
    4,
    [
      "Moments Beam",
      "Multiple-Load Balance",
      "Centre-of-Gravity Plumb-Line Setup",
      "Stability/Tipping Setup",
      "Density Measurement Setup",
      "Pressure-Depth Vessel",
      "U-Tube Manometer Extension",
      "Hydraulic System Extension",
    ],
    ["statics", "apparatus"],
  ),
  ...descriptors(
    "prefab",
    5,
    [
      "Lifted Load",
      "Hoist/Motor Setup",
      "Spring Compression Setup",
      "Ramp Energy Setup",
      "Pendulum Energy Setup",
      "Variable-Force Work Setup",
      "Efficiency/Energy-Flow Setup",
    ],
    ["energy", "apparatus"],
  ),
  ...descriptors(
    "prefab",
    6,
    [
      "Hooke-Law Spring Rig",
      "Force-Extension Apparatus",
      "Young-Modulus Wire Apparatus",
      "Stress-Strain Demonstration",
      "Loading/Unloading Extension Setup",
    ],
    ["deformation", "apparatus"],
  ),
  ...descriptors(
    "prefab",
    12,
    [
      "Ball-on-String Circular Motion",
      "Car on Circular Track",
      "Rotating Table",
      "Conical-Pendulum Extension",
      "Vertical-Circle Extension",
      "Centripetal-Force Apparatus",
    ],
    ["circular-motion", "apparatus"],
  ),
] as const;

const VISUALS = [
  ...descriptors(
    "visual-object",
    1,
    [
      "measurement marker",
      "coordinate axes",
      "scale/ruler graphic",
      "unit-prefix scale strip",
      "scientific-notation place-value strip",
    ],
    ["measurement", "visual"],
  ),
  ...descriptors(
    "visual-object",
    2,
    [
      "ball",
      "block",
      "trolley",
      "car",
      "cyclist",
      "person",
      "train",
      "lift/elevator",
      "projectile marker",
      "ground plane",
      "track",
      "launch platform",
    ],
    ["kinematics", "visual"],
  ),
  ...descriptors(
    "visual-object",
    3,
    [
      "mass block",
      "trolley/cart",
      "rough surface",
      "smooth surface",
      "inclined plane",
      "pulley",
      "string",
      "hook",
      "spring balance",
      "rocket/expelling body",
      "collision bumper",
    ],
    ["dynamics", "visual"],
  ),
  ...descriptors(
    "visual-object",
    4,
    [
      "beam",
      "pivot",
      "support",
      "hanging mass",
      "irregular lamina",
      "plumb line",
      "cube",
      "cylinder",
      "liquid container",
      "fluid column",
      "piston",
      "pressure surface",
    ],
    ["statics", "visual"],
  ),
  ...descriptors(
    "visual-object",
    5,
    [
      "load/mass",
      "motor",
      "winch",
      "ramp",
      "spring",
      "height marker",
      "moving cart",
      "energy reservoir icon",
      "dissipation/heating symbol",
    ],
    ["energy", "visual"],
  ),
  ...descriptors(
    "visual-object",
    6,
    [
      "helical spring",
      "wire",
      "rod",
      "material strip",
      "clamp",
      "support stand",
      "mass hanger",
      "slotted masses",
      "reference marker",
      "extension pointer",
    ],
    ["deformation", "visual"],
  ),
  ...descriptors(
    "visual-object",
    12,
    [
      "ball",
      "string",
      "circular track",
      "car",
      "rotating platform",
      "centre marker",
      "radius line",
      "angular arc",
    ],
    ["circular-motion", "visual"],
  ),
] as const;

const INSTRUMENTS = [
  ...descriptors(
    "instrument",
    1,
    [
      "metre rule",
      "vernier caliper",
      "micrometer screw gauge",
      "stopwatch",
      "digital timer",
      "balance",
      "protractor",
      "data table",
      "uncertainty interval tool",
    ],
    ["measurement", "instrument"],
  ),
  ...descriptors(
    "instrument",
    2,
    [
      "motion sensor",
      "light gate",
      "ticker timer",
      "stopwatch",
      "position marker",
      "displacement vector",
      "velocity vector",
      "acceleration vector",
      "trajectory",
      "motion-graph panel",
    ],
    ["kinematics", "probe"],
  ),
  ...descriptors(
    "instrument",
    3,
    [
      "force sensor",
      "newton meter",
      "light gate",
      "momentum vector",
      "force vector",
      "resultant-force vector",
      "free-body diagram",
      "force-time graph",
      "impulse-area overlay",
    ],
    ["dynamics", "probe"],
  ),
  ...descriptors(
    "instrument",
    4,
    [
      "balance",
      "measuring cylinder",
      "ruler",
      "pressure probe",
      "pressure gauge",
      "manometer",
      "centre-of-mass marker",
      "perpendicular-distance marker",
      "moment arrow",
    ],
    ["statics", "probe"],
  ),
  ...descriptors(
    "instrument",
    5,
    [
      "energy bars",
      "energy-flow diagram",
      "power meter",
      "work meter",
      "force-displacement graph",
      "area-under-graph tool",
      "height probe",
      "speed probe",
    ],
    ["energy", "representation"],
  ),
  ...descriptors(
    "instrument",
    6,
    [
      "ruler",
      "micrometer",
      "vernier caliper",
      "force sensor",
      "extensometer",
      "force-extension graph",
      "stress-strain graph",
      "elastic-limit marker",
      "area-under-curve tool",
    ],
    ["deformation", "probe"],
  ),
  ...descriptors(
    "instrument",
    12,
    [
      "velocity vector",
      "centripetal-acceleration vector",
      "force vector",
      "angular-position marker",
      "radius ruler",
      "period timer",
      "circular-motion graph",
    ],
    ["circular-motion", "probe"],
  ),
] as const;

export function mechanicsLibrarySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[+&/]/gu, " ")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

function mergeDescriptors(
  all: readonly MechanicsLibraryDescriptor[],
): readonly MechanicsLibraryDescriptor[] {
  const merged = new Map<string, MechanicsLibraryDescriptor>();
  for (const descriptor of all) {
    const id = mechanicsLibrarySlug(descriptor.name);
    const current = merged.get(id);
    merged.set(
      id,
      current
        ? {
            ...current,
            topics: [...new Set([...current.topics, ...descriptor.topics])],
            tags: [...new Set([...current.tags, ...descriptor.tags])],
            examples: [
              ...new Set([...current.examples, ...descriptor.examples]),
            ],
          }
        : descriptor,
    );
  }
  return Object.freeze(
    [...merged.values()].sort((a, b) => a.name.localeCompare(b.name)),
  );
}

export const MECHANICS_LIBRARY_DESCRIPTORS = mergeDescriptors([
  ...SMART_MODELS,
  ...APPARATUS,
  ...VISUALS,
  ...INSTRUMENTS,
]);
