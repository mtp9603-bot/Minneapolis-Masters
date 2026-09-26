import { MAX_STROKES, MIN_STROKES, holeDrinkCap } from "./course";

export function validateHole(hole: number, strokes: number | null, drinks: number): string | null {
  if (!Number.isInteger(hole) || hole < 1 || hole > 18) return "Invalid hole.";
  if (strokes !== null && (!Number.isInteger(strokes) || strokes < MIN_STROKES || strokes > MAX_STROKES)) {
    return `Strokes must be ${MIN_STROKES} to ${MAX_STROKES}.`;
  }
  const cap = holeDrinkCap(hole);
  if (!Number.isInteger(drinks) || drinks < 0 || drinks > (cap ?? 50)) {
    return cap != null ? `Max ${cap} drink on hole ${hole}.` : "Invalid drinks.";
  }
  return null;
}
