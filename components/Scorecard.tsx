import { PARS, YARDS } from "@/lib/course";
import { computeTotals, type Score } from "@/lib/scoring";

function Nine({ start, scores }: { start: number; scores: Map<number, Score> }) {
  const holes = Array.from({ length: 9 }, (_, i) => start + i);
  const sum = (f: (h: number) => number | null | undefined) =>
    holes.reduce((a, h) => a + (f(h) ?? 0), 0);
  const label = start === 1 ? "Out" : "In";
  return (
    <table className="sc">
      <thead>
        <tr>
          <th>Hole</th>
          {holes.map((h) => (
            <th key={h}>{h}</th>
          ))}
          <th>{label}</th>
        </tr>
      </thead>
      <tbody>
        <tr className="muted">
          <td>Yds</td>
          {holes.map((h) => (
            <td key={h} style={{ fontSize: 10 }}>{YARDS[h - 1]}</td>
          ))}
          <td className="tot" style={{ fontSize: 10 }}>{sum((h) => YARDS[h - 1])}</td>
        </tr>
        <tr>
          <td>Par</td>
          {holes.map((h) => (
            <td key={h}>{PARS[h - 1]}</td>
          ))}
          <td className="tot">{sum((h) => PARS[h - 1])}</td>
        </tr>
        <tr>
          <td>Score</td>
          {holes.map((h) => (
            <td key={h} style={{ fontWeight: 700 }}>{scores.get(h)?.strokes ?? ""}</td>
          ))}
          <td className="tot">{sum((h) => scores.get(h)?.strokes) || ""}</td>
        </tr>
        <tr>
          <td>🍺</td>
          {holes.map((h) => (
            <td key={h}>{scores.get(h)?.drinks || ""}</td>
          ))}
          <td className="tot">{sum((h) => scores.get(h)?.drinks) || ""}</td>
        </tr>
        <tr>
          <td>Net</td>
          {holes.map((h) => {
            const s = scores.get(h);
            return <td key={h} style={{ color: "var(--green)", fontWeight: 700 }}>{s?.strokes != null ? s.strokes - s.drinks : ""}</td>;
          })}
          <td className="tot" style={{ color: "var(--green)" }}>
            {holes.some((h) => scores.get(h)?.strokes != null) ? sum((h) => scores.get(h)?.strokes) - sum((h) => scores.get(h)?.drinks) : ""}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function Scorecard({ preRound, scores }: { preRound: number; scores: Score[] }) {
  const map = new Map(scores.map((s) => [s.hole, s]));
  const t = computeTotals(preRound, scores);
  return (
    <div>
      <Nine start={1} scores={map} />
      <Nine start={10} scores={map} />
      <table className="sc">
        <tbody>
          <tr>
            <td>Pre-round drinks</td>
            <td className="tot">{preRound}</td>
          </tr>
          <tr>
            <td>Gross ({t.thru === 18 ? "final" : `thru ${t.thru}`})</td>
            <td className="tot">{t.gross}</td>
          </tr>
          <tr>
            <td>Total drinks</td>
            <td className="tot">{t.drinks}</td>
          </tr>
          <tr>
            <td>Net</td>
            <td className="tot" style={{ color: "var(--green)", fontSize: 16 }}>{t.net}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
