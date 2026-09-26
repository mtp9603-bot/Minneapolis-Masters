"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { savePreRound, saveHole } from "@/app/actions";
import { MAX_STROKES, MIN_STROKES, PARS, YARDS, holeDrinkCap } from "@/lib/course";
import { computeTotals, formatToPar } from "@/lib/scoring";
import { browserDb } from "@/lib/supabase-browser";
import { saveToken } from "@/lib/local";
import type { PlayerRow, ScoreRow, Settings } from "@/lib/types";
import { Scorecard } from "./Scorecard";

type HoleState = { strokes: number | null; drinks: number };

const SCORE_NAMES: Record<number, string> = { [-3]: "Albatross", [-2]: "Eagle", [-1]: "Birdie", 0: "Par", 1: "Bogey", 2: "Double bogey", 3: "Triple bogey" };

function scoreName(strokes: number, par: number) {
  if (strokes === 1) return "Hole in one!";
  const d = strokes - par;
  return SCORE_NAMES[d] ?? (d > 0 ? `+${d}` : `${d}`);
}

export function CardClient(props: {
  token: string;
  player: PlayerRow;
  initialScores: ScoreRow[];
  initialSettings: Settings;
}) {
  const { token, player } = props;
  const [settings, setSettings] = useState<Settings>(props.initialSettings);
  const [pre, setPre] = useState(player.pre_round_drinks);
  const [holes, setHoles] = useState<Record<number, HoleState>>(() => {
    const m: Record<number, HoleState> = {};
    for (const s of props.initialScores) m[s.hole] = { strokes: s.strokes, drinks: s.drinks };
    return m;
  });
  const [step, setStep] = useState<number>(() => {
    if (props.initialScores.length === 0) return 0;
    for (let h = 1; h <= 18; h++) {
      if (!props.initialScores.find((s) => s.hole === h && s.strokes != null)) return h;
    }
    return 19;
  });

  // ---- Autosave: debounce per field, flush when changing holes ----
  const pending = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; run: () => void }>());
  const [inflight, setInflight] = useState(0);
  const [saveError, setSaveError] = useState("");

  const run = useCallback(async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setInflight((n) => n + 1);
    try {
      const res = await fn();
      setSaveError(res.ok ? "" : res.error ?? "Save failed.");
    } catch {
      setSaveError("Couldn't reach the server. Check your signal and tap again.");
    } finally {
      setInflight((n) => n - 1);
    }
  }, []);

  const schedule = useCallback(
    (key: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
      const existing = pending.current.get(key);
      if (existing) clearTimeout(existing.timer);
      const exec = () => {
        pending.current.delete(key);
        run(fn);
      };
      pending.current.set(key, { timer: setTimeout(exec, 400), run: exec });
    },
    [run],
  );

  const flush = useCallback(() => {
    for (const p of [...pending.current.values()]) {
      clearTimeout(p.timer);
      p.run();
    }
  }, []);

  useEffect(() => {
    saveToken(token);
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [token, flush]);

  // Live settings (lock / pre-round limit) from the admin.
  useEffect(() => {
    const ch = browserDb()
      .channel("card-settings")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "settings" }, (payload) => {
        const s = payload.new as Settings;
        setSettings({ pre_round_max: s.pre_round_max, locked: s.locked });
      })
      .subscribe();
    return () => {
      browserDb().removeChannel(ch);
    };
  }, []);

  const locked = settings.locked;

  function setPreRound(v: number) {
    if (locked) return;
    const next = Math.max(0, Math.min(settings.pre_round_max, v));
    setPre(next);
    schedule("pre", () => savePreRound(token, next));
  }

  function setHole(hole: number, patch: Partial<HoleState>) {
    if (locked) return;
    const cur = holes[hole] ?? { strokes: null, drinks: 0 };
    const next = { ...cur, ...patch };
    setHoles((h) => ({ ...h, [hole]: next }));
    schedule(`h${hole}`, () => saveHole(token, hole, next.strokes, next.drinks));
  }

  function go(to: number) {
    flush();
    setStep(Math.max(0, Math.min(19, to)));
    window.scrollTo({ top: 0 });
  }

  const scoreList = Object.entries(holes).map(([h, s]) => ({ hole: Number(h), ...s }));
  const totals = computeTotals(pre, scoreList);
  const saveLabel = saveError ? "" : inflight > 0 || pending.current.size > 0 ? "Saving…" : "All changes saved";

  return (
    <>
      <div className="totals">
        <div>
          <b>{totals.gross}</b>
          <small>Gross</small>
        </div>
        <div>
          <b>{totals.drinks}</b>
          <small>Drinks</small>
        </div>
        <div className="net">
          <b>{totals.net}</b>
          <small>Net</small>
        </div>
        <div>
          <b>{totals.thru === 18 ? "F" : totals.thru}</b>
          <small>{totals.thru ? formatToPar(totals.netToPar) + " net" : "Thru"}</small>
        </div>
      </div>

      <main className="wrap">
        <div className="spread" style={{ marginBottom: 10 }}>
          <b>{player.name}</b>
          <span className="save-state">{saveLabel}</span>
        </div>
        {locked && <div className="banner">Scoring is locked. The round is over.</div>}
        {saveError && <div className="banner error">{saveError}</div>}

        {step === 0 && (
          <PreRound
            value={pre}
            max={settings.pre_round_max}
            locked={locked}
            onChange={setPreRound}
            onNext={() => go(1)}
          />
        )}

        {step >= 1 && step <= 18 && (
          <HoleScreen
            key={step}
            hole={step}
            state={holes[step] ?? { strokes: null, drinks: 0 }}
            locked={locked}
            onChange={(p) => setHole(step, p)}
            onBack={() => go(step - 1)}
            onNext={() => go(step + 1)}
          />
        )}

        {step === 19 && (
          <div className="card stack">
            <h2>Your card</h2>
            <Scorecard preRound={pre} scores={scoreList} />
            <div className="navbtns">
              <button className="btn secondary" onClick={() => go(18)}>
                ‹ Hole 18
              </button>
              <Link className="btn" href="/leaderboard">
                Leaderboard
              </Link>
            </div>
          </div>
        )}

        <div className="card">
          <div className="dots">
            <button className={`dot ${step === 0 ? "here" : ""} ${pre > 0 ? "done" : ""}`} onClick={() => go(0)} aria-label="Pre-round">
              🍺
            </button>
            {Array.from({ length: 18 }, (_, i) => i + 1).map((h) => (
              <button
                key={h}
                className={`dot ${holes[h]?.strokes != null ? "done" : ""} ${step === h ? "here" : ""}`}
                onClick={() => go(h)}
              >
                {h}
              </button>
            ))}
            <button className={`dot ${step === 19 ? "here" : ""}`} onClick={() => go(19)} aria-label="Summary">
              ☰
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

function Counter(props: {
  label: string;
  display: React.ReactNode;
  unset?: boolean;
  onMinus: () => void;
  onPlus: () => void;
  onTapValue?: () => void;
  minusDisabled: boolean;
  plusDisabled: boolean;
  hint?: string;
}) {
  return (
    <div className="counter">
      <div className="label">{props.label}</div>
      <div className="controls">
        <button className="pm" onClick={props.onMinus} disabled={props.minusDisabled} aria-label={`${props.label} minus`}>
          −
        </button>
        <button className={`value ${props.unset ? "unset" : ""}`} onClick={props.onTapValue} type="button">
          {props.display}
        </button>
        <button className="pm" onClick={props.onPlus} disabled={props.plusDisabled} aria-label={`${props.label} plus`}>
          +
        </button>
      </div>
      <div className="hint">{props.hint}</div>
    </div>
  );
}

function PreRound(props: { value: number; max: number; locked: boolean; onChange: (v: number) => void; onNext: () => void }) {
  return (
    <div className="card stack">
      <div className="hole-title">
        <div className="num">Pre-round</div>
        <div className="meta">Drinks before you tee off on hole 1</div>
      </div>
      <Counter
        label="Pre-round drinks"
        display={props.value}
        onMinus={() => props.onChange(props.value - 1)}
        onPlus={() => props.onChange(props.value + 1)}
        minusDisabled={props.locked || props.value <= 0}
        plusDisabled={props.locked || props.value >= props.max}
        hint={`Limit: ${props.max} this year`}
      />
      <button className="btn block" onClick={props.onNext}>
        Start Hole 1 ›
      </button>
      <p className="small muted" style={{ margin: 0 }}>
        This page is your personal scorecard. Bookmark it or use Share → Add to Home Screen to get back here.
      </p>
    </div>
  );
}

function HoleScreen(props: {
  hole: number;
  state: HoleState;
  locked: boolean;
  onChange: (p: Partial<HoleState>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const { hole, state, locked } = props;
  const par = PARS[hole - 1];
  const cap = holeDrinkCap(hole);
  const strokes = state.strokes;
  const base = strokes ?? par;

  return (
    <div className="card stack">
      <div className="hole-title">
        <div className="num">Hole {hole}</div>
        <div className="meta">
          Par {par} · {YARDS[hole - 1]} yds
        </div>
      </div>

      <Counter
        label="Strokes"
        display={base}
        unset={strokes == null}
        onMinus={() => props.onChange({ strokes: Math.max(MIN_STROKES, base - 1) })}
        onPlus={() => props.onChange({ strokes: Math.min(MAX_STROKES, base + 1) })}
        onTapValue={() => strokes == null && props.onChange({ strokes: par })}
        minusDisabled={locked || (strokes != null && strokes <= MIN_STROKES)}
        plusDisabled={locked || (strokes != null && strokes >= MAX_STROKES)}
        hint={strokes == null ? "Tap the number to record par" : scoreName(strokes, par)}
      />

      <Counter
        label="Drinks"
        display={state.drinks}
        onMinus={() => props.onChange({ drinks: Math.max(0, state.drinks - 1) })}
        onPlus={() => props.onChange({ drinks: cap == null ? state.drinks + 1 : Math.min(cap, state.drinks + 1) })}
        minusDisabled={locked || state.drinks <= 0}
        plusDisabled={locked || (cap != null && state.drinks >= cap)}
        hint={cap != null ? `Max ${cap} drink on hole ${hole}` : ""}
      />

      <div className="navbtns">
        <button className="btn secondary" onClick={props.onBack}>
          ‹ {hole === 1 ? "Pre-round" : `Hole ${hole - 1}`}
        </button>
        <button className="btn" onClick={props.onNext}>
          {hole === 18 ? "Finish" : `Hole ${hole + 1}`} ›
        </button>
      </div>
    </div>
  );
}
