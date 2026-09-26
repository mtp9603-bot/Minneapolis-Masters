"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/app/admin/actions";

export function AdminLogin() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await adminLogin(pw);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <h2>Admin</h2>
      <div>
        <label htmlFor="pw">Password</label>
        <input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
      </div>
      {error && <div className="error">{error}</div>}
      <button className="btn block">Sign in</button>
    </form>
  );
}
