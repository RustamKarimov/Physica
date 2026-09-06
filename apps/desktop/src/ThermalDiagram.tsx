import type { ThermalAnalysis } from "./thermal-analysis";
import type { ThermalWorkflowId } from "./thermal-workflows";

function graphPoints(graph: ThermalAnalysis["graph"]): string {
  if (graph.length === 0) return "";
  const xs = graph.map((point) => point.x);
  const ys = graph.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return graph
    .map((point) => {
      const x = 72 + (515 * (point.x - minX)) / Math.max(maxX - minX, 1e-12);
      const y = 310 - (220 * (point.y - minY)) / Math.max(maxY - minY, 1e-12);
      return x.toFixed(2) + "," + y.toFixed(2);
    })
    .join(" ");
}

function secondaryPoints(graph: ThermalAnalysis["graph"]): string {
  const secondary = graph.filter(
    (point): point is typeof point & { readonly secondary: number } =>
      point.secondary !== undefined,
  );
  if (secondary.length === 0) return "";
  const all = graph.flatMap((point) =>
    point.secondary === undefined ? [point.y] : [point.y, point.secondary],
  );
  const minY = Math.min(...all);
  const maxY = Math.max(...all);
  const minX = Math.min(...secondary.map((point) => point.x));
  const maxX = Math.max(...secondary.map((point) => point.x));
  return secondary
    .map((point) => {
      const x = 72 + (515 * (point.x - minX)) / Math.max(maxX - minX, 1e-12);
      const y =
        310 - (220 * (point.secondary - minY)) / Math.max(maxY - minY, 1e-12);
      return x.toFixed(2) + "," + y.toFixed(2);
    })
    .join(" ");
}

export function ThermalDiagram({
  id,
  analysis,
}: {
  readonly id: ThermalWorkflowId;
  readonly analysis: ThermalAnalysis;
}) {
  const state = analysis.state;
  if (id === "particles" || id === "brownian")
    return (
      <svg
        viewBox="0 0 660 390"
        role="img"
        aria-label={
          id === "brownian"
            ? "Seeded hard-disk gas with a labelled larger Brownian tracer and its path"
            : "Seeded elastic hard-disk gas with velocity direction ticks and collision readout"
        }
      >
        <rect x="52" y="42" width="556" height="286" className="th-container" />
        {analysis.particles.map((particle, index) => {
          const x = 52 + particle.x * 556;
          const y = 42 + (particle.y / 0.7) * 286;
          return (
            <g key={index}>
              <circle
                cx={x}
                cy={y}
                r={Math.max(4, particle.radius * 170)}
                className={particle.tracer ? "th-tracer" : "th-particle"}
              />
              {particle.tracer ? (
                <text x={x + 13} y={y - 10}>
                  Brownian tracer
                </text>
              ) : null}
            </g>
          );
        })}
        {id === "brownian" ? (
          <polyline points={graphPoints(analysis.graph)} className="th-path" />
        ) : null}
        <text x="70" y="362">
          seeded replay · collisions {state.collisions?.toFixed(0)} · T =
          {state.temperature?.toFixed(1)} K
        </text>
      </svg>
    );
  if (id === "temperature")
    return (
      <svg
        viewBox="0 0 660 390"
        role="img"
        aria-label="Two labelled thermal bodies in contact and synchronized hot and cool temperature curves approaching equilibrium"
      >
        <rect x="65" y="84" width="150" height="160" className="th-hot" />
        <rect x="215" y="84" width="150" height="160" className="th-cool" />
        <path d="M130 275H300" className="th-heat-arrow" />
        <text x="90" y="155">
          HOT
        </text>
        <text x="242" y="155">
          COOL
        </text>
        <text x="80" y="190">
          {state.hot?.toFixed(1)} K
        </text>
        <text x="235" y="190">
          {state.cool?.toFixed(1)} K
        </text>
        <path d="M410 310H620M410 70V330" className="th-axis" />
        <polyline
          points={graphPoints(analysis.graph)}
          className="th-curve hot"
        />
        <polyline
          points={secondaryPoints(analysis.graph)}
          className="th-curve cool"
        />
        <text x="422" y="355">
          both → {state.equilibrium?.toFixed(1)} K
        </text>
      </svg>
    );
  if (id === "first-law")
    return (
      <svg
        viewBox="0 0 660 390"
        role="img"
        aria-label="Thermodynamic system boundary with labelled heat input, zero work and internal-energy ledger"
      >
        <rect
          x="180"
          y="70"
          width="300"
          height="230"
          rx="18"
          className="th-system"
        />
        <text x="255" y="110">
          SYSTEM: IDEAL GAS
        </text>
        <path d="M55 185H175" className="th-heat-arrow" />
        <text x="55" y="165">
          Q = {state.heat?.toFixed(1)} J →
        </text>
        <path d="M485 185H605" className="th-work-arrow" />
        <text x="493" y="165">
          W_by = 0 J
        </text>
        <text x="225" y="180">
          ΔU = {state.internal?.toFixed(1)} J
        </text>
        <text x="225" y="225">
          ΔU = Q − W_by
        </text>
        <text x="225" y="265">
          constant volume
        </text>
      </svg>
    );
  return (
    <svg
      viewBox="0 0 660 390"
      role="img"
      aria-label={
        id === "ideal-gas"
          ? "Gas cylinder, labelled movable piston, pressure gauge and linked inverse pressure-volume curve"
          : "Pressure-volume graph with labelled process direction and shaded signed work area"
      }
    >
      <path d="M70 315H610M70 55V330" className="th-axis" />
      <text x="596" y="345">
        V →
      </text>
      <text x="42" y="68">
        p ↑
      </text>
      {id === "pv-process" ? (
        <polygon
          points={"72,310 " + graphPoints(analysis.graph) + " 587,310"}
          className="th-area"
        />
      ) : null}
      <polyline points={graphPoints(analysis.graph)} className="th-curve gas" />
      {id === "ideal-gas" ? (
        <>
          <rect
            x="115"
            y="112"
            width="155"
            height="155"
            className="th-container"
          />
          <path d="M105 112H280" className="th-piston" />
          <circle cx="225" cy="190" r="34" className="th-gauge" />
          <text x="188" y="195">
            p {state.pressure?.toExponential(2)} Pa
          </text>
          <text x="120" y="292">
            piston · {(state.volume! * 1000).toFixed(1)} L
          </text>
        </>
      ) : (
        <>
          <text x="340" y="130">
            {state.finalVolume! >= state.initialVolume!
              ? "expansion →"
              : "compression ←"}
          </text>
          <text x="338" y="165">
            shaded area = W_by {state.work?.toFixed(1)} J
          </text>
        </>
      )}
    </svg>
  );
}
