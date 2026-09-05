export type WaveOpticsWorkflowId =
  "progressive" | "standing" | "double-slit" | "ray-lens" | "polarization";

export type WaveOpticsControlKey = "a" | "b" | "c" | "d";
export interface WaveOpticsWorkflow {
  readonly id: WaveOpticsWorkflowId;
  readonly title: string;
  readonly topic: string;
  readonly question: string;
  readonly equation: string;
  readonly assumptions: readonly string[];
  readonly controls: readonly {
    readonly key: WaveOpticsControlKey;
    readonly label: string;
    readonly unit: string;
    readonly min: number;
    readonly max: number;
    readonly step: number;
  }[];
  readonly defaults: Readonly<Record<WaveOpticsControlKey, number>>;
}

export const WAVE_OPTICS_WORKFLOWS: readonly WaveOpticsWorkflow[] = [
  {
    id: "progressive",
    title: "Progressive wave",
    topic: "Topic 7 · Waves",
    question:
      "How can a pattern travel while each medium particle stays local?",
    equation: "y = A sin(kx − ωt + φ)    v = fλ",
    assumptions: [
      "linear non-dispersive medium",
      "scalar transverse displacement",
    ],
    controls: [
      { key: "a", label: "Amplitude", unit: "cm", min: 0, max: 20, step: 0.5 },
      { key: "b", label: "Frequency", unit: "Hz", min: 0.2, max: 8, step: 0.1 },
      {
        key: "c",
        label: "Wavelength",
        unit: "m",
        min: 0.25,
        max: 3,
        step: 0.05,
      },
      { key: "d", label: "Time", unit: "s", min: 0, max: 5, step: 0.02 },
    ],
    defaults: { a: 8, b: 1.5, c: 1.2, d: 0.25 },
  },
  {
    id: "standing",
    title: "Standing wave",
    topic: "Topic 8 · Superposition",
    question:
      "Why do nodes remain fixed while the string between them oscillates?",
    equation: "y = 2A sin(kx) cos(ωt + φ)",
    assumptions: ["equal counter-propagating waves", "fixed 2 m medium"],
    controls: [
      {
        key: "a",
        label: "Component amplitude",
        unit: "cm",
        min: 0,
        max: 12,
        step: 0.5,
      },
      { key: "b", label: "Frequency", unit: "Hz", min: 0.2, max: 6, step: 0.1 },
      { key: "c", label: "Wavelength", unit: "m", min: 0.4, max: 2, step: 0.1 },
      { key: "d", label: "Time", unit: "s", min: 0, max: 5, step: 0.02 },
    ],
    defaults: { a: 4, b: 1, c: 1, d: 0 },
  },
  {
    id: "double-slit",
    title: "Double-slit intensity",
    topic: "Topic 8 · Superposition",
    question:
      "Can the visible screen and intensity graph stay one physical result?",
    equation: "I = I₀ sinc²β · cos²(δ/2)    Δy ≈ λL/d",
    assumptions: [
      "coherent monochromatic source",
      "Fraunhofer scalar far field",
    ],
    controls: [
      {
        key: "a",
        label: "Wavelength",
        unit: "nm",
        min: 400,
        max: 700,
        step: 5,
      },
      {
        key: "b",
        label: "Slit separation",
        unit: "mm",
        min: 0.15,
        max: 0.8,
        step: 0.01,
      },
      {
        key: "c",
        label: "Slit width",
        unit: "mm",
        min: 0.02,
        max: 0.12,
        step: 0.005,
      },
      {
        key: "d",
        label: "Screen distance",
        unit: "m",
        min: 0.5,
        max: 4,
        step: 0.1,
      },
    ],
    defaults: { a: 550, b: 0.3, c: 0.08, d: 2 },
  },
  {
    id: "ray-lens",
    title: "Ray boundary and lens",
    topic: "Extended · Geometrical optics",
    question:
      "How do Snell's law and the thin-lens rule locate light and image?",
    equation: "n₁ sin i = n₂ sin r    1/f = 1/u + 1/v",
    assumptions: [
      "air incident medium",
      "thin converging lens f = 0.20 m",
      "paraxial principal rays",
    ],
    controls: [
      {
        key: "a",
        label: "Incident angle",
        unit: "°",
        min: 0,
        max: 80,
        step: 1,
      },
      {
        key: "b",
        label: "Second index",
        unit: "",
        min: 1,
        max: 2.2,
        step: 0.02,
      },
      {
        key: "c",
        label: "Object distance",
        unit: "m",
        min: 0.22,
        max: 1.2,
        step: 0.02,
      },
    ],
    defaults: { a: 35, b: 1.5, c: 0.6, d: 0 },
  },
  {
    id: "polarization",
    title: "Polarizer and analyzer",
    topic: "Extended · Physical optics",
    question: "How does relative axis angle control transmitted intensity?",
    equation: "I = I₀ cos²θ",
    assumptions: [
      "ideal linear polarizers",
      "incident beam already linearly polarized",
    ],
    controls: [
      {
        key: "a",
        label: "Incident intensity",
        unit: "W m⁻²",
        min: 0,
        max: 20,
        step: 0.5,
      },
      {
        key: "b",
        label: "Relative angle",
        unit: "°",
        min: 0,
        max: 180,
        step: 1,
      },
    ],
    defaults: { a: 8, b: 60, c: 0, d: 0 },
  },
];
