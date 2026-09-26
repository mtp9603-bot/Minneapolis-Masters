"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { joinTournament } from "@/app/actions";
import { getSavedToken, saveToken } from "@/lib/local";

export function JoinForm() {
  const router = useRouter();
  const [saved, setSaved] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setSaved(getSavedToken()), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await joinTournament(name, code);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    saveToken(res.token);
    router.push(`/p/${res.token}`);
  }

  return (
    <>
      {saved && (
        <div className="card">
          <a className="btn block" href={`/p/${saved}`}>
            Continue to my card
          </a>
        </div>
      )}
      <form className="card stack" onSubmit={submit}>
        <h2>{saved ? "Join as someone else" : "Join the tournament"}</h2>
        <div>
          <label htmlFor="name">Your name</label>
          <input id="name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
        </div>
        <div>
          <label htmlFor="code">Tournament code</label>
          <input id="code" type="text" autoCapitalize="characters" autoCorrect="off" value={code} onChange={(e) => setCode(e.target.value)} required />
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn block" disabled={busy || !name.trim() || !code.trim()}>
          {busy ? "Joining…" : "Join"}
        </button>
        <p className="small muted" style={{ marginBottom: 0 }}>
          You'll get a personal scorecard link. Bookmark it or add it to your home screen. It's the only way back to your card.
        </p>
      </form>
    </>
  );
}
