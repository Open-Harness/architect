// The roadmap's dates (K42, section 5): computed every round, never typed. Pure: no I/O and no clock (the caller passes
// `today`). `roadmapGh.mjs` reads the pull requests; `sync.mjs --board --project` writes what this returns.
//
// An item's Start is the day a goal first claimed it or its first evidence pull request merged, its End the day it was
// built. For an item not yet done the sync forecasts both from what needs what and the pace measured so far:
//
//   pace         pull requests merged per day over the last three full days (repository-wide, as K42 measured it)
//   per item     all pull requests ever merged, divided by the items' progress (a stage counts a share of an item), so the
//                work an item takes is in the same unit as the pace
//   the forecast a day at a time: the day's pace is spent on the items that are ready (everything they need was done on an
//                earlier day), the most urgent first, and no one item takes more than 1/WIDTH of the day
//
// It is a forecast, not a promise: a slip shows in the dates, and in the milestone dates that follow them.
import { APP_MILESTONES, isDone } from "./board.mjs";

/** The share of an item's work each stage has behind it. */
export const STAGE_SHARE = { provisional: 0, spiked: 0.2, scaffoldable: 0.4, building: 0.6, built: 1, extracted: 1 };
/** How many items the pace is spread over at once (20 CI jobs, two ready pull requests per goal, K42 section 4). */
export const WIDTH = 8;
export const WINDOW_DAYS = 3;
const HORIZON = 730;

export const addDays = (day, n) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Pull requests merged per day over the WINDOW_DAYS full days before `today`. mergedDays: each merge's day, "YYYY-MM-DD". */
export const pace = (mergedDays, today) => {
  const from = addDays(today, -WINDOW_DAYS);
  return mergedDays.filter((d) => d >= from && d < today).length / WINDOW_DAYS;
};

/** The pull requests one item takes: everything merged so far over the progress the rows show (at least one item's worth). */
export const perItem = (totalMerged, rows) => Math.max(1, totalMerged) / Math.max(1, rows.reduce((n, r) => n + STAGE_SHARE[r.stage], 0));

/**
 * The superagent's milestones run in the order its brief gives (slices 12, 13, 14 and 15: each after the one before), so a
 * row in one waits for the rows of the nearest earlier milestone that still has any. Capxul's run side by side: its slices 7
 * to 10 only wait on what the rows say.
 */
export const SEQUENCE = ["coding agent", "triage agent", "extraction", "launch"];

const milestoneRank = (row) => (row.milestone ? Object.keys(APP_MILESTONES).indexOf(row.milestone) : Infinity);

/**
 * rows: parseBoard's. started: row id to the day it actually started, when known. Returns row id to { start, end } for
 * every unfinished row an app milestone holds, or null for a row the horizon cannot reach (a pace of nothing).
 * An item a milestone's row needs is scheduled too, since it comes first, but only the milestone's own rows are returned.
 */
export const forecast = ({ rows, started = {}, today, pace: perDay, perItem: work, width = WIDTH }) => {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const earlier = (r) => {
    for (let k = SEQUENCE.indexOf(r.milestone) - 1; SEQUENCE.indexOf(r.milestone) > 0 && k >= 0; k--) {
      const open = rows.filter((x) => x.milestone === SEQUENCE[k] && !isDone(x)).map((x) => x.id);
      if (open.length) return open;
    }
    return [];
  };
  const needsOf = (r) => [...new Set([...r.needs, ...earlier(r)])];
  const want = new Set();
  const take = (r) => {
    if (want.has(r.id) || isDone(r)) return;
    want.add(r.id);
    needsOf(r).forEach((n) => take(byId.get(n)));
  };
  rows.filter((r) => r.milestone).forEach(take);
  // Urgency: an app milestone's rank (the superagent's first, then Capxul's); an item needed earlier takes its dependent's.
  const rank = new Map([...want].map((id) => [id, milestoneRank(byId.get(id))]));
  for (let changed = true; changed; ) {
    changed = false;
    for (const id of want) {
      for (const n of needsOf(byId.get(id))) {
        if (!rank.has(n) || rank.get(n) <= rank.get(id)) continue;
        rank.set(n, rank.get(id));
        changed = true;
      }
    }
  }
  const left = new Map([...want].map((id) => [id, Math.max(1, work * (1 - STAGE_SHARE[byId.get(id).stage]))]));
  const first = new Map();
  const last = new Map();
  const order = [...want].sort((a, b) => rank.get(a) - rank.get(b) || Number(Boolean(byId.get(b).lane)) - Number(Boolean(byId.get(a).lane)) || a.localeCompare(b));
  for (let day = 0; day < HORIZON && last.size < want.size && perDay > 0; day++) {
    let budget = perDay;
    const ready = order.filter((id) => !last.has(id) && needsOf(byId.get(id)).every((n) => isDone(byId.get(n)) || (last.has(n) && last.get(n) < day)));
    for (const id of ready) {
      const spend = Math.min(perDay / width, left.get(id), budget);
      if (spend <= 0) continue;
      if (!first.has(id)) first.set(id, day);
      left.set(id, left.get(id) - spend);
      budget -= spend;
      if (left.get(id) < 1e-9) last.set(id, day);
    }
  }
  const out = {};
  for (const id of want) {
    const r = byId.get(id);
    if (!r.milestone) continue;
    out[id] = last.has(id) ? { start: started[id] ?? (r.lane ? today : addDays(today, first.get(id))), end: addDays(today, last.get(id)) } : null;
  }
  return out;
};

/**
 * Every row's dates: a done row keeps what happened (its start and end, when known), an unfinished row of an app
 * milestone gets its start (the actual one, else the forecast) and the forecast end, and a row no app pulled has none.
 * facts: row id to { start, end } from the pull requests and the claims.
 */
export const rowDates = ({ rows, facts = {}, forecasts }) => {
  const out = {};
  for (const r of rows) {
    const f = facts[r.id] ?? {};
    if (isDone(r)) out[r.id] = { start: f.start ?? null, end: f.end ?? f.start ?? null };
    else if (forecasts[r.id]) out[r.id] = { start: f.start ?? forecasts[r.id].start, end: forecasts[r.id].end };
  }
  return out;
};

/** A milestone's due date: the forecast end of its last item, so a slip shows where it comes from. Titles with no dated item are left out. */
export const milestoneDue = (rows, dates, titleOf) => {
  const due = {};
  for (const r of rows) {
    const end = dates[r.id]?.end;
    if (!r.milestone || !end) continue;
    const t = titleOf(r);
    if (!due[t] || end > due[t]) due[t] = end;
  }
  return due;
};

/**
 * What actually happened, per row: Start is the earlier of the day its lane first appeared on the page (laneSince) and
 * the day its first evidence pull request merged; End, for a done row, is the day its last evidence pull request merged.
 * merged: [{ number, day }]. An evidence number that is no merged pull request (an issue, an open pull request) is ignored.
 */
export const factsOf = ({ rows, merged, laneSince = {} }) => {
  const day = new Map(merged.map((m) => [m.number, m.day]));
  const out = {};
  for (const r of rows) {
    const days = [...new Set([...r.evidence.matchAll(/#(\d+)/g)].map((m) => Number(m[1])))].flatMap((n) => (day.has(n) ? [day.get(n)] : [])).sort();
    out[r.id] = { start: [days[0], laneSince[r.id]].filter(Boolean).sort()[0] ?? null, end: isDone(r) ? days.at(-1) ?? null : null };
  }
  return out;
};
