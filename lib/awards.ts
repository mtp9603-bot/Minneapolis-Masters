import { PARS, TOTAL_PAR } from "./course";
import { computeTotals, formatToPar, type Player, type Score } from "./scoring";

export type AwardWinner = { name: string; note?: string };
export type Award = { key: string; title: string; detail: string; winners: AwardWinner[] };

/**
 * Fun awards computed from the cards. Withdrawn players are left out.
 * Best gross only counts players who finished all 18.
 */
export function computeAwards(players: Player[], scores: (Score & { player_id: string })[]): Award[] {
  const byPlayer = new Map<string, Score[]>();
  for (const s of scores) byPlayer.set(s.player_id, [...(byPlayer.get(s.player_id) ?? []), s]);

  const cards = players
    .filter((p) => !p.withdrawn)
    .map((p) => {
      const list = byPlayer.get(p.id) ?? [];
      return { name: p.name, list, t: computeTotals(p.pre_round_drinks, list) };
    })
    .filter((c) => c.t.thru > 0);

  const awards: Award[] = [];

  // Hole in one (only shown when someone makes one)
  const aces = cards.flatMap((c) => c.list.filter((s) => s.strokes === 1).map((s) => ({ name: c.name, note: `hole ${s.hole}` })));
  if (aces.length) awards.push({ key: "ace", title: "Hole in one", detail: "Drinks are on them", winners: aces });

  // Best of a numeric stat; ties share the award.
  function top(key: string, title: string, value: (c: (typeof cards)[number]) => number | null, better: "high" | "low", detail: (v: number) => string) {
    const vals = cards.map((c) => ({ c, v: value(c) })).filter((x): x is { c: (typeof cards)[number]; v: number } => x.v != null);
    if (!vals.length) return;
    const best = better === "high" ? Math.max(...vals.map((x) => x.v)) : Math.min(...vals.map((x) => x.v));
    if (better === "high" && best <= 0) return;
    awards.push({ key, title, detail: detail(best), winners: vals.filter((x) => x.v === best).map((x) => ({ name: x.c.name })) });
  }

  top("drinks", "Most drinks", (c) => c.t.drinks, "high", (v) => `${v} drink${v === 1 ? "" : "s"}`);
  top("gross", "Best gross", (c) => (c.t.thru === 18 ? c.t.gross : null), "low", (v) => `${v} (${formatToPar(v - TOTAL_PAR)}) before drinks`);
  top(
    "birdies",
    "Most birdies",
    (c) => c.list.filter((s) => s.strokes != null && s.strokes < PARS[s.hole - 1]).length,
    "high",
    (v) => `${v} birdie${v === 1 ? "" : "s"} or better`,
  );

  // Worst single hole, by strokes over par.
  const holes = cards.flatMap((c) =>
    c.list.filter((s) => s.strokes != null).map((s) => ({ name: c.name, hole: s.hole, strokes: s.strokes!, over: s.strokes! - PARS[s.hole - 1] })),
  );
  const worst = Math.max(...holes.map((h) => h.over), -Infinity);
  if (worst >= 2) {
    awards.push({
      key: "worst",
      title: "Worst hole",
      detail: `${formatToPar(worst)} on one hole`,
      winners: holes.filter((h) => h.over === worst).map((h) => ({ name: h.name, note: `${h.strokes} on hole ${h.hole}, par ${PARS[h.hole - 1]}` })),
    });
  }

  return awards;
}
