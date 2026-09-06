import type { FieldAnalysis } from "./field-analysis";
import type { FieldWorkflowId } from "./field-workflows";

function graphPoints(graph: FieldAnalysis["graph"]): string {
  if (graph.length === 0) return "";
  const xs = graph.map((point) => point.x);
  const ys = graph.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return graph
    .map((point) => {
      const x = 70 + (520 * (point.x - minX)) / Math.max(maxX - minX, 1e-12);
      const y = 295 - (210 * (point.y - minY)) / Math.max(maxY - minY, 1e-12);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function FieldDiagram({
  id,
  analysis,
}: {
  readonly id: FieldWorkflowId;
  readonly analysis: FieldAnalysis;
}) {
  const s = analysis.state;
  if (id === "orbit")
    return (
      <svg
        viewBox="0 0 660 390"
        role="img"
        aria-label="Earth, circular satellite orbit, tangential velocity arrow and inward gravitational field arrow"
      >
        <circle cx="330" cy="195" r="62" className="fd-earth" />
        <circle cx="330" cy="195" r="145" className="fd-orbit" />
        <circle cx="475" cy="195" r="12" className="fd-satellite" />
        <path d="M475 195H385" className="fd-force-arrow" />
        <path d="M475 195V105" className="fd-velocity-arrow" />
        <text x="270" y="202">
          Earth
        </text>
        <text x="400" y="224">
          g inward ←
        </text>
        <text x="492" y="110">
          v tangent ↑
        </text>
        <text x="210" y="365">
          r = {s.radius?.toFixed(2)} × 1000 km · v = {s.speed?.toFixed(0)} m s⁻¹
        </text>
      </svg>
    );
  if (id === "transformer")
    return (
      <svg
        viewBox="0 0 660 390"
        role="img"
        aria-label="Ideal transformer with labelled primary and secondary coils, turns ratio, power flow and line loss"
      >
        <path d="M285 70V320M375 70V320" className="fd-core" />
        <path
          d="M245 105c-40 0-40 35 0 35s40 35 0 35-40 35 0 35 40 35 0 35"
          className="fd-coil"
        />
        <path
          d="M415 80c40 0 40 25 0 25s-40 25 0 25 40 25 0 25-40 25 0 25 40 25 0 25-40 25 0 25 40 25 0 25"
          className="fd-coil secondary"
        />
        <path d="M80 195H210M450 195H585" className="fd-power-arrow" />
        <text x="75" y="178">
          Primary {s.primary?.toFixed(0)} V
        </text>
        <text x="445" y="178">
          Secondary {s.secondary?.toFixed(0)} V
        </text>
        <text x="250" y="350">
          Np : Ns = 1 : {s.ratio?.toFixed(2)}
        </text>
        <text x="445" y="235">
          line loss {s.loss?.toFixed(2)} W
        </text>
      </svg>
    );
  if (id === "magnetic-force" || id === "induction")
    return (
      <svg
        viewBox="0 0 660 390"
        role="img"
        aria-label={
          id === "induction"
            ? "Coil, changing magnetic flux arrows and labelled induced-emf polarity"
            : "Current-carrying wire in a magnetic field with labelled force direction"
        }
      >
        {Array.from({ length: 20 }, (_, index) => (
          <g
            key={index}
            transform={`translate(${90 + (index % 5) * 115} ${65 + Math.floor(index / 5) * 82})`}
          >
            <circle r="13" className="fd-b-marker" />
            <path d="M-5-5L5 5M5-5L-5 5" className="fd-b-cross" />
          </g>
        ))}
        {id === "magnetic-force" ? (
          <>
            <path d="M115 270L535 110" className="fd-wire" />
            <path d="M275 210L330 75" className="fd-force-arrow" />
            <text x="420" y="120">
              I →
            </text>
            <text x="338" y="78">
              F {s.force! >= 0 ? "⊙ +" : "⊗ −"}
            </text>
          </>
        ) : (
          <>
            <ellipse cx="330" cy="195" rx="120" ry="55" className="fd-coil" />
            <ellipse
              cx="330"
              cy="195"
              rx="85"
              ry="38"
              className="fd-coil secondary"
            />
            <path d="M330 310V88" className="fd-flux-arrow" />
            <text x="350" y="105">
              ΔΦ ↑
            </text>
            <text x="350" y="315">
              ε = {s.emf?.toFixed(2)} V ({s.sourceSign! <= 0 ? "−" : "+"})
            </text>
          </>
        )}
      </svg>
    );
  if (id === "particle")
    return (
      <svg
        viewBox="0 0 660 390"
        role="img"
        aria-label="Electron trajectory curving between labelled positive and negative parallel plates"
      >
        <rect
          x="80"
          y="75"
          width="500"
          height="18"
          className="fd-positive-plate"
        />
        <rect
          x="80"
          y="300"
          width="500"
          height="18"
          className="fd-negative-plate"
        />
        <text x="95" y="65">
          + plate
        </text>
        <text x="95" y="345">
          − plate
        </text>
        <polyline
          points={graphPoints(analysis.graph)}
          className="fd-trajectory"
        />
        <circle cx="70" cy="295" r="8" className="fd-electron" />
        <text x="42" y="280">
          e⁻ →
        </text>
        <path d="M550 115V260" className="fd-field-arrow" />
        <text x="564" y="190">
          E ↓
        </text>
      </svg>
    );
  const isAc = id === "ac";
  const isGravity = id === "gravity";
  return (
    <svg
      viewBox="0 0 660 390"
      role="img"
      aria-label={
        isAc
          ? "Sinusoidal voltage graph with RMS line and named-clock result"
          : "Source, labelled field arrows, scalar potential graph and physical probe"
      }
    >
      <path d="M70 295H610M70 65V320" className="fd-axis" />
      <polyline points={graphPoints(analysis.graph)} className="fd-graph" />
      {isAc ? (
        <>
          <line x1="70" y1="190" x2="610" y2="190" className="fd-rms" />
          <text x="475" y="180">
            RMS = {s.rms?.toFixed(2)} V
          </text>
          <text x="88" y="350">
            time → · polarity reverses across 0 V
          </text>
        </>
      ) : (
        <>
          <circle
            cx="160"
            cy="185"
            r="38"
            className={
              isGravity
                ? "fd-earth"
                : s.sourceSign! >= 0
                  ? "fd-positive"
                  : "fd-negative"
            }
          />
          <text x="151" y="194">
            {isGravity ? "M" : s.sourceSign! >= 0 ? "+" : "−"}
          </text>
          <path
            d={
              s.sourceSign! >= 0 && !isGravity ? "M205 185H295" : "M295 185H205"
            }
            className="fd-field-arrow"
          />
          <circle cx="300" cy="185" r="8" className="fd-probe" />
          <text x="220" y="165">
            {isGravity
              ? "g toward M ←"
              : s.sourceSign! >= 0
                ? "E away →"
                : "E toward − ←"}
          </text>
          <text x="385" y="345">
            scalar potential curve
          </text>
        </>
      )}
    </svg>
  );
}
