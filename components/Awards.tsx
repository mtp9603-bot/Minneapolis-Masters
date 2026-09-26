import type { Award } from "@/lib/awards";

const SHOW = 4;

export function Awards({ awards, final }: { awards: Award[]; final: boolean }) {
  if (!awards.length) return null;
  return (
    <div className="card awards">
      <div className="spread">
        <h2>Awards</h2>
        <span className="small muted">{final ? "Final" : "So far"}</span>
      </div>
      {awards.map((a) => (
        <div className="award" key={a.key}>
          <div className="spread">
            <b>{a.title}</b>
            <span className="small muted">{a.detail}</span>
          </div>
          <ul className="award-winners">
            {a.winners.slice(0, SHOW).map((w, i) => (
              <li key={i}>
                <span className="winner">{w.name}</span>
                {w.note && <span className="muted small">{w.note}</span>}
              </li>
            ))}
            {a.winners.length > SHOW && <li className="muted small">+{a.winners.length - SHOW} more tied</li>}
          </ul>
        </div>
      ))}
    </div>
  );
}
