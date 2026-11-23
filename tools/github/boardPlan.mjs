// What GitHub should hold for the board's rows (K42, section 5): one issue per row, upserted by a marker in its body
// (never by title), or an existing issue the row adopts; labelled by kind, release and lane; in the milestone of the
// first app milestone that pulls it. Pure: no I/O. `sync.mjs --board` calls `adoptionProblems` and `boardPlan`, and
// applies the steps; `project.mjs` fills the Project's fields from the same rows.
import { BOARD_KINDS, BOARD_MILESTONES, NOT_YET_NEEDED, isDone, milestoneOf } from "./board.mjs";

export const itemMarker = (id) => `<!-- orthograph:item=${id} -->`;
/** Under this line an adopted issue keeps the words it had; the sync rewrites everything above it. */
export const ORIGINAL = "<!-- orthograph:original -->";
const KEPT_NOTE = "> The text this issue had before the board adopted it, kept as written:";

/** The issue's title: the item's name. */
export const itemTitle = (row) => (row.name.length > 120 ? `${row.name.slice(0, 117)}...` : row.name);

/** What an issue keeps beneath the sync's page: what follows the ORIGINAL line, or its whole old text when it is new to the board. */
const keptOf = (issue, row) => {
  const body = (issue.body ?? "").replace(/\r\n/g, "\n");
  const at = body.indexOf(`\n\n${ORIGINAL}\n`);
  if (at !== -1) return body.slice(at + ORIGINAL.length + 3);
  if (!row.adopts || body.includes(itemMarker(row.id)) || body.trim() === "") return "";
  return `${KEPT_NOTE}\n\n${body}`;
};

/** The issue's body: one page per row, rewritten whole by the sync, above the text an adopted issue keeps. */
export const itemBody = (row, statusUrl, kept = "") =>
  [
    itemMarker(row.id),
    `> Written by \`tools/github/sync.mjs --board\` from the row \`${row.id}\` in [the capability map](${statusUrl}). Edit the row, not this page.`,
    "",
    row.item,
    "",
    `**Stage:** ${row.stage}  `,
    `**Pulled by:** ${row.pulledBy}  `,
    `**Release:** ${row.release ?? "none yet"}  `,
    `**Milestone:** ${milestoneOf(row)}  `,
    `**Lane:** ${row.lane ?? "unclaimed"}  `,
    `**Touches:** ${row.touches.length ? row.touches.map((p) => `\`${p}\``).join(", ") : "nothing named"}  `,
    `**Needs:** ${row.needs.length ? row.needs.map((n) => `\`${n}\``).join(", ") : "nothing"}  `,
    `**Evidence:** ${row.evidence || "none"}`,
    ...(kept ? ["", ORIGINAL, kept] : []),
  ].join("\n");

/** The labels the board owns on an issue: its kind, its release and its lane. */
export const itemLabels = (row) => [`kind:${row.kind}`, ...(row.release ? [`release:${row.release}`] : []), ...(row.lane ? [`lane:${row.lane}`] : [])];
const owned = (l) => l.startsWith("release:") || l.startsWith("lane:") || l.startsWith("kind:");
// A kind label that is not the board's (ask, snag, goal, slice) is the sync's to replace only on an issue a row adopts.
const ownedOn = (issue, row) => (l) => (l.startsWith("kind:") && !BOARD_KINDS.includes(l) ? row.adopts === issue.number : owned(l));

export const laneLabel = (lane) => ({ name: `lane:${lane}`, color: "c2e0c6", description: `Claimed by Goal ${lane.slice(5)}: it works this item and its paths (K42, section 3)` });

const real = (i) => !i.pullRequest && i.trusted !== false;
/** The issue that is a row's: the one it adopts, else a trusted issue of a board kind with the row's marker (the oldest wins). */
export const issueOfRow = (row, issues) =>
  (row.adopts ? issues.find((i) => real(i) && i.number === row.adopts) : undefined) ??
  issues.filter((i) => real(i) && i.labels.some((l) => BOARD_KINDS.includes(l)) && (i.body ?? "").includes(itemMarker(row.id))).sort((x, y) => x.number - y.number)[0];

/** Why an adoption cannot be planned: an issue that is missing, a pull request, an outsider's, or already another row's. Empty when all is well. */
export const adoptionProblems = (rows, issues) => {
  const problems = [];
  const byNumber = new Map(issues.map((i) => [i.number, i]));
  for (const r of rows) {
    for (const [verb, n] of [...(r.adopts ? [["adopts", r.adopts]] : []), ...r.folds.map((f) => ["folds", f])]) {
      const i = byNumber.get(n);
      const mark = (i?.body ?? "").match(/orthograph:item=([a-z0-9-]+)/)?.[1];
      if (!i) problems.push(`${r.id} ${verb} #${n}, which is no issue`);
      else if (i.pullRequest) problems.push(`${r.id} ${verb} #${n}, which is a pull request`);
      else if (i.trusted === false) problems.push(`${r.id} ${verb} #${n}, which an outsider opened`);
      else if (mark && mark !== r.id && i.labels.some((l) => BOARD_KINDS.includes(l))) problems.push(`${r.id} ${verb} #${n}, which is the board's issue for ${mark}`);
    }
  }
  return problems;
};

