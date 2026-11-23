// The "Orthograph" Project (K33): one GitHub Project, owned by the repository's owner, over every goal, laid on top of the milestones,
// sub-issues and labels. Pure: no I/O. `projectGh.mjs` reads and writes it; `sync.mjs --project` runs both.

import { PULLED_BY, STAGES, issueOfRow } from "./board.mjs";

export const PROJECT_TITLE = "Orthograph";

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
  select("Harness", ["claude", "amp", "codex", "opencode"].map((h) => [h, "GRAY", ""])),
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

/** The saved views: every goal in one table, a board by Status, a roadmap (Start to End), and one table per goal. */
export const projectViews = (goals) => [
  { name: "All goals", layout: "TABLE_LAYOUT", filter: "" },
  { name: "By status", layout: "BOARD_LAYOUT", filter: "" },
  { name: "Roadmap", layout: "ROADMAP_LAYOUT", filter: "" },
  ...goals.map((g) => ({ name: `Goal ${g.number}`, layout: "TABLE_LAYOUT", filter: `goal:"Goal ${g.number}"` })),
];

const label = (i, prefix) => (i.labels.find((l) => l.startsWith(prefix)) ?? "").slice(prefix.length) || null;
const isOpen = (i) => (i.state ?? "open") === "open";

/**
 * What each tracked issue's fields should hold. Model and Lead role are set when known and never cleared, since an
 * agent may set them by hand; the others are kept equal to the briefs and the issue.
 */
const day = (iso) => (iso ? String(iso).slice(0, 10) : null);

/** A board row's fields (K42, section 5). Goal is set only when a live goal's lane claims it, and never cleared here. */
export const boardValues = (row, i, goals) => ({
  Kind: row.kind,
  Stage: row.stage,
  "Pulled by": row.pulledBy,
  Release: row.release,
  Lane: row.lane,
  Goal: row.lane && goals.some((g) => `goal-${g.number}` === row.lane) ? `Goal ${row.lane.slice(5)}` : undefined,
  Status: (i.state ?? "open") === "open" ? "Ready" : "Done",
});

export const itemValues = (i, goal, issues) => {
  const kind = label(i, "kind:");
  const dates = { Start: day(kind === "goal" ? goal.lead?.since ?? i.createdAt : i.createdAt), End: day(i.closedAt) };
  if (kind === "goal") {
    return {
      Goal: `Goal ${goal.number}`, Kind: "goal", Status: STATUS_OF_BRIEF[goal.status] ?? "Ready", Release: goal.release,
      Harness: goal.lead?.harness ?? null, Model: goal.lead?.model ?? undefined, "Lead role": "lead", ...dates,
    };
  }
  const blocked = (i.blockedBy ?? []).some((n) => issues.some((x) => x.number === n && isOpen(x)));
  const harness = label(i, "harness:");
  return {
    Goal: `Goal ${goal.number}`, Kind: kind, Release: label(i, "release:") ?? goal.release, Harness: harness,
    Status: !isOpen(i) ? "Done" : blocked ? "Blocked" : harness ? "Running" : "Ready",
    Model: undefined, "Lead role": label(i, "role:") ?? undefined, ...dates,
  };
};

/**
 * goals: the live goals. issues: as in plan.mjs, each with `nodeId`. project: null when it doesn't exist yet, else
 * { id, fields: [{ id, name, dataType, options: [{ id, name }] }], items: [{ id, number, values: { field: value } }],
 * views: [{ id, name, layout, filter }] }. rows: the board's rows (board.mjs), when the board is kept too.
 */
export const projectPlan = ({ goals, issues, project, rows }) => {
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
  const tracked = issues.filter((i) => !i.pullRequest && i.trusted !== false && label(i, "kind:") && byMilestone.has(i.milestone));
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
  for (const row of rows ?? []) {
    const i = issueOfRow(row, issues);
    if (i) settle(i, boardValues(row, i, goals));
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
