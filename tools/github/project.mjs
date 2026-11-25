// The "Orthograph" Project (K33): one GitHub Project, owned by the repository's owner, over every goal, laid on top of the milestones,
// sub-issues and labels. Pure: no I/O. `projectGh.mjs` reads and writes it; `sync.mjs --project` runs both.

import { APP_MILESTONES, PULLED_BY, STAGES, isDone } from "./board.mjs";
import { issueOfRow } from "./boardPlan.mjs";

export const PROJECT_TITLE = "Orthograph";

const HARNESSES = ["claude", "amp", "codex", "opencode"];
/** A brief's or a label's harness as the Harness field names it: an older brief's "claude-code" is "claude"; anything else unknown is no value. */
export const harnessOf = (h) => (h === "claude-code" ? "claude" : HARNESSES.includes(h) ? h : null);

const KINDS = ["goal", "slice", "snag", "ask", "decision", "gap", "capability", "grill"];
const STATUSES = [
  ["Ready", "GREEN", "Can start: nothing it waits on is open"],
  ["Running", "BLUE", "Someone has taken it (its harness label is on it), or the goal's lead is running"],
  ["Blocked", "RED", "Waits on an open issue it is blocked by"],
  ["Landing", "PURPLE", "The goal is merging into its base"],
  ["Done", "GRAY", "Closed, or the goal is done"],
  ["Parked", "YELLOW", "Set aside, with an owner and a reason"],
];
const STATUS_OF_BRIEF = { ready: "Ready", running: "Running", landing: "Landing", done: "Done", parked: "Parked" };

const select = (name, options) => ({ name, dataType: "SINGLE_SELECT", options: options.map(([n, color, description]) => ({ name: n, color, description })) });

/** The lanes a Project's Lane field offers: the live goals' and any a board row names. */
const lanesOf = (goals, rows) =>
  [...new Set([...goals.map((g) => `goal-${g.number}`), ...rows.flatMap((r) => (r.lane ? [r.lane] : []))])].sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)));

/**
 * The fields the Project holds. Model is text: models change weekly, so it is never a fixed list. With the board's rows
 * (K42) it also holds Stage, Pulled by and Lane.
 */
export const projectFields = (goals, rows) => [
  select("Goal", goals.map((g) => [`Goal ${g.number}`, "GRAY", g.milestone])),
  select("Kind", KINDS.map((k) => [k, "GRAY", ""])),
  select("Status", STATUSES),
  select("Release", ["preview", "beta", "1.0"].map((r) => [r, "GRAY", ""])),
  select("Harness", HARNESSES.map((h) => [h, "GRAY", ""])),
  { name: "Model", dataType: "TEXT", options: [] },
  select("Lead role", ["lead", "author", "builder", "reviewer", "designer", "spike"].map((r) => [r, "GRAY", ""])),
  { name: "Start", dataType: "DATE", options: [] },
  { name: "End", dataType: "DATE", options: [] },
  ...(rows ? [
    select("Stage", STAGES.map((s) => [s, "GRAY", ""])),
    select("Pulled by", PULLED_BY.map((a) => [a, "GRAY", ""])),
    select("Lane", lanesOf(goals, rows).map((l) => [l, "GRAY", ""])),
  ] : []),
];

const quoted = (titles) => titles.map((t) => `"${t}"`).join(",");
const byApp = (app) => Object.values(APP_MILESTONES).filter((m) => m.app === app).map((m) => m.title);
const goalMilestone = (goals, n) => goals.find((g) => g.number === n)?.milestone;

/**
 * The saved views (K45): every running goal's work in one table, a board by Status and a roadmap, all without the
 * parked goals' issues; the alpha (its milestone and Goal 18's); Capxul's path (its milestones and Goal 16's); the
 * parked issues on their own; and one table per goal that isn't parked.
 */
