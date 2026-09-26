import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/supabase-server";
import { PlayerEditor } from "@/components/admin/PlayerEditor";
import type { ScoreRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/admin");
  const { id } = await params;
  const { data: player } = await db().from("players").select("id, name, pre_round_drinks").eq("id", id).maybeSingle();
  if (!player) {
    return (
      <main className="wrap">
        Player not found. <Link href="/admin">Back</Link>
      </main>
    );
  }
  const { data: scores } = await db().from("scores").select("player_id, hole, strokes, drinks").eq("player_id", id);
  return (
    <main className="wrap">
      <Link href="/admin" className="small">
        ‹ Admin
      </Link>
      <PlayerEditor player={player} scores={(scores ?? []) as ScoreRow[]} />
    </main>
  );
}
