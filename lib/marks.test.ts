import { describe, expect, it } from "vitest";
import { scoreKind, scoreName, toParClass } from "./marks";

describe("scoreKind", () => {
  it("maps strokes vs par to scorecard marks", () => {
    expect(scoreKind(2, 5)).toBe("eagle"); // albatross still double circle
    expect(scoreKind(3, 5)).toBe("eagle");
    expect(scoreKind(3, 4)).toBe("birdie");
    expect(scoreKind(4, 4)).toBe("par");
    expect(scoreKind(5, 4)).toBe("bogey");
    expect(scoreKind(6, 4)).toBe("double");
    expect(scoreKind(7, 4)).toBe("triple");
    expect(scoreKind(12, 4)).toBe("triple");
  });
});

describe("scoreName", () => {
  it("names scores", () => {
    expect(scoreName(1, 3)).toBe("Hole in one!");
    expect(scoreName(2, 5)).toBe("Albatross");
    expect(scoreName(3, 4)).toBe("Birdie");
    expect(scoreName(7, 4)).toBe("Triple bogey");
    expect(scoreName(8, 4)).toBe("Quadruple bogey");
    expect(scoreName(9, 4)).toBe("+5");
  });
});

describe("toParClass", () => {
  it("red under, green even, black over", () => {
    expect([toParClass(-2), toParClass(0), toParClass(3)]).toEqual(["under", "even", "over"]);
  });
});
