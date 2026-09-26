import Link from "next/link";
import { PARS } from "@/lib/course";
import type { Score } from "@/lib/scoring";

function scoreClass(strokes: number | null, par: number) {
  if (strokes == null) return "";
  if (strokes < par) return "under";
  if (strokes > par) return "over";
  return "";
}

/** Hole-by-hole breakdown: score, drinks, and net (strokes − drinks) per hole, with subtotals. */
export function HoleDetail({ playerId, preRound, scores }: { playerId: string; preRound: number; scores: Score[] }) {
  const byHole = new Map(scores.map((s) => [s.hole, s]));

  const sum = (from: number, to: number) => {
    let strokes = 0, drinks = 0, played = 0;
    for (let h = from; h <= to; h++) {
      const s = byHole.get(h);
      drinks += s?.drinks ?? 0;
      if (s?.strokes != null) {
        strokes += s.strokes;
        played++;
      }
    }
    return { strokes, drinks, net: strokes - drinks, played };
  };

  const nineRows = (from: number) =>
    Array.from({ length: 9 }, (_, i) => from + i).map((h) => {
      const s = byHole.get(h);
      const strokes = s?.strokes ?? null;
      const drinks = s?.drinks ?? 0;
      return (
        <tr key={h}>
          <td>{h}</td>
          <td className="muted">{PARS[h - 1]}</td>
          <td className={`sc-strokes ${scoreClass(strokes, PARS[h - 1])}`}>{strokes ?? "–"}</td>
          <td>{drinks || (strokes != null ? 0 : "–")}</td>
          <td className="hd-net">{strokes != null ? strokes - drinks : "–"}</td>
        </tr>
      );
    });

  const subtotal = (label: string, t: ReturnType<typeof sum>, par: number) => (
    <tr className="hd-sub">
      <td>{label}</td>
      <td>{par}</td>
      <td>{t.played ? t.strokes : "–"}</td>
      <td>{t.drinks}</td>
      <td className="hd-net">{t.played ? t.net : "–"}</td>
    </tr>
  );

  const out = sum(1, 9);
  const inn = sum(10, 18);
  const all = sum(1, 18);
  const totalDrinks = all.drinks + preRound;

  return (
    <div className="hd">
      <table>
        <thead>
          <tr>
            <th>Hole</th>
            <th>Par</th>
            <th>Score</th>
            <th>🍺</th>
            <th>Net</th>
          </tr>
        </thead>
        <tbody>
          <tr className="hd-sub">
            <td colSpan={3}>Pre-round</td>
            <td>{preRound}</td>
            <td className="hd-net">{preRound ? -preRound : 0}</td>
          </tr>
          {nineRows(1)}
          {subtotal("Out", out, 36)}
          {nineRows(10)}
          {subtotal("In", inn, 36)}
          <tr className="hd-total">
            <td colSpan={2}>Total</td>
            <td>{all.strokes}</td>
            <td>{totalDrinks}</td>
            <td className="hd-net">{all.strokes - totalDrinks}</td>
          </tr>
        </tbody>
      </table>
      <Link href={`/player/${playerId}`} className="small">
        Full scorecard ›
      </Link>
    </div>
  );
}
