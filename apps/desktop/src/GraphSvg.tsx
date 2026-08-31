import type {
  ResolvedCartesianGraph,
  ResolvedGraphSegment,
} from "@physica/graphs";

const points = (items: readonly { readonly x: number; readonly y: number }[]) =>
  items.map((point) => `${point.x},${point.y}`).join(" ");

function ErrorSegment({
  segment,
  capSize,
}: {
  readonly segment: ResolvedGraphSegment;
  readonly capSize: number;
}) {
  const horizontal = Math.abs(segment.from.y - segment.to.y) < 1e-9;
  const half = capSize / 2;
  return (
    <>
      <line
        x1={segment.from.x}
        y1={segment.from.y}
        x2={segment.to.x}
        y2={segment.to.y}
      />
      <line
        x1={segment.from.x + (horizontal ? 0 : -half)}
        y1={segment.from.y + (horizontal ? -half : 0)}
        x2={segment.from.x + (horizontal ? 0 : half)}
        y2={segment.from.y + (horizontal ? half : 0)}
      />
      <line
        x1={segment.to.x + (horizontal ? 0 : -half)}
        y1={segment.to.y + (horizontal ? -half : 0)}
        x2={segment.to.x + (horizontal ? 0 : half)}
        y2={segment.to.y + (horizontal ? half : 0)}
      />
    </>
  );
}

