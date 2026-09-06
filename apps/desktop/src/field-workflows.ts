export type FieldWorkflowId =
  | "gravity"
  | "orbit"
  | "electric-field"
  | "particle"
  | "magnetic-force"
  | "induction"
  | "ac"
  | "transformer";
export type FieldControlKey = "a" | "b" | "c" | "d";

export interface FieldWorkflow {
  readonly id: FieldWorkflowId;
  readonly title: string;
  readonly topic: string;
  readonly question: string;
  readonly equation: string;
  readonly assumptions: readonly string[];
  readonly controls: readonly {
    readonly key: FieldControlKey;
    readonly label: string;
    readonly unit: string;
    readonly min: number;
    readonly max: number;
    readonly step: number;
  }[];
  readonly defaults: Readonly<Record<FieldControlKey, number>>;
}

export const FIELD_WORKFLOWS: readonly FieldWorkflow[] = [
  {
    id: "gravity",
    title: "Gravitational field",
    topic: "Topic 13 · Gravitational fields",
    question: "How do field and potential change with distance from Earth?",
    equation: "g = −GM/r²    φ = −GM/r",
    assumptions: [
      "spherical Earth",
      "Newtonian field",
      "zero potential at infinity",
    ],
    controls: [
      {
        key: "a",
        label: "Earth masses",
        unit: "M⊕",
        min: 0.2,
        max: 5,
        step: 0.1,
      },
      {
        key: "b",
        label: "Radius",
        unit: "1000 km",
        min: 6.4,
        max: 40,
        step: 0.2,
      },
    ],
    defaults: { a: 1, b: 7, c: 0, d: 0 },
  },
  {
    id: "orbit",
    title: "Circular orbit",
    topic: "Topic 13 · Gravitational fields",
    question: "How does orbital radius link speed, period and energy?",
    equation: "v = √(GM/r)    T = 2π√(r³/GM)",
    assumptions: [
      "circular orbit",
      "Earth fixed",
      "satellite mass negligible dynamically",
    ],
    controls: [
      {
        key: "a",
        label: "Orbital radius",
        unit: "1000 km",
        min: 6.5,
        max: 45,
        step: 0.2,
      },
      {
        key: "b",
        label: "Satellite mass",
        unit: "kg",
        min: 100,
        max: 5000,
        step: 100,
      },
    ],
    defaults: { a: 6.771, b: 1000, c: 0, d: 0 },
  },
  {
    id: "electric-field",
    title: "Electric field and potential",
    topic: "Topic 18 · Electric fields",
    question: "How do charge sign and distance set E and V?",
    equation: "E = kQ/r²    V = kQ/r",
    assumptions: ["point charge", "vacuum", "electrostatic state"],
    controls: [
      {
        key: "a",
        label: "Source charge",
        unit: "nC",
        min: -10,
        max: 10,
        step: 0.2,
      },
      {
        key: "b",
        label: "Probe distance",
        unit: "m",
        min: 0.05,
        max: 1,
        step: 0.01,
      },
    ],
    defaults: { a: 2, b: 0.25, c: 0, d: 0 },
  },
  {
    id: "particle",
    title: "Charged particle between plates",
    topic: "Topic 18 · Electric fields",
    question: "How does plate voltage alter an electron trajectory?",
    equation: "E = V/d    a = qE/m",
    assumptions: [
      "uniform field",
      "non-relativistic electron",
      "edge effects neglected",
    ],
    controls: [
      {
        key: "a",
        label: "Plate voltage",
        unit: "V",
        min: -500,
        max: 500,
        step: 10,
      },
      {
        key: "b",
        label: "Plate separation",
        unit: "cm",
        min: 1,
        max: 10,
        step: 0.2,
      },
      {
        key: "c",
        label: "Electron speed",
        unit: "10⁷ m/s",
        min: 0.5,
        max: 4,
        step: 0.1,
      },
      {
        key: "d",
        label: "Flight time",
        unit: "ns",
        min: 0.1,
        max: 3,
        step: 0.05,
      },
    ],
    defaults: { a: 200, b: 5, c: 2, d: 1 },
  },
  {
    id: "magnetic-force",
    title: "Magnetic force",
    topic: "Topic 20 · Magnetic fields",
    question: "How do current, field and angle determine wire force?",
    equation: "F = BIL sin θ",
    assumptions: ["uniform B", "straight active wire", "conventional current"],
    controls: [
      {
        key: "a",
        label: "Magnetic field",
        unit: "T",
        min: 0,
        max: 2,
        step: 0.05,
      },
      { key: "b", label: "Current", unit: "A", min: -5, max: 5, step: 0.1 },
      {
        key: "c",
        label: "Wire length",
        unit: "m",
        min: 0.05,
        max: 1,
        step: 0.05,
      },
      { key: "d", label: "Angle", unit: "°", min: 0, max: 180, step: 1 },
    ],
    defaults: { a: 0.4, b: 3, c: 0.2, d: 90 },
  },
  {
    id: "induction",
    title: "Electromagnetic induction",
    topic: "Topic 20 · Magnetic fields",
    question: "How do flux change and Lenz polarity determine induced emf?",
    equation: "Φ = BA cos θ    ε = −N ΔΦ/Δt",
    assumptions: ["uniform flux per turn", "constant rate over interval"],
    controls: [
      { key: "a", label: "Coil turns", unit: "", min: 10, max: 1000, step: 10 },
      {
        key: "b",
        label: "Flux change",
        unit: "mWb",
        min: -10,
        max: 10,
        step: 0.1,
      },
      {
        key: "c",
        label: "Time interval",
        unit: "s",
        min: 0.02,
        max: 2,
        step: 0.02,
      },
    ],
    defaults: { a: 200, b: 3, c: 0.1, d: 0 },
  },
  {
    id: "ac",
    title: "AC waveform and RMS",
    topic: "Topic 21 · Alternating currents",
    question: "How does one named-clock sample relate peak, RMS and phase?",
    equation: "V = V₀ sin(2πft)    Vrms = V₀/√2",
    assumptions: ["ideal sinusoid", "steady frequency"],
    controls: [
      { key: "a", label: "Peak voltage", unit: "V", min: 1, max: 400, step: 1 },
      { key: "b", label: "Frequency", unit: "Hz", min: 1, max: 100, step: 1 },
      {
        key: "c",
        label: "Named-clock time",
        unit: "ms",
        min: 0,
        max: 100,
        step: 0.2,
      },
    ],
    defaults: { a: 325, b: 50, c: 5, d: 0 },
  },
  {
    id: "transformer",
    title: "Transformer and transmission",
    topic: "Topic 21 · Alternating currents",
    question: "How does turns ratio change voltage, current and line loss?",
    equation: "Vs/Vp = Ns/Np    P = VI    Ploss = I²R",
    assumptions: [
      "ideal transformer",
      "purely resistive line",
      "fixed input power",
    ],
    controls: [
      {
        key: "a",
        label: "Primary turns",
        unit: "",
        min: 50,
        max: 1000,
        step: 10,
      },
      {
        key: "b",
        label: "Secondary turns",
        unit: "",
        min: 50,
        max: 5000,
        step: 10,
      },
      {
        key: "c",
        label: "Primary voltage",
        unit: "V",
        min: 10,
        max: 500,
        step: 5,
      },
      {
        key: "d",
        label: "Primary current",
        unit: "A",
        min: 0.1,
        max: 20,
        step: 0.1,
      },
    ],
    defaults: { a: 500, b: 2000, c: 230, d: 2 },
  },
];
