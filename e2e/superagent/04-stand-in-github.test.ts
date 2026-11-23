// Check 04 (Goal 17 slice 3): each GitHub call the superagent includes passes against the GitHub stand-in, a small server
// over a real bare repository that speaks GitHub's REST API. A pushed branch and the pull request opened on it read back
// (M4.25). The answers are judged against the spec's own schemas (schema.ts), not against the adapter's types.
//
// The stand-in is the process `orthograph.standIn` in the plugin's package.json names (README: "The stand-in"). It starts
// with this world, the same every time: repository acme/widgets, branch `main` with one commit, issue #1 open, opened by ann.
// Writes need a bearer token (any non-empty one); reads need none.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { appPlugin } from "./needs.ts";
import { trimmed } from "./pins.ts";
import { at, build, load, once, type Node } from "./plugin.ts";
import { problems } from "./schema.ts";
import { startStandIn, type Running } from "./servers.ts";
import { operationNamed, readSpec } from "./spec.ts";

const spec = readSpec(trimmed("github"));
const dir = appPlugin("github");
const TOKEN = "test-token";
const REPO = { owner: "acme", repo: "widgets" };

const git = (cwd: string, ...args: ReadonlyArray<string>) => {
  const r = spawnSync("git", ["-c", `http.extraHeader=Authorization: Bearer ${TOKEN}`, "-c", "user.name=Coder", "-c", "user.email=coder@example.test", ...args],
    { cwd, encoding: "utf8", env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null" } });
  expect(r.status, `git ${args.join(" ")}:\n${r.stdout}${r.stderr}`).toBe(0);
  return r.stdout.trim();
};

describe("04 github: the calls pass against the stand-in", () => {
  let started: Running | undefined;
  /** The stand-in and a client of it, started by the first test that needs them. */
  const world = once(async () => {
    build(dir);
    const stand = await startStandIn(dir);
    started = stand;
    return { stand, calls: ((await load(dir, "./client"))["client"] as (o: unknown) => Node)({ baseUrl: stand.url, token: TOKEN })["calls"] as Node };
  });
  const work = mkdtempSync(join(tmpdir(), "ortho-github-work-"));
  const fits = (call: string, value: unknown) => expect(problems(spec, operationNamed(spec, call).success!.schema, value), `${call}'s answer fits the spec`).toEqual([]);
  const sha = { head: "" };

  afterAll(async () => { rmSync(work, { recursive: true, force: true }); await started?.stop(); });

  it("comments on an issue: none at first; each created once, with its id and link; listed in order, and by page", async () => {
    const { calls } = await world();
    const empty = await at(calls, "issues.listComments")({ ...REPO, issue_number: 1 });
    expect(empty).toEqual([]);
    fits("issues.listComments", empty);
    const one = await at(calls, "issues.createComment")({ ...REPO, issue_number: 1, body: "On it." });
    fits("issues.createComment", one);
    expect(one).toMatchObject({ body: "On it.", user: expect.objectContaining({ login: expect.any(String) }) });
    expect(one.html_url).toMatch(new RegExp(`/acme/widgets/issues/1#issuecomment-${String(one.id)}$`));
    const two = await at(calls, "issues.createComment")({ ...REPO, issue_number: 1, body: "Second." });
    expect(two.id).toBeGreaterThan(one.id);
    const listed = await at(calls, "issues.listComments")({ ...REPO, issue_number: 1 });
    fits("issues.listComments", listed);
    expect(listed.map((c: Node) => [c.id, c.body])).toEqual([[one.id, "On it."], [two.id, "Second."]]);
    const page = await at(calls, "issues.listComments")({ ...REPO, issue_number: 1, per_page: 1, page: 2 });
    expect(page.map((c: Node) => c.id)).toEqual([two.id]);
    // a body is kept byte for byte: spaces at the ends, a CRLF, a long run, an emoji
    const odd = ["  padded  ", "line one\r\nline two\n", "x".repeat(1000), "done \u{1F680} caf\u00e9"];
    const made = [];
    for (const body of odd) made.push(await at(calls, "issues.createComment")({ ...REPO, issue_number: 1, body }));
    expect(made.map((c: Node) => c.body)).toEqual(odd);
    const back = await at(calls, "issues.listComments")({ ...REPO, issue_number: 1 });
    expect(back.slice(2).map((c: Node) => c.body)).toEqual(odd);
  });

  it("refuses what GitHub refuses: an issue that isn't there is 404, a write with no token is 401 and writes nothing", async () => {
    const { stand, calls } = await world();
    const missing = await at(calls, "issues.createComment")({ ...REPO, issue_number: 99, body: "x" }).then(() => undefined, (e: unknown) => e);
    expect(missing).toMatchObject({ status: 404 });
    const bare = await fetch(`${stand.url}/repos/acme/widgets/issues/1/comments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: "sneaky" }) });
    expect(bare.status).toBe(401);
    expect(((await bare.json()) as Node)["message"]).toEqual(expect.any(String));
    const after = await at(calls, "issues.listComments")({ ...REPO, issue_number: 1 });
    expect(after.map((c: Node) => c.body).slice(0, 2)).toEqual(["On it.", "Second."]);
    expect(after, "the unauthenticated write added nothing").toHaveLength(6);
  });

  it("a branch pushed to the stand-in reads back, and a pull request opened on it carries that commit", async () => {
    const { stand, calls } = await world();
    const clone = join(work, "widgets");
    git(work, "clone", `${stand.url}/acme/widgets.git`, clone);
    git(clone, "checkout", "-b", "coder/slug-1");
    writeFileSync(join(clone, "slug.test.ts"), "export {};\n");
    git(clone, "add", "slug.test.ts");
    git(clone, "commit", "-m", "Add a slug test");
    git(clone, "push", "-u", "origin", "coder/slug-1");
    sha.head = git(clone, "rev-parse", "HEAD");
    expect(git(work, "ls-remote", `${stand.url}/acme/widgets.git`, "refs/heads/coder/slug-1").split("\t")[0]).toBe(sha.head);

    const opened = await at(calls, "pulls.create")({ ...REPO, title: "Add a slug test", head: "coder/slug-1", base: "main", body: "Closes #1" });
    fits("pulls.create", opened);
    expect(opened).toMatchObject({ number: 2, state: "open", title: "Add a slug test", merged: false, head: { ref: "coder/slug-1", sha: sha.head }, base: { ref: "main" } });
    const read = await at(calls, "pulls.get")({ ...REPO, pull_number: 2 });
    fits("pulls.get", read);
    expect(read).toMatchObject({ number: 2, state: "open", body: "Closes #1", head: { sha: sha.head } });
  });

  it("refuses a second pull request for the same branch, a branch that isn't there, and a base that isn't there: 422", async () => {
    const { calls } = await world();
    const again = (extra: Node) => at(calls, "pulls.create")({ ...REPO, title: "Again", head: "coder/slug-1", base: "main", ...extra }).then(() => undefined, (e: unknown) => e);
    expect(await again({})).toMatchObject({ status: 422 });
    expect(await again({ head: "coder/nope" })).toMatchObject({ status: 422 });
    expect(await again({ base: "nope" })).toMatchObject({ status: 422 });
    expect((await at(calls, "pulls.get")({ ...REPO, pull_number: 2 })).number).toBe(2);
  });

  it("a pull request's conversation is its issue's: its comments are its own, and issue 1 keeps two", async () => {
    const { calls } = await world();
    const mine = await at(calls, "issues.createComment")({ ...REPO, issue_number: 2, body: "Ready for review." });
    fits("issues.createComment", mine);
    const listed = await at(calls, "issues.listComments")({ ...REPO, issue_number: 2 });
    expect(listed.map((c: Node) => c.body)).toEqual(["Ready for review."]);
    expect(await at(calls, "issues.listComments")({ ...REPO, issue_number: 1 })).toHaveLength(6);
  });

  it("reviews: each submitted once, in order, with its state; a comment on a line of the diff is its own record", async () => {
    const { calls } = await world();
    const first = await at(calls, "pulls.createReview")({ ...REPO, pull_number: 2, event: "COMMENT", body: "Looks fine." });
    fits("pulls.createReview", first);
    expect(first).toMatchObject({ state: "COMMENTED", body: "Looks fine." });
    const second = await at(calls, "pulls.createReview")({ ...REPO, pull_number: 2, event: "REQUEST_CHANGES", body: "Needs a test." });
    expect(second).toMatchObject({ state: "CHANGES_REQUESTED" });
    const reviews = await at(calls, "pulls.listReviews")({ ...REPO, pull_number: 2 });
    fits("pulls.listReviews", reviews);
    expect(reviews.map((r: Node) => [r.id, r.state])).toEqual([[first.id, "COMMENTED"], [second.id, "CHANGES_REQUESTED"]]);
    const line = await at(calls, "pulls.createReviewComment")({ ...REPO, pull_number: 2, body: "nit", commit_id: sha.head, path: "slug.test.ts", line: 1, side: "RIGHT" });
    fits("pulls.createReviewComment", line);
    expect(line).toMatchObject({ body: "nit", path: "slug.test.ts", commit_id: sha.head });
    const lines = await at(calls, "pulls.listReviewComments")({ ...REPO, pull_number: 2 });
    fits("pulls.listReviewComments", lines);
    expect(lines.map((c: Node) => c.id)).toEqual([line.id]);
    const approved = await at(calls, "pulls.createReview")({ ...REPO, pull_number: 2, event: "APPROVE" });
    expect(approved).toMatchObject({ state: "APPROVED" });
    const inTree = await at(calls, "pulls.createReviewComment")({ ...REPO, pull_number: 2, body: "x", commit_id: sha.head, path: "README.md", line: 1, side: "RIGHT" }).then(() => undefined, (e: unknown) => e);
    expect(inTree, "README.md is in the tree but not in the diff").toMatchObject({ status: 422 });
    const off = await at(calls, "pulls.createReviewComment")({ ...REPO, pull_number: 2, body: "x", commit_id: sha.head, path: "not-in-the-diff.ts", line: 1, side: "RIGHT" }).then(() => undefined, (e: unknown) => e);
    expect(off).toMatchObject({ status: 422 });
  });

  it("stops when told, by its id, leaving nothing running and no folder", async () => {
    const { stand } = await world();
    await stand.stop();
    expect(() => process.kill(stand.pid, 0)).toThrow();
    expect(spawnSync("pgrep", ["-fl", stand.dir], { encoding: "utf8" }).stdout.trim()).toBe("");
  });
});
