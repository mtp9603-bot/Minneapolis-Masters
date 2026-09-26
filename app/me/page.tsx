"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSavedToken } from "@/lib/local";

export default function Me() {
  const router = useRouter();
  useEffect(() => {
    const t = getSavedToken();
    router.replace(t ? `/p/${t}` : "/");
  }, [router]);
  return <main className="wrap muted">Loading…</main>;
}
