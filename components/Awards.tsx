import type { Award } from "@/lib/awards";

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
          <div className="award-winners">
            {a.winners.map((w, i) => (
              <span key={i}>
                {i > 0 && ", "}
                {w.name}
                {w.note && <span className="muted"> ({w.note})</span>}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
