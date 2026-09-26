import { JoinForm } from "@/components/JoinForm";
import { COURSE_NAME, TOTAL_PAR, TOTAL_YARDS } from "@/lib/course";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="medallion">
          <img src="/logo.png" alt="Minneapolis Masters logo" />
        </div>
        <div className="eyebrow light">{COURSE_NAME} · Golden Valley, MN</div>
        <h1 className="hero-title">Minneapolis Masters</h1>
        <div className="hero-stats">
          <div>
            <b>{TOTAL_PAR}</b>
            <span>Par</span>
          </div>
          <div>
            <b>{TOTAL_YARDS.toLocaleString()}</b>
            <span>Yards</span>
          </div>
          <div>
            <b>Blue</b>
            <span>Tees</span>
          </div>
        </div>
      </section>
      <main className="wrap overlap">
        <JoinForm />
        <div className="card rules">
          <div className="eyebrow">How scoring works</div>
          <p>
            Gross is total strokes. Every drink, pre-round and on each hole, takes one stroke off. Lowest net wins.
          </p>
          <p>
            Ties go to the player with more drinks, then countback from hole 18. Pre-round drinks are capped, and
            holes 17 and 18 allow one drink each.
          </p>
        </div>
      </main>
    </>
  );
}
