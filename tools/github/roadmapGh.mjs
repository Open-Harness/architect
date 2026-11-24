// Reads what the roadmap's dates come from (K42, section 5) and runs roadmap.mjs's pure forecast over it. Read-only.
import { execFileSync } from "node:child_process";
import { isDone, milestoneOf } from "./board.mjs";
import { factsOf, forecast, milestoneDue, pace, perItem, rowDates } from "./roadmap.mjs";

const out = (cmd, argv) => execFileSync(cmd, argv, { encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "pipe"] });

/** Every merged pull request's number and merge day, by `gh` (a pull request merged into any branch counts, as K42's 196 did). */
const readMerged = (repo) =>
  JSON.parse(out("gh", ["pr", "list", "--repo", repo, "--state", "merged", "--limit", "5000", "--json", "number,mergedAt"])).map((p) => ({ number: p.number, day: p.mergedAt.slice(0, 10) }));

/** The day each claimed row's lane first appeared on the page, from its history. Empty where the history is short. */
const readLaneSince = (rows) => {
  const since = {};
  for (const r of rows.filter((x) => x.lane)) {
    const days = out("git", ["log", "--format=%cs", "-G", `^\\| ${r.id} \\|.*\\| goal-[0-9]+ \\|`, "--", "docs/canon/status.md"]).trim().split("\n").filter(Boolean);
    if (days.length) since[r.id] = days.at(-1);
  }
  return since;
};

/** { dates, due, pace, perItem, today }: every row's Start and End, each milestone's due date, and the measures they rest on. */
export const readRoadmap = ({ repo, rows, today = new Date().toISOString().slice(0, 10) }) => {
  const merged = readMerged(repo);
  const facts = factsOf({ rows, merged, laneSince: readLaneSince(rows) });
  const perDay = pace(merged.map((m) => m.day), today);
  const work = perItem(merged.length, rows);
  const started = Object.fromEntries(Object.entries(facts).filter(([id, f]) => f.start && !isDone(rows.find((r) => r.id === id))).map(([id, f]) => [id, f.start]));
  const dates = rowDates({ rows, facts, forecasts: forecast({ rows, started, today, pace: perDay, perItem: work }) });
  return { dates, due: milestoneDue(rows, dates, milestoneOf), pace: perDay, perItem: work, today };
};
