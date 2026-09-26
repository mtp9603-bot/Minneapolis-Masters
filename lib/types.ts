export type Settings = { pre_round_max: number; locked: boolean };
export type PlayerRow = {
  id: string;
  name: string;
  pre_round_drinks: number;
  withdrawn?: boolean;
  submitted_at?: string | null;
};
export type ScoreRow = { player_id: string; hole: number; strokes: number | null; drinks: number };
