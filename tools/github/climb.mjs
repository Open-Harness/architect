// The climb (K45, Goal 18's slice 13): for each build, the alpha and Capxul, and each dimension, its value at every
// commit or event that moved it. Read-only; the pure parts are exported and tested (climb.test.mjs).
//   node tools/github/climb.mjs --slices <slices.json> --out <dir>
// writes <dir>/history.json and <dir>/items.json, each `{ rows, meta }`, the two files the climb dashboard reads
// (tools/github/climb-dashboard/README.md). Run it from the repository root after `git fetch origin main goal/stage-1
// goal/capxul`.
// slices.json: GitHub's slice issues of Goals 16 and 18, [{ number, title, state, closed_at, created_at }], as
// `gh api -X GET search/issues -f q='repo:<repo> is:issue label:kind:slice label:goal-18'` gives them.
// Dimensions:
//   capabilities  the board's rows in each build by stage, from docs/canon/status.md on main, and their weighted progress
//   tests         the alpha's check files, green (none of its tests on its suite's expected-failing list) and red; and
//                 Capxul's journeys written. A file is the unit because it is exact in git: its red list is a file of its
//                 own (`expected-failing/<check>.txt`, G9; GOAL18-climb-check-files). A green file turns red again only
//                 when its author adds tests that fail first. `nx run e2e:totals` counts the tests.
//   slices        each build's slices done and open
// The tests' history is on goal/stage-1 until Gate M1's suites reached main (23 November), then on main.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { APP_MILESTONES, STAGES, parseBoard } from "./board.mjs";
import { STAGE_SHARE } from "./roadmap.mjs";

/** The alpha's suites (K44, section 2): the core, Gate M1, ortho new and add, the acceptance check (slice 11), the chain basics, and prove's own checks. */
export const ALPHA_SUITES = ["m0", "m1", "m2", "acceptance", "layer1", "layer2", "stage1", "on-chain", "climb", "grid"];
/** Check files the alpha leaves out: the portal's graphs, which wait with its screens (K44, call 2; M1.50). */
export const NOT_ALPHA = ["m1/40-m1-50-graph.test.ts"];
/** The board was first whole on the evening of 23 November (#780, #791); its history starts there. */
export const BOARD_WHOLE_AT = "2026-11-23T23:00:00Z";

/** An expected-failing list's keys: one per line, `#` lines and blanks skipped (e2e/totals/totals.mjs). */
export const countRed = (text) => text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).length;

/**
 * One tree's check files per suite: `files` is [{ file, text? }] under e2e/ (paths relative to e2e/), and a list's text
 * is read only for `expected-failing/*.txt`. A check is red when its own list holds a key; a list with no check file is
 * stale and not counted. Returns { suite: { all, red } }.
 */
export const checkFiles = (files, read) => {
  const by = Object.fromEntries(ALPHA_SUITES.map((s) => [s, { all: 0, red: 0 }]));
  const checks = new Set(files.filter((f) => f.file.endsWith(".test.ts") && !f.file.includes("/expected-failing/") && !NOT_ALPHA.includes(f.file)).map((f) => f.file));
  for (const file of checks) {
    const suite = file.split("/")[0];
    if (by[suite]) by[suite].all++;
  }
  for (const f of files) {
    const m = f.file.match(/^([^/]+)\/expected-failing\/(.+)\.txt$/);
    if (!m || !by[m[1]] || !checks.has(`${m[1]}/${m[2]}.test.ts`)) continue;
    if (countRed(read(f)) > 0) by[m[1]].red++;
  }
  return by;
};

/** Each row's build as the board says now: the alpha's milestone, or Capxul's path. Others climb in neither. */
export const lanesOf = (rows) => new Map(rows.flatMap((r) => {
  const m = APP_MILESTONES[r.milestone];
  if (!m) return [];
  if (r.milestone === "alpha") return [[r.id, "alpha"]];
  return m.app === "Capxul" ? [[r.id, "Capxul"]] : [];
}));

/** One page's capability points for each build: a count per stage and the weighted progress, in percent. */
export const capabilityPoints = (at, lanes, rows) => {
  const stageAt = new Map(rows.map((r) => [r.id, r.stage]));
  return ["alpha", "Capxul"].flatMap((lane) => {
    const ids = [...lanes].filter(([, l]) => l === lane).map(([id]) => id);
    const stages = ids.map((id) => stageAt.get(id) ?? "provisional");
    return [
      ...STAGES.map((s) => ({ at, lane, dimension: "capabilities", series: s, value: stages.filter((x) => x === s).length })),
      { at, lane, dimension: "capabilities", series: "progress", value: ids.length ? Math.round((100 * stages.reduce((n, s) => n + STAGE_SHARE[s], 0)) / ids.length) : 0 },
    ];
  });
};

/** The slices' points: done and open in each build after every opening and closing. The alpha's are Goal 18's from slice 4. */
export const slicePoints = (issues) => {
  const slices = issues
    .map((i) => ({ ...i, goal: Number(i.title.match(/^Goal (\d+) · /)?.[1]), slice: i.title.match(/^Goal \d+ · (\w+) · /)?.[1] }))
    .filter((i) => (i.goal === 18 && Number(i.slice) >= 4) || i.goal === 16);
  const laneOf = (i) => (i.goal === 18 ? "alpha" : "Capxul");
  const events = slices.flatMap((i) => [{ at: i.created_at, i, d: 0 }, ...(i.closed_at ? [{ at: i.closed_at, i, d: 1 }] : [])]).sort((a, b) => a.at.localeCompare(b.at));
  const tally = { alpha: { all: 0, done: 0 }, Capxul: { all: 0, done: 0 } };
  const points = events.flatMap((e) => {
    const lane = laneOf(e.i);
    const t = tally[lane];
    if (e.d) t.done++;
    else t.all++;
    return [{ at: e.at, lane, dimension: "slices", series: "done", value: t.done }, { at: e.at, lane, dimension: "slices", series: "open", value: t.all - t.done }];
  });
  const items = slices.map((i) => ({ lane: laneOf(i), dimension: "slices", id: `#${i.number}`, name: i.title.replace(/^Goal \d+ · /, ""), group: `Goal ${i.goal}`, status: i.state === "closed" ? "done" : "open" }));
  return { points, items };
};

