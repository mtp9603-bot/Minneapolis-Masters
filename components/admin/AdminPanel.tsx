"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  adminLogout,
  archiveYear,
  deletePlayer,
  resetTournament,
  setSubmitted,
  setWithdrawn,
  updateSettings,
} from "@/app/admin/actions";
import { computeTotals } from "@/lib/scoring";
import type { PlayerRow, ScoreRow, Settings } from "@/lib/types";

type Result = { ok: true } | { ok: false; error: string };

export function AdminPanel(props: {
  settings: Settings;
  joinCode: string;
  players: (PlayerRow & { token: string })[];
  scores: ScoreRow[];
  archives: { year: number; archived_at: string }[];
}) {
  const router = useRouter();
  const [preMax, setPreMax] = useState(props.settings.pre_round_max);
  const [locked, setLocked] = useState(props.settings.locked);
  const [code, setCode] = useState(props.joinCode);
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState("");
  const [copied, setCopied] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [archiveFirst, setArchiveFirst] = useState(true);
  const [busy, setBusy] = useState(false);

  async function act(fn: () => Promise<Result>, success: string) {
    setBusy(true);
    try {
      const res = await fn();
      setMsg(res.ok ? success : res.error);
      router.refresh();
      return res.ok;
    } finally {
      setBusy(false);
    }
  }

  const save = (next?: Partial<{ pre_round_max: number; locked: boolean }>) =>
    act(() => updateSettings({ pre_round_max: preMax, locked, join_code: code, ...next }), "Settings saved.");

  async function toggleLock() {
    const next = !locked;
    if (next && !window.confirm("Lock scoring? Players won't be able to change their cards.")) return;
    setLocked(next);
    await save({ locked: next });
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete ${name} and their scores? This can't be undone.`)) return;
    await act(() => deletePlayer(id), `Deleted ${name}.`);
  }

  async function withdraw(p: PlayerRow) {
    if (!p.withdrawn && !window.confirm(`Mark ${p.name} as withdrawn? They'll drop to the bottom as WD and can't edit their card.`)) return;
    await act(() => setWithdrawn(p.id, !p.withdrawn), p.withdrawn ? `${p.name} is back in.` : `${p.name} marked WD.`);
  }

  async function toggleSubmitted(p: PlayerRow) {
    await act(() => setSubmitted(p.id, !p.submitted_at), p.submitted_at ? `Reopened ${p.name}'s card.` : `Marked ${p.name}'s card submitted.`);
  }

  async function archive() {
    const y = Number(year);
    const exists = props.archives.some((a) => a.year === y);
    if (exists && !window.confirm(`Replace the saved ${y} results with the current standings?`)) return;
    await act(() => archiveYear(y), `Saved ${y} to Past Champions.`);
  }

  async function reset() {
    const note = archiveFirst ? `Results will be saved to Past Champions as ${year} first.` : "Results will NOT be saved.";
    if (!window.confirm(`Delete ALL players and scores? ${note}`)) return;
    const ok = await act(() => resetTournament(confirm, archiveFirst ? Number(year) : null), "Tournament reset.");
    if (ok) {
      setConfirm("");
      setLocked(false);
      setPreMax(1);
    }
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

  const active = props.players.filter((p) => !p.withdrawn);
  const waiting = active.filter((p) => !p.submitted_at);
  const savedThisYear = props.archives.find((a) => a.year === Number(year));

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
          <button className={`btn small ${locked ? "" : "danger"}`} onClick={toggleLock} disabled={busy}>
            {locked ? "Unlock" : "Lock scoring"}
          </button>
        </div>
        <div>
          <b>
            Cards submitted: {active.length - waiting.length} of {active.length}
          </b>
          {waiting.length > 0 && active.length > 0 && (
            <div className="small muted">Waiting on: {waiting.map((p) => p.name).join(", ")}</div>
          )}
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
        <button className="btn block" onClick={() => save()} disabled={busy}>
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
                  <b>
                    {p.name} {p.withdrawn && <span className="tag wd">WD</span>}
                    {p.submitted_at && !p.withdrawn && <span className="tag ok">Submitted</span>}
                  </b>
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
                  {!p.withdrawn && (
                    <button className="btn secondary small" onClick={() => toggleSubmitted(p)} disabled={busy}>
                      {p.submitted_at ? "Reopen card" : "Mark submitted"}
                    </button>
                  )}
                  <button className="btn secondary small" onClick={() => withdraw(p)} disabled={busy}>
                    {p.withdrawn ? "Reinstate" : "Withdraw"}
                  </button>
                  <button className="btn danger small" onClick={() => remove(p.id, p.name)} disabled={busy}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card stack">
        <h2>Past Champions</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Saves the final standings, every card, and the awards. Do this after you lock scoring. Saving the same year
          again replaces it.
        </p>
        <div>
          <label htmlFor="year">Year</label>
          <input id="year" type="number" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <button className="btn block" onClick={archive} disabled={busy || props.players.length === 0}>
          Save results to Past Champions
        </button>
        {props.archives.length > 0 && (
          <div className="small">
            Saved:{" "}
            {props.archives.map((a, i) => (
              <span key={a.year}>
                {i > 0 && ", "}
                <Link href={`/history/${a.year}`}>{a.year}</Link>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card stack">
        <h2>Reset for next year</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Deletes every player and score, unlocks scoring, and sets the pre-round limit back to 1. Change the tournament
          code above too.
        </p>
        {props.players.length > 0 && !savedThisYear && (
          <div className="banner">{year} results haven't been saved to Past Champions yet.</div>
        )}
        <label className="row" style={{ fontWeight: 500 }}>
          <input type="checkbox" checked={archiveFirst} onChange={(e) => setArchiveFirst(e.target.checked)} style={{ width: 22, height: 22 }} />
          Save results to Past Champions as {year} first
        </label>
        <input type="text" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Type RESET to confirm" />
        <button className="btn danger block" disabled={busy || confirm !== "RESET"} onClick={reset}>
          Reset tournament
        </button>
      </div>
    </>
  );
}
