#!/usr/bin/env node
// The goals, mirrored on GitHub (K33), and the board (K42). The briefs are the truth; this makes GitHub hold the same:
// the labels, a milestone per goal, a goal issue per goal and a sub-issue per slice. With `--board`, the capability map
// in docs/canon/status.md is the truth of the items: one issue per row, in the milestone of the first app milestone that
// pulls it, and (with `--project`) the Project's Stage, Pulled by, Release, Lane and Kind. Dry run by default;
// `--apply` writes.
//
//   node tools/github/sync.mjs                         plan, from design/goals/*.md in this checkout
//   node tools/github/sync.mjs --brief origin/goal/on-chain:design/goals/04-on-chain.md
//                                                      also a brief that lives on another branch
//   node tools/github/sync.mjs --goal-branches         also the briefs on origin/goal/* that this checkout lacks
//                                                      (a goal found on one branch only; on two, it is skipped)
//   node tools/github/sync.mjs --migrate               also move open issues and pull requests from goal-<n>
//                                                      labels and release milestones to goal milestones and labels
//   node tools/github/sync.mjs --board --dry-run       also the board: print the plan for the status page's rows,
//                                                      and the counts by stage and by who pulled them
//   node tools/github/sync.mjs --board --project       also the Project's fields for those rows, and the roadmap's dates
//   node tools/github/sync.mjs --apply                 do it
//
// A row adopts an existing issue (`issue #531` in its Evidence cell) and folds duplicates into it (`folds #533`);
// docs/canon/status.md's column legend says how. Writes are paced (pace.mjs) and a rate-limit refusal is waited out.
//
// It needs `gh`, signed in with the `repo` scope (in CI, GH_TOKEN). It never deletes anything. Run one at a time: two
// runs at once can both create the same issue, so the workflow (.github/workflows/goals.yml) runs it in one queue.
import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { boardCounts, claimOverlaps, parseBoard } from "./board.mjs";
import { adoptionProblems, boardPlan, foldComment } from "./boardPlan.mjs";
import { readGoal } from "./frontmatter.mjs";
import { PAUSE_CREATE_MS, PAUSE_WRITE_MS, pause, withRetry } from "./pace.mjs";
import { plan, typeOf } from "./plan.mjs";
import { boardValues, projectPlan } from "./project.mjs";
import { applyProject, hasProjectScope, readProject, tokenScopes } from "./projectGh.mjs";
import { readRoadmap } from "./roadmapGh.mjs";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const migrate = args.includes("--migrate");
const withProject = args.includes("--project");
const withBoard = args.includes("--board");
const dryRun = args.includes("--dry-run");
if (apply && dryRun) {
  process.stderr.write("--apply and --dry-run say opposite things; pass one.\n");
  process.exit(1);
}
const goalBranches = args.includes("--goal-branches");
const extra = args.flatMap((a, i) => (a === "--brief" ? [args[i + 1]] : []));
const git = (...argv) => execFileSync("git", argv, { encoding: "utf8" });
const briefName = /^\d{2}-[a-z0-9-]+\.md$/;
const isBrief = (f) => briefName.test(f) && !f.endsWith("-snags.md");

const gh = (path, { method = "GET", body } = {}) => {
  const argv = ["api", "-H", "Accept: application/vnd.github+json", "-X", method, path];
  if (body) argv.push("--input", "-");
  const out = withRetry(() => execFileSync("gh", argv, { input: body ? JSON.stringify(body) : undefined, encoding: "utf8", maxBuffer: 64 << 20, stdio: ["pipe", "pipe", "pipe"] }));
  return out.trim() === "" ? null : JSON.parse(out);
};
const ghAll = (path) => {
  const out = execFileSync("gh", ["api", "--paginate", "--slurp", path], { encoding: "utf8", maxBuffer: 64 << 20 });
  return JSON.parse(out).flat();
};