/** Drops a point that repeats the one before it in its build, dimension and series. */
export const changesOnly = (points) => {
  const last = new Map();
  return points.filter((p) => {
    const key = `${p.lane}|${p.dimension}|${p.series}`;
    if (last.get(key) === p.value) return false;
    last.set(key, p.value);
    return true;
  });
};

const main = () => {
  const flag = (name) => {
    const at = process.argv.indexOf(name);
    if (at < 0 || !process.argv[at + 1]) throw new Error(`climb.mjs needs ${name} <path>`);
    return process.argv[at + 1];
  };
  const [slicesFile, out] = [flag("--slices"), flag("--out")];
  // Every time is UTC, so the history sorts and compares as text whatever zone a commit was made in.
  const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 256 << 20, env: { ...process.env, TZ: "UTC" } });
  const blobs = new Map();
  const blob = (sha) => (blobs.has(sha) ? blobs.get(sha) : blobs.set(sha, git("cat-file", "-p", sha)).get(sha));
  const tree = (commit, path) => git("ls-tree", "-r", commit, "--", path).split("\n").filter(Boolean).map((l) => ({ sha: l.split(/\s/)[2], file: l.split("\t")[1] }));
  const commits = (ref, paths) => git("log", "--first-parent", "--reverse", "--date=iso-strict-local", "--format=%H %cd", ref, "--", ...paths).split("\n").filter(Boolean).map((l) => ({ sha: l.split(" ")[0], at: l.split(" ")[1] }));

  const today = parseBoard(readFileSync("docs/canon/status.md", "utf8")).rows;
  const lanes = lanesOf(today);
  const points = [];
  for (const c of commits("origin/main", ["docs/canon/status.md"])) {
    if (c.at < BOARD_WHOLE_AT) continue;
    points.push(...capabilityPoints(c.at, lanes, parseBoard(git("show", `${c.sha}:docs/canon/status.md`)).rows));
  }
  // The alpha's check files: on goal/stage-1 until Gate M1's suites reached main, then on main.
  const landed = commits("origin/main", ["e2e/m1"])[0]?.at;
  let suites = {};
  const testCommits = [
    ...commits("origin/goal/stage-1", ["e2e"]).filter((c) => !landed || c.at < landed),
    ...commits("origin/main", ["e2e"]).filter((c) => !landed || c.at >= landed),
  ];
  for (const c of testCommits) {
    const files = tree(c.sha, "e2e").map(({ sha, file }) => ({ sha, file: file.slice("e2e/".length) }));
    suites = checkFiles(files, (f) => blob(f.sha));
    const all = Object.values(suites).reduce((n, s) => n + s.all, 0);
    const red = Object.values(suites).reduce((n, s) => n + s.red, 0);
    for (const [series, value] of [["green", all - red], ["red", red], ["all", all]]) points.push({ at: c.at, lane: "alpha", dimension: "tests", series, value });
  }
  // Capxul's journeys, written on goal/capxul; pass and fail arrive with Goal 16's slice 13, its journeys in CI.
  for (const c of commits("origin/goal/capxul", ["examples/capxul/journeys"])) {
    const n = tree(c.sha, "examples/capxul/journeys").filter(({ file }) => file.endsWith(".ts") && !file.includes("/support/")).length;
    points.push({ at: c.at, lane: "Capxul", dimension: "tests", series: "written", value: n });
  }
  const slices = slicePoints(JSON.parse(readFileSync(slicesFile, "utf8")));
  points.push(...slices.points);
  const items = [
    ...today.filter((r) => lanes.has(r.id)).map((r) => ({ lane: lanes.get(r.id), dimension: "capabilities", id: r.id, name: r.name, group: r.milestone, status: r.stage })),
    ...Object.entries(suites).map(([s, v]) => ({ lane: "alpha", dimension: "tests", id: `e2e/${s}`, name: `e2e/${s}`, group: "suite", status: `${v.red ? `${v.all - v.red} of ${v.all}` : `all ${v.all}`} check files green`, green: v.all - v.red, files: v.all })),
    ...slices.items,
  ];
  const history = changesOnly(points.sort((a, b) => a.at.localeCompare(b.at))).map((p) => ({ ...p, day: p.at.slice(0, 10) }));
  const meta = [
    { label: "climb.mjs", value: readFileSync(new URL(import.meta.url), "utf8"), type: "code", lang: "javascript" },
    { label: "Inputs", value: "docs/canon/status.md on main from 23 November; the alpha's check files and their expected-failing lists on goal/stage-1, then main; Capxul's journeys on goal/capxul; the slice issues of Goals 16 and 18" },
    { label: "Made", value: new Date().toISOString() },
  ];
  writeFileSync(join(out, "history.json"), `${JSON.stringify({ rows: history, meta })}\n`);
  writeFileSync(join(out, "items.json"), `${JSON.stringify({ rows: items, meta })}\n`);
  process.stdout.write(`${history.length} points, ${items.length} items, in ${out}\n`);
};

if (import.meta.url === `file://${process.argv[1]}`) main();
