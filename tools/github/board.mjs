// The board (K42, section 5): the capability map in docs/canon/status.md, one row per item, and what GitHub should hold
// for it: one issue per row, upserted by a marker in its body (never by title), labelled by release and lane, in the
// milestone of the first app milestone that pulls it. Pure: no I/O. `sync.mjs --board` reads the page and GitHub, calls
// `parseBoard` and `boardPlan`, and applies the steps; `project.mjs` fills the Project's fields from the same rows.

export const BOARD_COLUMNS = ["id", "Item", "Stage", "Pulled by", "Release", "Milestone", "Lane", "Touches", "Needs", "Evidence"];
/** K42, section 2, in the order work moves. */
export const STAGES = ["provisional", "spiked", "scaffoldable", "building", "built", "extracted"];
export const PULLED_BY = ["superagent", "Capxul", "framework"];
export const RELEASES = ["preview", "beta", "1.0"];
export const NOT_YET_NEEDED = "Not yet needed";

/** The apps' milestones (K42, section 5), by the key a row's Milestone column holds. */
export const APP_MILESTONES = {
  "coding agent": { app: "superagent", title: "Superagent: the coding agent end to end", description: "The superagent's first milestone: the pages and the coding agent end to end, its slice 12 (K42, section 6)." },
  "triage agent": { app: "superagent", title: "Superagent: the triage agent", description: "The superagent's triage agent, made from data with no new code, its slice 13." },
  extraction: { app: "superagent", title: "Superagent: extraction", description: "The superagent's plugins moved from its plugins/ into packages/ and published, its slice 14." },
  launch: { app: "superagent", title: "Superagent: launch", description: "The superagent's launch: real sign-in, teams, a live deploy with a public address for webhooks, a sandbox and a model endpoint off Aaron's Mac." },
  "getting paid": { app: "Capxul", title: "Capxul: getting paid", description: "Capxul's first milestone: a sales invoice with a pay link, the payment that settles it and the ledger lines it posts (K43)." },
  books: { app: "Capxul", title: "Capxul: the books", description: "Capxul's books, in ERPNext's shapes (K43)." },
  "people and payroll": { app: "Capxul", title: "Capxul: people and payroll", description: "Capxul's HR and payroll (K43)." },
  banking: { app: "Capxul", title: "Capxul: banking", description: "Capxul's bank accounts through Bridge (K43)." },
};
export const NOT_YET_DESCRIPTION = "Board items no app has pulled yet, with no date (K42, section 5).";
export const BOARD_MILESTONES = [
  ...Object.values(APP_MILESTONES).map(({ title, description }) => ({ title, description })),
  { title: NOT_YET_NEEDED, description: NOT_YET_DESCRIPTION },
];

export const itemMarker = (id) => `<!-- orthograph:item=${id} -->`;
const BOARD_KINDS = ["kind:capability", "kind:gap"];
const kindOf = (id) => (id.startsWith("gap-") ? "gap" : "capability");
const isDone = (row) => row.stage === "built" || row.stage === "extracted";
const none = (cell) => cell === "—" || cell === "none" || cell === "";

// The name is the text before the first ": " that sits outside parentheses and backticks; a row without one is all name.
const nameOf = (item) => {
  let depth = 0;
  let tick = false;
  for (let i = 0; i < item.length; i++) {
    const c = item[i];
    if (c === "`") tick = !tick;
    else if (!tick && c === "(") depth++;
    else if (!tick && c === ")") depth = Math.max(0, depth - 1);
    else if (!tick && depth === 0 && c === ":" && item[i + 1] === " ") return item.slice(0, i);
  }
  return item;
};

const cells = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

/**
 * Reads the capability map: every table under "## 2. The capability map" whose header is the board's columns.
 * Returns { rows, errors }. A bad row is an error, never skipped, so a typo cannot drop an item from the board.
 */
