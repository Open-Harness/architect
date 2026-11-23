import type { Facts, StageRow, Stage, Why } from "./types.ts";

const row = (stage: Stage, why: Why, label: string): StageRow => ({ stage, why, label });

/** No message from a person since the report: only then does a blocked or failed report wait for one. */
const blockedSince = (f: Facts): boolean =>
  (f.report?.state === "blocked" || f.report?.state === "failed") && !(f.person !== undefined && f.person.seq > f.report.seq);

/** The prototype's `003` table, top to bottom, first match wins. */
export const stageOf = (ticket: { readonly state: string }, f: Facts): StageRow =>
  ticket.state !== "open" ? row("ended", "none", "Ended")
  : f.undelivered !== undefined ? row("person", "delivery", "Input undelivered")
  : f.attention !== undefined ? row("person", "answer", "Awaiting answer")
  : f.report?.state === "ready" ? row("person", "review", "Awaiting review")
  : blockedSince(f) ? row("person", f.report?.state === "failed" ? "failed" : "blocked", f.report?.state === "failed" ? "Failed" : "Blocked")
  : f.assignment === undefined || f.assignment.state === "pending" ? row("working", "queued", "Queued")
  : f.report?.state === "waiting" || f.assignment.state === "ended" ? row("idle", "none", "Waiting for a Trigger")
  : row("working", "none", "Working");
