"use server";

import { randomBytes } from "node:crypto";
import { db } from "@/lib/supabase-server";
import { validateHole } from "@/lib/validate";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function getSettings() {
  const { data, error } = await db().from("settings").select("pre_round_max, locked").eq("id", 1).single();
  if (error || !data) throw new Error("Settings not found. Did you run supabase/schema.sql?");
  return data as { pre_round_max: number; locked: boolean };
}

type TokenPlayer = { id: string; submitted_at: string | null; withdrawn: boolean };

async function playerForToken(token: string): Promise<TokenPlayer | null> {
  if (typeof token !== "string" || token.length < 10) return null;
  const { data } = await db().from("player_tokens").select("player_id").eq("token", token).maybeSingle();
  if (!data) return null;
  const { data: p } = await db().from("players").select("id, submitted_at, withdrawn").eq("id", data.player_id).single();
  return (p as TokenPlayer) ?? null;
}

/** Why this player can't edit right now, or null if they can. */
async function editBlocker(p: TokenPlayer | null): Promise<string | null> {
  if (!p) return "Scorecard link not recognized.";
  if (p.withdrawn) return "You've been marked as withdrawn. See the organizer.";
  if (p.submitted_at) return "Your card is submitted. Ask the organizer to reopen it.";
  if ((await getSettings()).locked) return "Scoring is locked.";
  return null;
}

export async function joinTournament(name: string, code: string): Promise<Result<{ token: string }>> {
  const cleanName = String(name ?? "").trim().replace(/\s+/g, " ");
  if (cleanName.length < 1 || cleanName.length > 40) return { ok: false, error: "Enter your name (up to 40 characters)." };

  const { data: cfg } = await db().from("private_config").select("join_code").eq("id", 1).single();
  if (!cfg || String(code ?? "").trim().toLowerCase() !== cfg.join_code.trim().toLowerCase()) {
    return { ok: false, error: "That tournament code isn't right." };
  }
  if ((await getSettings()).locked) return { ok: false, error: "Scoring is locked. The round is over." };

  const { data: player, error } = await db().from("players").insert({ name: cleanName }).select("id").single();
  if (error || !player) {
    if (error?.code === "23505") {
      return { ok: false, error: "That name is already taken. If it's you, ask the organizer for your link, or add a last initial." };
    }
    return { ok: false, error: "Couldn't join. Try again." };
  }

  const token = randomBytes(18).toString("base64url");
  const { error: tokErr } = await db().from("player_tokens").insert({ player_id: player.id, token });
  if (tokErr) {
    await db().from("players").delete().eq("id", player.id);
    return { ok: false, error: "Couldn't join. Try again." };
  }
  return { ok: true, token };
}

export async function savePreRound(token: string, drinks: number): Promise<Result> {
  const p = await playerForToken(token);
  const blocked = await editBlocker(p);
  if (blocked) return { ok: false, error: blocked };
  const s = await getSettings();
  if (!Number.isInteger(drinks) || drinks < 0 || drinks > s.pre_round_max) {
    return { ok: false, error: `Pre-round drinks must be 0 to ${s.pre_round_max}.` };
  }
  const { error } = await db().from("players").update({ pre_round_drinks: drinks }).eq("id", p!.id);
  return error ? { ok: false, error: "Save failed." } : { ok: true };
}

export async function saveHole(token: string, hole: number, strokes: number | null, drinks: number): Promise<Result> {
  const p = await playerForToken(token);
  const blocked = await editBlocker(p);
  if (blocked) return { ok: false, error: blocked };

  const err = validateHole(hole, strokes, drinks);
  if (err) return { ok: false, error: err };

  const { error } = await db()
    .from("scores")
    .upsert({ player_id: p!.id, hole, strokes, drinks, updated_at: new Date().toISOString() });
  return error ? { ok: false, error: "Save failed." } : { ok: true };
}

/** Player finishes their round. Requires all 18 holes; locks the card until the organizer reopens it. */
export async function submitCard(token: string): Promise<Result> {
  const p = await playerForToken(token);
  const blocked = await editBlocker(p);
  if (blocked) return { ok: false, error: blocked };
  const { data } = await db().from("scores").select("hole").eq("player_id", p!.id).not("strokes", "is", null);
  const missing = 18 - (data?.length ?? 0);
  if (missing > 0) return { ok: false, error: `Enter strokes for all 18 holes first (${missing} missing).` };
  const { error } = await db().from("players").update({ submitted_at: new Date().toISOString() }).eq("id", p!.id);
  return error ? { ok: false, error: "Submit failed. Try again." } : { ok: true };
}
