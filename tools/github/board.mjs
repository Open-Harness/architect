// The board (K42, section 5): the capability map in docs/canon/status.md, one row per item, and what GitHub should hold
// for it: one issue per row, upserted by a marker in its body (never by title), labelled by release and lane, in the
// milestone of the first app milestone that pulls it. Pure: no I/O. `sync.mjs --board` reads the page and GitHub, calls
// `parseBoard` and `boardPlan`, and applies the steps; `project.mjs` fills the Project's fields from the same rows.

export const BOARD_COLUMNS = ["id", "Item", "Stage", "Pulled by", "Release", "Milestone", "Lane", "Touches", "Needs", "Evidence"];
/** K42, section 2, in the order work moves. */
export const STAGES = ["provisional", "spiked", "scaffoldable", "building", "built", "extracted"];
export const PULLED_BY = ["superagent", "Capxul", "framework"];
export const RELEASES = ["preview", "beta", "1.0"];
const LEGEND_COLUMNS = ["Column", "What it holds"];
export const NOT_YET_NEEDED = "Not yet needed";

/**
 * The milestones (K42, section 5; K44), by the key a row's Milestone column holds, in the order they are ranked: the
 * alpha first, then Capxul's critical path (K44, section 3). The superagent's are kept for its rows when it resumes; K44
 * parked it and its rows were re-sorted.
 */
export const APP_MILESTONES = {
  alpha: { app: "framework", title: "Alpha: Orthograph on npm", description: "The npm preview, TypeScript end to end, with the chain basics: what Goal 18 builds (K44, section 2)." },
  books: { app: "Capxul", title: "Capxul: the books", description: "Capxul's books in double entry, in ERPNext's shapes, the first step of its path (K44, section 3). Ships in the beta." },
  "people and payroll": { app: "Capxul", title: "Capxul: people and payroll", description: "Capxul's HR basics and payroll, each pay run posting to the books (K44, section 3). Ships in the beta." },
  banking: { app: "Capxul", title: "Capxul: banking", description: "Bridge for real, and money in and out posting to the books (K44, section 3). Ships in 1.0." },
  budgets: { app: "Capxul", title: "Capxul: budgets", description: "Budgets against accounts and cost centres; the on-chain module is deployed outside the framework (K44, call 8). Ships in 1.0." },
  "getting paid": { app: "Capxul", title: "Capxul: getting paid", description: "Capxul's milestone for getting paid, later with the chain (K44): a sales invoice with a pay link, the payment that settles it and the ledger lines it posts." },
  "coding agent": { app: "superagent", title: "Superagent: the coding agent end to end", description: "The superagent's first milestone: the pages and the coding agent end to end, its slice 12 (K42, section 6)." },
  "triage agent": { app: "superagent", title: "Superagent: the triage agent", description: "The superagent's triage agent, made from data with no new code, its slice 13." },
  extraction: { app: "superagent", title: "Superagent: extraction", description: "The superagent's plugins moved from its plugins/ into packages/ and published, its slice 14." },
  launch: { app: "superagent", title: "Superagent: launch", description: "The superagent's launch: real sign-in, teams, a live deploy with a public address for webhooks, a sandbox and a model endpoint off Aaron's Mac." },
};
/** K44, section 4: the release each milestone ships in. */
export const MILESTONE_RELEASE = { alpha: "preview", books: "beta", "people and payroll": "beta", banking: "1.0", budgets: "1.0", "getting paid": "1.0", "coding agent": "beta", "triage agent": "beta", extraction: "beta", launch: "1.0" };
export const NOT_YET_DESCRIPTION = "Board items no app has pulled yet, with no date (K42, section 5).";
export const BOARD_MILESTONES = [
  ...Object.values(APP_MILESTONES).map(({ title, description }) => ({ title, description })),
  { title: NOT_YET_NEEDED, description: NOT_YET_DESCRIPTION },
];

export const itemMarker = (id) => `<!-- orthograph:item=${id} -->`;
export const BOARD_KINDS = ["kind:capability", "kind:gap"];
const kindOf = (id) => (id.startsWith("gap-") ? "gap" : "capability");
export const isDone = (row) => row.stage === "built" || row.stage === "extracted";
export const none = (cell) => cell === "—" || cell === "none" || cell === "";

