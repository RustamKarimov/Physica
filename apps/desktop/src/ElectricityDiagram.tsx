import type { ElectricityAnalysis } from "./electricity-analysis";
import type { ElectricityWorkflowId } from "./electricity-workflows";

function points(
  graph: ElectricityAnalysis["graph"],
  secondary = false,
): string {
  if (graph.length === 0) return "";
  const xs = graph.map((point) => point.x);
  const ys = graph.map((point) =>
    secondary ? (point.secondary ?? 0) : point.y,
  );
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const maxAbsY = Math.max(...ys.map(Math.abs), 1e-12);
  return graph
    .map((point) => {
      const x = 70 + ((point.x - minX) / Math.max(maxX - minX, 1e-12)) * 520;
      const value = secondary ? (point.secondary ?? 0) : point.y;
      const y = 250 - (value / maxAbsY) * 145;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function ElectricityDiagram({
  id,
  analysis,
}: {
  readonly id: ElectricityWorkflowId;
  readonly analysis: ElectricityAnalysis;
}) {
  if (id === "network") {
    const s = analysis.state;
    return (
      <svg
        viewBox="0 0 660 390"
        role="img"
        aria-label="Solved series-parallel circuit with labelled node potentials and signed branch currents"
      >
        <path d="M85 80H260V65H560V310H260V295H85V80" className="el-wire" />
        <path
          d="M260 65V155M260 210V295M560 65V155M560 210V310"
          className="el-wire"
        />
        <path
          d="M275 65l16-16 20 32 20-32 20 32 20-16h70"
          className="el-resistor"
        />
        <path d="M245 155h30m-30 55h30" className="el-resistor" />
        {s.switchClosed ? (
          <path d="M545 155h30m-30 55h30" className="el-resistor" />
        ) : (
          <path
            d="M545 155h12m8-18l-18 48m18 25h10"
            className="el-switch-open"
          />
        )}
        <path d="M105 125v130m35-105v80" className="el-cell" />
        <circle cx="260" cy="65" r="7" className="el-node" />
        <circle cx="260" cy="295" r="7" className="el-node" />
        <text x="235" y="42">
          {s.source?.toFixed(2)} V
        </text>
        <text x="384" y="42">
          I = {s.seriesCurrent?.toFixed(3)} A →
        </text>
        <text x="285" y="187">
          A: {s.currentA?.toFixed(3)} A ↓
        </text>
        <text x="455" y="187">
          B: {s.switchClosed ? `${s.currentB?.toFixed(3)} A ↓` : "OPEN"}
        </text>
        <text x="245" y="330">
          0 V ground
        </text>
        <text x="445" y="330">
          junction = {s.junction?.toFixed(3)} V
        </text>
      </svg>
    );
  }
  if (id === "internal-divider") {
    const s = analysis.state;
    return (
      <svg
        viewBox="0 0 660 390"
        role="img"
        aria-label="Cell with internal resistance, terminal voltmeter, lost-volts region and adjustable potential divider"
      >
        <path d="M70 95H540V310H70V95" className="el-wire" />
        <path d="M105 140v120m30-95v70" className="el-cell" />
        <path
          d="M205 95l15-16 20 32 20-32 20 32 15-16"
          className="el-resistor"
        />
        <path
          d="M540 130l-16 20 32 20-32 20 32 20-32 20 16 20"
          className="el-resistor"
        />
        <circle cx="420" cy="190" r="38" className="el-meter" />
        <text x="407" y="200" className="el-meter-label">
          V
        </text>
        <path
          d={`M540 ${130 + (s.fraction ?? 0) * 120}H420V228`}
          className="el-probe"
        />
        <text x="185" y="55">
          internal loss {s.lost?.toFixed(2)} V
        </text>
        <text x="365" y="55">
          terminal {s.terminal?.toFixed(2)} V
        </text>
        <text x="365" y="280">
          Vout {s.output?.toFixed(2)} V
        </text>
      </svg>
    );
  }
  if (id === "rc") {
    const s = analysis.state;
    return (
      <svg
        viewBox="0 0 660 390"
        role="img"
        aria-label="RC charging circuit and linked voltage and scaled-current curves sampled from one named-clock state"
      >
        <path d="M55 65H600V330H55V65" className="el-wire" />
        <path d="M85 110v170m30-135v100" className="el-cell" />
        <path
          d="M205 65l15-16 20 32 20-32 20 32 15-16"
          className="el-resistor"
        />
        <path d="M445 125v145m35-145v145" className="el-capacitor" />
        <rect
          x="445"
          y={270 - 145 * (s.fraction ?? 0)}
          width="35"
          height={145 * (s.fraction ?? 0)}
          className="el-charge"
        />
        <polyline
          points={points(analysis.graph)}
          className="el-graph-primary"
        />
        <polyline
          points={points(analysis.graph, true)}
          className="el-graph-secondary"
        />
        <line
          x1={
            70 +
            Math.min(
              (s.time ?? 0) / Math.max((s.tau ?? 1) * 5, s.time ?? 0.1),
              1,
            ) *
              520
          }
          y1="100"
          x2={
            70 +
            Math.min(
              (s.time ?? 0) / Math.max((s.tau ?? 1) * 5, s.time ?? 0.1),
              1,
            ) *
              520
          }
          y2="250"
          className="el-time"
        />
        <text x="355" y="105">
          VC {s.voltage?.toFixed(2)} V
        </text>
        <text x="355" y="300">
          I {s.current?.toExponential(2)} A
        </text>
      </svg>
    );
  }
  const secondary = id === "iv";
  return (
    <svg
      viewBox="0 0 660 390"
      role="img"
      aria-label={`${id} graph and electrical representation derived from one calculation`}
    >
      <path d="M70 250H610M70 80V310" className="el-axis" />
      <polyline points={points(analysis.graph)} className="el-graph-primary" />
      {secondary && (
        <polyline
          points={points(analysis.graph, true)}
          className="el-graph-secondary"
        />
      )}
      <circle cx="520" cy="75" r="8" className="el-node" />
      <text x="535" y="82">
        calculated state
      </text>
      <text x="90" y="340">
        {id === "charge-current" ? "time →" : "potential difference →"}
      </text>
      <text x="18" y="72">
        {id === "charge-current" ? "charge" : "current"}
      </text>
      {secondary && (
        <text x="380" y="330" className="el-legend">
          solid: ohmic · dashed: filament
        </text>
      )}
    </svg>
  );
}
