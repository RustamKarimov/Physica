import type { WaveOpticsAnalysis } from "./wave-optics-analysis";
import type { WaveOpticsWorkflowId } from "./wave-optics-workflows";

function pathFrom(
  samples: readonly { x: number; y: number }[],
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): string {
  return samples
    .map(
      (sample, index) =>
        `${index === 0 ? "M" : "L"}${xScale(sample.x)} ${yScale(sample.y)}`,
    )
    .join(" ");
}

export function WaveOpticsDiagram({
  id,
  values,
  analysis,
}: {
  readonly id: WaveOpticsWorkflowId;
  readonly values: Readonly<Record<"a" | "b" | "c" | "d", number>>;
  readonly analysis: WaveOpticsAnalysis;
}) {
  if (id === "progressive") {
    const raw = analysis.raw as {
      samples: readonly { x: number; state: { displacementMetres: number } }[];
      probe: { displacementMetres: number };
    };
    const amplitude = Math.max(values.a / 100, 0.001);
    const path = pathFrom(
      raw.samples.map(({ x, state }) => ({ x, y: state.displacementMetres })),
      (x) => 45 + (x / 4) * 530,
      (y) => 160 - (y / amplitude) * 95,
    );
    return (
      <svg
        role="img"
        aria-label="Progressive wave with local particle and pattern direction labels"
        viewBox="0 0 620 320"
      >
        <line className="wo-axis" x1="35" y1="160" x2="590" y2="160" />
        <path className="wo-wave" d={path} />
        <line className="wo-probe" x1="310" y1="45" x2="310" y2="275" />
        <circle
          className="wo-particle"
          cx="310"
          cy={160 - (raw.probe.displacementMetres / amplitude) * 95}
          r="8"
        />
        <text x="332" y="62">
          pattern → {analysis.values[0]![1]}
        </text>
        <text x="332" y="88">
          particle ↕ local oscillation
        </text>
        <text x="280" y="298">
          probe x = 2.00 m
        </text>
      </svg>
    );
  }
  if (id === "standing") {
    const raw = analysis.raw as {
      samples: readonly {
        x: number;
        state: {
          displacementMetres: number;
          envelopeAmplitudeMetres: number;
          nodePositionsMetres: readonly number[];
        };
      }[];
    };
    const amplitude = Math.max((2 * values.a) / 100, 0.001);
    const samples = raw.samples.map(({ x, state }) => ({
      x,
      y: state.displacementMetres,
    }));
    const upper = raw.samples.map(({ x, state }) => ({
      x,
      y: state.envelopeAmplitudeMetres,
    }));
    const lower = upper.map(({ x, y }) => ({ x, y: -y }));
    const xScale = (x: number) => 45 + (x / 2) * 530;
    const yScale = (y: number) => 160 - (y / amplitude) * 95;
    return (
      <svg
        role="img"
        aria-label="Standing wave with fixed node markers and antinode envelope"
        viewBox="0 0 620 320"
      >
        <line className="wo-axis" x1="35" y1="160" x2="590" y2="160" />
        <path className="wo-envelope" d={pathFrom(upper, xScale, yScale)} />
        <path className="wo-envelope" d={pathFrom(lower, xScale, yScale)} />
        <path className="wo-wave" d={pathFrom(samples, xScale, yScale)} />
        {raw.samples[0]!.state.nodePositionsMetres.map((x) => (
          <g key={x}>
            <circle className="wo-node" cx={xScale(x)} cy="160" r="6" />
            <text x={xScale(x) - 8} y="190">
              N
            </text>
          </g>
        ))}
        <text x="42" y="298">
          N = node · dashed curves = antinode envelope
        </text>
      </svg>
    );
  }
  if (id === "double-slit") {
    const raw = analysis.raw as {
      samples: readonly {
        screenPositionMetres: number;
        state: { normalizedIntensity: number };
      }[];
    };
    const graph = pathFrom(
      raw.samples.map(({ screenPositionMetres, state }) => ({
        x: screenPositionMetres,
        y: state.normalizedIntensity,
      })),
      (x) => 350 + ((x + 0.03) / 0.06) * 235,
      (y) => 272 - y * 100,
    );
    return (
      <svg
        role="img"
        aria-label="Double slit, intensity screen strip and graph generated from one physical sample set"
        viewBox="0 0 620 320"
      >
        <circle className="wo-source" cx="45" cy="130" r="9" />
        <path
          className="wo-rays"
          d="M54 130L150 95M54 130L150 165M158 95L285 45M158 95L285 215M158 165L285 45M158 165L285 215"
        />
        <rect className="wo-barrier" x="150" y="30" width="8" height="210" />
        <rect x="147" y="88" width="14" height="16" className="wo-slit" />
        <rect x="147" y="158" width="14" height="16" className="wo-slit" />
        <g aria-label="screen intensity strip">
          {raw.samples
            .filter((_, index) => index % 3 === 0)
            .map((sample, index) => (
              <rect
                key={index}
                x="285"
                y={35 + index * 5.1}
                width="18"
                height="6"
                fill="#edbd67"
                opacity={0.08 + sample.state.normalizedIntensity * 0.92}
              />
            ))}
        </g>
        <line className="wo-axis" x1="340" y1="272" x2="595" y2="272" />
        <line className="wo-axis" x1="350" y1="282" x2="350" y2="155" />
        <path className="wo-intensity" d={graph} />
        <text x="350" y="302">
          screen position
        </text>
        <text x="175" y="265">
          same 121 samples →
        </text>
      </svg>
    );
  }
  if (id === "ray-lens") {
    const raw = analysis.raw as {
      boundary: { refractedAngleRadians: number };
      lens: { imageDistanceMetres: number; magnification: number };
      incidentAngleRadians: number;
    };
    const hitX = 165;
    const hitY = 145;
    const incidentX = hitX - Math.sin(raw.incidentAngleRadians) * 105;
    const incidentY = hitY - Math.cos(raw.incidentAngleRadians) * 105;
    const refractedX =
      hitX + Math.sin(raw.boundary.refractedAngleRadians) * 105;
    const refractedY =
      hitY + Math.cos(raw.boundary.refractedAngleRadians) * 105;
    const imageX = 445 + Math.min(125, raw.lens.imageDistanceMetres * 260);
    const imageHeight = Math.min(70, Math.abs(raw.lens.magnification) * 80);
    return (
      <svg
        role="img"
        aria-label="Snell refraction diagram and thin-lens principal-ray image construction"
        viewBox="0 0 620 320"
      >
        <line className="wo-boundary" x1="25" y1={hitY} x2="300" y2={hitY} />
        <line className="wo-normal" x1={hitX} y1="25" x2={hitX} y2="270" />
        <path
          className="wo-ray"
          d={`M${incidentX} ${incidentY}L${hitX} ${hitY}L${refractedX} ${refractedY}`}
        />
        <text x="35" y="292">
          Snell boundary
        </text>
        <line className="wo-axis" x1="330" y1="185" x2="605" y2="185" />
        <path className="wo-lens" d="M445 55Q420 120 445 250Q470 120 445 55" />
        <path className="wo-object" d="M365 185V90M365 90l-9 14m9-14 9 14" />
        <path
          className="wo-ray"
          d={`M365 90L445 90L${imageX} ${185 + imageHeight}`}
        />
        <path
          className="wo-ray secondary"
          d={`M365 90L445 185L${imageX} ${185 + imageHeight}`}
        />
        <path className="wo-image" d={`M${imageX} 185V${185 + imageHeight}`} />
        <text x="365" y="292">
          thin lens · image
        </text>
      </svg>
    );
  }
  const raw = analysis.raw as {
    polarization: { transmissionFraction: number };
    angleRadians: number;
  };
  const axisX = Math.sin(raw.angleRadians) * 55;
  const axisY = Math.cos(raw.angleRadians) * 55;
  return (
    <svg
      role="img"
      aria-label="Polarizer and analyzer axes with labelled Malus-law transmission"
      viewBox="0 0 620 320"
    >
      <path className="wo-beam" d="M35 160H220" />
      <path className="wo-beam" d="M220 160H410" />
      <path
        className="wo-beam"
        d="M410 160H575"
        opacity={0.1 + raw.polarization.transmissionFraction * 0.9}
      />
      <circle className="wo-polarizer" cx="220" cy="160" r="78" />
      <line className="wo-axis-line" x1="220" y1="95" x2="220" y2="225" />
      <circle className="wo-analyzer" cx="410" cy="160" r="78" />
      <line
        className="wo-axis-line"
        x1={410 - axisX}
        y1={160 + axisY}
        x2={410 + axisX}
        y2={160 - axisY}
      />
      <text x="180" y="270">
        polarizer
      </text>
      <text x="375" y="270">
        analyzer
      </text>
      <text x="465" y="85">
        I/I₀ = {raw.polarization.transmissionFraction.toFixed(3)}
      </text>
    </svg>
  );
}
