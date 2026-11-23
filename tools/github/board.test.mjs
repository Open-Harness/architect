// node --test tools/github/board.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { APP_MILESTONES, BOARD_COLUMNS, NOT_YET_NEEDED, boardCounts, claimOverlaps, parseBoard } from "./board.mjs";
import { ORIGINAL, adoptionProblems, boardPlan, foldComment, itemBody, itemLabels, itemMarker, issueOfRow } from "./boardPlan.mjs";
import { LABELS, typeOf } from "./plan.mjs";
import { boardStatus, boardValues, projectFields, projectPlan } from "./project.mjs";

const head = `| ${BOARD_COLUMNS.join(" | ")} |\n|${BOARD_COLUMNS.map(() => "---").join("|")}|`;
const page = (...lines) => `# Status\n\n## 1. The releases\n\n| id | other |\n|---|---|\n| x | y |\n\n## 2. The capability map\n\nProse.\n\n### A group\n\n${head}\n${lines.join("\n")}\n\n## 3. Holes\n`;
const row = (id, item, stage, by, release, milestone, lane, touches, needs, evidence) =>
  `| ${[id, item, stage, by, release, milestone, lane, touches, needs, evidence].join(" | ")} |`;

const sample = page(
  row("secrets", "Secrets by declaration: per environment only", "building", "superagent", "beta", "coding agent", "goal-17", "`packages/host-cloudflare`, `packages/orthograph/src/modules/secrets`", "—", "#690; slice M2.04"),
  row("things", "Things: fields, machines", "built", "framework", "preview", "—", "none", "`packages/orthograph/src/modules/things`", "—", "slice M1.03"),
  row("sign-in", "Sign-in (`@orthograph/auth`: people, sessions): Better Auth", "provisional", "superagent", "1.0", "launch", "none", "`packages/auth`", "secrets, things", "slices M2.05"),
  row("reports", "Reports: the books' statements", "provisional", "Capxul", "1.0", "books", "none", "`packages/projections`", "things", "K42"),
  row("gap-node-host", "Node host: the server runs only as a Worker", "provisional", "framework", "—", "—", "none", "—", "—", "no slice"),
);

test("the page's rows: every column read, the kind from the id, the name from the item, the tables outside section 2 ignored", () => {
  const { rows, errors } = parseBoard(sample);
  assert.deepEqual(errors, []);
  assert.deepEqual(rows.map((r) => r.id), ["secrets", "things", "sign-in", "reports", "gap-node-host"]);
  const secrets = rows[0];
  assert.deepEqual([secrets.kind, secrets.name, secrets.stage, secrets.pulledBy, secrets.release, secrets.milestone, secrets.lane], ["capability", "Secrets by declaration", "building", "superagent", "beta", "coding agent", "goal-17"]);
  assert.deepEqual(secrets.touches, ["packages/host-cloudflare", "packages/orthograph/src/modules/secrets"]);
  assert.equal(rows[2].name, "Sign-in (`@orthograph/auth`: people, sessions)", "a colon inside parentheses is not the end of the name");
  assert.deepEqual(rows[2].needs, ["secrets", "things"]);
  assert.equal(rows[4].kind, "gap");
  assert.deepEqual([rows[4].release, rows[4].milestone, rows[4].lane, rows[4].touches], [null, null, null, []]);
  assert.deepEqual(boardCounts(rows).byPulledBy, { superagent: 2, Capxul: 1, framework: 2 });
  assert.equal(boardCounts(rows).byStage.provisional, 3);
});

test("a row that does not read is an error naming it, never a silent skip", () => {
  const bad = (line) => parseBoard(page(line)).errors.join("\n");
  assert.match(bad(row("A_b", "x", "building", "framework", "—", "—", "none", "—", "—", "")), /id is not lowercase/);
  assert.match(bad(row("a", "x: y", "half-built", "framework", "—", "—", "none", "—", "—", "")), /stage 'half-built'/);
  assert.match(bad(row("a", "x: y", "built", "everyone", "—", "—", "none", "—", "—", "")), /pulled by 'everyone'/);
  assert.match(bad(row("a", "x: y", "built", "framework", "2.0", "—", "none", "—", "—", "")), /release '2.0'/);
  assert.match(bad(row("a", "x: y", "built", "framework", "—", "someday", "none", "—", "—", "")), /milestone 'someday'/);
  assert.match(bad(row("a", "x: y", "built", "framework", "—", "—", "team-4", "—", "—", "")), /lane 'team-4'/);
  assert.match(bad(row("a", "x: y", "built", "framework", "—", "—", "none", "packages/x", "—", "")), /touches is not a list/);
  assert.match(bad(row("a", "x: y", "built", "framework", "—", "—", "none", "—", "ghost", "")), /needs 'ghost', which is no row/);
  assert.match(bad("| a | too | few |"), /3 cells/);
  assert.match(parseBoard("# no map\n").errors[0], /no section/);
});

