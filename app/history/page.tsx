import Link from "next/link";
import { db } from "@/lib/supabase-server";
import type { ArchivedPlayer } from "@/lib/archive";

export const dynamic = "force-dynamic";
export const metadata = { title: "Past Champions · Minneapolis Masters" };

type Row = { year: number; champion_name: string | null; standings: ArchivedPlayer[] };

function champion(y: Row) {
  if (y.champion_name) return y.champion_name;
  return y.standings.filter((p) => p.position === "1" || p.position === "T1").map((p) => p.name).join(" & ") || "—";
}

function summary(y: Row) {
  const champ = y.standings.find((p) => p.position === "1" || p.position === "T1");
  if (!champ) return null;
  return `Net ${champ.net} · ${y.standings.filter((p) => !p.withdrawn).length} players`;
}

export default async function HistoryPage() {
  const { data } = await db().from("archives").select("year, champion_name, standings").order("year", { ascending: false });
  const years = (data ?? []) as Row[];
  const [reigning, ...past] = years;

  return (
    <main className="wrap">
      <div className="eyebrow">Minneapolis Masters</div>
      <h1>Past Champions</h1>

      {!reigning && (
        <div className="card muted">No champions yet. Results are saved here at the end of each tournament.</div>
      )}

      {reigning && (
        <Link href={`/history/${reigning.year}`} className="reigning">
          <div className="reigning-medal">
            <img src="/logo.png" alt="" />
          </div>
          <div className="eyebrow light">Reigning champion · {reigning.year}</div>
          <div className="reigning-name">{champion(reigning)}</div>
          {summary(reigning) && <div className="reigning-meta">{summary(reigning)}</div>}
        </Link>
      )}

      {past.length > 0 && (
        <div className="card list-card">
          {past.map((y) => (
            <Link href={`/history/${y.year}`} className="champ" key={y.year}>
              <span className="champ-year">{y.year}</span>
              <span className="champ-name">
                {champion(y)}
                {summary(y) && <span className="champ-meta">{summary(y)}</span>}
              </span>
              <span className="chev">›</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
