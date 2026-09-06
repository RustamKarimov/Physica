export type ThermalWorkflowId =
  | "temperature"
  | "ideal-gas"
  | "particles"
  | "brownian"
  | "first-law"
  | "pv-process";
export type ThermalControlKey = "a" | "b" | "c" | "d";

export interface ThermalWorkflow {
  readonly id: ThermalWorkflowId;
  readonly title: string;
  readonly topic: string;
  readonly question: string;
  readonly equation: string;
  readonly assumptions: readonly string[];
  readonly controls: readonly {
    readonly key: ThermalControlKey;
    readonly label: string;
    readonly unit: string;
    readonly min: number;
    readonly max: number;
    readonly step: number;
  }[];
  readonly defaults: Readonly<Record<ThermalControlKey, number>>;
}

export const THERMAL_WORKFLOWS: readonly ThermalWorkflow[] = [
  {
    id: "temperature",
    title: "Temperature and equilibrium",
    topic: "Topic 14 · Temperature",
    question:
      "How do absolute temperature and thermal contact share one state?",
    equation: "T/K = θ/°C + 273.15    ΔT(t) = ΔT₀e⁻ᵏᵗ",
    assumptions: [
      "constant heat capacities",
      "isolated two-body contact",
      "linear thermometric scale",
    ],
    controls: [
      { key: "a", label: "Hot body", unit: "°C", min: 0, max: 250, step: 1 },
      { key: "b", label: "Cool body", unit: "°C", min: -20, max: 100, step: 1 },
      { key: "c", label: "Contact time", unit: "s", min: 0, max: 180, step: 1 },
    ],
    defaults: { a: 80, b: 20, c: 45, d: 0 },
  },
  {
    id: "ideal-gas",
    title: "Ideal-gas state",
    topic: "Topic 15 · Ideal gases",
    question: "How do pressure, volume and absolute temperature remain linked?",
    equation: "pV = nRT    ⟨Eₖ⟩ = 3kT/2",
    assumptions: [
      "ideal point particles",
      "thermal equilibrium",
      "negligible intermolecular forces",
    ],
    controls: [
      {
        key: "a",
        label: "Temperature",
        unit: "K",
        min: 100,
        max: 800,
        step: 5,
      },
      { key: "b", label: "Volume", unit: "L", min: 5, max: 80, step: 1 },
      { key: "c", label: "Amount", unit: "mol", min: 0.1, max: 3, step: 0.1 },
    ],
    defaults: { a: 300, b: 24, c: 1, d: 0 },
  },
  {
    id: "particles",
    title: "Hard-particle teaching gas",
    topic: "Topic 15 · Ideal gases",
    question: "How do elastic collisions build ensemble observables?",
    equation: "⟨Eₖ⟩ = 3kT/2    collisions conserve p and Eₖ",
    assumptions: [
      "seeded 2D elastic hard disks",
      "schematic size and time scale",
      "velocity calibrated to the 3D kinetic relation",
    ],
    controls: [
      { key: "a", label: "Particles", unit: "", min: 8, max: 48, step: 1 },
      {
        key: "b",
        label: "Temperature",
        unit: "K",
        min: 100,
        max: 700,
        step: 10,
      },
      { key: "c", label: "Seed", unit: "", min: 1, max: 999, step: 1 },
    ],
    defaults: { a: 24, b: 300, c: 97, d: 0 },
  },
  {
    id: "brownian",
    title: "Brownian tracer",
    topic: "Topic 15 · Ideal gases",
    question:
      "How can deterministic molecular impacts produce an irregular path?",
    equation: "Δp_tracer = Σ impulses from gas particles",
    assumptions: [
      "seeded 2D elastic hard disks",
      "tracer is larger and heavier",
      "path is a teaching representation",
    ],
    controls: [
      { key: "a", label: "Particles", unit: "", min: 12, max: 48, step: 1 },
      {
        key: "b",
        label: "Temperature",
        unit: "K",
        min: 100,
        max: 700,
        step: 10,
      },
      { key: "c", label: "Seed", unit: "", min: 1, max: 999, step: 1 },
    ],
    defaults: { a: 28, b: 300, c: 215, d: 0 },
  },
  {
    id: "first-law",
    title: "First-law energy ledger",
    topic: "Topic 16 · Thermodynamics",
    question: "How do heat and work determine the internal-energy change?",
    equation: "ΔU = Q − W_by    U = 3nRT/2",
    assumptions: [
      "monatomic ideal gas",
      "constant-volume path",
      "positive heat enters the gas",
    ],
    controls: [
      {
        key: "a",
        label: "Initial temperature",
        unit: "K",
        min: 100,
        max: 600,
        step: 5,
      },
      {
        key: "b",
        label: "Final temperature",
        unit: "K",
        min: 100,
        max: 800,
        step: 5,
      },
      { key: "c", label: "Amount", unit: "mol", min: 0.1, max: 3, step: 0.1 },
    ],
    defaults: { a: 300, b: 420, c: 1, d: 0 },
  },
  {
    id: "pv-process",
    title: "P–V work",
    topic: "Topic 16 · Thermodynamics",
    question: "How does signed area under an isothermal path become work?",
    equation: "W_by = ∫p dV = nRT ln(V₂/V₁)",
    assumptions: [
      "quasi-static ideal-gas path",
      "constant absolute temperature",
      "positive area is expansion work",
    ],
    controls: [
      {
        key: "a",
        label: "Temperature",
        unit: "K",
        min: 100,
        max: 700,
        step: 5,
      },
      {
        key: "b",
        label: "Initial volume",
        unit: "L",
        min: 5,
        max: 60,
        step: 1,
      },
      { key: "c", label: "Final volume", unit: "L", min: 5, max: 80, step: 1 },
      { key: "d", label: "Amount", unit: "mol", min: 0.1, max: 3, step: 0.1 },
    ],
    defaults: { a: 300, b: 24, c: 48, d: 1 },
  },
];
