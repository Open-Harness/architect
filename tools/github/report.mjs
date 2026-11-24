// What a sync run prints about the board (K42, section 5): the counts a person reads first. Pure but for `say`.
import { boardCounts, claimOverlaps } from "./board.mjs";
import { WINDOW_DAYS } from "./roadmap.mjs";
import { boardValues } from "./project.mjs";

/** rows: the board's. roadmap: roadmapGh's { dates, due, pace, perItem }. say: prints a line. */
export const boardReport = ({ steps, rows, roadmap, say }) => {
  const c = boardCounts(rows);
  const list = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(", ");
  say(`Board: ${c.rows} rows. By stage: ${list(c.byStage)}. By who pulled them: ${list(c.byPulledBy)}.`);
  const n = (kind) => steps.filter((s) => s.board && s.do === kind).length;
  const adopted = steps.filter((s) => s.board && s.do === "updateIssue" && s.adopt).length;
  say(`Board steps: ${adopted} issue(s) to adopt, ${n("createIssue")} to create, ${n("updateIssue") - adopted} to update, ${n("closeIssue")} new issue(s) to close, ${n("foldIssue")} duplicate(s) to fold and close, ${steps.filter((s) => s.do === "setMilestoneDue").length} milestone date(s) to set.`);
  say(`Roadmap (a forecast, recomputed every run): pace ${roadmap.pace.toFixed(1)} pull requests a day over the last ${WINDOW_DAYS} days, ${roadmap.perItem.toFixed(1)} per item. Milestone dates: ${Object.entries(roadmap.due).map(([t, d]) => `${t} ${d}`).join("; ")}.`);
  for (const o of claimOverlaps(rows)) say(`claims overlap: ${o.a} (${o.lanes[0]}) and ${o.b} (${o.lanes[1]}) both touch ${o.path}; the framework goal settles it (K42, section 3, case 2)`);
};

/** The Project's plan for the issues that exist, and an estimate for the issues the run would create (they have no number yet). */
export const projectReport = ({ pSteps, steps, rows, roadmap, live, say }) => {
  for (const s of pSteps) say(`would ${s.do} ${s.title ?? s.name ?? ""}`);
  say(`${pSteps.length} Project step(s) for the issues that exist (${pSteps.filter((s) => s.do === "setValue").length} field values set, ${pSteps.filter((s) => s.do === "addItem").length} issues added).`);
  if (!rows) return;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const made = steps.filter((s) => s.do === "createIssue" && s.board).map((s) => byId.get(s.key.slice(5)));
  const writes = made.reduce((k, r) => k + Object.values(boardValues(r, { state: "open" }, live, { byId, dates: roadmap.dates })).filter((v) => v !== undefined && v !== null).length, 0);
  say(`Plus about ${writes} field value(s) and ${made.length} item(s) for the ${made.length} issue(s) it would create.`);
};