export const projectViews = (goals) => [
  { name: "All goals", layout: "TABLE_LAYOUT", filter: "-label:parked" },
  { name: "By status", layout: "BOARD_LAYOUT", filter: "-label:parked" },
  { name: "Roadmap", layout: "ROADMAP_LAYOUT", filter: "-label:parked" },
  { name: "The alpha", layout: "BOARD_LAYOUT", filter: `milestone:${quoted([APP_MILESTONES.alpha.title, goalMilestone(goals, 18)].filter(Boolean))}` },
  { name: "Capxul's path", layout: "BOARD_LAYOUT", filter: `milestone:${quoted([...byApp("Capxul"), goalMilestone(goals, 16)].filter(Boolean))}` },
  { name: "Parked", layout: "TABLE_LAYOUT", filter: "label:parked" },
  ...goals.filter((g) => g.status !== "parked").map((g) => ({ name: `Goal ${g.number}`, layout: "TABLE_LAYOUT", filter: `goal:"Goal ${g.number}"` })),
];

const label = (i, prefix) => (i.labels.find((l) => l.startsWith(prefix)) ?? "").slice(prefix.length) || null;
const isOpen = (i) => (i.state ?? "open") === "open";

/**
 * What each tracked issue's fields should hold. Model and Lead role are set when known and never cleared, since an
 * agent may set them by hand; the others are kept equal to the briefs and the issue.
 */
const day = (iso) => (iso ? String(iso).slice(0, 10) : null);

/**
 * A board row's Status (K42, section 5). Done when it is built; Running when a goal has claimed it (the Project's word
 * for "in progress"); otherwise Ready only when every row it needs is built, and Blocked until then.
 */
export const boardStatus = (row, byId) => {
  if (isDone(row)) return "Done";
  if (row.lane) return "Running";
  return row.needs.every((n) => (byId.get(n) ? isDone(byId.get(n)) : false)) ? "Ready" : "Blocked";
};

/**
 * A board row's fields (K42, section 5). Goal is set only when a live goal's lane claims it, and never cleared here.
 * `ctx`: { byId: rows by id, dates: row id to { start, end } from roadmap.mjs }. Start and End are cleared for a row with no date.
 */
export const boardValues = (row, i, goals, ctx = { byId: new Map(), dates: null }) => ({
  Kind: row.kind,
  Stage: row.stage,
  "Pulled by": row.pulledBy,
  Release: row.release,
  Lane: row.lane,
  Goal: row.lane && goals.some((g) => `goal-${g.number}` === row.lane) ? `Goal ${row.lane.slice(5)}` : undefined,
  Status: boardStatus(row, ctx.byId),
  ...(ctx.dates ? { Start: ctx.dates[row.id]?.start ?? null, End: ctx.dates[row.id]?.end ?? null } : {}),
});

export const itemValues = (i, goal, issues) => {
  const kind = label(i, "kind:");
  const dates = { Start: day(kind === "goal" ? goal.lead?.since ?? i.createdAt : i.createdAt), End: day(i.closedAt) };
  if (kind === "goal") {
    return {
      Goal: `Goal ${goal.number}`, Kind: "goal", Status: STATUS_OF_BRIEF[goal.status] ?? "Ready", Release: goal.release,
      Harness: harnessOf(goal.lead?.harness), Model: goal.lead?.model ?? undefined, "Lead role": "lead", ...dates,
    };
  }
  const blocked = (i.blockedBy ?? []).some((n) => issues.some((x) => x.number === n && isOpen(x)));
  const harness = harnessOf(label(i, "harness:"));
  return {
    Goal: `Goal ${goal.number}`, Kind: kind, Release: label(i, "release:") ?? goal.release, Harness: harness,
    Status: !isOpen(i) ? "Done" : blocked ? "Blocked" : harness ? "Running" : "Ready",
    Model: undefined, "Lead role": label(i, "role:") ?? undefined, ...dates,
  };
};

