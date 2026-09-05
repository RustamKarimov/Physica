export type WorkflowId =
  | "projectile"
  | "incline"
  | "pulley"
  | "collision"
  | "energy"
  | "stress"
  | "circular";
export interface Workflow {
  readonly id: WorkflowId;
  readonly title: string;
  readonly topic: string;
  readonly question: string;
  readonly equation: string;
  readonly assumptions: readonly string[];
  readonly controls: readonly {
    readonly key: "a" | "b" | "c";
    readonly label: string;
    readonly unit: string;
    readonly min: number;
    readonly max: number;
    readonly step: number;
  }[];
  readonly defaults: {
    readonly a: number;
    readonly b: number;
    readonly c: number;
  };
}

export const WORKFLOWS: readonly Workflow[] = [
  {
    id: "projectile",
    title: "Projectile lesson",
    topic: "Topic 2 · Kinematics",
    question:
      "How do independent horizontal and vertical motions form one trajectory?",
    equation: "x = u cos θ · t    y = u sin θ · t − ½gt²",
    assumptions: [
      "uniform g = 9.81 m s⁻²",
      "negligible air resistance",
      "point-particle body",
    ],
    controls: [
      {
        key: "a",
        label: "Launch speed",
        unit: "m s⁻¹",
        min: 5,
        max: 40,
        step: 1,
      },
      { key: "b", label: "Launch angle", unit: "°", min: 10, max: 80, step: 1 },
      { key: "c", label: "Time", unit: "s", min: 0, max: 5, step: 0.05 },
    ],
    defaults: { a: 20, b: 45, c: 1 },
  },
  {
    id: "incline",
    title: "Inclined-plane FBD",
    topic: "Topic 3 · Dynamics",
    question:
      "Is the downslope component of weight large enough to overcome friction?",
    equation: "N = mg cos θ    F∥ = mg sin θ    f ≤ μN",
    assumptions: ["rigid plane", "Coulomb friction", "mass = 5 kg"],
    controls: [
      { key: "a", label: "Plane angle", unit: "°", min: 0, max: 60, step: 1 },
      {
        key: "b",
        label: "Friction coefficient",
        unit: "",
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
    defaults: { a: 30, b: 0.2, c: 0 },
  },
  {
    id: "pulley",
    title: "Pulley investigation",
    topic: "Topic 3 · Dynamics",
    question:
      "How does the mass difference determine acceleration and string tension?",
    equation: "a = (m₂ − m₁)g / (m₁ + m₂)",
    assumptions: [
      "massless inextensible string",
      "frictionless massless pulley",
      "one system owns the constraint",
    ],
    controls: [
      { key: "a", label: "Mass A", unit: "kg", min: 0.5, max: 10, step: 0.5 },
      { key: "b", label: "Mass B", unit: "kg", min: 0.5, max: 10, step: 0.5 },
    ],
    defaults: { a: 2, b: 3, c: 0 },
  },
  {
    id: "collision",
    title: "Collision momentum",
    topic: "Topic 3 · Dynamics",
    question: "What remains conserved as collision elasticity changes?",
    equation: "Σp before = Σp after    v₂ − v₁ = e(u₁ − u₂)",
    assumptions: [
      "isolated one-dimensional collision",
      "mA = 2 kg, mB = 1 kg",
      "finite contact interval omitted from schematic",
    ],
    controls: [
      {
        key: "a",
        label: "Velocity A",
        unit: "m s⁻¹",
        min: -5,
        max: 8,
        step: 0.5,
      },
      {
        key: "b",
        label: "Velocity B",
        unit: "m s⁻¹",
        min: -5,
        max: 8,
        step: 0.5,
      },
      { key: "c", label: "Restitution", unit: "", min: 0, max: 1, step: 0.05 },
    ],
    defaults: { a: 3, b: 0, c: 1 },
  },
  {
    id: "energy",
    title: "Energy transfer",
    topic: "Topic 5 · Work, energy and power",
    question:
      "Can every joule be assigned to a useful transfer, store or dissipation?",
    equation: "Einput = Euseful + Estored + Edissipated",
    assumptions: [
      "closed accounting interval",
      "stored energy is a teacher-controlled share",
    ],
    controls: [
      {
        key: "a",
        label: "Input energy",
        unit: "J",
        min: 10,
        max: 1000,
        step: 10,
      },
      {
        key: "b",
        label: "Useful fraction",
        unit: "",
        min: 0,
        max: 0.9,
        step: 0.05,
      },
      {
        key: "c",
        label: "Stored fraction",
        unit: "",
        min: 0,
        max: 0.9,
        step: 0.05,
      },
    ],
    defaults: { a: 600, b: 0.65, c: 0.1 },
  },
  {
    id: "stress",
    title: "Stress–strain",
    topic: "Topic 6 · Deformation",
    question:
      "Where does proportional elastic response end and permanent deformation begin?",
    equation: "σ = F/A    ε = ΔL/L    E = σ/ε",
    assumptions: [
      "uniform specimen cross-section",
      "bilinear educational constitutive curve",
      "E = 200 GPa, yield stress = 400 MPa",
    ],
    controls: [
      {
        key: "a",
        label: "Applied force",
        unit: "N",
        min: 20,
        max: 600,
        step: 10,
      },
      { key: "b", label: "Area", unit: "mm²", min: 0.5, max: 5, step: 0.1 },
      { key: "c", label: "Extension", unit: "mm", min: 0.1, max: 8, step: 0.1 },
    ],
    defaults: { a: 100, b: 1, c: 1 },
  },
  {
    id: "circular",
    title: "Uniform circular motion",
    topic: "Topic 12 · Motion in a circle",
    question:
      "Why is velocity tangent while acceleration and force point inward?",
    equation: "v = ωr    a = v²/r = ω²r    F = ma",
    assumptions: ["fixed radius", "constant angular speed", "mass = 0.5 kg"],
    controls: [
      { key: "a", label: "Radius", unit: "m", min: 0.5, max: 5, step: 0.1 },
      {
        key: "b",
        label: "Angular speed",
        unit: "rad s⁻¹",
        min: -5,
        max: 5,
        step: 0.1,
      },
      { key: "c", label: "Time", unit: "s", min: 0, max: 10, step: 0.05 },
    ],
    defaults: { a: 2, b: 1.5, c: 1 },
  },
];