const sameText = (a, b) => (a ?? "").replace(/\r\n/g, "\n") === b;

/**
 * rows: parseBoard's. state: as in plan.mjs ({ labels, milestones, issues, ownerType, types }). typeOf: plan.mjs's.
 * due: milestone title to its due date (roadmap.mjs). Steps: the lane labels, the milestones and their dates, then each
 * row's issue made, or adopted, or brought up to date, closed when its stage is built or extracted and open otherwise,
 * then each folded issue closed with a comment. Nothing is deleted: a row removed from the page leaves its issue where it is.
 */
export const boardPlan = ({ rows, state, statusUrl, typeOf, due = {} }) => {
  const steps = [];
  const haveLabel = new Set(state.labels.map((l) => l.name));
  for (const lane of [...new Set(rows.flatMap((r) => (r.lane ? [r.lane] : [])))].sort()) {
    const want = laneLabel(lane);
    if (!haveLabel.has(want.name)) steps.push({ do: "createLabel", ...want });
  }
  const haveMilestone = new Map(state.milestones.map((m) => [m.title, m]));
  for (const want of BOARD_MILESTONES) {
    const have = haveMilestone.get(want.title);
    if (!have) steps.push({ do: "createMilestone", ...want });
    else if (have.description !== want.description) steps.push({ do: "updateMilestone", number: have.number, ...want });
  }
  for (const [title, day] of Object.entries(due)) {
    if (title === NOT_YET_NEEDED || (haveMilestone.get(title)?.dueOn ?? null) === day) continue;
    steps.push({ do: "setMilestoneDue", title, day });
  }
  for (const row of rows) {
    const title = itemTitle(row);
    const labels = itemLabels(row);
    const milestone = milestoneOf(row);
    const issue = issueOfRow(row, state.issues);
    if (!issue) {
      steps.push({ do: "createIssue", board: true, key: `item ${row.id}`, title, body: itemBody(row, statusUrl), type: typeOf(row.kind, state), labels, milestone });
      if (isDone(row)) steps.push({ do: "closeIssue", board: true, issue: `item ${row.id}`, title });
    } else {
      const body = itemBody(row, statusUrl, keptOf(issue, row));
      const adopting = row.adopts === issue.number && !(issue.body ?? "").includes(itemMarker(row.id));
      const step = { do: "updateIssue", board: true, adopt: adopting, number: issue.number, title };
      let changed = adopting || issue.title !== title;
      if (!sameText(issue.body, body)) [step.body, changed] = [body, true];
      const mine = issue.labels.filter(ownedOn(issue, row)).sort().join();
      if (mine !== [...labels].sort().join()) [step.labels, changed] = [[...issue.labels.filter((l) => !ownedOn(issue, row)(l)), ...labels], true];
      if (issue.milestone !== milestone) [step.milestone, changed] = [milestone, true];
      if (row.adopts === issue.number && issue.type !== typeOf(row.kind, state)) [step.type, changed] = [typeOf(row.kind, state), true];
      const open = (issue.state ?? "open") === "open";
      if (open === isDone(row)) [step.state, changed] = [isDone(row) ? "closed" : "open", true];
      if (changed) steps.push(step);
    }
    for (const n of row.folds) {
      const folded = state.issues.find((i) => i.number === n);
      if (folded && (folded.state ?? "open") === "open") steps.push({ do: "foldIssue", board: true, number: n, into: issue ? issue.number : `item ${row.id}`, row: row.id, title: folded.title });
    }
  }
  return steps;
};

/** The comment a folded issue is closed with. The hidden line lets a re-run see it was already said. */
export const foldComment = (row, into) =>
  `<!-- orthograph:folded=${row.id} -->\nThis is the same item as #${into}, the board's issue for \`${row.id}\` (${row.name}). It is closed so the work has one page; the words above stay as they were, and #${into} links here from its evidence.`;
