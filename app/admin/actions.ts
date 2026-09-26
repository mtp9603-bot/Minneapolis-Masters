"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase-server";
import { ADMIN_COOKIE, adminCookieValue, passwordMatches, requireAdmin } from "@/lib/admin-auth";
import { validateHole } from "@/lib/validate";
import { buildSnapshot } from "@/lib/archive";
import type { PlayerRow, ScoreRow } from "@/lib/types";

type Result = { ok: true } | { ok: false; error: string };

export async function adminLogin(password: string): Promise<Result> {
  if (!passwordMatches(String(password ?? ""))) return { ok: false, error: "Wrong password." };
  (await cookies()).set(ADMIN_COOKIE, adminCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return { ok: true };
}

export async function adminLogout() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function updateSettings(input: { pre_round_max: number; locked: boolean; join_code: string }): Promise<Result> {
  await requireAdmin();
  if (![1, 2].includes(input.pre_round_max)) return { ok: false, error: "Pre-round limit must be 1 or 2." };
  const code = String(input.join_code ?? "").trim();
  if (code.length < 3) return { ok: false, error: "Tournament code must be at least 3 characters." };

  const s = await db()
    .from("settings")
    .update({ pre_round_max: input.pre_round_max, locked: !!input.locked, updated_at: new Date().toISOString() })
    .eq("id", 1);
  const c = await db().from("private_config").update({ join_code: code }).eq("id", 1);
  if (s.error || c.error) return { ok: false, error: "Save failed." };
  revalidatePath("/admin");
  return { ok: true };
}

export async function updatePlayer(input: {
  id: string;
  name: string;
  pre_round_drinks: number;
  holes: { hole: number; strokes: number | null; drinks: number }[];
}): Promise<Result> {
  await requireAdmin();
  const name = String(input.name ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 40) return { ok: false, error: "Name must be 1 to 40 characters." };
  if (!Number.isInteger(input.pre_round_drinks) || input.pre_round_drinks < 0 || input.pre_round_drinks > 2) {
    return { ok: false, error: "Pre-round drinks must be 0 to 2." };
  }
  for (const h of input.holes) {
    const err = validateHole(h.hole, h.strokes, h.drinks);
    if (err) return { ok: false, error: `Hole ${h.hole}: ${err}` };
  }

  const p = await db().from("players").update({ name, pre_round_drinks: input.pre_round_drinks }).eq("id", input.id);
  if (p.error) return { ok: false, error: p.error.code === "23505" ? "Another player already has that name." : "Save failed." };

  const now = new Date().toISOString();
  const rows = input.holes.map((h) => ({ player_id: input.id, hole: h.hole, strokes: h.strokes, drinks: h.drinks, updated_at: now }));
  const s = await db().from("scores").upsert(rows);
  if (s.error) return { ok: false, error: "Saving holes failed." };
  revalidatePath("/admin");
  return { ok: true };
}

export async function deletePlayer(id: string): Promise<Result> {
  await requireAdmin();
  const { error } = await db().from("players").delete().eq("id", id);
  if (error) return { ok: false, error: "Delete failed." };
  revalidatePath("/admin");
  return { ok: true };
}

export async function setSubmitted(id: string, submitted: boolean): Promise<Result> {
  await requireAdmin();
  const { error } = await db()
    .from("players")
    .update({ submitted_at: submitted ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: "Update failed." };
  revalidatePath("/admin");
  return { ok: true };
}

export async function setWithdrawn(id: string, withdrawn: boolean): Promise<Result> {
  await requireAdmin();
  const { error } = await db().from("players").update({ withdrawn }).eq("id", id);
  if (error) return { ok: false, error: "Update failed." };
  revalidatePath("/admin");
  return { ok: true };
}

async function saveArchive(year: number): Promise<Result> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { ok: false, error: "Enter a valid year." };
  const [players, scores] = await Promise.all([
    db().from("players").select("id, name, pre_round_drinks, withdrawn"),
    db().from("scores").select("player_id, hole, strokes, drinks"),
  ]);
  if (players.error || scores.error) return { ok: false, error: "Couldn't read scores." };
  if (!players.data?.length) return { ok: false, error: "There are no players to save." };
  const snap = buildSnapshot(players.data as PlayerRow[], scores.data as ScoreRow[]);
  const { error } = await db()
    .from("archives")
    .upsert({ year, archived_at: new Date().toISOString(), standings: snap.standings, awards: snap.awards });
  if (error) return { ok: false, error: "Saving to Past Champions failed." };
  revalidatePath("/history");
  return { ok: true };
}

/** Save (or re-save) this year's final standings to Past Champions. */
export async function archiveYear(year: number): Promise<Result> {
  await requireAdmin();
  const res = await saveArchive(year);
  if (res.ok) revalidatePath("/admin");
  return res;
}

/**
 * Wipes all players and scores, unlocks scoring, and resets pre-round limit to 1.
 * When archiveAs is a year, results are saved to Past Champions first; if that fails, nothing is deleted.
 */
export async function resetTournament(confirm: string, archiveAs: number | null): Promise<Result> {
  await requireAdmin();
  if (confirm !== "RESET") return { ok: false, error: "Type RESET to confirm." };
  if (archiveAs != null) {
    const saved = await saveArchive(archiveAs);
    if (!saved.ok && saved.error !== "There are no players to save.") return saved;
  }
  const { error } = await db().from("players").delete().not("id", "is", null);
  if (error) return { ok: false, error: "Reset failed." };
  await db().from("settings").update({ locked: false, pre_round_max: 1, updated_at: new Date().toISOString() }).eq("id", 1);
  revalidatePath("/admin");
  return { ok: true };
}
