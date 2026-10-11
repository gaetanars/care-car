import type { MileagePoint } from "@/domain/types";

export interface MileageSeries {
  vehicleId: number;
  label: string;
  points: MileagePoint[];
}

const W = 320;
const H = 180;
const PAD = { left: 52, right: 12, top: 12, bottom: 28 };
// Literal class names: Tailwind only generates what it can read.
const COLORS = [
  { line: "stroke-chart-1", dot: "fill-chart-1", swatch: "bg-chart-1" },
  { line: "stroke-chart-2", dot: "fill-chart-2", swatch: "bg-chart-2" },
  { line: "stroke-chart-3", dot: "fill-chart-3", swatch: "bg-chart-3" },
  { line: "stroke-chart-4", dot: "fill-chart-4", swatch: "bg-chart-4" },
  { line: "stroke-chart-5", dot: "fill-chart-5", swatch: "bg-chart-5" },
] as const;
const number = new Intl.NumberFormat("fr-FR");
const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  year: "numeric",
});
const dayMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const monthYear = (iso: string) =>
  dateFormat.format(new Date(`${iso}T00:00:00`));

/** Server-rendered real-km curves, one line per vehicle (SPEC §11). Axes show min/max only. */
export function MileageChart({
  series,
  kmPerYear,
}: {
  series: MileageSeries[];
  kmPerYear: { label: string; year: number; km: number }[];
}) {
  const plotted = series.filter((s) => s.points.length > 0);
  if (plotted.length === 0) return <p>Aucun relevé sur la période.</p>;
  const all = plotted.flatMap((s) => s.points);
  const dates = all.map((p) => p.date).sort();
  const xs = all.map((p) => dayMs(p.date));
  const ys = all.map((p) => p.realKm);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const x = (ms: number) =>
    PAD.left +
    (x1 === x0 ? 0.5 : (ms - x0) / (x1 - x0)) * (W - PAD.left - PAD.right);
  const y = (km: number) =>
    H -
    PAD.bottom -
    (y1 === y0 ? 0.5 : (km - y0) / (y1 - y0)) * (H - PAD.top - PAD.bottom);
  const description = plotted
    .map(
      (s) =>
        `${s.label} : de ${number.format(s.points[0]!.realKm)} à ${number.format(s.points.at(-1)!.realKm)} km`,
    )
    .join(" ; ");
  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Courbe du kilométrage réel. ${description}`}
        className="w-full text-ink-muted"
      >
        <g className="stroke-line" strokeWidth={1}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={H - PAD.bottom}
            y2={H - PAD.bottom}
          />
          <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={H - PAD.bottom} />
        </g>
        <g fill="currentColor" fontSize={10}>
          <text x={PAD.left - 6} y={y(y1) + 3} textAnchor="end">
            {number.format(y1)}
          </text>
          <text x={PAD.left - 6} y={y(y0) + 3} textAnchor="end">
            {number.format(y0)}
          </text>
          <text x={PAD.left} y={H - 10} textAnchor="start">
            {monthYear(dates[0]!)}
          </text>
          <text x={W - PAD.right} y={H - 10} textAnchor="end">
            {monthYear(dates.at(-1)!)}
          </text>
        </g>
        {plotted.map((s, i) => {
          const color = COLORS[i % COLORS.length]!;
          return (
            <g key={s.vehicleId}>
              <polyline
                className={color.line}
                fill="none"
                strokeWidth={2}
                strokeLinejoin="round"
                points={s.points
                  .map(
                    (p) =>
                      `${x(dayMs(p.date)).toFixed(1)},${y(p.realKm).toFixed(1)}`,
                  )
                  .join(" ")}
              />
              {s.points.map((p, j) => (
                <circle
                  key={j}
                  className={`${color.dot} stroke-surface-200`}
                  strokeWidth={2}
                  r={4}
                  cx={x(dayMs(p.date))}
                  cy={y(p.realKm)}
                />
              ))}
            </g>
          );
        })}
      </svg>
      {plotted.length > 1 && (
        <ul className="text-body-sm flex flex-wrap gap-x-4 gap-y-1">
          {plotted.map((s, i) => (
            <li key={s.vehicleId} className="flex items-center gap-2">
              <span
                aria-hidden
                className={`inline-block size-3 rounded-full ${COLORS[i % COLORS.length]!.swatch}`}
              />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <table className="text-body-sm w-full">
        <caption className="text-left font-semibold">Km par an</caption>
        <thead>
          <tr className="text-left text-ink-muted">
            <th scope="col">Véhicule</th>
            <th scope="col">Année</th>
            <th scope="col" className="text-right">
              Km
            </th>
          </tr>
        </thead>
        <tbody>
          {kmPerYear.map((r) => (
            <tr key={`${r.label}-${r.year}`}>
              <td>{r.label}</td>
              <td>{r.year}</td>
              <td className="text-right tabular-nums">{number.format(r.km)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
