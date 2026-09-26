import { describe, expect, it } from "vitest";
import { buildLeaderboard, computeTotals } from "./scoring";
import { PARS } from "./course";

type S = { player_id: string; hole: number; strokes: number | null; drinks: number };

function fullRound(id: string, strokes: number[], drinks: number[] = Array(18).fill(0)): S[] {
  return strokes.map((s, i) => ({ player_id: id, hole: i + 1, strokes: s, drinks: drinks[i] }));
}

describe("computeTotals", () => {
  it("net = gross - (pre-round + hole drinks)", () => {
    const t = computeTotals(1, fullRound("a", PARS, [2, ...Array(17).fill(0)]));
    expect(t.gross).toBe(72);
    expect(t.drinks).toBe(3);
    expect(t.net).toBe(69);
    expect(t.thru).toBe(18);
  });

  it("counts only holes with strokes toward thru", () => {
    const t = computeTotals(0, [
      { hole: 1, strokes: 5, drinks: 1 },
      { hole: 2, strokes: null, drinks: 2 },
    ]);
    expect(t.thru).toBe(1);
    expect(t.drinks).toBe(3);
    expect(t.gross).toBe(5);
  });
});

describe("buildLeaderboard", () => {
  it("sorts by lowest net", () => {
    const players = [
      { id: "a", name: "A", pre_round_drinks: 0 },
      { id: "b", name: "B", pre_round_drinks: 0 },
    ];
    const rows = buildLeaderboard(players, [...fullRound("a", PARS.map((p) => p + 1)), ...fullRound("b", PARS)]);
    expect(rows.map((r) => r.id)).toEqual(["b", "a"]);
    expect(rows[0].wonTiebreak).toBeNull();
  });

  it("tie on net: more drinks wins", () => {
    const players = [
      { id: "a", name: "A", pre_round_drinks: 0 },
      { id: "b", name: "B", pre_round_drinks: 1 },
    ];
    // A: 72 gross, 0 drinks = 72 net. B: 73 gross, 1 drink = 72 net.
    const b = PARS.slice();
    b[0] += 1;
    const rows = buildLeaderboard(players, [...fullRound("a", PARS), ...fullRound("b", b)]);
    expect(rows.map((r) => r.id)).toEqual(["b", "a"]);
    expect(rows[0].wonTiebreak).toEqual({ kind: "drinks" });
    expect(rows.map((r) => r.position)).toEqual(["1", "2"]);
  });

  it("tie on net and drinks: countback from 18", () => {
    const players = [
      { id: "a", name: "A", pre_round_drinks: 0 },
      { id: "b", name: "B", pre_round_drinks: 0 },
    ];
    const a = PARS.slice();
    const b = PARS.slice();
    // Same totals; A is better on 17, worse on 16. 18 is equal.
    a[16] -= 1;
    a[15] += 1;
    const rows = buildLeaderboard(players, [...fullRound("a", a), ...fullRound("b", b)]);
    expect(rows.map((r) => r.id)).toEqual(["a", "b"]);
    expect(rows[0].wonTiebreak).toEqual({ kind: "countback", hole: 17 });
  });

  it("identical cards are a true tie", () => {
    const players = [
      { id: "a", name: "A", pre_round_drinks: 0 },
      { id: "b", name: "B", pre_round_drinks: 0 },
    ];
    const rows = buildLeaderboard(players, [...fullRound("a", PARS), ...fullRound("b", PARS)]);
    expect(rows.map((r) => r.position)).toEqual(["T1", "T1"]);
    expect(rows[0].wonTiebreak).toBeNull();
  });

  it("players with no scores go last", () => {
    const players = [
      { id: "a", name: "A", pre_round_drinks: 1 },
      { id: "b", name: "B", pre_round_drinks: 0 },
    ];
    const rows = buildLeaderboard(players, fullRound("b", PARS.map((p) => p + 3)));
    expect(rows.map((r) => r.id)).toEqual(["b", "a"]);
    expect(rows[1].position).toBe("–");
  });
});
