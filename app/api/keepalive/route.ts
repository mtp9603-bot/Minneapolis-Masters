import { db } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * Called once a day by Vercel Cron (see vercel.json) so the free Supabase
 * project sees activity and isn't paused between tournaments.
 * If CRON_SECRET is set in Vercel, only Vercel's scheduler can call it.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { error } = await db().from("settings").select("id").eq("id", 1).single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, at: new Date().toISOString() });
}
