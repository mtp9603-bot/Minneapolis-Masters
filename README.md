# Minneapolis Masters

Live scoring for a one-day golf tournament at Brookview Golf Course (Regulation 18, Blue tees), Golden Valley, MN.
Next.js (App Router) + Supabase (Postgres + Realtime), deployed on Vercel.

## How it works

- **Join (`/`)**: player enters their name and the tournament code and gets a personal link (`/p/<secret>`). The link is saved on the phone, and **My Card** in the header always returns to it.
- **My Card**: a pre-round drinks screen, then one hole per screen with big +/- buttons. Changes save automatically. Drink caps are enforced in the UI and again on the server and in the database.
  - **Bad signal is OK.** Changes are kept on the phone and resent automatically until they land. The status line says "No signal · N changes saved on this phone" while it waits.
  - **Submit card.** After all 18 holes, the player taps Submit and their card locks. Admin can reopen it.
- **Leaderboard (`/leaderboard`)**: live through Supabase Realtime. Tap a name to expand a hole-by-hole breakdown (score, drinks, and net per hole, with Out, In, and Total), with a link to their full scorecard.
- **Awards**: shown under the leaderboard and updated live: most drinks, best gross, most birdies, worst hole, and any hole in one. Withdrawn players are left out.
- **Past Champions (`/history`)**: each year's final standings, every card, and the awards.
- **Admin (`/admin`)**: password-protected. Edit or delete any player, copy a player's personal link, see who hasn't submitted, reopen a card, mark a player withdrawn (WD), set the pre-round limit (1 or 2), change the tournament code, lock scoring, save results to Past Champions, and reset for next year.

Scoring: Net = total strokes − (pre-round drinks + all hole drinks). Lowest net wins. Ties go to more total drinks, then countback on strokes from hole 18 backward. Mid-round, the leaderboard ranks by net relative to par for holes played, so someone thru 4 doesn't lead a player who has finished. Once everyone finishes, that is the same order as raw net.

Security model: the browser can only **read** players, scores, and settings. Every write goes through Next.js server actions that use the Supabase secret key. Player links and the tournament code sit in tables the browser can't read.

---

## Setup (about 15 minutes)

### 1. Supabase

1. Go to [supabase.com](https://supabase.com), sign in, and click **New project**. Pick any name (e.g. `minneapolis-masters`), set a database password (you won't need it again), and choose a region near Minnesota (e.g. *East US* or *Central US*). Wait for it to finish provisioning.
2. In the left sidebar, open **SQL Editor** → **New query**.
3. Open [`supabase/schema.sql`](supabase/schema.sql) from this repo, copy all of it, paste it in, and click **Run**. You should see "Success. No rows returned."
   - **Already ran `schema.sql` before September 26, 2026?** Don't run it again, because it erases everything. Run [`supabase/migrations/002_submit_withdraw_archive.sql`](supabase/migrations/002_submit_withdraw_archive.sql) instead. It only adds what's new.
   - The starting tournament code is `BROOKVIEW`. You can change it later on the Admin page.
4. Open **Project Settings** (gear icon) → **API Keys** and copy three values:
   - **Project URL** (also under **Data API**), e.g. `https://abcd1234.supabase.co`
   - **Publishable key** (`sb_publishable_...`). Older projects label this **anon public**.
   - **Secret key** (`sb_secret_...`). Older projects label this **service_role**. Keep it private.

Realtime is turned on by the SQL script, so there's nothing else to do in Supabase.

### 2. Put the code on GitHub

This repo is already on GitHub. Vercel deploys from it.

### 3. Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New…** → **Project**, find this repository, and click **Import**.
3. Framework preset should say **Next.js**. Leave the build settings alone.
4. Open **Environment Variables** and add these four:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your publishable (anon) key |
   | `SUPABASE_SECRET_KEY` | your secret (service_role) key |
   | `ADMIN_PASSWORD` | a password you choose for `/admin` |
   | `CRON_SECRET` | optional: any long random string (protects the daily keep-alive) |

5. Click **Deploy**. In a minute or two you'll get a URL like `minneapolis-masters.vercel.app`.
6. Optional: under **Settings → Domains**, add a custom domain.

**Keeping Supabase awake.** Supabase pauses free projects after about a week with no activity. `vercel.json` schedules a tiny daily check (`/api/keepalive`) that reads one row so the project stays active all year. In Vercel, you can see it under **Settings → Cron Jobs**. Still, a week before the tournament, open the Supabase dashboard and confirm the project says it's active.

If you change an environment variable later, redeploy it: **Deployments** → ⋯ on the latest one → **Redeploy**. Vercel only picks up env changes on a new build.

### 4. Smoke test

1. Open `https://<your-app>/admin`, sign in, and set the tournament code you want.
2. On your phone, open the site, join with the code, and enter a couple of holes.
3. Open `/leaderboard` on another device and confirm it updates within a second or two.
4. In Admin, delete your test player.

---

## Tournament day

- Share the site URL and the code. Each player joins once and should bookmark the page or use **Share → Add to Home Screen**.
- If someone loses their link (new phone, cleared browser), go to Admin → **Copy link** next to their name and text it to them. Joining again under the same name is blocked on purpose.
- To allow 2 pre-round drinks this year, go to Admin → Pre-round drink limit → **2** → Save.
- Players tap **Submit card** when they finish. Admin shows "Cards submitted: X of Y" and who you're waiting on. A ✓ appears next to their name on the leaderboard.
- Someone needs a fix after submitting? Admin → **Reopen card**, or edit it yourself with **Edit**.
- Someone leaves early? Admin → **Withdraw**. They drop to the bottom as WD, can't edit, and don't count for awards. **Reinstate** undoes it.
- When the last group finishes, go to Admin → **Lock scoring**. Cards become read-only and the leaderboard shows "Final". You can still fix any card from Admin.
- Then Admin → **Save results to Past Champions**. You can save again after fixes; it replaces that year.

## Next year

Admin → **Reset for next year**: leave "Save results to Past Champions first" checked, type `RESET`, and confirm. Results are saved, then all players and scores are deleted, scoring unlocks, and the pre-round limit goes back to 1. If the save fails, nothing is deleted. Then set a new tournament code.

---

## Local development

```bash
cp .env.example .env.local   # fill in your Supabase values
npm install
npm run dev                  # http://localhost:3000
npm test                     # scoring + tie-breaker unit tests
```

Course data lives in `lib/course.ts`. Scoring and tie-breakers live in `lib/scoring.ts`.
