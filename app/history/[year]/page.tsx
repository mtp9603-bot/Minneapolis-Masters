import Link from "next/link";
import { db } from "@/lib/supabase-server";
import type { Archive } from "@/lib/archive";
import { ArchiveStandings } from "@/components/ArchiveStandings";
import { Awards } from "@/components/Awards";

export const dynamic = "force-dynamic";

export default async function ArchiveYearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const y = Number(year);
  const { data } = Number.isInteger(y) ? await db().from("archives").select("*").eq("year", y).maybeSingle() : { data: null };
  if (!data) {
    return (
      <main className="wrap">
        <div className="card">
          No results saved for {year}. <Link href="/history">Past Champions</Link>
        </div>
      </main>
    );
  }
  const a = data as Archive;
  return (
    <main className="wrap">
      <Link href="/history" className="back">
        ‹ Past Champions
      </Link>
      <div className="eyebrow">Final results</div>
      <h1>{a.year} Minneapolis Masters</h1>
      {a.standings.length === 0 ? (
        <div className="reigning static">
          <div className="reigning-medal">
            <img src="/logo.png" alt="" />
          </div>
          <div className="eyebrow light">{a.year} champion</div>
          <div className="reigning-name">{a.champion_name ?? "—"}</div>
          <div className="reigning-meta">Scorecards weren&apos;t recorded this year.</div>
        </div>
      ) : (
        <>
          <ArchiveStandings standings={a.standings} />
          <Awards awards={a.awards} final />
        </>
      )}
    </main>
  );
}
