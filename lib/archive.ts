import { computeAwards, type Award } from "./awards";
import { buildLeaderboard, describeTiebreak } from "./scoring";
import type { PlayerRow, ScoreRow } from "./types";

export type ArchivedPlayer = {
  id: string;
  name: string;
  position: string;
  thru: number;
  gross: number;
  drinks: number;
  net: number;
  netToPar: number;
  withdrawn: boolean;
  tiebreak: string | null;
  pre: number;
  holes: { hole: number; strokes: number | null; drinks: number }[];
};

export type Archive = {
  year: number;
  archived_at: string;
  champion_name: string | null;
  standings: ArchivedPlayer[];
  awards: Award[];
};

/** Freeze the current leaderboard, cards, and awards into a plain JSON snapshot. */
export function buildSnapshot(players: PlayerRow[], scores: ScoreRow[]): { standings: ArchivedPlayer[]; awards: Award[] } {
  const rows = buildLeaderboard(players, scores);
  const standings = rows.map((r) => ({
    id: r.id,
    name: r.name,
    position: r.position,
    thru: r.thru,
    gross: r.gross,
    drinks: r.drinks,
    net: r.net,
    netToPar: r.netToPar,
    withdrawn: !!r.withdrawn,
    tiebreak: r.wonTiebreak ? describeTiebreak(r.wonTiebreak) : null,
    pre: r.pre_round_drinks,
    holes: scores
      .filter((s) => s.player_id === r.id)
      .map((s) => ({ hole: s.hole, strokes: s.strokes, drinks: s.drinks }))
      .sort((a, b) => a.hole - b.hole),
  }));
  return { standings, awards: computeAwards(players, scores) };
}
