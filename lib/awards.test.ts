import { describe, expect, it } from "vitest";
import { computeAwards } from "./awards";
import { buildLeaderboard } from "./scoring";
import { PARS } from "./course";

const card = (id: string, strokes: (number | null)[], drinks: number[] = []) =>
  strokes.map((s, i) => ({ player_id: id, hole: i + 1, strokes: s, drinks: drinks[i] ?? 0 }));

describe("computeAwards", () => {
  const players = [
    { id: "a", name: "Ann", pre_round_drinks: 1 },
    { id: "b", name: "Ben", pre_round_drinks: 0 },
    { id: "w", name: "Wes", pre_round_drinks: 2, withdrawn: true },
  ];
  const a = PARS.slice();
  a[0] = 3; // birdie
  a[11] = 1; // ace on par 3 #12
  const b = PARS.slice();
  b[5] = 8; // +4 on #6
  const scores = [...card("a", a, [1, 1]), ...card("b", b, Array(18).fill(1)), ...card("w", Array(18).fill(15), Array(18).fill(9))];
  const awards = Object.fromEntries(computeAwards(players, scores).map((x) => [x.key, x]));

  it("ignores withdrawn players", () => {
    expect(awards.drinks.winners.map((w) => w.name)).toEqual(["Ben"]);
    expect(awards.worst.winners[0].name).toBe("Ben");
  });
  it("finds aces, best gross, birdies, worst hole", () => {
    expect(awards.ace.winners).toEqual([{ name: "Ann", note: "hole 12" }]);
    expect(awards.gross.winners.map((w) => w.name)).toEqual(["Ann"]);
    expect(awards.birdies.detail).toBe("2 birdies or better");
    expect(awards.worst.winners[0].note).toBe("8 on hole 6, par 4");
  });
});

describe("withdrawn players on the leaderboard", () => {
  it("sort last with position WD", () => {
    const rows = buildLeaderboard(
      [
        { id: "w", name: "Wes", pre_round_drinks: 0, withdrawn: true },
        { id: "a", name: "Ann", pre_round_drinks: 0 },
      ],
      [...card("w", PARS.map((p) => p - 1)), ...card("a", PARS)],
    );
    expect(rows.map((r) => [r.name, r.position])).toEqual([
      ["Ann", "1"],
      ["Wes", "WD"],
    ]);
  });
});
