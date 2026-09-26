"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Fragment } from "react";
import { browserDb } from "@/lib/supabase-browser";
import { buildLeaderboard, describeTiebreak, formatToPar } from "@/lib/scoring";
import { toParClass } from "@/lib/marks";
import type { PlayerRow, ScoreRow } from "@/lib/types";
import { HoleDetail } from "./HoleDetail";
import { Awards } from "./Awards";
import { computeAwards } from "@/lib/awards";
import Link from "next/link";

export function Leaderboard() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [locked, setLocked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [live, setLive] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const sb = browserDb();
    const [p, s, st] = await Promise.all([
      sb.from("players").select("id, name, pre_round_drinks, withdrawn, submitted_at"),
      sb.from("scores").select("player_id, hole, strokes, drinks"),
      sb.from("settings").select("locked").eq("id", 1).single(),
    ]);
    if (p.data) setPlayers(p.data as PlayerRow[]);
    if (s.data) setScores(s.data as ScoreRow[]);
    if (st.data) setLocked(st.data.locked);
    setLoaded(true);
  }, []);

  const reloadSoon = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(load, 250);
  }, [load]);

  useEffect(() => {
    load();
    const ch = browserDb()
      .channel("leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, reloadSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, reloadSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, reloadSoon)
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    // Phones drop sockets when asleep; refresh when the screen comes back.
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      browserDb().removeChannel(ch);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load, reloadSoon]);

  const rows = useMemo(() => buildLeaderboard(players, scores), [players, scores]);
  const awards = useMemo(() => computeAwards(players, scores), [players, scores]);
  const submitted = useMemo(() => new Set(players.filter((p) => p.submitted_at).map((p) => p.id)), [players]);

  return (
    <>
      <div className="spread">
        <div>
          <div className="eyebrow">Brookview · Regulation 18</div>
          <h1>Leaderboard</h1>
        </div>
        <span className={`live-pill ${locked ? "final" : live ? "on" : ""}`}>
          <i />
          {locked ? "Final" : live ? "Live" : "Connecting"}
        </span>
      </div>
      <div className="card" style={{ padding: "8px 10px" }}>
        {!loaded ? (
          <p className="muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="muted">No players yet.</p>
        ) : (
          <table className="lb">
            <thead>
              <tr>
                <th>Pos</th>
                <th>Player</th>
                <th>Thru</th>
                <th>Gross</th>
                <th>🍺</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.id}>
                <tr className={`click ${open === r.id ? "open" : ""} ${r.withdrawn ? "wd" : ""} ${r.position === "1" || r.position === "T1" ? "leader" : ""}`} onClick={() => setOpen(open === r.id ? null : r.id)}>
                  <td className="pos">
                    <span className="pos-badge">{r.position}</span>
                  </td>
                  <td>
                    <span className="name">{r.name}</span>
                    {r.wonTiebreak && <span className="tb">{describeTiebreak(r.wonTiebreak)}</span>}
                  </td>
                  <td>
                    {r.thru === 18 ? "F" : r.thru || "–"}
                    {submitted.has(r.id) && <span className="sub" title="Card submitted"> ✓</span>}
                  </td>
                  <td>{r.thru ? r.gross : "–"}</td>
                  <td>{r.drinks}</td>
                  <td>
                    <span className={`net ${r.thru ? toParClass(r.netToPar) : ""}`}>{r.thru ? r.net : "–"}</span>
                    {r.thru > 0 && <span className={`topar ${toParClass(r.netToPar)}`}>{formatToPar(r.netToPar)}</span>}
                  </td>
                </tr>
                {open === r.id && (
                  <tr className="detail">
                    <td colSpan={6}>
                      <HoleDetail playerId={r.id} preRound={r.pre_round_drinks} scores={scores.filter((s) => s.player_id === r.id)} />
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Awards awards={awards} final={locked} />
      <p className="small muted">
        <Link href="/history">Past Champions ›</Link>
      </p>
      <p className="small muted">
        Lowest net wins. Mid-round, players are ranked by net relative to par for the holes they've played. Ties: more
        drinks, then countback from hole 18. Tap a name for hole-by-hole detail. ✓ means the player submitted their card.
      </p>
    </>
  );
}
