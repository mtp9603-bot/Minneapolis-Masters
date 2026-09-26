"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { savePreRound, saveHole, submitCard } from "@/app/actions";
import { loadOutbox, storeOutbox, type Outbox, type OutboxValue } from "@/lib/outbox";
import { MAX_STROKES, MIN_STROKES, PARS, YARDS, holeDrinkCap } from "@/lib/course";
import { computeTotals, formatToPar } from "@/lib/scoring";
import { browserDb } from "@/lib/supabase-browser";
import { saveToken } from "@/lib/local";
import type { PlayerRow, ScoreRow, Settings } from "@/lib/types";
import { Scorecard } from "./Scorecard";
import { ScoreMark } from "./ScoreMark";
import { scoreKind, scoreName } from "@/lib/marks";

type HoleState = { strokes: number | null; drinks: number };


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

  // ---- Autosave with an on-phone outbox ----
  // Every change goes into the outbox (also saved to localStorage) and is sent shortly after.
  // If the network fails, it stays there and is retried until it lands.
  const outbox = useRef<Outbox>({});
  const sending = useRef(false);
  const again = useRef(false);
  const sendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [waiting, setWaiting] = useState(0);
  const [offline, setOffline] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [status, setStatus] = useState({ submitted: !!player.submitted_at, withdrawn: !!player.withdrawn });

  const persist = useCallback(() => {
    storeOutbox(token, outbox.current);
    setWaiting(Object.keys(outbox.current).length);
  }, [token]);

  const sendAll = useCallback(async () => {
    if (sending.current) {
      again.current = true;
      return;
    }
    sending.current = true;
    try {
      for (const [k, v] of Object.entries(outbox.current)) {
        let res: { ok: boolean; error?: string };
        try {
          res = "pre" in v ? await savePreRound(token, v.pre) : await saveHole(token, Number(k.slice(1)), v.strokes, v.drinks);
        } catch {
          // Network problem: keep everything and try again soon.
          setOffline(true);
          if (sendTimer.current) clearTimeout(sendTimer.current);
          sendTimer.current = setTimeout(sendAll, 5000);
          return;
        }
        setOffline(false);
        // Saved, or rejected by the server (e.g. scoring locked). Either way it's done, unless it changed meanwhile.
        if (JSON.stringify(outbox.current[k]) === JSON.stringify(v)) delete outbox.current[k];
        setSaveError(res.ok ? "" : res.error ?? "Save failed.");
        persist();
      }
    } finally {
      sending.current = false;
      if (again.current) {
        again.current = false;
        sendAll();
      }
    }
  }, [token, persist]);

  const enqueue = useCallback(
    (k: string, v: OutboxValue) => {
      outbox.current[k] = v;
      persist();
      if (sendTimer.current) clearTimeout(sendTimer.current);
      sendTimer.current = setTimeout(sendAll, 400);
    },
    [persist, sendAll],
  );

  const flush = useCallback(() => {
    if (sendTimer.current) clearTimeout(sendTimer.current);
    if (Object.keys(outbox.current).length) sendAll();
  }, [sendAll]);

  // On load: restore anything that didn't make it last time, then send it.
  useEffect(() => {
    saveToken(token);
    const box = loadOutbox(token);
    outbox.current = box;
    if (Object.keys(box).length) {
      setHoles((h) => {
        const next = { ...h };
        for (const [k, v] of Object.entries(box)) if (!("pre" in v)) next[Number(k.slice(1))] = v;
        return next;
      });
      const pre = box.pre;
      if (pre && "pre" in pre) setPre(pre.pre);
      persist();
      sendAll();
    }
    const onVis = () => flush();
    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [token, flush, persist, sendAll]);

  // Live settings (lock / pre-round limit) and this player's status from the admin.
  useEffect(() => {
    const ch = browserDb()
      .channel(`card-${player.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "settings" }, (payload) => {
        const s = payload.new as Settings;
        setSettings({ pre_round_max: s.pre_round_max, locked: s.locked });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "players", filter: `id=eq.${player.id}` }, (payload) => {
        const p = payload.new as PlayerRow;
        setStatus({ submitted: !!p.submitted_at, withdrawn: !!p.withdrawn });
      })
      .subscribe();
    return () => {
      browserDb().removeChannel(ch);
    };
  }, [player.id]);

  const locked = settings.locked || status.submitted || status.withdrawn;

  function setPreRound(v: number) {
    if (locked) return;
    const next = Math.max(0, Math.min(settings.pre_round_max, v));
    setPre(next);
    enqueue("pre", { pre: next });
  }

  function setHole(hole: number, patch: Partial<HoleState>) {
    if (locked) return;
    const cur = holes[hole] ?? { strokes: null, drinks: 0 };
    const next = { ...cur, ...patch };
    setHoles((h) => ({ ...h, [hole]: next }));
    enqueue(`h${hole}`, next);
  }

  function go(to: number) {
    flush();
    setStep(Math.max(0, Math.min(19, to)));
    window.scrollTo({ top: 0 });
  }

  const scoreList = Object.entries(holes).map(([h, s]) => ({ hole: Number(h), ...s }));
  const totals = computeTotals(pre, scoreList);
  const saveLabel = offline
    ? `No signal · ${waiting} change${waiting === 1 ? "" : "s"} saved on this phone`
    : waiting > 0
      ? "Saving…"
      : saveError
        ? ""
        : "All changes saved";
  const holesDone = scoreList.filter((s) => s.strokes != null).length;

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  async function submit() {
    if (!window.confirm("Submit your card? You won't be able to change it after this.")) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await submitCard(token);
      if (res.ok) setStatus((s) => ({ ...s, submitted: true }));
      else setSubmitError(res.error);
    } catch {
      setSubmitError("No signal. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

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
        {status.withdrawn ? (
          <div className="banner">You&apos;re marked as withdrawn. See the organizer if that&apos;s wrong.</div>
        ) : status.submitted ? (
          <div className="banner">Card submitted. Ask the organizer if something needs fixing.</div>
        ) : settings.locked ? (
          <div className="banner">Scoring is locked. The round is over.</div>
        ) : null}
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
            {!locked &&
              (holesDone === 18 ? (
                <>
                  <button className="btn block" onClick={submit} disabled={submitting || waiting > 0}>
                    {submitting ? "Submitting…" : waiting > 0 ? "Waiting for signal to save…" : "Submit card"}
                  </button>
                  <p className="small muted center" style={{ margin: 0 }}>
                    Check every hole first. Once submitted, only the organizer can change it.
                  </p>
                </>
              ) : (
                <p className="small muted center" style={{ margin: 0 }}>
                  {18 - holesDone} hole{18 - holesDone === 1 ? "" : "s"} left before you can submit your card.
                </p>
              ))}
            {submitError && <div className="error center">{submitError}</div>}
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
  hint?: React.ReactNode;
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
        display={strokes == null ? base : <ScoreMark strokes={strokes} par={par} size="lg" />}
        unset={strokes == null}
        onMinus={() => props.onChange({ strokes: Math.max(MIN_STROKES, base - 1) })}
        onPlus={() => props.onChange({ strokes: Math.min(MAX_STROKES, base + 1) })}
        onTapValue={() => strokes == null && props.onChange({ strokes: par })}
        minusDisabled={locked || (strokes != null && strokes <= MIN_STROKES)}
        plusDisabled={locked || (strokes != null && strokes >= MAX_STROKES)}
        hint={strokes == null ? "Tap the number to record par" : <span className={`kind-${scoreKind(strokes, par)}`}>{scoreName(strokes, par)}</span>}
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