test("fail closed: a table in the map whose header is misspelt is an error, and the legend is the one table allowed", () => {
  const good = row("a", "x: y", "built", "framework", "—", "—", "none", "—", "—", "");
  const misspelt = page(good).replace("| Stage |", "| Stag |");
  const { errors } = parseBoard(misspelt);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /header is not the board's columns/);
  const legend = page(good).replace("Prose.", "| Column | What it holds |\n|---|---|\n| id | a name |\n\nProse.");
  assert.deepEqual(parseBoard(legend).errors, []);
  assert.equal(parseBoard(legend).rows.length, 1);
  assert.match(parseBoard(page(good).replace("Prose.", "| Colum | What |\n|---|---|\n| x | y |")).errors[0], /header is not the board's columns/);
});

test("the split and the releases: a framework row has no app milestone, and K42 decides the release", () => {
  const bad = (line) => parseBoard(page(line)).errors.join("\n");
  assert.match(bad(row("a", "x: y", "built", "framework", "—", "books", "none", "—", "—", "")), /is Capxul's, but the row is pulled by framework/);
  assert.match(bad(row("a", "x: y", "built", "superagent", "—", "books", "none", "—", "—", "")), /is Capxul's, but the row is pulled by superagent/);
  assert.match(bad(row("a", "x: y", "built", "Capxul", "beta", "books", "none", "—", "—", "")), /only Capxul pulls ships in 1.0/);
  assert.match(bad(row("a", "x: y", "built", "superagent", "1.0", "coding agent", "none", "—", "—", "")), /ships in beta/);
  assert.match(bad(row("a", "x: y", "built", "superagent", "beta", "launch", "none", "—", "—", "")), /ships in 1.0/);
  const twice = page(row("a", "x: y", "built", "framework", "—", "—", "none", "—", "—", ""), row("a", "y: z", "built", "framework", "—", "—", "none", "—", "—", ""));
  assert.match(parseBoard(twice).errors.join(), /duplicate id/);
  const circle = page(row("a", "x: y", "built", "framework", "—", "—", "none", "—", "b", ""), row("b", "y: z", "built", "framework", "—", "—", "none", "—", "a", ""));
  assert.match(parseBoard(circle).errors.join(), /run in a circle/);
});

test("the real status page reads, every id is unique, and every app milestone is used by its own app", () => {
  const { rows, errors } = parseBoard(readFileSync("docs/canon/status.md", "utf8"));
  assert.deepEqual(errors, []);
  assert.ok(rows.length > 60);
  for (const r of rows) if (r.milestone) assert.equal(APP_MILESTONES[r.milestone].app, r.pulledBy);
  // K42's split: what the superagent pulls and what Capxul pulls.
  const by = (id) => rows.find((r) => r.id === id).pulledBy;
  for (const id of ["versions", "timers", "safe-repeats", "events-in", "outbox", "secrets", "webhook-doors", "pages", "sign-in", "live-deploy"]) assert.equal(by(id), "superagent", id);
  for (const id of ["reports", "lists", "trees", "dates"]) assert.equal(by(id), "Capxul", id);
  assert.notEqual(by("teams"), by("companies"), "organisations are separate (K42, call 10)");
  assert.deepEqual(claimOverlaps(rows), []);
});

const empty = { labels: [], milestones: [], issues: [], ownerType: "Organization", types: [] };
const url = "https://example.test/status.md";
const plan = (rows, state) => boardPlan({ rows, state, statusUrl: url, typeOf });
const { rows } = parseBoard(sample);

test("from nothing: the lane label, every milestone, an issue per row in the first milestone that pulls it, the built ones closed", () => {
  const steps = plan(rows, empty);
  assert.deepEqual(steps.filter((s) => s.do === "createLabel").map((s) => s.name), ["lane:goal-17"]);
  assert.deepEqual(steps.filter((s) => s.do === "createMilestone").map((s) => s.title), [...Object.values(APP_MILESTONES).map((m) => m.title), NOT_YET_NEEDED]);
  const issues = steps.filter((s) => s.do === "createIssue");
  assert.equal(issues.length, rows.length);
  const secrets = issues.find((s) => s.key === "item secrets");
  assert.deepEqual([secrets.title, secrets.milestone, secrets.type], ["Secrets by declaration", "Superagent: the coding agent end to end", "Capability"]);
  assert.deepEqual(secrets.labels, ["kind:capability", "release:beta", "lane:goal-17"]);
  assert.ok(secrets.body.startsWith(itemMarker("secrets")) && secrets.body.includes("**Touches:** `packages/host-cloudflare`"));
  assert.equal(issues.find((s) => s.key === "item gap-node-host").milestone, NOT_YET_NEEDED);
  assert.equal(issues.find((s) => s.key === "item gap-node-host").type, "Gap");
  assert.deepEqual(issues.find((s) => s.key === "item reports").labels, ["kind:capability", "release:1.0"]);
  assert.deepEqual(steps.filter((s) => s.do === "closeIssue").map((s) => s.issue), ["item things"], "a built row's issue is closed");
});

const held = (rows, over = {}) => ({
  labels: [...LABELS, { name: "lane:goal-17", color: "c2e0c6", description: "Claimed by Goal 17: it works this item and its paths (K42, section 3)" }],
  milestones: Object.values(APP_MILESTONES).map((m, k) => ({ number: k + 1, ...m })).concat([{ number: 99, title: NOT_YET_NEEDED, description: "Board items no app has pulled yet, with no date (K42, section 5)." }]),
  ownerType: "Organization",
  types: [],
  issues: rows.map((r, k) => ({
    number: 100 + k, title: r.name, body: itemBody(r, url), state: r.stage === "built" ? "closed" : "open", trusted: true, pullRequest: false,
    labels: itemLabels(r), milestone: r.milestone ? APP_MILESTONES[r.milestone].title : NOT_YET_NEEDED, ...over,
  })),
});

test("run twice: once GitHub holds every row, there is nothing to do, even with other labels on an issue", () => {
  const state = held(rows);
  assert.deepEqual(plan(rows, state), []);
  state.issues[0].labels.push("harness:amp");
  assert.deepEqual(plan(rows, state), [], "a label the board does not own is left alone");
});

test("a row that changed: the issue is rewritten, its labels and milestone moved, and it is closed when built", () => {
  const state = held(rows);
  const moved = rows.map((r) => (r.id === "secrets" ? { ...r, stage: "built", lane: null, release: "1.0", milestone: "launch" } : r));
  state.issues[0].labels.push("harness:amp");
  const [step, ...rest] = plan(moved, state);
  assert.equal(rest.length, 0);
  assert.deepEqual([step.do, step.number, step.state, step.milestone], ["updateIssue", 100, "closed", "Superagent: launch"]);
  assert.deepEqual(step.labels, ["harness:amp", "kind:capability", "release:1.0"], "its own labels stay; the lane is dropped");
  assert.ok(step.body.includes("**Stage:** built"));
});

test("a built row reopened when its stage goes back, and a stray copy or an outsider's issue is never taken for the row's", () => {
  const state = held(rows);
  const back = rows.map((r) => (r.id === "things" ? { ...r, stage: "building" } : r));
  assert.deepEqual(plan(back, state).map((s) => [s.number, s.state]), [[101, "open"]]);
  const dup = { ...state.issues[1], number: 500, trusted: true };
  assert.equal(issueOfRow(rows[1], [dup, state.issues[1]]).number, 101, "the oldest wins");
  assert.equal(issueOfRow(rows[1], [{ ...state.issues[1], trusted: false }]), undefined);
  assert.equal(issueOfRow(rows[1], [{ ...state.issues[1], pullRequest: true }]), undefined);
  assert.equal(issueOfRow(rows[1], [{ ...state.issues[1], labels: [] }]), undefined, "an issue without a board kind is not the row's");
});

test("the beta label says the beta of K42, and the board's kind has a label and an issue type", () => {
  assert.equal(LABELS.find((l) => l.name === "release:beta").description, "Ships in the beta: the framework the superagent proves (K42)");
  assert.ok(LABELS.some((l) => l.name === "kind:capability"));
  assert.equal(typeOf("capability", { ownerType: "User" }), "Task");
});

test("claims: two goals on one path are named, the same goal or a finished item is not", () => {
  const mk = (id, lane, stage, ...touches) => ({ id, lane, stage, touches });
  assert.equal(claimOverlaps([mk("a", "goal-17", "building", "packages/cli"), mk("b", "goal-16", "building", "packages/cli/src")]).length, 1);
  assert.equal(claimOverlaps([mk("a", "goal-17", "building", "packages/cli"), mk("b", "goal-17", "building", "packages/cli")]).length, 0);
  assert.equal(claimOverlaps([mk("a", "goal-17", "built", "packages/cli"), mk("b", "goal-16", "building", "packages/cli")]).length, 0);
  assert.equal(claimOverlaps([mk("a", "goal-17", "building", "packages/cli"), mk("b", "goal-16", "building", "packages/cli-two")]).length, 0, "a sibling prefix is not a parent");
});

const goal = { number: 17, milestone: "Goal 17: the superagent", release: "beta", status: "running", lead: {} };
test("the Project: Stage, Pulled by and Lane join the fields, the board's items are set and cleared, and no fields change without the board", () => {
  const withBoard = projectFields([goal], rows).map((f) => f.name);
  assert.deepEqual(withBoard.slice(-3), ["Stage", "Pulled by", "Lane"]);
  assert.deepEqual(projectFields([goal]).map((f) => f.name).length, 9);
  assert.deepEqual(projectFields([goal], rows).find((f) => f.name === "Kind").options.map((o) => o.name).slice(-2), ["capability", "grill"]);
  const state = held(rows);
  const steps = projectPlan({ goals: [goal], issues: state.issues.map((i) => ({ ...i, nodeId: `I${i.number}` })), project: null, rows });
  const set = (n, f) => steps.find((s) => s.do === "setValue" && s.number === n && s.field === f)?.value;
  assert.deepEqual([set(100, "Stage"), set(100, "Pulled by"), set(100, "Release"), set(100, "Lane"), set(100, "Kind"), set(100, "Goal")], ["building", "superagent", "beta", "goal-17", "capability", "Goal 17"]);
  assert.equal(set(101, "Status"), "Done");
  assert.ok(!steps.some((s) => s.number === 104 && s.field === "Release"), "a row with no release sets none");
  assert.deepEqual(boardValues(rows[4], { state: "open" }, [goal]).Release, null);
});

test("the Project, run twice: once it holds each board item's fields there is nothing to do", () => {
  const state = held(rows);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const issues = state.issues.map((i) => ({ ...i, nodeId: `I${i.number}` }));
  const fields = projectFields([goal], rows).map((f) => ({ id: `F-${f.name}`, name: f.name, dataType: f.dataType, options: f.options.map((o, k) => ({ id: `${f.name}${k}`, name: o.name })) }));
  const items = rows.map((r, k) => ({ id: `T${k}`, number: 100 + k, values: Object.fromEntries(Object.entries(boardValues(r, issues[k], [goal], { byId, dates: null })).filter(([, v]) => v !== null && v !== undefined)) }));
  const views = projectPlan({ goals: [goal], issues, project: null, rows }).filter((s) => s.do === "createView").map((s, k) => ({ id: `V${k}`, name: s.name, layout: s.layout, filter: s.filter }));
  assert.deepEqual(projectPlan({ goals: [goal], issues, project: { id: "P", fields, items, views }, rows }), []);
});

test("every Item starts with a short name and a colon, and the issue's title is the name", () => {
  const bad = (item) => parseBoard(page(row("a", item, "built", "framework", "—", "—", "none", "—", "—", ""))).errors.join();
  assert.match(bad("no name here"), /short name and a colon/);
  assert.match(bad(`${"long ".repeat(14)}name: what it is`), /short name and a colon/);
  assert.equal(bad("Short name: what it is"), "");
});

const ask = (number, body = "The ask, in its own words.\r\nSecond line.", extra = {}) => ({
  number, title: `Ask (Goal 16, for Goal 3): something #${number}`, body, state: "open", trusted: true, pullRequest: false,
  labels: ["kind:ask", "release:1.0", "goal-17", "harness:amp"], milestone: "Goal 17: the superagent", type: "Ask", ...extra,
});
const adopting = parseBoard(page(
  row("principals", "Principals: agent, service and system callers", "building", "superagent", "beta", "coding agent", "goal-17", "`packages/orthograph/src/modules/roles`", "—", "`issue #531`, `folds #533`; K40 fix 1"),
  row("versions", "Versions: things with `versions:`", "provisional", "superagent", "beta", "coding agent", "none", "`packages/orthograph`", "principals", "`issue #532`"),
)).rows;

test("adopting: the row's issue is an existing one, relabelled and moved, its words kept beneath the page, the others folded", () => {
  assert.deepEqual([adopting[0].adopts, adopting[0].folds, adopting[1].adopts, adopting[1].folds], [531, [533], 532, []]);
  const state = { ...empty, issues: [ask(531), ask(532), ask(533)] };
  const steps = plan(adopting, state);
  assert.equal(steps.filter((s) => s.do === "createIssue").length, 0, "nothing is created beside an adopted issue");
  const first = steps.find((s) => s.do === "updateIssue" && s.number === 531);
  assert.deepEqual([first.adopt, first.title, first.milestone, first.type], [true, "Principals", "Superagent: the coding agent end to end", "Capability"]);
  assert.deepEqual(first.labels, ["goal-17", "harness:amp", "kind:capability", "release:beta", "lane:goal-17"], "kind:ask goes, the others stay");
  assert.ok(first.body.startsWith(itemMarker("principals")));
  assert.ok(first.body.includes(`\n\n${ORIGINAL}\n> The text this issue had before the board adopted it`));
  assert.ok(first.body.endsWith("The ask, in its own words.\nSecond line."), "line endings normalised, words intact");
  assert.deepEqual(steps.filter((s) => s.do === "foldIssue").map((s) => [s.number, s.into, s.row]), [[533, 531, "principals"]]);
  assert.match(foldComment(adopting[0], 531), /same item as #531/);
});

test("adopting, run twice: the marker is on the issue, so there is no second adoption, no lost text and no second fold", () => {
  const first = plan(adopting, { ...empty, issues: [ask(531), ask(532), ask(533)] });
  const issues = [531, 532, 533].map((n) => {
    const s = first.find((x) => x.do === "updateIssue" && x.number === n);
    const folded = first.some((x) => x.do === "foldIssue" && x.number === n);
    return s ? ask(n, s.body, { labels: s.labels, milestone: s.milestone, type: s.type, title: s.title }) : ask(n, undefined, { state: folded ? "closed" : "open" });
  });
  const state = {
    ...empty,
    issues,
    labels: [{ name: "lane:goal-17" }],
    milestones: first.filter((s) => s.do === "createMilestone").map((s, k) => ({ number: k + 1, title: s.title, description: s.description })),
  };
  const second = plan(adopting, state);
  assert.deepEqual(second.filter((s) => s.do === "updateIssue" || s.do === "foldIssue").map((s) => [s.do, s.number]), [], "nothing left to write");
  assert.ok(issueOfRow(adopting[0], issues), "found again, by its number or its marker");
});

test("adoption problems: an issue that is missing, a pull request, an outsider's or another row's is named before anything is written", () => {
  const rowsBad = parseBoard(page(
    row("a", "A: one", "building", "framework", "—", "—", "none", "—", "—", "`issue #1`, `folds #2, #3`"),
    row("b", "B: two", "building", "framework", "—", "—", "none", "—", "—", "`issue #4`, `folds #5`"),
  )).rows;
  const issues = [ask(1), ask(2, "x", { pullRequest: true }), ask(3, "x", { trusted: false }), ask(4, `${itemMarker("c")}\nbody`, { labels: ["kind:capability"] })];
  assert.deepEqual(adoptionProblems(rowsBad, issues), [
    "a folds #2, which is a pull request",
    "a folds #3, which an outsider opened",
    "b adopts #4, which is the board's issue for c",
    "b folds #5, which is no issue",
  ]);
  const bad = (cell) => parseBoard(page(row("a", "A: one", "building", "framework", "—", "—", "none", "—", "—", cell), row("b", "B: two", "building", "framework", "—", "—", "none", "—", "—", "`issue #7`"))).errors.join();
  assert.match(bad("`issue #1`, `issue #2`"), /adopts 2 issues/);
  assert.match(bad("`folds #1`"), /folds issues but adopts none/);
  assert.match(bad("`issue #7`"), /already adopted or folded by row a/);
});

test("Status (K42, section 5): done when built, running with a lane, ready only when every need is built, else blocked", () => {
  const mk = (id, stage, lane, ...needs) => ({ id, stage, lane, needs });
  const all = [mk("a", "built", null), mk("b", "extracted", null), mk("c", "building", null), mk("d", "provisional", null, "a", "b"), mk("e", "provisional", null, "a", "c"), mk("f", "building", "goal-17", "c"), mk("g", "built", "goal-17", "c")];
  const byId = new Map(all.map((r) => [r.id, r]));
  assert.deepEqual(all.map((r) => boardStatus(r, byId)), ["Done", "Done", "Ready", "Ready", "Blocked", "Running", "Done"]);
});

test("a milestone's due date is written when it differs, and not for 'Not yet needed'", () => {
  const state = { ...empty, milestones: [{ number: 1, title: "Capxul: the books", description: "x", dueOn: "2026-12-01" }] };
  const steps = boardPlan({ rows: [], state, statusUrl: url, typeOf, due: { "Capxul: the books": "2026-12-01", "Capxul: banking": "2026-12-09", [NOT_YET_NEEDED]: "2027-01-01" } });
  assert.deepEqual(steps.filter((s) => s.do === "setMilestoneDue"), [{ do: "setMilestoneDue", title: "Capxul: banking", day: "2026-12-09" }]);
});
