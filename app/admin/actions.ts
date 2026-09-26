"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase-server";
import { ADMIN_COOKIE, adminCookieValue, passwordMatches, requireAdmin } from "@/lib/admin-auth";
import { validateHole } from "@/lib/validate";

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

/** Wipes all players and scores, unlocks scoring, and resets pre-round limit to 1. */
export async function resetTournament(confirm: string): Promise<Result> {
  await requireAdmin();
  if (confirm !== "RESET") return { ok: false, error: 'Type RESET to confirm.' };
  const { error } = await db().from("players").delete().not("id", "is", null);
  if (error) return { ok: false, error: "Reset failed." };
  await db().from("settings").update({ locked: false, pre_round_max: 1, updated_at: new Date().toISOString() }).eq("id", 1);
  revalidatePath("/admin");
  return { ok: true };
}
