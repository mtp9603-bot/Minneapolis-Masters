import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/supabase-server";
import { CardClient } from "@/components/CardClient";
import type { ScoreRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Card · Minneapolis Masters", robots: { index: false } };

export default async function CardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: tok } = await db().from("player_tokens").select("player_id").eq("token", token).maybeSingle();
  if (!tok) {
    return (
      <main className="wrap">
        <div className="card stack">
          <h2>Scorecard not found</h2>
          <p className="muted">This link doesn't match a player. The organizer may have reset the tournament.</p>
          <Link className="btn block" href="/">
            Join the tournament
          </Link>
        </div>
      </main>
    );
  }

  const [player, scores, settings] = await Promise.all([
    db().from("players").select("id, name, pre_round_drinks").eq("id", tok.player_id).single(),
    db().from("scores").select("player_id, hole, strokes, drinks").eq("player_id", tok.player_id),
    db().from("settings").select("pre_round_max, locked").eq("id", 1).single(),
  ]);

  return (
    <CardClient
      token={token}
      player={player.data!}
      initialScores={(scores.data ?? []) as ScoreRow[]}
      initialSettings={settings.data ?? { pre_round_max: 1, locked: false }}
    />
  );
}
