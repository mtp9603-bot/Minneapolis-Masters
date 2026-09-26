export const COURSE_NAME = "Brookview Golf Course";
export const COURSE_SUB = "Regulation 18 · Blue tees · Golden Valley, MN";

export const PARS = [4, 5, 5, 3, 4, 4, 4, 3, 4, 4, 4, 3, 4, 4, 5, 5, 3, 4];
export const YARDS = [360, 502, 544, 173, 318, 375, 399, 203, 308, 380, 358, 159, 346, 337, 561, 534, 153, 414];

export const TOTAL_PAR = PARS.reduce((a, b) => a + b, 0); // 72
export const TOTAL_YARDS = YARDS.reduce((a, b) => a + b, 0); // 6424

export const MIN_STROKES = 1;
export const MAX_STROKES = 15;

/** Max drinks allowed on a hole (1-18). null = no cap. */
export function holeDrinkCap(hole: number): number | null {
  return hole >= 17 ? 1 : null;
}
