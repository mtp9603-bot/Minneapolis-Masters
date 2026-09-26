import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Minneapolis Masters",
  description: "Live scoring for the Minneapolis Masters at Brookview Golf Course",
  appleWebApp: { capable: true, title: "MPLS Masters", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2c6846",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <Link href="/" className="brand">
            <span className="brand-badge">
              <img src="/logo.png" alt="" />
            </span>
            <span>
              <span className="long">Minneapolis</span><span className="short">MPLS</span> <span className="accent">Masters</span>
            </span>
          </Link>
          <nav className="nav">
            <Link href="/me">My Card</Link>
            <Link href="/leaderboard">Leaderboard</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
