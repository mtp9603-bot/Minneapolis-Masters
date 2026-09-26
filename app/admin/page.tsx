import type { Metadata } from "next";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/supabase-server";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminPanel } from "@/components/admin/AdminPanel";
import type { ScoreRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · Minneapolis Masters", robots: { index: false } };

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <main className="wrap">
        <AdminLogin />
      </main>
    );
  }

  const [settings, cfg, players, tokens, scores, archives] = await Promise.all([
    db().from("settings").select("pre_round_max, locked").eq("id", 1).single(),
    db().from("private_config").select("join_code").eq("id", 1).single(),
    db().from("players").select("id, name, pre_round_drinks, withdrawn, submitted_at").order("name"),
    db().from("player_tokens").select("player_id, token"),
    db().from("scores").select("player_id, hole, strokes, drinks"),
    db().from("archives").select("year, archived_at, champion_name, standings").order("year", { ascending: false }),
  ]);

  const tokenBy = new Map((tokens.data ?? []).map((t) => [t.player_id as string, t.token as string]));

  return (
    <main className="wrap">
      <AdminPanel
        settings={settings.data ?? { pre_round_max: 1, locked: false }}
        joinCode={cfg.data?.join_code ?? ""}
        players={(players.data ?? []).map((p) => ({ ...p, token: tokenBy.get(p.id) ?? "" }))}
        scores={(scores.data ?? []) as ScoreRow[]}
        archives={(archives.data ?? []).map((a) => ({
          year: a.year as number,
          champion: (a.champion_name as string | null) ?? "",
          manual: !(a.standings as unknown[])?.length,
        }))}
      />
    </main>
  );
}
