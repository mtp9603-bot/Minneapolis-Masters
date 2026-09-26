import Link from "next/link";
import { db } from "@/lib/supabase-server";
import { Scorecard } from "@/components/Scorecard";
import type { ScoreRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isUuid = /^[0-9a-f-]{36}$/i.test(id);
  const player = isUuid ? (await db().from("players").select("id, name, pre_round_drinks").eq("id", id).maybeSingle()).data : null;
  if (!player) {
    return (
      <main className="wrap">
        <div className="card">
          Player not found. <Link href="/leaderboard">Back to leaderboard</Link>
        </div>
      </main>
    );
  }
  const { data: scores } = await db().from("scores").select("player_id, hole, strokes, drinks").eq("player_id", id);
  return (
    <main className="wrap">
      <Link href="/leaderboard" className="back">
        ‹ Leaderboard
      </Link>
      <h1>{player.name}</h1>
      <div className="card" style={{ padding: 10 }}>
        <Scorecard preRound={player.pre_round_drinks} scores={(scores ?? []) as ScoreRow[]} />
      </div>
    </main>
  );
}
