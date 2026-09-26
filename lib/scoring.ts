import { PARS } from "./course";

export type Score = { hole: number; strokes: number | null; drinks: number };
export type Player = { id: string; name: string; pre_round_drinks: number };

export type Totals = {
  gross: number;
  drinks: number;
  net: number;
  thru: number;
  /** Net relative to par for the holes played. Used to rank players mid-round. */
  netToPar: number;
  /** strokes by hole, index 0 = hole 1 */
  byHole: (number | null)[];
};

export function computeTotals(preRound: number, scores: Score[]): Totals {
  const byHole: (number | null)[] = Array(18).fill(null);
  let gross = 0;
  let drinks = preRound;
  let thru = 0;
  let parPlayed = 0;
  for (const s of scores) {
    drinks += s.drinks;
    if (s.strokes != null) {
      byHole[s.hole - 1] = s.strokes;
      gross += s.strokes;
      parPlayed += PARS[s.hole - 1];
      thru++;
    }
  }
  const net = gross - drinks;
  return { gross, drinks, net, thru, netToPar: net - parPlayed, byHole };
}

export type Tiebreak = { kind: "drinks" } | { kind: "countback"; hole: number };

export type Row = Player & Totals & {
  position: string;
  /** Set when this player is ranked ahead of a player with the same net because of a tie-breaker. */
  wonTiebreak: Tiebreak | null;
};

/**
 * Compare two players who have the same net.
 * Negative = a ranks ahead. Returns the rule that decided it.
 */
function tiebreak(a: Totals, b: Totals): { cmp: number; rule: Tiebreak | null } {
  // 1. More total drinks wins.
  if (a.drinks !== b.drinks) return { cmp: b.drinks - a.drinks, rule: { kind: "drinks" } };
  // 2. Countback: hole 18, 17, 16 ... lower strokes wins. Skip holes either player hasn't played.
  for (let h = 18; h >= 1; h--) {
    const sa = a.byHole[h - 1];
    const sb = b.byHole[h - 1];
    if (sa == null || sb == null) continue;
    if (sa !== sb) return { cmp: sa - sb, rule: { kind: "countback", hole: h } };
  }
  return { cmp: 0, rule: null };
}

function sameNet(a: Totals, b: Totals) {
  return a.netToPar === b.netToPar;
}

/**
 * Rank players. Lowest net wins. Mid-round, players are compared by net relative to par
 * for holes played, which gives the same order as raw net once everyone has finished.
 * Players with no holes entered go to the bottom.
 */
export function buildLeaderboard(players: Player[], scores: (Score & { player_id: string })[]): Row[] {
  const byPlayer = new Map<string, Score[]>();
  for (const s of scores) {
    const list = byPlayer.get(s.player_id) ?? [];
    list.push(s);
    byPlayer.set(s.player_id, list);
  }
  const rows = players.map((p) => ({ ...p, ...computeTotals(p.pre_round_drinks, byPlayer.get(p.id) ?? []) }));

  rows.sort((a, b) => {
    if ((a.thru === 0) !== (b.thru === 0)) return a.thru === 0 ? 1 : -1;
    if (!sameNet(a, b)) return a.netToPar - b.netToPar;
    const t = tiebreak(a, b).cmp;
    if (t !== 0) return t;
    return a.name.localeCompare(b.name);
  });

  const out: Row[] = [];
  let rank = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const prev = rows[i - 1];
    const next = rows[i + 1];
    const tiedWithPrev = prev && prev.thru > 0 && r.thru > 0 && sameNet(prev, r) && tiebreak(prev, r).cmp === 0;
    if (!tiedWithPrev) rank = i + 1;
    const tiedWithNext = next && next.thru > 0 && r.thru > 0 && sameNet(r, next) && tiebreak(r, next).cmp === 0;

    let wonTiebreak: Tiebreak | null = null;
    if (next && r.thru > 0 && next.thru > 0 && sameNet(r, next)) {
      wonTiebreak = tiebreak(r, next).rule;
    }
    out.push({
      ...r,
      position: r.thru === 0 ? "–" : tiedWithPrev || tiedWithNext ? `T${rank}` : `${rank}`,
      wonTiebreak,
    });
  }
  return out;
}

export function describeTiebreak(t: Tiebreak): string {
  return t.kind === "drinks" ? "Won on tiebreak (more drinks)" : `Won on tiebreak (countback, hole ${t.hole})`;
}

export function formatToPar(n: number): string {
  return n === 0 ? "E" : n > 0 ? `+${n}` : `${n}`;
}