/**
 * goals: the live goals. issues: as in plan.mjs, each with `nodeId`. project: null when it doesn't exist yet, else
 * { id, fields: [{ id, name, dataType, options: [{ id, name }] }], items: [{ id, number, values: { field: value } }],
 * views: [{ id, name, layout, filter }] }. rows: the board's rows (board.mjs), when the board is kept too. dates: roadmap.mjs's.
 */
export const projectPlan = ({ goals, issues, project, rows, dates }) => {
  const steps = [];
  if (!project) steps.push({ do: "createProject", title: PROJECT_TITLE }, { do: "linkRepository" });
  const have = project ?? { fields: [], items: [], views: [] };

  for (const want of projectFields(goals, rows)) {
    const field = have.fields.find((f) => f.name === want.name);
    if (!field) steps.push({ do: "createField", ...want });
    else if (want.dataType === "SINGLE_SELECT") {
      const missing = want.options.filter((o) => !field.options.some((x) => x.name === o.name));
      const extra = field.options.filter((x) => !want.options.some((o) => o.name === x.name));
      // Replacing the options keeps the ones we name by id, so values already set on items survive.
      if (missing.length || (want.name === "Status" && extra.length)) {
        const keep = want.name === "Status" ? [] : extra.map((x) => ({ id: x.id, name: x.name, color: x.color ?? "GRAY", description: x.description ?? "" }));
        steps.push({ do: "updateField", name: want.name, options: [...want.options.map((o) => ({ ...o, id: field.options.find((x) => x.name === o.name)?.id })), ...keep] });
      }
    }
  }

  const byMilestone = new Map(goals.map((g) => [g.milestone, g]));
  // An issue a board row adopts is the row's, not a goal's, even before the sync moves it to the app's milestone.
  const adopted = new Set((rows ?? []).flatMap((r) => (r.adopts ? [r.adopts] : [])));
  const tracked = issues.filter((i) => !i.pullRequest && i.trusted !== false && label(i, "kind:") && byMilestone.has(i.milestone) && !adopted.has(i.number));
  const settle = (i, values) => {
    const item = have.items.find((x) => x.number === i.number);
    if (!item) steps.push({ do: "addItem", number: i.number, title: `#${i.number}` });
    for (const [field, value] of Object.entries(values)) {
      if (value === undefined) continue;
      const now = item?.values?.[field] ?? null;
      // A slice, snag or ask someone parked by hand stays parked while it is open; only a goal's brief parks a goal.
      if (field === "Status" && now === "Parked" && values.Kind !== "goal" && value !== "Done") continue;
      if (value === null && now !== null) steps.push({ do: "clearValue", number: i.number, field, title: `#${i.number} ${field}` });
      if (value !== null && now !== value) steps.push({ do: "setValue", number: i.number, field, value, title: `#${i.number} ${field} = ${value}` });
    }
  };
  for (const i of tracked) settle(i, itemValues(i, byMilestone.get(i.milestone), issues));
  // The board's items: an issue only once the sync has made it, so a dry run before the first write counts none.
  const byId = new Map((rows ?? []).map((r) => [r.id, r]));
  for (const row of rows ?? []) {
    const i = issueOfRow(row, issues);
    if (i) settle(i, boardValues(row, i, goals, { byId, dates }));
  }

  // A new Project opens with one table named "View 1": it becomes "All goals" rather than leaving a stray view.
  const views = [...have.views];
  for (const want of projectViews(goals)) {
    let view = views.find((v) => v.name === want.name);
    if (!view && want.name === "All goals") {
      const first = views.find((v) => v.name === "View 1");
      if (first) {
        steps.push({ do: "updateView", id: first.id, name: want.name, layout: want.layout, filter: want.filter, title: want.name });
        view = { ...first, ...want };
        views.splice(views.indexOf(first), 1, view);
      }
    }
    if (!view) steps.push({ do: "createView", ...want, title: want.name });
    else if (view.layout !== want.layout || (view.filter ?? "") !== want.filter) steps.push({ do: "updateView", id: view.id, ...want, title: want.name });
  }
  return steps;
};
