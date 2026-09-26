"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminLogout, deletePlayer, resetTournament, updateSettings } from "@/app/admin/actions";
import { computeTotals } from "@/lib/scoring";
import type { PlayerRow, ScoreRow, Settings } from "@/lib/types";

export function AdminPanel(props: {
  settings: Settings;
  joinCode: string;
  players: (PlayerRow & { token: string })[];
  scores: ScoreRow[];
}) {
  const router = useRouter();
  const [preMax, setPreMax] = useState(props.settings.pre_round_max);
  const [locked, setLocked] = useState(props.settings.locked);
  const [code, setCode] = useState(props.joinCode);
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState("");
  const [copied, setCopied] = useState("");

  async function save(next?: Partial<{ pre_round_max: number; locked: boolean }>) {
    const input = { pre_round_max: preMax, locked, join_code: code, ...next };
    const res = await updateSettings(input);
    setMsg(res.ok ? "Settings saved." : res.error);
    router.refresh();
  }

  async function toggleLock() {
    const next = !locked;
    if (next && !window.confirm("Lock scoring? Players won't be able to change their cards.")) return;
    setLocked(next);
    await save({ locked: next });
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete ${name} and their scores? This can't be undone.`)) return;
    const res = await deletePlayer(id);
    setMsg(res.ok ? `Deleted ${name}.` : res.error);
    router.refresh();
  }

  async function reset() {
    if (!window.confirm("Delete ALL players and scores for next year?")) return;
    const res = await resetTournament(confirm);
    setMsg(res.ok ? "Tournament reset." : res.error);
    if (res.ok) {
      setConfirm("");
      setLocked(false);
      setPreMax(1);
    }
    router.refresh();
  }

  async function copyLink(token: string, name: string) {
    const url = `${window.location.origin}/p/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(name);
    } catch {
      window.prompt(`Link for ${name}:`, url);
    }
  }

  const byPlayer = new Map<string, ScoreRow[]>();
  for (const s of props.scores) byPlayer.set(s.player_id, [...(byPlayer.get(s.player_id) ?? []), s]);

  return (
    <>
      <div className="spread">
        <h1>Admin</h1>
        <button
          className="btn secondary small"
          onClick={async () => {
            await adminLogout();
            router.refresh();
          }}
        >
          Sign out
        </button>
      </div>
      {msg && <div className="banner">{msg}</div>}

      <div className="card stack">
        <h2>Round</h2>
        <div className="spread">
          <div>
            <b>Scoring is {locked ? "locked" : "open"}</b>
            <div className="small muted">{locked ? "Cards are read-only." : "Players can edit their cards."}</div>
          </div>
          <button className={`btn small ${locked ? "" : "danger"}`} onClick={toggleLock}>
            {locked ? "Unlock" : "Lock scoring"}
          </button>
        </div>
      </div>

      <div className="card stack">
        <h2>Settings</h2>
        <div>
          <label htmlFor="pre">Pre-round drink limit</label>
          <select id="pre" value={preMax} onChange={(e) => setPreMax(Number(e.target.value))}>
            <option value={1}>1 drink</option>
            <option value={2}>2 drinks</option>
          </select>
        </div>
        <div>
          <label htmlFor="code">Tournament code</label>
          <input id="code" type="text" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <button className="btn block" onClick={() => save()}>
          Save settings
        </button>
      </div>

      <div className="card">
        <h2>Players ({props.players.length})</h2>
        <div className="plist">
          {props.players.length === 0 && <p className="muted">No one has joined yet.</p>}
          {props.players.map((p) => {
            const t = computeTotals(p.pre_round_drinks, byPlayer.get(p.id) ?? []);
            return (
              <div className="item" key={p.id}>
                <div className="spread">
                  <b>{p.name}</b>
                  <span className="small muted">
                    Thru {t.thru} · G {t.gross} · 🍺 {t.drinks} · Net {t.net}
                  </span>
                </div>
                <div className="row" style={{ marginTop: 8, flexWrap: "wrap" }}>
                  <Link className="btn secondary small" href={`/admin/player/${p.id}`}>
                    Edit
                  </Link>
                  <button className="btn secondary small" onClick={() => copyLink(p.token, p.name)}>
                    {copied === p.name ? "Copied!" : "Copy link"}
                  </button>
                  <button className="btn danger small" onClick={() => remove(p.id, p.name)}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card stack">
        <h2>Reset for next year</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Deletes every player and score, unlocks scoring, and sets the pre-round limit back to 1. Change the tournament
          code above too. Type RESET to confirm.
        </p>
        <input type="text" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="RESET" />
        <button className="btn danger block" disabled={confirm !== "RESET"} onClick={reset}>
          Reset tournament
        </button>
      </div>
    </>
  );
}
