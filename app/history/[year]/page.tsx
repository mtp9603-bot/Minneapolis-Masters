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
      <Link href="/history" className="small">
        ‹ Past Champions
      </Link>
      <h1>{a.year} Final Results</h1>
      <ArchiveStandings standings={a.standings} />
      <Awards awards={a.awards} final />
    </main>
  );
}