/**
 * Adoption (K42, section 5): many open issues already describe board items, and a first run must not duplicate them.
 * A row's Evidence cell may hold `issue #531`, in backticks, to adopt that issue (the sync writes the marker, the
 * labels, the milestone and the Project's fields onto it, and keeps its original text beneath), and `folds #533, #538`,
 * in backticks, for the other issues that are the same item: the sync closes each with a comment pointing at the row's issue.
 */
export const ADOPT_SYNTAX = {
  adopt: /`issue #(\d+)`/g,
  folds: /`folds (#\d+(?:, #\d+)*)`/g,
};
const adoptsOf = (evidence) => [...evidence.matchAll(ADOPT_SYNTAX.adopt)].map((m) => Number(m[1]));
const foldsOf = (evidence) => [...evidence.matchAll(ADOPT_SYNTAX.folds)].flatMap((m) => [...m[1].matchAll(/#(\d+)/g)].map((x) => Number(x[1])));
const NAME_MAX = 50;

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
    if (!lines[i].startsWith("|")) continue;
    if (cells(lines[i]).join("|") !== BOARD_COLUMNS.join("|")) {
      // Fail closed: a table here with a misspelt or missing column would otherwise drop its items from the board.
      // The one other table is the page's own legend of the columns.
      if (cells(lines[i]).join("|") !== LEGEND_COLUMNS.join("|")) errors.push(`line ${i + 1}: a table in the capability map whose header is not the board's columns (${BOARD_COLUMNS.join(", ")}): ${lines[i]}`);
      while (i + 1 < end && lines[i + 1].startsWith("|")) i++;
      continue;
    }
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
      // K42, section 5: every Item starts with a short name and a colon, and the issue's title is the name.
      if (nameOf(item) === item || nameOf(item).length > NAME_MAX) bad(`item does not start with a short name and a colon (\`Name: what it is\`, the name at most ${NAME_MAX} characters)`);
      const adopts = adoptsOf(evidence);
      const folds = foldsOf(evidence);
      if (adopts.length > 1) bad(`adopts ${adopts.length} issues; a row adopts one, and folds the rest`);
      if (folds.length && !adopts.length) bad("folds issues but adopts none: name the one it adopts with `issue #N`");
      if (adopts.some((n) => folds.includes(n))) bad("adopts and folds the same issue");
      if (pulledBy === "framework" && !none(milestone) && milestone !== "alpha") bad("a framework row's only milestone is the alpha: an app pulls it, or it is not yet needed");
      // K44, section 4: a row ships in its milestone's release. The alpha's rows are the preview's, and the preview's rows
      // are the alpha's; Capxul's books, people and payroll ship in the beta, the rest of its path in 1.0.
      if (!none(milestone) && !none(release) && MILESTONE_RELEASE[milestone] && release !== MILESTONE_RELEASE[milestone]) bad(`a piece for '${milestone}' ships in ${MILESTONE_RELEASE[milestone]}`);
      if (pulledBy === "framework" && release === "preview" && milestone !== "alpha") bad("a preview piece is the alpha's: its milestone is alpha");
      if (pulledBy === "Capxul" && none(milestone) && !none(release) && release !== "1.0") bad("a piece Capxul pulls off its path ships in 1.0");
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
        adopts: adopts[0] ?? null,
        folds,
        line: i + 1,
      });
    }
  }
  if (rows.length === 0 && errors.length === 0) errors.push("the capability map has no table with the board's columns");
  const ids = new Set(rows.map((r) => r.id));
  const claimedBy = new Map();
  for (const r of rows) {
    for (const n of [...(r.adopts ? [r.adopts] : []), ...r.folds]) {
      if (claimedBy.has(n) && claimedBy.get(n) !== r.id) errors.push(`line ${r.line} (${r.id}): issue #${n} is already adopted or folded by row ${claimedBy.get(n)}`);
      claimedBy.set(n, r.id);
    }
  }
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

/** The counts a person reads first: rows by stage and by who pulled them. */
export const boardCounts = (rows) => {
  const count = (key, order) => Object.fromEntries(order.map((k) => [k, rows.filter((r) => r[key] === k).length]));
  return { rows: rows.length, byStage: count("stage", STAGES), byPulledBy: count("pulledBy", PULLED_BY) };
};
