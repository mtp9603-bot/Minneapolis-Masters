"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { browserDb } from "@/lib/supabase-browser";
import { buildLeaderboard, describeTiebreak, formatToPar } from "@/lib/scoring";
import type { PlayerRow, ScoreRow } from "@/lib/types";

export function Leaderboard() {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [locked, setLocked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [live, setLive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const sb = browserDb();
    const [p, s, st] = await Promise.all([
      sb.from("players").select("id, name, pre_round_drinks"),
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

  return (
    <>
      <div className="spread">
        <h1>Leaderboard</h1>
        <span className="small muted">{locked ? "Final" : live ? "● Live" : "Connecting…"}</span>
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
                <tr key={r.id} className="click" onClick={() => router.push(`/player/${r.id}`)}>
                  <td className="pos">{r.position}</td>
                  <td>
                    <span className="name">{r.name}</span>
                    {r.wonTiebreak && <span className="tb">{describeTiebreak(r.wonTiebreak)}</span>}
                  </td>
                  <td>{r.thru === 18 ? "F" : r.thru || "–"}</td>
                  <td>{r.thru ? r.gross : "–"}</td>
                  <td>{r.drinks}</td>
                  <td>
                    <span className="net">{r.thru ? r.net : "–"}</span>
                    {r.thru > 0 && r.thru < 18 && <span className="tb" style={{ color: "var(--muted)" }}>{formatToPar(r.netToPar)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="small muted">
        Lowest net wins. Mid-round, players are ranked by net relative to par for the holes they've played. Ties: more
        drinks, then countback from hole 18.
      </p>
    </>
  );
}
