/**
 * Standard scorecard notation, based on strokes vs par:
 *   eagle or better  = double circle      birdie = circle
 *   par              = no mark
 *   bogey            = square             double bogey = double square
 *   triple or worse  = filled square
 * Colors follow the leaderboard convention: red under par, green even, black over.
 */
export type ScoreKind = "eagle" | "birdie" | "par" | "bogey" | "double" | "triple";

export function scoreKind(strokes: number, par: number): ScoreKind {
  const d = strokes - par;
  if (d <= -2) return "eagle";
  if (d === -1) return "birdie";
  if (d === 0) return "par";
  if (d === 1) return "bogey";
  if (d === 2) return "double";
  return "triple";
}

const NAMES: Record<number, string> = { [-3]: "Albatross", [-2]: "Eagle", [-1]: "Birdie", 0: "Par", 1: "Bogey", 2: "Double bogey", 3: "Triple bogey", 4: "Quadruple bogey" };

export function scoreName(strokes: number, par: number): string {
  if (strokes === 1) return "Hole in one!";
  const d = strokes - par;
  if (d < -3) return "Condor";
  return NAMES[d] ?? `+${d}`;
}

/** CSS class for a to-par number: red under, green even, black over. */
export function toParClass(n: number): "under" | "even" | "over" {
  return n < 0 ? "under" : n === 0 ? "even" : "over";
}
