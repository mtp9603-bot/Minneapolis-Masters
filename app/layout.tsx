import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@fontsource-variable/inter";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "./globals.css";
import { TabBar } from "@/components/TabBar";

export const metadata: Metadata = {
  title: "Minneapolis Masters",
  description: "Live scoring for the Minneapolis Masters at Brookview Golf Course",
  appleWebApp: { capable: true, title: "MPLS Masters", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f3a2a",
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
            <span className="brand-text">
              Minneapolis <span className="accent">Masters</span>
            </span>
          </Link>
        </header>
        {children}
        <TabBar />
      </body>
    </html>
  );
}
