"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePlayer } from "@/app/admin/actions";
import { PARS, holeDrinkCap } from "@/lib/course";
import { computeTotals } from "@/lib/scoring";
import type { PlayerRow, ScoreRow } from "@/lib/types";

type H = { strokes: string; drinks: string };

export function PlayerEditor({ player, scores }: { player: PlayerRow; scores: ScoreRow[] }) {
  const router = useRouter();
  const [name, setName] = useState(player.name);
  const [pre, setPre] = useState(String(player.pre_round_drinks));
  const [holes, setHoles] = useState<H[]>(() =>
    Array.from({ length: 18 }, (_, i) => {
      const s = scores.find((x) => x.hole === i + 1);
      return { strokes: s?.strokes != null ? String(s.strokes) : "", drinks: String(s?.drinks ?? 0) };
    }),
  );
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const parsed = holes.map((h, i) => ({
    hole: i + 1,
    strokes: h.strokes.trim() === "" ? null : Number(h.strokes),
    drinks: h.drinks.trim() === "" ? 0 : Number(h.drinks),
  }));
  const totals = computeTotals(Number(pre) || 0, parsed);

  function set(i: number, patch: Partial<H>) {
    setHoles((hs) => hs.map((h, j) => (j === i ? { ...h, ...patch } : h)));
  }

  async function save() {
    setBusy(true);
    const res = await updatePlayer({ id: player.id, name, pre_round_drinks: Number(pre), holes: parsed });
    setBusy(false);
    setMsg(res.ok ? "Saved." : res.error);
    if (res.ok) router.refresh();
  }

  return (
    <>
      <h1>Edit player</h1>
      {msg && <div className="banner">{msg}</div>}
      <div className="card stack">
        <div>
          <label htmlFor="n">Name</label>
          <input id="n" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </div>
        <div>
          <label htmlFor="pre">Pre-round drinks (0–2)</label>
          <input id="pre" type="number" inputMode="numeric" min={0} max={2} value={pre} onChange={(e) => setPre(e.target.value)} />
        </div>
      </div>
      <div className="card">
        <table className="edit-grid">
          <thead>
            <tr>
              <th>Hole</th>
              <th>Par</th>
              <th>Strokes</th>
              <th>Drinks</th>
            </tr>
          </thead>
          <tbody>
            {holes.map((h, i) => (
              <tr key={i}>
                <td>
                  <b>{i + 1}</b>
                </td>
                <td className="muted">{PARS[i]}</td>
                <td>
                  <input type="number" inputMode="numeric" min={1} max={15} value={h.strokes} onChange={(e) => set(i, { strokes: e.target.value })} />
                </td>
                <td>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={holeDrinkCap(i + 1) ?? undefined}
                    value={h.drinks}
                    onChange={(e) => set(i, { drinks: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted">
          Gross {totals.gross} · Drinks {totals.drinks} · Net {totals.net} · Thru {totals.thru}. Leave strokes blank for
          holes not played.
        </p>
        <button className="btn block" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </>
  );
}
