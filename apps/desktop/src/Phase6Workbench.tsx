import { useMemo, useState } from "react";
import { constantAcceleration1D } from "@physica/solver-analytical";
import { findBracketedRoot } from "@physica/solver-algebraic";
import { rk4 } from "@physica/solver-ode";
import { solveDcCircuit } from "@physica/solver-circuits";
import { traceInterfaces } from "@physica/solver-rays";
import { scalarGrid1D, stepWaveEquation1D } from "@physica/solver-grid";
import {
  SeededRandom,
  scheduleExponentialEvents,
} from "@physica/solver-stochastic";
import { forwardProject, scalarImage } from "@physica/solver-reconstruction";
import "./phase6-workbench.css";

type Proof = {
  readonly id: string;
  readonly label: string;
  readonly question: string;
  readonly answer: string;
  readonly detail: string;
  readonly points: readonly { x: number; y: number }[];
};
function createProofs(): readonly Proof[] {
  const acceleration = constantAcceleration1D(0, 8, -9.81, 1);
  const root = findBracketedRoot((x) => x * x - 2, 0, 2);
  let oscillator: readonly number[] = [1, 0];
  const oscillation = [{ x: 0, y: 1 }];
  for (let i = 0; i < 80; i += 1) {
    oscillator = rk4(
      (_t, s) => [s[1] ?? 0, -(s[0] ?? 0) - 0.2 * (s[1] ?? 0)],
      oscillator,
      i / 20,
      0.05,
    ).state;
    oscillation.push({ x: (i + 1) / 20, y: oscillator[0] ?? 0 });
  }
  const grid = scalarGrid1D([0, 0, 0.25, 0.7, 1, 0.7, 0.25, 0, 0], 1);
  const wave = stepWaveEquation1D(
    { displacement: grid, previous: grid, timeSeconds: 0 },
    1,
    0.5,
    "fixed",
  );
  const rays = traceInterfaces(
    { origin: { x: 0, y: 1 }, direction: { x: 0.5, y: -0.8660254 } },
    [
      {
        id: "air-glass",
        point: { x: 0, y: 0 },
        normal: { x: 0, y: 1 },
        refractiveIndexBefore: 1,
        refractiveIndexAfter: 1.5,
      },
    ],
  );
  const circuit = solveDcCircuit({
    groundNode: "g",
    resistors: [
      { id: "r1", nodeA: "v", nodeB: "n", resistanceOhms: 100 },
      { id: "r2", nodeA: "n", nodeB: "g", resistanceOhms: 100 },
    ],
    voltageSources: [
      { id: "battery", positiveNode: "v", negativeNode: "g", voltageVolts: 10 },
    ],
  });
  const events = scheduleExponentialEvents(2, 6, new SeededRandom(9702));
  const pixels = Array(64).fill(0) as number[];
  pixels[18] = 1;
  pixels[45] = 0.7;
  const projection = forwardProject(scalarImage(8, 8, pixels), {
    anglesRadians: [0, Math.PI / 4, Math.PI / 2],
    detectorCount: 8,
  });
  return [
    {
      id: "analytical",
      label: "Exact motion",
      question: "Where is an accelerating object at t = 1 s?",
      answer: acceleration.position.toFixed(3) + " m",
      detail:
        "Closed-form model: x = u t + 1/2 a t². No frame loop is involved.",
      points: [
        { x: 0, y: 0 },
        { x: 0.25, y: 1.7 },
        { x: 0.5, y: 2.8 },
        { x: 0.75, y: 3.3 },
        { x: 1, y: acceleration.position },
      ],
    },
    {
      id: "algebraic",
      label: "Solved state",
      question: "Which x satisfies x² = 2?",
      answer: root.value.toFixed(10),
      detail:
        "Bracketed root search reports its residual and convergence, rather than guessing.",
      points: [
        { x: 0, y: -2 },
        { x: 0.5, y: -1.75 },
        { x: 1, y: -1 },
        { x: 1.414, y: 0 },
        { x: 2, y: 2 },
      ],
    },
    {
      id: "ode",
      label: "Numerical evolution",
      question: "How does a damped oscillator evolve?",
      answer: "x(4 s) = " + (oscillator[0] ?? 0).toFixed(4),
      detail:
        "RK4 advances physics time independently of display refresh rate.",
      points: oscillation,
    },
    {
      id: "grid",
      label: "Wave grid",
      question: "Can a disturbance advance stably?",
      answer: "Courant = " + wave.diagnostic.courantNumber.toFixed(2),
      detail:
        "Fixed boundaries and an explicit stability condition govern the grid.",
      points: wave.state.displacement.values.map((y, x) => ({ x, y })),
    },
    {
      id: "rays",
      label: "Optical path",
      question: "Where does an air-to-glass ray meet the boundary?",
      answer: "x = " + (rays[0]?.to.x ?? 0).toFixed(3),
      detail: "The path uses analytic intersection and Snell refraction.",
      points: [
        { x: 0, y: 1 },
        { x: rays[0]?.to.x ?? 0, y: 0 },
        { x: 1, y: -0.3 },
      ],
    },
    {
      id: "circuit",
      label: "Circuit network",
      question: "What is the divider midpoint voltage?",
      answer: (circuit.nodeVoltages.n ?? 0).toFixed(2) + " V",
      detail:
        "Modified nodal analysis satisfies the whole graph, including Kirchhoff constraints.",
      points: [
        { x: 0, y: 10 },
        { x: 1, y: 5 },
        { x: 2, y: 0 },
      ],
    },
    {
      id: "stochastic",
      label: "Seeded events",
      question: "Can random decay replay exactly?",
      answer: events.length + " reproducible events",
      detail:
        "The seed and random-source snapshot make the same event sequence replayable.",
      points: events.map((event, index) => ({
        x: event.timeSeconds,
        y: index + 1,
      })),
    },
    {
      id: "reconstruction",
      label: "Tomography",
      question: "Can projections retain two-object evidence?",
      answer:
        projection.values.filter((value) => value > 0).length +
        " active detector bins",
      detail: "Forward projection is the input to later reconstruction views.",
      points: projection.values.map((y, x) => ({ x, y })),
    },
  ];
}
const proofs = createProofs();
function polyline(points: readonly { x: number; y: number }[]): string {
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  return points
    .map(
      (p) =>
        60 +
        ((p.x - minX) / (maxX - minX || 1)) * 620 +
        "," +
        (340 - ((p.y - minY) / (maxY - minY || 1)) * 230),
    )
    .join(" ");
}
export function Phase6Workbench() {
  const [selected, setSelected] = useState(proofs[0]!.id);
  const proof = proofs.find((item) => item.id === selected) ?? proofs[0]!;
  const line = useMemo(() => polyline(proof.points), [proof]);
  const endpoint = line.split(" ").at(-1)?.split(",") ?? ["60", "340"];
  return (
    <section
      className="phase6-workbench"
      id="phase-6-workbench"
      aria-labelledby="phase6-title"
    >
      <div className="phase6-heading">
        <div>
          <span>PHASE 6 · SOLVER FOUNDATION</span>
          <h1 id="phase6-title">The calculations behind future lessons.</h1>
        </div>
        <p>
          This panel is a transparent engineering view, not a finished lesson.
          Pick a solver to see the physical question it answers and the
          numerical result it guarantees.
        </p>
      </div>
      <div className="phase6-grid">
        <nav aria-label="Physics solver proofs">
          {proofs.map((item) => (
            <button
              key={item.id}
              className={item.id === proof.id ? "active" : ""}
              onClick={() => setSelected(item.id)}
            >
              <b>{item.label}</b>
              <small>{item.question}</small>
            </button>
          ))}
        </nav>
        <div className="phase6-stage">
          <div className="phase6-result">
            <span>REFERENCE RESULT</span>
            <strong>{proof.answer}</strong>
            <p>{proof.detail}</p>
          </div>
          <svg
            viewBox="0 0 740 400"
            role="img"
            aria-label={proof.label + " numerical reference plot"}
          >
            <path className="phase6-axis" d="M60 340H700M60 45V340" />
            <polyline points={line} />
            <circle cx={endpoint[0]} cy={endpoint[1]} r="7" />
          </svg>
          <div className="phase6-authority">
            <b>CONTRACT</b>
            <span>
              Physics time and solver state are authoritative. This plot only
              observes the result.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
