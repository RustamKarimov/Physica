import {
  evaluateProjectile,
  projectileFlightTime,
  type MechanicsResult,
} from "@physica/physics-mechanics";
import { number, type Analysis } from "./mechanics-analysis";
import type { Workflow, WorkflowId } from "./mechanics-workflows";

function unwrap<T>(result: MechanicsResult<T>): Readonly<T> {
  if (!result.ok)
    throw new Error(
      result.issues[0]?.message ?? "Invalid mechanics configuration.",
    );
  return result.value;
}

function arrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  className: string,
  label: string,
) {
  return (
    <g className={className}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} markerEnd="url(#arrow)" />
      <text x={x2 + 6} y={y2 - 5}>
        {label}
      </text>
    </g>
  );
}
export function MechanicsDiagram({
  id,
  values,
  analysis,
}: {
  readonly id: WorkflowId;
  readonly values: Workflow["defaults"];
  readonly analysis: Analysis;
}) {
  const defs = (
    <defs>
      <marker
        id="arrow"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" />
      </marker>
    </defs>
  );
  if (id === "projectile") {
    const parameters = {
      initialPositionMetres: { x: 0, y: 0 },
      launchSpeedMetresPerSecond: values.a,
      launchAngleRadians: (values.b * Math.PI) / 180,
      gravityMetresPerSecondSquared: 9.81,
    };
    const landingTime = unwrap(projectileFlightTime(parameters));
    const trajectory = Array.from({ length: 31 }, (_, index) => {
      const t = (landingTime * index) / 30;
      return unwrap(evaluateProjectile(parameters, t));
    });
    const maxX = Math.max(
      ...trajectory.map((sample) => sample.positionMetres.x),
      1,
    );
    const maxY = Math.max(
      ...trajectory.map((sample) => sample.positionMetres.y),
      1,
    );
    const scale = Math.min(9, 540 / maxX, 190 / maxY);
    const points = trajectory.map(
      (sample) =>
        `${40 + sample.positionMetres.x * scale},${260 - sample.positionMetres.y * scale}`,
    );
    const state = analysis.raw as Readonly<{
      positionMetres: { x: number; y: number };
      velocityMetresPerSecond: { x: number; y: number };
    }>;
    const x = 40 + state.positionMetres.x * scale;
    const y = 260 - state.positionMetres.y * scale;
    return (
      <svg
        role="img"
        aria-label="Projectile trajectory with horizontal and vertical velocity components"
        viewBox="0 0 620 320"
      >
        {defs}
        <line className="ground" x1="20" y1="260" x2="600" y2="260" />
        <polyline className="trajectory" points={points.join(" ")} />
        <circle className="body" cx={x} cy={y} r="12" />
        {arrow(
          x,
          y,
          x + state.velocityMetresPerSecond.x * 2,
          y,
          "vector velocity-x",
          "vx",
        )}
        {arrow(
          x,
          y,
          x,
          y - state.velocityMetresPerSecond.y * 2,
          "vector velocity-y",
          "vy",
        )}
        <text x="25" y="290">
          Horizontal velocity is constant; vertical velocity changes with g.
        </text>
      </svg>
    );
  }
  if (id === "incline") {
    const result = analysis.raw as Readonly<{
      normalNewtons: number;
      frictionNewtons: number;
    }>;
    const angle = (values.a * Math.PI) / 180;
    const startX = 70;
    const startY = 260;
    const length = Math.min(470, 200 / Math.max(Math.sin(angle), 0.001));
    const endX = startX + length * Math.cos(angle);
    const endY = startY - length * Math.sin(angle);
    const blockX = startX + length * 0.68 * Math.cos(angle);
    const blockY = startY - length * 0.68 * Math.sin(angle);
    return (
      <svg
        role="img"
        aria-label="Block on an inclined plane with resolved force arrows"
        viewBox="0 0 620 320"
      >
        {defs}
        <path
          className="surface"
          d={`M${startX} ${startY} L${endX} ${endY} L${endX} ${startY} Z`}
        />
        <g transform={`translate(${blockX} ${blockY}) rotate(${-values.a})`}>
          <rect
            className="block"
            x="-38"
            y="-28"
            width="76"
            height="56"
            rx="5"
          />
        </g>
        {arrow(blockX, blockY, blockX, blockY + 90, "vector weight", "mg")}
        {arrow(
          blockX,
          blockY,
          blockX - Math.sin(angle) * result.normalNewtons * 2,
          blockY - Math.cos(angle) * result.normalNewtons * 2,
          "vector normal",
          "N",
        )}
        {arrow(
          blockX,
          blockY,
          blockX + Math.cos(angle) * result.frictionNewtons * 3,
          blockY - Math.sin(angle) * result.frictionNewtons * 3,
          "vector friction",
          "f",
        )}
        <text x="55" y="292">
          Arrow lengths follow calculated force magnitudes.
        </text>
      </svg>
    );
  }
  if (id === "pulley") {
    const result = analysis.raw as Readonly<{
      accelerationMetresPerSecondSquared: number;
      tensionNewtons: number;
    }>;
    return (
      <svg
        role="img"
        aria-label="Atwood machine with two masses, string tension and acceleration"
        viewBox="0 0 620 320"
      >
        {defs}
        <circle className="pulley" cx="310" cy="82" r="48" />
        <path className="string" d="M262 82V230M358 82V230" />
        <rect className="mass-a" x="222" y="190" width="80" height="65" />
        <rect className="mass-b" x="318" y="190" width="80" height="65" />
        <text x="246" y="227">
          {values.a} kg
        </text>
        <text x="342" y="227">
          {values.b} kg
        </text>
        {arrow(262, 185, 262, 115, "vector tension", "T")}
        {arrow(358, 185, 358, 115, "vector tension", "T")}
        <text x="30" y="292">
          a = {number(result.accelerationMetresPerSecondSquared)} m s⁻² · T ={" "}
          {number(result.tensionNewtons)} N
        </text>
      </svg>
    );
  }
  if (id === "collision") {
    const result = analysis.raw as Readonly<{
      finalVelocityA: number;
      finalVelocityB: number;
    }>;
    return (
      <svg
        role="img"
        aria-label="Before and after collision velocities on a straight track"
        viewBox="0 0 620 320"
      >
        {defs}
        <text x="40" y="45">
          BEFORE
        </text>
        <line className="track" x1="30" y1="120" x2="590" y2="120" />
        <rect className="cart-a" x="130" y="75" width="85" height="45" />
        <rect className="cart-b" x="390" y="75" width="65" height="45" />
        {arrow(
          170,
          70,
          170 + values.a * 18,
          70,
          "vector velocity-x",
          `uA ${number(values.a)}`,
        )}
        {arrow(
          420,
          65,
          420 + values.b * 18,
          65,
          "vector velocity-y",
          `uB ${number(values.b)}`,
        )}
        <text x="40" y="175">
          AFTER · e = {number(values.c)}
        </text>
        <line className="track" x1="30" y1="255" x2="590" y2="255" />
        <rect className="cart-a" x="200" y="210" width="85" height="45" />
        <rect className="cart-b" x="330" y="210" width="65" height="45" />
        {arrow(
          240,
          205,
          240 + result.finalVelocityA * 18,
          205,
          "vector velocity-x",
          `vA ${number(result.finalVelocityA)}`,
        )}
        {arrow(
          360,
          200,
          360 + result.finalVelocityB * 18,
          200,
          "vector velocity-y",
          `vB ${number(result.finalVelocityB)}`,
        )}
      </svg>
    );
  }
  if (id === "energy") {
    const result = analysis.raw as Readonly<{
      inputJoules: number;
      usefulJoules: number;
      storedJoules: number;
      dissipatedJoules: number;
    }>;
    const scale = 220 / result.inputJoules;
    return (
      <svg
        role="img"
        aria-label="Energy ledger flow from input to useful, stored and dissipated energy"
        viewBox="0 0 620 320"
      >
        <rect className="energy-input" x="40" y="90" width="140" height="120" />
        <text x="68" y="145">
          INPUT
        </text>
        <text x="68" y="170">
          {number(result.inputJoules)} J
        </text>
        <path className="energy-flow" d="M180 150H310" />
        <rect
          className="energy-useful"
          x="310"
          y="45"
          width={result.usefulJoules * scale}
          height="54"
        />
        <rect
          className="energy-stored"
          x="310"
          y="130"
          width={result.storedJoules * scale}
          height="54"
        />
        <rect
          className="energy-loss"
          x="310"
          y="215"
          width={result.dissipatedJoules * scale}
          height="54"
        />
        <text x="320" y="77">
          useful {number(result.usefulJoules)} J
        </text>
        <text x="320" y="162">
          stored {number(result.storedJoules)} J
        </text>
        <text x="320" y="247">
          dissipated {number(result.dissipatedJoules)} J
        </text>
      </svg>
    );
  }
  if (id === "stress") {
    const raw = analysis.raw as Readonly<{
      direct: { strain: number; stressPascals: number };
      material: { region: string };
    }>;
    const x = Math.min(560, 65 + raw.direct.strain * 90000);
    const y = Math.max(45, 265 - raw.direct.stressPascals / 2e6);
    return (
      <svg
        role="img"
        aria-label="Stress strain graph with elastic limit and current measured point"
        viewBox="0 0 620 320"
      >
        <line className="axis" x1="60" y1="270" x2="585" y2="270" />
        <line className="axis" x1="60" y1="270" x2="60" y2="30" />
        <polyline className="stress-curve" points="60,270 240,70 530,42" />
        <line className="yield-line" x1="240" y1="270" x2="240" y2="55" />
        <text x="215" y="292">
          yield
        </text>
        <circle className="data-point" cx={x} cy={y} r="9" />
        <text x="75" y="52">
          stress σ
        </text>
        <text x="515" y="295">
          strain ε
        </text>
        <text x="340" y="210">
          current point: {raw.material.region}
        </text>
      </svg>
    );
  }
  const state = analysis.raw as Readonly<{
    positionMetres: { x: number; y: number };
    velocityMetresPerSecond: { x: number; y: number };
    accelerationMetresPerSecondSquared: { x: number; y: number };
  }>;
  const orbitScale = Math.min(35, 125 / values.a);
  const radiusPixels = values.a * orbitScale;
  const x = 310 + state.positionMetres.x * orbitScale;
  const y = 160 - state.positionMetres.y * orbitScale;
  const velocityMagnitude = Math.hypot(
    state.velocityMetresPerSecond.x,
    state.velocityMetresPerSecond.y,
  );
  const velocityScale = Math.min(10, 100 / Math.max(velocityMagnitude, 1e-9));
  const accelerationMagnitude = Math.hypot(
    state.accelerationMetresPerSecondSquared.x,
    state.accelerationMetresPerSecondSquared.y,
  );
  const accelerationScale = Math.min(
    5,
    100 / Math.max(accelerationMagnitude, 1e-9),
  );
  return (
    <svg
      role="img"
      aria-label="Circular path with tangent velocity and inward acceleration vectors"
      viewBox="0 0 620 320"
    >
      {defs}
      <circle className="orbit" cx="310" cy="160" r={radiusPixels} />
      <line className="radius" x1="310" y1="160" x2={x} y2={y} />
      <circle className="centre" cx="310" cy="160" r="5" />
      <circle className="body" cx={x} cy={y} r="12" />
      {arrow(
        x,
        y,
        x + state.velocityMetresPerSecond.x * velocityScale,
        y - state.velocityMetresPerSecond.y * velocityScale,
        "vector velocity-x",
        "v tangent",
      )}
      {arrow(
        x,
        y,
        x + state.accelerationMetresPerSecondSquared.x * accelerationScale,
        y - state.accelerationMetresPerSecondSquared.y * accelerationScale,
        "vector acceleration",
        "a inward",
      )}
    </svg>
  );
}
