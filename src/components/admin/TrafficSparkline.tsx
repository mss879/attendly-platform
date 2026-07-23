// Daily views as a small bar chart. Deliberately a plain server-rendered SVG:
// it costs no client JavaScript and there is nothing to interact with.

const BAR_W = 6;
const GAP = 3;
const HEIGHT = 32;

export function TrafficSparkline({
  days,
  label,
}: {
  /** One point per day, oldest first, already padded to a full window. */
  days: { day: string; views: number }[];
  label: string;
}) {
  const width = days.length * (BAR_W + GAP) - GAP;
  const max = Math.max(...days.map((d) => d.views), 0);

  return (
    <svg
      viewBox={`0 0 ${width} ${HEIGHT}`}
      width={width}
      height={HEIGHT}
      className="shrink-0 overflow-visible"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {days.map((point, i) => {
        // Every day gets a visible stub, so a quiet day reads as "nothing
        // happened" rather than as a gap in the chart.
        const h = max === 0 ? 2 : Math.max(2, Math.round((point.views / max) * HEIGHT));
        return (
          <rect
            key={point.day}
            x={i * (BAR_W + GAP)}
            y={HEIGHT - h}
            width={BAR_W}
            height={h}
            rx={1.5}
            className={point.views > 0 ? "fill-orange-500/80" : "fill-slate-200"}
          />
        );
      })}
    </svg>
  );
}
