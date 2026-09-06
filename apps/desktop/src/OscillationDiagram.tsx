import type {
  OscillationAnalysis,
  OscillationGraphPoint,
} from "./oscillation-analysis";
import type { OscillationWorkflowId } from "./oscillation-workflows";

function seriesPoints(
  graph: readonly OscillationGraphPoint[],
  key: keyof Omit<OscillationGraphPoint, "time">,
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  if (graph.length === 0) return "";
  const values = graph.map((point) => point[key]);
  const maximum = Math.max(...values.map(Math.abs), 1e-12);
  return graph
    .map((point, index) => {
      const px = x + (width * index) / Math.max(1, graph.length - 1);
      const py = y + height / 2 - (point[key] / maximum) * (height * 0.42);
      return px.toFixed(2) + "," + py.toFixed(2);
    })
    .join(" ");
}

function currentX(
  analysis: OscillationAnalysis,
  x: number,
  width: number,
): number {
  return (
    x +
    (width * analysis.currentGraphIndex) /
      Math.max(1, (analysis.graph.length || analysis.resonance.length) - 1)
  );
}

export function OscillationDiagram({
  id,
  analysis,
}: {
  readonly id: OscillationWorkflowId;
  readonly analysis: OscillationAnalysis;
}) {
  const state = analysis.state;
  if (id === "shm") {
    const amplitude = Math.max(state.amplitude!, 1e-12);
    const massX = 305 + (state.displacement! / amplitude) * 115;
    const markerX = currentX(analysis, 505, 345);
    const total = Math.max(state.totalEnergy!, 1e-12);
    return (
      <svg
        viewBox="0 0 900 520"
        role="img"
        aria-label="Synchronized SHM mass, x v a and force vectors, energy bars, and linked graph followers at one named-clock time"
      >
        <path
          d={
            "M55 150h55l18-28 28 56 28-56 28 56 28-56 28 56 28-28h" +
            (massX - 305)
          }
          className="os-spring"
        />
        <rect
          x={massX}
          y="112"
          width="82"
          height="76"
          rx="8"
          className="os-mass"
        />
        <line x1="305" y1="92" x2="305" y2="206" className="os-equilibrium" />
        <text x="269" y="218">
          x = 0
        </text>
        <path
          d={
            "M" + (massX + 41) + " 104h" + (state.displacement! >= 0 ? 80 : -80)
          }
          className="os-x-vector"
        />
        <text x={massX + 15} y="90">
          x {state.displacement! >= 0 ? "→ +" : "← −"}
        </text>
        <path
          d={"M" + (massX + 41) + " 204h" + (state.velocity! >= 0 ? 75 : -75)}
          className="os-v-vector"
        />
        <text x={massX + 15} y="230">
          v {state.velocity! >= 0 ? "→ +" : "← −"}
        </text>
        <path
          d={
            "M" + (massX + 41) + " 258h" + (state.acceleration! >= 0 ? 70 : -70)
          }
          className="os-a-vector"
        />
        <text x={massX + 10} y="284">
          a, F {state.acceleration! >= 0 ? "→ +" : "← −"}
        </text>
        <rect
          x="80"
          y={465 - (125 * state.kineticEnergy!) / total}
          width="58"
          height={(125 * state.kineticEnergy!) / total}
          className="os-ke"
        />
        <rect
          x="155"
          y={465 - (125 * state.potentialEnergy!) / total}
          width="58"
          height={(125 * state.potentialEnergy!) / total}
          className="os-pe"
        />
        <text x="90" y="492">
          KE
        </text>
        <text x="165" y="492">
          EPE
        </text>
        {[
          ["displacement", "x–t", 66],
          ["velocity", "v–t", 176],
          ["acceleration", "a–t", 286],
        ].map(([key, label, y]) => (
          <g key={key}>
            <path d={"M505 " + (Number(y) + 42) + "H850"} className="os-axis" />
            <polyline
              points={seriesPoints(
                analysis.graph,
                key as "displacement" | "velocity" | "acceleration",
                505,
                Number(y),
                345,
                84,
              )}
              className={"os-series " + key}
            />
            <line
              x1={markerX}
              y1={y}
              x2={markerX}
              y2={Number(y) + 84}
              className="os-cursor"
            />
            <text x="462" y={Number(y) + 47}>
              {label}
            </text>
          </g>
        ))}
        <text x="490" y="430">
          t = {state.time?.toFixed(2)} s · one shared graph cursor
        </text>
        <text x="490" y="462">
          KE + EPE = {state.totalEnergy?.toFixed(4)} J
        </text>
      </svg>
    );
  }
  if (id === "pendulum") {
    const pivotX = 300;
    const pivotY = 70;
    const bobX = pivotX + 220 * Math.sin(state.angle!);
    const bobY = pivotY + 220 * Math.cos(state.angle!);
    return (
      <svg
        viewBox="0 0 900 520"
        role="img"
        aria-label="Small-angle pendulum with equilibrium, extremes, angular displacement and linked displacement graph"
      >
        <path d="M210 55H390" className="os-support" />
        <path
          d={"M" + pivotX + " " + pivotY + "L" + bobX + " " + bobY}
          className="os-string"
        />
        <line
          x1={pivotX}
          y1={pivotY}
          x2={pivotX}
          y2="310"
          className="os-equilibrium"
        />
        <circle cx={bobX} cy={bobY} r="30" className="os-bob" />
        <text x={bobX + 35} y={bobY}>
          θ = {((state.angle! * 180) / Math.PI).toFixed(2)}°
        </text>
        <path d="M470 350H850M470 80V370" className="os-axis" />
        <polyline
          points={seriesPoints(
            analysis.graph,
            "displacement",
            470,
            80,
            380,
            270,
          )}
          className="os-series displacement"
        />
        <line
          x1={currentX(analysis, 470, 380)}
          y1="80"
          x2={currentX(analysis, 470, 380)}
          y2="350"
          className="os-cursor"
        />
        <text x="475" y="400">
          T = {state.period?.toFixed(3)} s · small-angle model disclosed
        </text>
      </svg>
    );
  }
  if (id === "resonance") {
    const maximum = Math.max(
      ...analysis.resonance.map((point) => point.amplitude),
    );
    const points = analysis.resonance
      .map((point, index) => {
        const x = 90 + (720 * index) / (analysis.resonance.length - 1);
        const y = 390 - (280 * point.amplitude) / maximum;
        return x.toFixed(2) + "," + y.toFixed(2);
      })
      .join(" ");
    const cursor = currentX(analysis, 90, 720);
    return (
      <svg
        viewBox="0 0 900 520"
        role="img"
        aria-label="Labelled driven-oscillator resonance curve with selected frequency, amplitude and phase lag"
      >
        <path d="M90 390H820M90 70V410" className="os-axis" />
        <polyline points={points} className="os-resonance" />
        <line x1={cursor} y1="70" x2={cursor} y2="390" className="os-cursor" />
        <circle
          cx={cursor}
          cy={390 - (280 * state.amplitude!) / maximum}
          r="9"
          className="os-marker"
        />
        <text x="115" y="455">
          driving angular frequency →
        </text>
        <text x="125" y="100">
          response amplitude ↑
        </text>
        <text x="500" y="470">
          selected ω = {state.driveFrequency?.toFixed(2)} rad s⁻¹ · phase lag ={" "}
          {((state.phase! * 180) / Math.PI).toFixed(1)}°
        </text>
      </svg>
    );
  }
  if (id === "coupled")
    return (
      <svg
        viewBox="0 0 900 520"
        role="img"
        aria-label="Two masses and three springs owned by one coupled normal-mode model"
      >
        <path
          d="M35 250h90l20-35 35 70 35-70 35 70 30-35"
          className="os-spring"
        />
        <rect
          x={280 + state.first! * 500}
          y="205"
          width="105"
          height="90"
          className="os-mass"
        />
        <path
          d={
            "M" +
            (385 + state.first! * 500) +
            " 250h80l20-35 35 70 35-70 35 70 30-35"
          }
          className="os-spring coupled"
        />
        <rect
          x={600 + state.second! * 500}
          y="205"
          width="105"
          height="90"
          className="os-mass second"
        />
        <text x="270" y="340">
          Mass A x₁={state.first?.toFixed(3)} m
        </text>
        <text x="585" y="340">
          Mass B x₂={state.second?.toFixed(3)} m
        </text>
        <text x="240" y="410">
          symmetric ω₊={state.symmetricFrequency?.toFixed(2)} rad s⁻¹
        </text>
        <text x="505" y="445">
          antisymmetric ω₋={state.antisymmetricFrequency?.toFixed(2)} rad s⁻¹
        </text>
      </svg>
    );
  return (
    <svg
      viewBox="0 0 900 520"
      role="img"
      aria-label="Damped mass spring oscillator with displacement trace and decreasing mechanical-energy graph"
    >
      <path
        d="M60 145h90l18-28 30 56 30-56 30 56 30-28h70"
        className="os-spring"
      />
      <rect
        x={350 + state.displacement! * 600}
        y="105"
        width="95"
        height="80"
        className="os-mass"
      />
      <rect x="260" y="205" width="180" height="52" className="os-damper" />
      <text x="275" y="237">
        damper c = {state.damping?.toFixed(2)} kg s⁻¹
      </text>
      <path d="M90 470H820M90 290V485" className="os-axis" />
      <polyline
        points={seriesPoints(analysis.graph, "displacement", 90, 290, 730, 160)}
        className="os-series displacement"
      />
      <polyline
        points={seriesPoints(analysis.graph, "totalEnergy", 90, 290, 730, 160)}
        className="os-series energy"
      />
      <text x="105" y="315">
        displacement oscillates · total energy decreases
      </text>
    </svg>
  );
}
