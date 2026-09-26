import { Leaderboard } from "@/components/Leaderboard";

export const metadata = { title: "Leaderboard · Minneapolis Masters" };

export default function LeaderboardPage() {
  return (
    <main className="wrap">
      <Leaderboard />
    </main>
  );
}
