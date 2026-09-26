"use client";

import { Fragment, useState } from "react";
import type { ArchivedPlayer } from "@/lib/archive";
import { toParClass } from "@/lib/marks";
import { formatToPar } from "@/lib/scoring";
import { HoleDetail } from "./HoleDetail";

export function ArchiveStandings({ standings }: { standings: ArchivedPlayer[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="card" style={{ padding: "8px 10px" }}>
      <table className="lb">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Player</th>
            <th>Thru</th>
            <th>Gross</th>
            <th>🍺</th>
            <th>Net</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((r) => (
            <Fragment key={r.id}>
              <tr className={`click ${open === r.id ? "open" : ""} ${r.withdrawn ? "wd" : ""}`} onClick={() => setOpen(open === r.id ? null : r.id)}>
                <td className="pos">{r.position}</td>
                <td>
                  <span className="name">{r.name}</span> <span className="chev">{open === r.id ? "▾" : "▸"}</span>
                  {r.tiebreak && <span className="tb">{r.tiebreak}</span>}
                </td>
                <td>{r.thru === 18 ? "F" : r.thru || "–"}</td>
                <td>{r.thru ? r.gross : "–"}</td>
                <td>{r.drinks}</td>
                <td>
                  <span className={`net ${r.thru ? toParClass(r.netToPar) : ""}`}>{r.thru ? r.net : "–"}</span>
                  {r.thru > 0 && <span className={`topar ${toParClass(r.netToPar)}`}>{formatToPar(r.netToPar)}</span>}
                </td>
              </tr>
              {open === r.id && (
                <tr className="detail">
                  <td colSpan={6}>
                    <HoleDetail preRound={r.pre} scores={r.holes} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
