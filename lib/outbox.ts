/**
 * Changes that haven't reached the server yet, kept on the phone so a dropped
 * signal or a closed tab doesn't lose them. Keys: "pre" or "h1".."h18".
 */
export type OutboxValue = { pre: number } | { strokes: number | null; drinks: number };
export type Outbox = Record<string, OutboxValue>;

const key = (token: string) => `mm_outbox_${token}`;

export function loadOutbox(token: string): Outbox {
  try {
    return JSON.parse(localStorage.getItem(key(token)) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

export function storeOutbox(token: string, box: Outbox) {
  try {
    if (Object.keys(box).length) localStorage.setItem(key(token), JSON.stringify(box));
    else localStorage.removeItem(key(token));
  } catch {}
}
