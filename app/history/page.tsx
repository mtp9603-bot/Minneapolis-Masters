import Link from "next/link";
import { db } from "@/lib/supabase-server";
import type { ArchivedPlayer } from "@/lib/archive";

export const dynamic = "force-dynamic";
export const metadata = { title: "Past Champions · Minneapolis Masters" };

export default async function HistoryPage() {
  const { data } = await db().from("archives").select("year, standings").order("year", { ascending: false });
  const years = (data ?? []) as { year: number; standings: ArchivedPlayer[] }[];

  return (
    <main className="wrap">
      <h1>Past Champions</h1>
      <div className="card" style={{ padding: "4px 16px" }}>
        {years.length === 0 && <p className="muted">No past results yet. Results are saved here at the end of each tournament.</p>}
        {years.map((y) => {
          const champs = y.standings.filter((p) => p.position === "1" || p.position === "T1");
          return (
            <Link href={`/history/${y.year}`} className="champ" key={y.year}>
              <span className="champ-year">{y.year}</span>
              <span className="champ-name">
                {champs.map((c) => c.name).join(" & ") || "—"}
                {champs[0] && (
                  <span className="small muted">
                    {" "}
                    · Net {champs[0].net} · {y.standings.filter((p) => !p.withdrawn).length} players
                  </span>
                )}
              </span>
              <span className="muted">›</span>
            </Link>
          );
        })}
      </div>
      <p className="small">
        <Link href="/leaderboard">‹ Leaderboard</Link>
      </p>
    </main>
  );
}
