import type { Gate, Out, Strength } from "./types.ts";

type Cell = "listed" | "unlisted" | "unnamed";

/**
 * The prototype's `002` table (GOAL17-stage-one, call 8), top first, first match wins: how strongly an event asks the agent to
 * act, and why. Then `off` turns every inferred strength into none: explicit requests work in every mode.
 */
export const gate: Gate = {
  of: (t, _thread, tickets, p) => {
    const a = t.author;
    const row = p.admission[t.row] ?? {};
    const cell = (c: Cell, fallback: Strength): Strength => row[c] ?? fallback;
    const addressed = t.addressed !== undefined;
    // A thread an open or ended ticket owns, not stopped by a person, carries follow-up strength; one held only for context does not.
    const followed = tickets.some((k) => k.mode !== "context" && k.state !== "stopped" && k.stoppedBy !== "person");
    const listed = a?.state === "listed";
    let out: Out;
    if (a?.bot) out = p.bots.has(a.external) && (addressed || t.observed) ? { strength: "inferred", basis: "bot" } : { strength: "none", basis: "bot" };
    else if (listed && addressed) out = { strength: "explicit", basis: "addressed" };
    else if (a !== null && followed) out = { strength: listed || row.unlisted === "explicit" ? "explicit" : "inferred", basis: "followup" };
    else if (a !== null && addressed) out = { strength: cell("unlisted", "none"), basis: "admission" };
    else if (listed && t.observed) out = { strength: cell("listed", "inferred"), basis: "admission" };
    else if (t.observed) out = { strength: cell("unnamed", "none"), basis: "admission" };
    else out = { strength: "none", basis: "admission" };
    return p.mode === "off" && out.strength === "inferred" ? { ...out, strength: "none" } : out;
  },
};
