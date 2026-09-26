"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const Icon = {
  card: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="4.5" y="3" width="15" height="18" rx="2.5" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  ),
  board: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M4 20V11M10 20V5M16 20v-6M22 20H2" />
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4.5a2.5 2.5 0 0 0 2.5 4M17 6h2.5a2.5 2.5 0 0 1-2.5 4M12 14v3M8.5 20h7l-.8-3H9.3l-.8 3Z" />
    </svg>
  ),
};

const TABS = [
  { href: "/me", label: "My Card", icon: Icon.card, match: (p: string) => p === "/me" || p.startsWith("/p/") },
  { href: "/leaderboard", label: "Leaderboard", icon: Icon.board, match: (p: string) => p.startsWith("/leaderboard") || p.startsWith("/player") },
  { href: "/history", label: "Champions", icon: Icon.trophy, match: (p: string) => p.startsWith("/history") },
];

export function TabBar() {
  const path = usePathname() ?? "/";
  if (path.startsWith("/admin")) return null;
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={`tab ${t.match(path) ? "active" : ""}`}>
          {t.icon}
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
