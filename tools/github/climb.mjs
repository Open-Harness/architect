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
//   tests         the alpha's suites: tests passing and failing (the expected-failing lists); Capxul's journeys written
//   slices        each build's slices done and open
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { APP_MILESTONES, STAGES, parseBoard } from "./board.mjs";
import { STAGE_SHARE } from "./roadmap.mjs";

/** The alpha's suites (K44, section 2): the core, Gate M1, ortho new and add, the chain basics, the climb itself. */
export const ALPHA_SUITES = ["m0", "m1", "m2", "layer1", "layer2", "stage1", "on-chain", "climb", "grid"];
/** The board was written on the evening of 23 November (#780, #791); a page with fewer rows is before it was whole. */
export const WHOLE_BOARD = 100;

/** A test is a `test(` or `it(` call at the start of a line, with its modifiers. */
export const countTests = (text) => (text.match(/^\s*(?:test|it)(?:\.(?:skip|only|todo|fails))?(?:\.each\([\s\S]*?\))?\(/gm) ?? []).length;
/** An expected-failing list's keys: one per line, `#` lines and blanks skipped (e2e/totals/totals.mjs). */
export const countRed = (text) => text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).length;

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
  const flag = (name) => process.argv[process.argv.indexOf(name) + 1];
  const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 256 << 20 });
  const blobs = new Map();
  const blob = (sha) => (blobs.has(sha) ? blobs.get(sha) : blobs.set(sha, git("cat-file", "-p", sha)).get(sha));
  const tree = (commit, path) => git("ls-tree", "-r", commit, "--", path).split("\n").filter(Boolean).map((l) => ({ sha: l.split(/\s/)[2], file: l.split("\t")[1] }));
  const commits = (ref, paths) => git("log", "--first-parent", "--reverse", "--format=%H %cI", ref, "--", ...paths).split("\n").filter(Boolean).map((l) => ({ sha: l.split(" ")[0], at: l.split(" ")[1] }));

  const today = parseBoard(readFileSync("docs/canon/status.md", "utf8")).rows;
  const lanes = lanesOf(today);
  const points = [];
  for (const c of commits("origin/main", ["docs/canon/status.md"])) {
    const rows = parseBoard(git("show", `${c.sha}:docs/canon/status.md`)).rows;
    if (rows.length >= WHOLE_BOARD) points.push(...capabilityPoints(c.at, lanes, rows));
  }
  // The alpha's tests: on goal/stage-1 until Gate M1's suites reached main, then on main.
  const landed = commits("origin/main", ["e2e/m1"])[0]?.at;
  let suites = {};
  for (const c of [...commits("origin/goal/stage-1", ["e2e"]).filter((c) => !landed || c.at < landed), ...commits("origin/main", ["e2e"])]) {
    suites = Object.fromEntries(ALPHA_SUITES.map((s) => [s, { tests: 0, red: 0 }]));
    for (const { sha, file } of tree(c.sha, "e2e")) {
      const [, suite, ...rest] = file.split("/");
      if (!suites[suite]) continue;
      if (rest[0] === "expected-failing" && file.endsWith(".txt")) suites[suite].red += countRed(blob(sha));
      else if (file.endsWith(".test.ts")) suites[suite].tests += countTests(blob(sha));
    }
    const all = Object.values(suites).reduce((n, s) => n + s.tests, 0);
    const red = Object.values(suites).reduce((n, s) => n + s.red, 0);
    points.push({ at: c.at, lane: "alpha", dimension: "tests", series: "passing", value: all - red }, { at: c.at, lane: "alpha", dimension: "tests", series: "failing", value: red });
  }
  // Capxul's journeys, written on goal/capxul; pass and fail arrive with Goal 16's slice 13, its journeys in CI.
  for (const c of commits("origin/goal/capxul", ["examples/capxul/journeys"])) {
    const n = tree(c.sha, "examples/capxul/journeys").filter(({ file }) => file.endsWith(".ts") && !file.includes("/support/")).length;
    points.push({ at: c.at, lane: "Capxul", dimension: "tests", series: "written", value: n });
  }
  const slices = slicePoints(JSON.parse(readFileSync(flag("--slices"), "utf8")));
  points.push(...slices.points);
  const items = [
    ...today.filter((r) => lanes.has(r.id)).map((r) => ({ lane: lanes.get(r.id), dimension: "capabilities", id: r.id, name: r.name, group: r.milestone, status: r.stage })),
    ...Object.entries(suites).map(([s, v]) => ({ lane: "alpha", dimension: "tests", id: `e2e/${s}`, name: `e2e/${s}`, group: "suite", status: v.red ? `${v.tests - v.red} of ${v.tests} pass` : `all ${v.tests} pass`, passing: v.tests - v.red, tests: v.tests })),
    ...slices.items,
  ];
  const history = changesOnly(points.sort((a, b) => a.at.localeCompare(b.at))).map((p) => ({ ...p, day: p.at.slice(0, 10) }));
  const meta = [
    { label: "climb.mjs", value: readFileSync(new URL(import.meta.url), "utf8"), type: "code", lang: "javascript" },
    { label: "Inputs", value: "docs/canon/status.md on main from 23 November; the alpha's e2e suites and expected-failing lists on goal/stage-1, then main; Capxul's journeys on goal/capxul; the slice issues of Goals 16 and 18" },
    { label: "Made", value: new Date().toISOString() },
  ];
  const out = flag("--out");
  writeFileSync(join(out, "history.json"), `${JSON.stringify({ rows: history, meta })}\n`);
  writeFileSync(join(out, "items.json"), `${JSON.stringify({ rows: items, meta })}\n`);
  process.stdout.write(`${history.length} points, ${items.length} items, in ${out}\n`);
};

if (import.meta.url === `file://${process.argv[1]}`) main();