const repo = execFileSync("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], { encoding: "utf8" }).trim();
const owner = repo.split("/")[0];

// The Project is the owner's, so it needs the token's `project` scope. Without it a dry run shows the Project's plan
// from nothing, and --apply writes nothing at all.
const projectScope = withProject && hasProjectScope();
if (withProject && apply && !projectScope) {
  process.stderr.write("The token lacks the project scope, so nothing was written. Run: gh auth refresh -s project\n");
  process.exit(3);
}

const sources = [
  ...readdirSync("design/goals")
    .filter(isBrief)
    .map((f) => ({ path: `design/goals/${f}`, ref: null, text: readFileSync(`design/goals/${f}`, "utf8") })),
  ...extra.map((spec) => {
    const [ref, path] = [spec.slice(0, spec.indexOf(":")), spec.slice(spec.indexOf(":") + 1)];
    return { path, ref, text: git("show", `${ref}:${path}`) };
  }),
];

// A brief that lives only on its goal branch (it reaches main when the goal lands): take it when exactly one goal
// branch has a brief of that number and the checkout has none.
if (goalBranches) {
  const here = new Set(sources.map((s) => s.path.match(/(\d{2})-/)[1]));
  const found = new Map();
  for (const ref of git("for-each-ref", "--format=%(refname:short)", "refs/remotes/origin/goal/").split("\n").filter(Boolean)) {
    for (const path of git("ls-tree", "--name-only", ref, "design/goals/").split("\n").filter((f) => isBrief(f.split("/").pop()))) {
      const n = path.split("/").pop().slice(0, 2);
      if (!here.has(n)) found.set(n, [...(found.get(n) ?? []), { path, ref }]);
    }
  }
  for (const [n, hits] of found) {
    if (hits.length > 1) process.stderr.write(`goal ${n}: a brief on ${hits.map((h) => h.ref).join(" and ")}; skipped, pass --brief\n`);
    else sources.push({ ...hits[0], text: git("show", `${hits[0].ref}:${hits[0].path}`) });
  }
}

const goals = [];
for (const s of sources) {
  const r = readGoal(s.path, s.text);
  // A brief it can't read skips only its own goal: the other goals' pages stay fresh, and the run still ends with exit
  // code 2, so the workflow shows red until the brief is fixed.
  if (r.error) {
    process.stderr.write(`skipped: ${r.error}\n`);
    process.exitCode = 2;
    continue;
  }
  if (goals.some((g) => g.number === r.goal.number)) continue; // the checkout's copy wins over a branch's
  goals.push({ ...r.goal, ref: s.ref });
}

// Until a goal lands, its lead keeps its own lines on the goal branch: its status, its lead and "Where it stands". So
// those come from the brief on that branch when the branch has one, even when main has the rest of the brief.
for (const g of goals) {
  if (!g.branch || g.ref) continue;
  const spec = `origin/${g.branch}:${g.brief}`;
  if (spawnSync("git", ["cat-file", "-e", spec]).status !== 0) continue;
  const r = readGoal(g.brief, git("show", spec));
  if (r.error || r.goal.number !== g.number) continue;
  Object.assign(g, { status: r.goal.status, lead: r.goal.lead, stands: r.goal.stands });
}
const old = new Set([1, 2]); // finished before K33: no milestone
const live = goals.filter((g) => !old.has(g.number)).sort((a, b) => a.number - b.number);

const briefUrl = (g) => `https://github.com/${repo}/blob/${g.ref ? g.ref.replace(/^origin\//, "") : "main"}/${g.brief}`;

const readState = () => {
const issues = ghAll(`repos/${repo}/issues?state=all&per_page=100`);
const goalNumbers = issues.filter((i) => !i.pull_request && i.labels.some((l) => l.name === "kind:goal")).map((i) => i.number);
const sliceNumbers = issues.filter((i) => !i.pull_request && i.labels.some((l) => l.name === "kind:slice")).map((i) => i.number);
const subIssues = new Map(goalNumbers.map((n) => [n, ghAll(`repos/${repo}/issues/${n}/sub_issues?per_page=100`).map((x) => x.number)]));
// Only blockers in this repository: GitHub allows a blocker from another, whose number would name a different issue here.
const blockedBy = new Map(sliceNumbers.map((n) => [n, ghAll(`repos/${repo}/issues/${n}/dependencies/blocked_by?per_page=100`)
  .filter((x) => x.repository_url?.endsWith(`/repos/${repo}`)).map((x) => x.number)]));
const owner_ = JSON.parse(execFileSync("gh", ["api", "graphql", "-f", `query={repositoryOwner(login:"${owner}"){id __typename} repository(owner:"${owner}",name:"${repo.split("/")[1]}"){issueTypes(first:20){nodes{name}}}}`], { encoding: "utf8" })).data;
return {
  ownerType: owner_.repositoryOwner.__typename,
  ownerId: owner_.repositoryOwner.id,
  types: (owner_.repository.issueTypes?.nodes ?? []).map((x) => x.name),
  labels: ghAll(`repos/${repo}/labels?per_page=100`).map((l) => ({ name: l.name, color: l.color, description: l.description ?? "" })),
  milestones: ghAll(`repos/${repo}/milestones?state=all&per_page=100`).map((m) => ({ number: m.number, title: m.title, description: m.description ?? "", dueOn: m.due_on ? m.due_on.slice(0, 10) : null })),
  issues: issues.map((i) => ({
    number: i.number,
    id: i.id,
    title: i.title,
    body: i.body ?? "",
    state: i.state,
    pullRequest: Boolean(i.pull_request),
    // Anyone may open an issue on a public repository, and a form adds its kind label, so only the owner's,
    // collaborators' and this workflow's own issues can be taken for the sync's.
    trusted: ["OWNER", "MEMBER", "COLLABORATOR"].includes(i.author_association) || i.user?.login === "github-actions[bot]",
    labels: i.labels.map((l) => l.name),
    milestone: i.milestone?.title ?? null,
    type: i.type?.name ?? null,
    subIssues: subIssues.get(i.number) ?? [],
    blockedBy: blockedBy.get(i.number) ?? [],
    nodeId: i.node_id,
    createdAt: i.created_at,
    closedAt: i.closed_at,
  })),
};
};
const state = readState();

// The board: the status page's rows. A page whose rows don't read stops the run before any step, so a typo can't drop
// an item from the board.
let rows = null;
if (withBoard) {
  const parsed = parseBoard(readFileSync("docs/canon/status.md", "utf8"));
  if (parsed.errors.length) {
    process.stderr.write(`docs/canon/status.md: the capability map does not read:\n${parsed.errors.map((e) => `  ${e}`).join("\n")}\n`);
    process.exit(2);
  }
  rows = parsed.rows;
  // An adoption that cannot be planned (no such issue, a pull request, another row's) stops the run before any write.
  const problems = adoptionProblems(rows, state.issues);
  if (problems.length) {
    process.stderr.write(`docs/canon/status.md: adoptions that cannot be planned:\n${problems.map((e) => `  ${e}`).join("\n")}\n`);
    process.exit(2);
  }
}
// The roadmap (K42, section 5): actual dates from the pull requests and the claims, the rest forecast. Read-only.
const roadmap = rows ? readRoadmap({ repo, rows }) : null;
const statusUrl = `https://github.com/${repo}/blob/main/docs/canon/status.md`;
const steps = [
  ...plan({ goals: live, state, briefUrl, migrate }),
  ...(rows ? boardPlan({ rows, state, statusUrl, typeOf, due: roadmap.due }) : []),
];
for (const s of steps) process.stdout.write(`${apply ? "do" : "would"} ${s.do} ${s.title ?? s.name ?? s.number ?? ""}${s.child ? ` ← ${s.child}` : ""}\n`);
const say = (line) => process.stdout.write(`${line}\n`);
if (rows) {
  const c = boardCounts(rows);
  const list = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(", ");
  say(`Board: ${c.rows} rows. By stage: ${list(c.byStage)}. By who pulled them: ${list(c.byPulledBy)}.`);
  const n = (kind) => steps.filter((s) => s.board && s.do === kind).length;
  const adopted = steps.filter((s) => s.board && s.do === "updateIssue" && s.adopt).length;
  say(`Board steps: ${adopted} issue(s) to adopt, ${n("createIssue")} to create, ${n("updateIssue") - adopted} to update, ${n("closeIssue")} new issue(s) to close, ${n("foldIssue")} duplicate(s) to fold and close, ${steps.filter((s) => s.do === "setMilestoneDue").length} milestone date(s) to set.`);
  say(`Roadmap: pace ${roadmap.pace.toFixed(1)} pull requests a day over the last 3 days, ${roadmap.perItem.toFixed(1)} per item. Milestone dates: ${Object.entries(roadmap.due).map(([t, d]) => `${t} ${d}`).join("; ")}.`);
  for (const o of claimOverlaps(rows)) say(`claims overlap: ${o.a} (${o.lanes[0]}) and ${o.b} (${o.lanes[1]}) both touch ${o.path}; the framework goal settles it (K42, section 3, case 2)`);
}
// An organization's issue types need `admin:org`: stop before writing anything rather than halfway through.
if (apply && steps.some((s) => s.do === "createIssueType") && !["admin:org", "user"].some((x) => tokenScopes().has(x))) {
  process.stderr.write("Making the issue types needs the admin:org scope, so nothing was written. Run: gh auth refresh -s admin:org\n");
  process.exit(3);
}
if (!apply) {
  if (withProject) {
    const project = projectScope ? readProject(owner, repo).project : null;
    if (!projectScope) say("(no project scope: the Project's plan from nothing; run gh auth refresh -s project)");
    const pSteps = projectPlan({ goals: live, issues: state.issues, project, rows, dates: roadmap?.dates });
    for (const s of pSteps) say(`would ${s.do} ${s.title ?? s.name ?? ""}`);
    say(`${pSteps.length} Project step(s) for the issues that exist (${pSteps.filter((s) => s.do === "setValue").length} field values set, ${pSteps.filter((s) => s.do === "addItem").length} issues added).`);
    if (rows) {
      // An issue this run would create has no number yet, so its fields are counted from its row.
      const byId = new Map(rows.map((r) => [r.id, r]));
      const made = steps.filter((s) => s.do === "createIssue" && s.board).map((s) => byId.get(s.key.slice(5)));
      const writes = made.reduce((n, r) => n + Object.values(boardValues(r, { state: "open" }, live, { byId, dates: roadmap.dates })).filter((v) => v !== undefined && v !== null).length, 0);
      say(`Plus about ${writes} field value(s) and ${made.length} item(s) for the ${made.length} issue(s) it would create.`);
    }
  }
  say(`${steps.length} step(s). Dry run: nothing written. Add --apply to write.`);
  process.exit();
}

const milestones = new Map(state.milestones.map((m) => [m.title, m.number]));
const created = new Map();
const issueRef = (x) => (typeof x === "number" ? { number: x, id: state.issues.find((i) => i.number === x).id } : created.get(x));
const rowById = new Map((rows ?? []).map((r) => [r.id, r]));
for (const s of steps) {
  if (s.do === "createLabel") gh(`repos/${repo}/labels`, { method: "POST", body: { name: s.name, color: s.color, description: s.description } });
  if (s.do === "updateLabel") gh(`repos/${repo}/labels/${encodeURIComponent(s.name)}`, { method: "PATCH", body: { color: s.color, description: s.description } });
  if (s.do === "createMilestone") milestones.set(s.title, gh(`repos/${repo}/milestones`, { method: "POST", body: { title: s.title, description: s.description } }).number);
  if (s.do === "updateMilestone") gh(`repos/${repo}/milestones/${s.number}`, { method: "PATCH", body: { description: s.description } });
  if (s.do === "setMilestoneDue") gh(`repos/${repo}/milestones/${milestones.get(s.title)}`, { method: "PATCH", body: { due_on: `${s.day}T12:00:00Z` } });
  if (s.do === "createIssue") {
    const i = gh(`repos/${repo}/issues`, { method: "POST", body: { title: s.title, body: s.body, labels: s.labels, milestone: milestones.get(s.milestone), type: s.type } });
    created.set(s.key, { number: i.number, id: i.id });
  }
  if (s.do === "updateIssue") {
    const extra = { ...(s.body ? { body: s.body } : {}), ...(s.labels ? { labels: s.labels } : {}), ...(s.state ? { state: s.state } : {}), ...(s.milestone ? { milestone: milestones.get(s.milestone) } : {}), ...(s.type ? { type: s.type } : {}) };
    gh(`repos/${repo}/issues/${s.number}`, { method: "PATCH", body: { title: s.title, ...extra } });
  }
  if (s.do === "closeIssue") gh(`repos/${repo}/issues/${issueRef(s.issue).number}`, { method: "PATCH", body: { state: "closed" } });
  if (s.do === "foldIssue") {
    // The comment first, then the close; a hidden line in the comment keeps a re-run from saying it twice.
    const into = issueRef(s.into).number;
    const said = ghAll(`repos/${repo}/issues/${s.number}/comments?per_page=100`).some((c) => (c.body ?? "").includes(`orthograph:folded=${s.row}`));
    if (!said) gh(`repos/${repo}/issues/${s.number}/comments`, { method: "POST", body: { body: foldComment(rowById.get(s.row), into) } });
    gh(`repos/${repo}/issues/${s.number}`, { method: "PATCH", body: { state: "closed", state_reason: "duplicate" } });
  }
  if (s.do === "createIssueType") {
    const q = "mutation($o:ID!,$n:String!,$c:IssueTypeColor!,$d:String!){createIssueType(input:{ownerId:$o,name:$n,color:$c,description:$d,isEnabled:true}){issueType{id}}}";
    execFileSync("gh", ["api", "graphql", "-f", `query=${q}`, "-f", `o=${state.ownerId}`, "-f", `n=${s.name}`, "-f", `c=${s.color}`, "-f", `d=${s.description}`], { encoding: "utf8" });
  }
  if (s.do === "setType") gh(`repos/${repo}/issues/${s.number}`, { method: "PATCH", body: { type: s.type } });
  if (s.do === "addBlockedBy") gh(`repos/${repo}/issues/${issueRef(s.issue).number}/dependencies/blocked_by`, { method: "POST", body: { issue_id: issueRef(s.blocker).id } });
  if (s.do === "addSubIssue") gh(`repos/${repo}/issues/${issueRef(s.parent).number}/sub_issues`, { method: "POST", body: { sub_issue_id: issueRef(s.child).id } });
  if (s.do === "moveIssue") {
    if (s.milestone) gh(`repos/${repo}/issues/${s.number}`, { method: "PATCH", body: { milestone: milestones.get(s.milestone) } });
    if (s.addLabels.length) gh(`repos/${repo}/issues/${s.number}/labels`, { method: "POST", body: { labels: s.addLabels } });
  }
  pause(s.do === "createIssue" || s.do === "foldIssue" ? PAUSE_CREATE_MS : PAUSE_WRITE_MS);
}
say(`${steps.length} step(s) written to ${repo}.`);
if (withProject) say(`The Project: ${applyProject({ owner, repo, goals: live, issues: readState().issues, log: say, rows: rows ?? undefined, dates: roadmap?.dates })}`);
