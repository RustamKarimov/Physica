export type OscillationWorkflowId =
  "shm" | "pendulum" | "damping" | "resonance" | "coupled";
export type OscillationControlKey = "a" | "b" | "c" | "d";

export interface OscillationWorkflow {
  readonly id: OscillationWorkflowId;
  readonly title: string;
  readonly topic: string;
  readonly question: string;
  readonly equation: string;
  readonly assumptions: readonly string[];
  readonly controls: readonly {
    readonly key: OscillationControlKey;
    readonly label: string;
    readonly unit: string;
    readonly min: number;
    readonly max: number;
    readonly step: number;
  }[];
  readonly defaults: Readonly<Record<OscillationControlKey, number>>;
}

export const OSCILLATION_WORKFLOWS: readonly OscillationWorkflow[] = [
  {
    id: "shm",
    title: "Synchronized SHM",
    topic: "Topic 17 · Oscillations",
    question: "How can every view stay synchronized while time is scrubbed?",
    equation: "x=A cos(ωt+φ)    v=dx/dt    a=−ω²x    F=ma",
    assumptions: ["linear restoring force", "no damping", "constant mass"],
    controls: [
      { key: "a", label: "Amplitude", unit: "cm", min: 2, max: 25, step: 0.5 },
      {
        key: "b",
        label: "Angular frequency",
        unit: "rad s⁻¹",
        min: 1,
        max: 10,
        step: 0.25,
      },
      { key: "c", label: "Mass", unit: "kg", min: 0.1, max: 3, step: 0.1 },
      {
        key: "d",
        label: "Named-clock scrub",
        unit: "s",
        min: 0,
        max: 10,
        step: 0.05,
      },
    ],
    defaults: { a: 12, b: 4, c: 0.5, d: 0.7 },
  },
  {
    id: "pendulum",
    title: "Small-angle pendulum",
    topic: "Topic 17 · Oscillations",
    question: "How do length and gravity set a pendulum period?",
    equation: "θ=θ₀ cos(√(g/L)t)    T=2π√(L/g)",
    assumptions: ["small angle", "point bob", "massless rigid string"],
    controls: [
      { key: "a", label: "Length", unit: "m", min: 0.2, max: 3, step: 0.05 },
      { key: "b", label: "Amplitude", unit: "°", min: 1, max: 18, step: 0.5 },
      { key: "c", label: "Mass", unit: "kg", min: 0.05, max: 1, step: 0.05 },
      { key: "d", label: "Time", unit: "s", min: 0, max: 10, step: 0.05 },
    ],
    defaults: { a: 1.2, b: 8, c: 0.2, d: 0.8 },
  },
  {
    id: "damping",
    title: "Damped oscillator",
    topic: "Topic 17 · Oscillations",
    question: "How does viscous damping remove mechanical energy?",
    equation: "mx″+cx′+kx=0    P_diss=c v²",
    assumptions: ["linear spring", "viscous damping", "fixed-step RK4"],
    controls: [
      {
        key: "a",
        label: "Initial displacement",
        unit: "cm",
        min: 2,
        max: 30,
        step: 1,
      },
      {
        key: "b",
        label: "Spring constant",
        unit: "N m⁻¹",
        min: 4,
        max: 60,
        step: 1,
      },
      { key: "c", label: "Damping", unit: "kg s⁻¹", min: 0, max: 5, step: 0.1 },
      { key: "d", label: "Run time", unit: "s", min: 0.1, max: 10, step: 0.1 },
    ],
    defaults: { a: 20, b: 16, c: 0.8, d: 4 },
  },
  {
    id: "resonance",
    title: "Driven resonance",
    topic: "Topic 17 · Oscillations",
    question: "How do drive frequency and damping set amplitude and phase?",
    equation: "A=F₀/√[(k−mω²)²+(cω)²]",
    assumptions: ["linear steady state", "sinusoidal drive", "viscous damping"],
    controls: [
      {
        key: "a",
        label: "Drive frequency",
        unit: "rad s⁻¹",
        min: 0,
        max: 12,
        step: 0.1,
      },
      {
        key: "b",
        label: "Damping",
        unit: "kg s⁻¹",
        min: 0.2,
        max: 5,
        step: 0.1,
      },
      {
        key: "c",
        label: "Spring constant",
        unit: "N m⁻¹",
        min: 4,
        max: 64,
        step: 1,
      },
      {
        key: "d",
        label: "Drive force",
        unit: "N",
        min: 0.2,
        max: 5,
        step: 0.1,
      },
    ],
    defaults: { a: 5, b: 1.2, c: 25, d: 2 },
  },
  {
    id: "coupled",
    title: "Coupled normal modes",
    topic: "Topic 17 · Oscillations extension",
    question: "How can one coupled model own two synchronized masses?",
    equation: "ω₊=√(k/m)    ω₋=√[(k+2k_c)/m]",
    assumptions: [
      "identical masses",
      "linear identical grounding springs",
      "one coupling spring",
    ],
    controls: [
      {
        key: "a",
        label: "Symmetric amplitude",
        unit: "cm",
        min: 0,
        max: 15,
        step: 0.5,
      },
      {
        key: "b",
        label: "Antisymmetric amplitude",
        unit: "cm",
        min: 0,
        max: 15,
        step: 0.5,
      },
      {
        key: "c",
        label: "Coupling stiffness",
        unit: "N m⁻¹",
        min: 0,
        max: 20,
        step: 0.5,
      },
      { key: "d", label: "Time", unit: "s", min: 0, max: 10, step: 0.05 },
    ],
    defaults: { a: 6, b: 6, c: 8, d: 1.2 },
  },
];
