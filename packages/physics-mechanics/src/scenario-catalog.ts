export const MECHANICS_EXAMPLE_IDS = Object.freeze([
  "units-prefixes",
  "dimensional-analysis",
  "vector-components",
  "uncertainty-repeated-measurements",
  "constant-velocity",
  "constant-acceleration",
  "free-fall",
  "projectile",
  "motion-graphs-linked",
  "forces-fbd",
  "inclined-plane",
  "pulley-system",
  "elastic-collision",
  "inelastic-collision",
  "impulse",
  "moments-balance",
  "centre-of-mass-stability",
  "density",
  "pressure-depth",
  "energy-conservation",
  "spring-energy",
  "work-area",
  "power-efficiency",
  "hooke-law",
  "young-modulus",
  "stress-strain",
  "elastic-energy",
  "uniform-circular-motion",
  "centripetal-force",
  "velocity-acceleration-followers",
] as const);

export type MechanicsExampleId = (typeof MECHANICS_EXAMPLE_IDS)[number];

export interface MechanicsScenario {
  readonly id: MechanicsExampleId;
  readonly topic: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  readonly title: string;
  readonly question: string;
  readonly result: unknown;
  readonly equations: readonly string[];
  readonly assumptions: readonly string[];
  readonly representations: readonly string[];
}

export const TOPICS: Readonly<
  Record<MechanicsExampleId, MechanicsScenario["topic"]>
> = Object.freeze({
  "units-prefixes": 1,
  "dimensional-analysis": 1,
  "vector-components": 1,
  "uncertainty-repeated-measurements": 1,
  "constant-velocity": 2,
  "constant-acceleration": 2,
  "free-fall": 2,
  projectile: 2,
  "motion-graphs-linked": 2,
  "forces-fbd": 3,
  "inclined-plane": 3,
  "pulley-system": 3,
  "elastic-collision": 3,
  "inelastic-collision": 3,
  impulse: 3,
  "moments-balance": 4,
  "centre-of-mass-stability": 4,
  density: 4,
  "pressure-depth": 4,
  "energy-conservation": 5,
  "spring-energy": 5,
  "work-area": 5,
  "power-efficiency": 5,
  "hooke-law": 6,
  "young-modulus": 6,
  "stress-strain": 6,
  "elastic-energy": 6,
  "uniform-circular-motion": 12,
  "centripetal-force": 12,
  "velocity-acceleration-followers": 12,
});

export const TITLES: Readonly<Record<MechanicsExampleId, string>> =
  Object.freeze({
    "units-prefixes": "SI prefix scale",
    "dimensional-analysis": "Dimensional analysis",
    "vector-components": "Vector components",
    "uncertainty-repeated-measurements": "Repeated measurements",
    "constant-velocity": "Constant velocity",
    "constant-acceleration": "Constant acceleration",
    "free-fall": "Free fall",
    projectile: "Projectile motion",
    "motion-graphs-linked": "Linked motion graphs",
    "forces-fbd": "Forces and free-body diagram",
    "inclined-plane": "Inclined plane",
    "pulley-system": "Pulley system",
    "elastic-collision": "Elastic collision",
    "inelastic-collision": "Inelastic collision",
    impulse: "Impulse area",
    "moments-balance": "Moments balance",
    "centre-of-mass-stability": "Centre of mass and stability",
    density: "Density",
    "pressure-depth": "Pressure with depth",
    "energy-conservation": "Energy conservation",
    "spring-energy": "Spring energy",
    "work-area": "Work from graph area",
    "power-efficiency": "Power and efficiency",
    "hooke-law": "Hooke's law",
    "young-modulus": "Young modulus",
    "stress-strain": "Stress–strain",
    "elastic-energy": "Elastic energy",
    "uniform-circular-motion": "Uniform circular motion",
    "centripetal-force": "Centripetal force",
    "velocity-acceleration-followers": "Tangent and radial followers",
  });
