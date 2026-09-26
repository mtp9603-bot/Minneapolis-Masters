import { scoreKind } from "@/lib/marks";

/** A stroke count drawn with standard scorecard notation (circles under par, squares over). */
export function ScoreMark({ strokes, par, size = "sm" }: { strokes: number | null; par: number; size?: "sm" | "lg" }) {
  if (strokes == null) return <span className="mark">–</span>;
  return <span className={`mark mark-${size} ${scoreKind(strokes, par)}`}>{strokes}</span>;
}

export function MarkLegend() {
  const items: [string, string][] = [
    ["eagle", "Eagle+"],
    ["birdie", "Birdie"],
    ["bogey", "Bogey"],
    ["double", "Double"],
    ["triple", "Triple+"],
  ];
  return (
    <div className="legend" aria-label="Scorecard legend">
      {items.map(([k, label]) => (
        <span key={k}>
          <span className={`mark mark-xs ${k}`} /> {label}
        </span>
      ))}
    </div>
  );
}
