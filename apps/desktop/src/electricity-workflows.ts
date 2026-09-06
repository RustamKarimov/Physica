export type ElectricityWorkflowId =
  | "charge-current"
  | "iv"
  | "resistivity-power"
  | "network"
  | "internal-divider"
  | "rc";
export type ElectricityControlKey = "a" | "b" | "c" | "d" | "e";

export interface ElectricityWorkflow {
  readonly id: ElectricityWorkflowId;
  readonly title: string;
  readonly topic: string;
  readonly question: string;
  readonly equation: string;
  readonly assumptions: readonly string[];
  readonly controls: readonly {
    readonly key: ElectricityControlKey;
    readonly label: string;
    readonly unit: string;
    readonly min: number;
    readonly max: number;
    readonly step: number;
    readonly kind?: "range" | "toggle";
  }[];
  readonly defaults: Readonly<Record<ElectricityControlKey, number>>;
}

export const ELECTRICITY_WORKFLOWS: readonly ElectricityWorkflow[] = [
  {
    id: "charge-current",
    title: "Charge and current",
    topic: "Topic 9 · Electricity",
    question: "How much charge passes a point during a measured interval?",
    equation: "Q = It",
    assumptions: ["steady conventional current", "signed flow direction shown"],
    controls: [
      { key: "a", label: "Current", unit: "A", min: -5, max: 5, step: 0.1 },
      { key: "b", label: "Duration", unit: "s", min: 0, max: 60, step: 0.5 },
    ],
    defaults: { a: 1.5, b: 12, c: 0, d: 0, e: 0 },
  },
  {
    id: "iv",
    title: "I–V characteristics",
    topic: "Topic 9 · Electricity",
    question: "Why does a hot filament not keep a constant resistance?",
    equation: "V = IR only for an ohmic component at fixed temperature",
    assumptions: [
      "static teaching curves",
      "filament temperature history omitted",
    ],
    controls: [
      {
        key: "a",
        label: "Probe voltage",
        unit: "V",
        min: -12,
        max: 12,
        step: 0.2,
      },
      {
        key: "b",
        label: "Curve control",
        unit: "",
        min: 0.4,
        max: 2,
        step: 0.05,
      },
    ],
    defaults: { a: 6, b: 1, c: 0, d: 0, e: 0 },
  },
  {
    id: "resistivity-power",
    title: "Resistivity and power",
    topic: "Topic 9 · Electricity",
    question:
      "How do wire geometry and voltage determine resistance and power?",
    equation: "R = ρL/A    I = V/R    P = VI",
    assumptions: [
      "uniform copper-like conductor",
      "fixed temperature",
      "ohmic response",
    ],
    controls: [
      {
        key: "a",
        label: "Resistivity",
        unit: "nΩ m",
        min: 10,
        max: 100,
        step: 1,
      },
      { key: "b", label: "Length", unit: "m", min: 0.2, max: 5, step: 0.1 },
      { key: "c", label: "Area", unit: "mm²", min: 0.2, max: 5, step: 0.1 },
      { key: "d", label: "Voltage", unit: "V", min: 0.1, max: 12, step: 0.1 },
    ],
    defaults: { a: 17, b: 2, c: 1, d: 1.2, e: 0 },
  },
  {
    id: "network",
    title: "Series–parallel network",
    topic: "Topic 10 · D.C. circuits",
    question:
      "Can every branch current and node potential satisfy KCL and KVL together?",
    equation: "ΣI = 0 at a node    ΣV = 0 around a loop",
    assumptions: ["ideal source", "ohmic branches", "ideal wires and meters"],
    controls: [
      { key: "a", label: "Source emf", unit: "V", min: 1, max: 24, step: 0.5 },
      {
        key: "b",
        label: "Series resistance",
        unit: "Ω",
        min: 1,
        max: 20,
        step: 0.5,
      },
      {
        key: "c",
        label: "Branch A resistance",
        unit: "Ω",
        min: 1,
        max: 30,
        step: 0.5,
      },
      {
        key: "d",
        label: "Branch B resistance",
        unit: "Ω",
        min: 1,
        max: 30,
        step: 0.5,
      },
      {
        key: "e",
        label: "Branch B switch",
        unit: "",
        min: 0,
        max: 1,
        step: 1,
        kind: "toggle",
      },
    ],
    defaults: { a: 12, b: 4, c: 6, d: 3, e: 1 },
  },
  {
    id: "internal-divider",
    title: "Cell and potential divider",
    topic: "Topic 10 · D.C. circuits",
    question:
      "How do internal loss and divider position change measured terminal values?",
    equation: "E = Vterminal + Ir    Vout = Vin R₂/(R₁ + R₂)",
    assumptions: [
      "lumped internal resistance",
      "unloaded ideal divider voltmeter",
    ],
    controls: [
      { key: "a", label: "Cell emf", unit: "V", min: 1, max: 24, step: 0.5 },
      {
        key: "b",
        label: "Internal resistance",
        unit: "Ω",
        min: 0,
        max: 5,
        step: 0.1,
      },
      {
        key: "c",
        label: "Load resistance",
        unit: "Ω",
        min: 1,
        max: 30,
        step: 0.5,
      },
      {
        key: "d",
        label: "Divider position",
        unit: "%",
        min: 5,
        max: 95,
        step: 1,
      },
    ],
    defaults: { a: 12, b: 1, c: 5, d: 65, e: 0 },
  },
  {
    id: "rc",
    title: "RC charging",
    topic: "Topic 19 · Capacitance",
    question:
      "How do voltage, current, charge and energy evolve from one named-clock time?",
    equation: "VC = V(1 − e^(−t/RC))    I = (V/R)e^(−t/RC)",
    assumptions: [
      "ideal first-order RC circuit",
      "constant source and capacitance",
    ],
    controls: [
      {
        key: "a",
        label: "Source voltage",
        unit: "V",
        min: 1,
        max: 24,
        step: 0.5,
      },
      {
        key: "b",
        label: "Resistance",
        unit: "kΩ",
        min: 0.2,
        max: 10,
        step: 0.1,
      },
      {
        key: "c",
        label: "Capacitance",
        unit: "µF",
        min: 50,
        max: 1000,
        step: 10,
      },
      {
        key: "d",
        label: "Named-clock time",
        unit: "s",
        min: 0,
        max: 10,
        step: 0.02,
      },
    ],
    defaults: { a: 12, b: 2, c: 500, d: 1, e: 0 },
  },
];
