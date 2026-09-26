import { JoinForm } from "@/components/JoinForm";
import { COURSE_NAME, COURSE_SUB, TOTAL_PAR, TOTAL_YARDS } from "@/lib/course";

export default function Home() {
  return (
    <main className="wrap">
      <div className="hero">
        <img src="/logo.png" alt="Minneapolis Masters logo" />
        <h1>Minneapolis Masters</h1>
        <div className="muted">{COURSE_NAME}</div>
        <div className="muted small">
          {COURSE_SUB} · Par {TOTAL_PAR} · {TOTAL_YARDS.toLocaleString()} yds
        </div>
        <div className="tee-stripe" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>
      <JoinForm />
      <div className="card small muted">
        <b>How scoring works.</b> Gross is total strokes. Every drink (pre-round plus each hole) takes one stroke
        off. Lowest net wins. Ties go to the player with more drinks, then countback from hole 18. Pre-round
        drinks are capped, and holes 17 and 18 allow one drink each.
      </div>
    </main>
  );
}