export function GraphSvg({
  plan,
  id,
}: {
  readonly plan: ResolvedCartesianGraph;
  readonly id: string;
}) {
  const clipId = `graph-plot-${id}`;
  return (
    <svg
      className="graph-canvas"
      viewBox={`0 0 ${plan.viewport.width} ${plan.viewport.height}`}
      role="img"
      aria-labelledby={`graph-title-${id} graph-description-${id}`}
    >
      <title id={`graph-title-${id}`}>{plan.name}</title>
      <desc id={`graph-description-${id}`}>{plan.accessibilitySummary}</desc>
      <defs>
        <clipPath id={clipId}>
          <rect {...plan.plotRect} />
        </clipPath>
      </defs>
      <rect
        className="graph-plot-background"
        x={plan.plotRect.x}
        y={plan.plotRect.y}
        width={plan.plotRect.width}
        height={plan.plotRect.height}
      />
      <g className="graph-grid" aria-hidden="true">
        {plan.xTicks.map((tick) => (
          <line
            key={`xg-${tick.canonicalValue}`}
            x1={tick.position.x}
            x2={tick.position.x}
            y1={plan.plotRect.y}
            y2={plan.plotRect.y + plan.plotRect.height}
          />
        ))}
        {plan.yTicks.map((tick) => (
          <line
            key={`yg-${tick.canonicalValue}`}
            x1={plan.plotRect.x}
            x2={plan.plotRect.x + plan.plotRect.width}
            y1={tick.position.y}
            y2={tick.position.y}
          />
        ))}
      </g>
      <g className="graph-axes" aria-hidden="true">
        <line
          x1={plan.plotRect.x}
          x2={plan.plotRect.x + plan.plotRect.width}
          y1={plan.plotRect.y + plan.plotRect.height}
          y2={plan.plotRect.y + plan.plotRect.height}
        />
        <line
          x1={plan.plotRect.x}
          x2={plan.plotRect.x}
          y1={plan.plotRect.y}
          y2={plan.plotRect.y + plan.plotRect.height}
        />
      </g>
      <g className="graph-ticks" aria-hidden="true">
        {plan.xTicks.map((tick) => (
          <text
            key={`xl-${tick.canonicalValue}`}
            x={tick.position.x}
            y={plan.plotRect.y + plan.plotRect.height + 25}
            textAnchor="middle"
          >
            {tick.label}
          </text>
        ))}
        {plan.yTicks.map((tick) => (
          <text
            key={`yl-${tick.canonicalValue}`}
            x={plan.plotRect.x - 15}
            y={tick.position.y + 5}
            textAnchor="end"
          >
            {tick.label}
          </text>
        ))}
        <text
          className="graph-axis-title"
          x={plan.plotRect.x + plan.plotRect.width / 2}
          y={plan.viewport.height - 12}
          textAnchor="middle"
        >
          {plan.xAxisLabel}
        </text>
        <text
          className="graph-axis-title"
          x={19}
          y={plan.plotRect.y + plan.plotRect.height / 2}
          textAnchor="middle"
          transform={`rotate(-90 19 ${plan.plotRect.y + plan.plotRect.height / 2})`}
        >
          {plan.yAxisLabel}
        </text>
      </g>
      <g clipPath={`url(#${clipId})`}>
        {plan.analyses
          .filter((item) => item.kind === "area")
          .map(
            (area) =>
              area.kind === "area" && (
                <polygon
                  key={area.id}
                  className="graph-analysis-area"
                  points={points(area.points)}
                  fill={area.fillHex}
                  opacity={area.opacity}
                />
              ),
          )}
        {plan.curves.map((curve) =>
          curve.bars ? (
            <g
              key={`${curve.datasetId}-${curve.seriesKey}`}
              className="graph-bars"
            >
              {curve.bars.map((bar, index) => (
                <rect
                  key={index}
                  {...bar.rect}
                  fill={curve.style.fillHex ?? curve.style.strokeHex}
                  stroke={curve.style.strokeHex}
                  strokeWidth={curve.style.lineWidth}
                />
              ))}
            </g>
          ) : (
            <polyline
              key={`${curve.datasetId}-${curve.seriesKey}`}
              points={points(curve.points)}
              fill="none"
              stroke={curve.style.strokeHex}
              strokeWidth={curve.style.lineWidth}
              strokeDasharray={curve.style.dash?.join(" ")}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ),
        )}
        {plan.analyses.map((analysis) => {
          if (analysis.kind === "tangent")
            return (
              <g key={analysis.id} className="graph-analysis-tangent">
                <line
                  x1={analysis.line.from.x}
                  y1={analysis.line.from.y}
                  x2={analysis.line.to.x}
                  y2={analysis.line.to.y}
                  stroke={analysis.strokeHex}
                  strokeWidth={analysis.lineWidth}
                  strokeDasharray="10 7"
                />
                {analysis.triangle && (
                  <polyline
                    points={points(analysis.triangle.points)}
                    fill="none"
                    stroke={analysis.strokeHex}
                    strokeWidth={analysis.lineWidth + 1}
                  />
                )}
              </g>
            );
          if (analysis.kind === "linear-fit")
            return (
              <line
                key={analysis.id}
                className="graph-analysis-fit"
                x1={analysis.line.from.x}
                y1={analysis.line.from.y}
                x2={analysis.line.to.x}
                y2={analysis.line.to.y}
                stroke={analysis.strokeHex}
                strokeWidth={analysis.lineWidth}
                strokeDasharray="4 6"
              />
            );
          if (analysis.kind === "error-bars")
            return (
              <g
                key={analysis.id}
                className="graph-analysis-errors"
                stroke={analysis.strokeHex}
                strokeWidth={analysis.lineWidth}
              >
                {analysis.segments.map((item, index) => (
                  <ErrorSegment
                    key={index}
                    segment={item}
                    capSize={analysis.capSize}
                  />
                ))}
              </g>
            );
          return null;
        })}
        {plan.cursor && (
          <line
            className="graph-cursor-line"
            x1={plan.cursor.x}
            x2={plan.cursor.x}
            y1={plan.plotRect.y}
            y2={plan.plotRect.y + plan.plotRect.height}
          />
        )}
      </g>
      <g className="graph-markers">
        {plan.points.map((marker) => (
          <g key={marker.id}>
            <circle cx={marker.point.x} cy={marker.point.y} r={marker.radius} />
            <text
              x={marker.point.x - 10}
              y={marker.point.y - 14}
              textAnchor="end"
            >
              {marker.label}
            </text>
          </g>
        ))}
        {plan.analyses.map(
          (analysis) =>
            analysis.kind === "maximum" && (
              <g key={analysis.id} className="graph-analysis-maximum">
                <circle
                  cx={analysis.point.x}
                  cy={analysis.point.y}
                  r={7}
                  style={{ fill: analysis.markerHex }}
                />
                <text x={analysis.point.x + 12} y={analysis.point.y - 12}>
                  {analysis.label}
                </text>
              </g>
            ),
        )}
        {plan.cursor?.readouts.map((readout) => (
          <circle
            className="graph-cursor-point"
            key={`${readout.datasetId}-${readout.seriesKey}`}
            cx={readout.point.x}
            cy={readout.point.y}
            r={6}
          />
        ))}
      </g>
      <g className="graph-annotations">
        {plan.annotations.map((annotation) => (
          <g key={annotation.id}>
            <line
              x1={annotation.point.x - 42}
              y1={annotation.point.y + 22}
              x2={annotation.point.x - 4}
              y2={annotation.point.y + 4}
            />
            <text
              x={annotation.point.x - 48}
              y={annotation.point.y + 29}
              textAnchor="end"
            >
              {annotation.text}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