export const parseBoard = (text) => {
  const errors = [];
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^## 2\. /.test(l));
  if (start === -1) return { rows: [], errors: ["no section '## 2.' (the capability map)"] };
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  if (end === -1) end = lines.length;
  const rows = [];
  for (let i = start; i < end; i++) {
    if (!lines[i].startsWith("|") || cells(lines[i]).join("|") !== BOARD_COLUMNS.join("|")) continue;
    for (i += 2; i < end && lines[i].startsWith("|"); i++) {
      const at = `line ${i + 1}`;
      const c = cells(lines[i]);
      if (c.length !== BOARD_COLUMNS.length) {
        errors.push(`${at}: ${c.length} cells, want ${BOARD_COLUMNS.length}`);
        continue;
      }
      const [id, item, stage, pulledBy, release, milestone, lane, touches, needs, evidence] = c;
      const bad = (why) => errors.push(`${at} (${id}): ${why}`);
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) bad("id is not lowercase words joined by hyphens");
      if (rows.some((r) => r.id === id)) bad("duplicate id");
      if (item === "") bad("no item");
      if (!STAGES.includes(stage)) bad(`stage '${stage}' is not one of ${STAGES.join(", ")}`);
      if (!PULLED_BY.includes(pulledBy)) bad(`pulled by '${pulledBy}' is not one of ${PULLED_BY.join(", ")}`);
      if (!none(release) && !RELEASES.includes(release)) bad(`release '${release}' is not preview, beta, 1.0 or —`);
      if (!none(milestone) && !APP_MILESTONES[milestone]) bad(`milestone '${milestone}' is not one of ${Object.keys(APP_MILESTONES).join(", ")} or —`);
      if (!none(lane) && !/^goal-\d+$/.test(lane)) bad(`lane '${lane}' is not goal-<n> or none`);
      if (!none(touches) && touches.replace(/`[^`]+`/g, "").replace(/[,\s]/g, "") !== "") bad("touches is not a list of `paths`");
      const app = APP_MILESTONES[milestone]?.app;
      if (app && app !== pulledBy) bad(`milestone '${milestone}' is ${app}'s, but the row is pulled by ${pulledBy}`);
      if (pulledBy === "framework" && !none(milestone)) bad("a framework row has no app milestone: an app pulls it, or it is not yet needed");
      // K42, section 5: a piece the superagent pulls for its slices 1 to 14 ships in the beta; its launch alone, or Capxul alone, in 1.0.
      if (pulledBy === "Capxul" && !none(release) && release !== "1.0") bad("a piece only Capxul pulls ships in 1.0");
      if (pulledBy === "superagent" && !none(milestone) && !none(release)) {
        const want = milestone === "launch" ? "1.0" : "beta";
        if (release !== want) bad(`a superagent piece for '${milestone}' ships in ${want}`);
      }
      rows.push({
        id,
        kind: kindOf(id),
        item,
        name: nameOf(item),
        stage,
        pulledBy,
        release: none(release) ? null : release,
        milestone: none(milestone) ? null : milestone,
        lane: none(lane) ? null : lane,
        touches: none(touches) ? [] : [...touches.matchAll(/`([^`]+)`/g)].map((m) => m[1]),
        needs: none(needs) ? [] : needs.split(",").map((n) => n.trim()),
        evidence: none(evidence) ? "" : evidence,
        line: i + 1,
      });
    }
  }
  if (rows.length === 0 && errors.length === 0) errors.push("the capability map has no table with the board's columns");
  const ids = new Set(rows.map((r) => r.id));
  for (const r of rows) {
    for (const n of r.needs) {
      if (!ids.has(n)) errors.push(`line ${r.line} (${r.id}): needs '${n}', which is no row`);
      if (n === r.id) errors.push(`line ${r.line} (${r.id}): needs itself`);
    }
  }
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const r of rows) {
    const seen = new Set();
    const walk = (x) => {
      if (x === r.id && seen.size > 0) return true;
      if (seen.has(x)) return false;
      seen.add(x);
      return (byId.get(x)?.needs ?? []).some(walk);
    };
    if (r.needs.some(walk)) errors.push(`line ${r.line} (${r.id}): needs run in a circle`);
  }
  return { rows, errors };
};

/** The milestone's title a row belongs in: the first app milestone that pulls it, or "Not yet needed". */
export const milestoneOf = (row) => (row.milestone ? APP_MILESTONES[row.milestone].title : NOT_YET_NEEDED);

/** Two open claims by different goals on one path (a path inside another counts): K42, section 3, case 2. */
export const claimOverlaps = (rows) => {
  const open = rows.filter((r) => r.lane && !isDone(r));
  const within = (a, b) => a === b || a.startsWith(b.endsWith("/") ? b : `${b}/`) || b.startsWith(a.endsWith("/") ? a : `${a}/`);
  const out = [];
  for (let i = 0; i < open.length; i++) {
    for (let j = i + 1; j < open.length; j++) {
      if (open[i].lane === open[j].lane) continue;
      const path = open[i].touches.flatMap((a) => open[j].touches.filter((b) => within(a, b)).map((b) => (a.length >= b.length ? a : b)))[0];
      if (path) out.push({ a: open[i].id, b: open[j].id, lanes: [open[i].lane, open[j].lane], path });
    }
  }
  return out;
};

/** The issue's title: the item's name. */
export const itemTitle = (row) => (row.name.length > 120 ? `${row.name.slice(0, 117)}...` : row.name);

/** The issue's body: one page per row, rewritten whole by the sync. */
export const itemBody = (row, statusUrl) =>
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
  ].join("\n");

/** The labels the board owns on an issue: its kind, its release and its lane. */
export const itemLabels = (row) => [`kind:${row.kind}`, ...(row.release ? [`release:${row.release}`] : []), ...(row.lane ? [`lane:${row.lane}`] : [])];
const owned = (l) => l.startsWith("release:") || l.startsWith("lane:") || BOARD_KINDS.includes(l);

export const laneLabel = (lane) => ({ name: `lane:${lane}`, color: "c2e0c6", description: `Claimed by Goal ${lane.slice(5)}: it works this item and its paths (K42, section 3)` });

/** The issue that is a row's, if there is one: a trusted issue of a board kind with the row's marker; the oldest wins. */
export const issueOfRow = (row, issues) =>
  issues
    .filter((i) => !i.pullRequest && i.trusted !== false && i.labels.some((l) => BOARD_KINDS.includes(l)) && (i.body ?? "").includes(itemMarker(row.id)))
    .sort((x, y) => x.number - y.number)[0];

/**
 * rows: parseBoard's. state: as in plan.mjs ({ labels, milestones, issues, ownerType, types }). typeOf: plan.mjs's.
 * Steps: the lane labels, the milestones, then each row's issue made or brought up to date, closed when its stage is
 * built or extracted and open otherwise. Nothing is deleted: a row removed from the page leaves its issue where it is.
 */
export const boardPlan = ({ rows, state, statusUrl, typeOf }) => {
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
  for (const row of rows) {
    const title = itemTitle(row);
    const body = itemBody(row, statusUrl);
    const labels = itemLabels(row);
    const milestone = milestoneOf(row);
    const issue = issueOfRow(row, state.issues);
    if (!issue) {
      steps.push({ do: "createIssue", board: true, key: `item ${row.id}`, title, body, type: typeOf(row.kind, state), labels, milestone });
      if (isDone(row)) steps.push({ do: "closeIssue", board: true, issue: `item ${row.id}`, title });
      continue;
    }
    const step = { do: "updateIssue", board: true, number: issue.number, title };
    let changed = issue.title !== title;
    if (issue.body !== body) [step.body, changed] = [body, true];
    const mine = issue.labels.filter(owned).sort().join();
    if (mine !== [...labels].sort().join()) [step.labels, changed] = [[...issue.labels.filter((l) => !owned(l)), ...labels], true];
    if (issue.milestone !== milestone) [step.milestone, changed] = [milestone, true];
    const open = (issue.state ?? "open") === "open";
    if (open === isDone(row)) [step.state, changed] = [isDone(row) ? "closed" : "open", true];
    if (changed) steps.push(step);
  }
  return steps;
};

/** The counts a person reads first: rows by stage and by who pulled them. */
export const boardCounts = (rows) => {
  const count = (key, order) => Object.fromEntries(order.map((k) => [k, rows.filter((r) => r[key] === k).length]));
  return { rows: rows.length, byStage: count("stage", STAGES), byPulledBy: count("pulledBy", PULLED_BY) };
};
