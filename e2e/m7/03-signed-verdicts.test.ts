// Check 03 (M7.05, L2.02 and L2.03's "cloud parts"): the verdict a pull request gets is signed with the job's own GitHub token, and only that token. Judged on this machine with the real parts: the real logbook worker on
// workerd (`wrangler dev`, the policy passed as variables the way the deployed worker's are), a real OIDC issuer process (`@orthograph/services`) that stands in for `token.actions.githubusercontent.com` only by its address,
// configured the way GitHub's is (the claims a `pull_request` job carries, for the workflow this repository's `.github/workflows/test-worlds.yml` is: its name and its path, read from that file), and a real HTTP server that stands in for the runner's
// token request (`ACTIONS_ID_TOKEN_REQUEST_URL` and `_TOKEN`). The real `ortho prove --env test` runs once, as the job runs it, with no token of its own and no local issuer; nothing here reaches GitHub, a cloud or a credential.
// WHAT IS PINNED. (1) The run: prove asks the runner's endpoint, with the runner's bearer, for the audience the logbook demands (`ortho-logbook`), and posts one verdict per operation of the model, each stored with the PR's provenance:
// repository, `refs/pull/<n>/merge`, the workflow's name, `pull_request`, and the sha of the commit that was proved, which is the revision. (2) What the logbook takes: that token, and 401 for each token that is not it: another issuer, a forgery
// that claims this issuer's address but is signed by another key, the wrong audience, another repository, another workflow (by file), a branch ref a pull request's workflow never has, a token with no ref, an unsigned token (`alg: none`), a
// signed token whose payload was changed, no header, another scheme, an empty bearer, a malformed one, and one that has expired (the same token that was taken before it expired); and each leaves the ledger as it was. (3) A pull request's token cannot
// record a production release (`POST /releases`), while the release workflow's token on `main` can: the logbook takes any allowed ref on any route today, which would let a pull request write a release (a finding, in the pull request).
// Red today on two reasons: the workflow file does not exist (the claims are its name and path), and a pull request's token can record a release. Controls, true today: the stand-in's claims are GitHub's set for a pull request; the real prove posts
// with the runner's token; every 401 above (the logbook's policy is built for this, D3 #8 and #32).
// NOT JUDGED HERE: that GitHub issues this shape of token (the first real run is the proof), and the cloud logbook's own configuration (an open decision: where the logbook lives during a pull request's run).
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { closeSync, cpSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { PATH } from "./workflow.ts";
import { cli, freePorts, mint, repo, startIssuer, startLogbook, stop } from "./support.ts";

const REPO = "Open-Harness/orthograph";
const AUDIENCE = "ortho-logbook";
const PR_REF = "refs/pull/7/merge";
const PORTS = freePorts("issuer", "rogue", "logbook", "runner", "test");
const issuer = `http://127.0.0.1:${PORTS.issuer}/actions`;
const rogue = `http://127.0.0.1:${PORTS.rogue}/actions`;
const logbook = `http://127.0.0.1:${PORTS.logbook}`;
const REQUEST_BEARER = "runner-bearer-4e1a";
const visible = (from: string) => !basename(from).startsWith(".");
const git = (root: string, ...args: ReadonlyArray<string>) => spawnSync("git", ["-c", "user.name=m7", "-c", "user.email=m7@example.test", "-c", "commit.gpgsign=false", ...args], { cwd: root, encoding: "utf8" }).stdout.trim();

/** The claims of a GitHub Actions job for a pull request (GitHub's "OIDC token claims" list), for the workflow named and found where this repository's test-worlds workflow is. */
const github = (workflow: { name: string; file: string }, sha: string, over: Record<string, unknown> = {}) => ({
  sub: `repo:${REPO}:pull_request`, aud: AUDIENCE, repository: REPO, repository_owner: "Open-Harness", repository_visibility: "public", actor: "builder", run_id: "19000000001", run_number: "42", run_attempt: "1",
  ref: PR_REF, ref_type: "branch", ref_protected: "false", sha, event_name: "pull_request", head_ref: "goal-15/m7-05-build", base_ref: "goal/release", workflow: workflow.name,
  workflow_ref: `${REPO}/${workflow.file}@${PR_REF}`, job_workflow_ref: `${REPO}/${workflow.file}@${PR_REF}`, job_workflow_sha: sha, runner_environment: "github-hosted", ...over,
});

let root = "", parent = "", sha = "", revision = "";
const children: ChildProcess[] = [];
let runner: Server;
const asked: Array<{ audience: string | null; authorization: string | undefined }> = [];
const tokens: Record<string, string> = {};

/** A command of the project, asynchronously (the stand-in servers are in this process). Its words go to a file and it is done when it exits: `env up` leaves a process behind that holds a pipe open, so a pipe's end would never come. */
let count = 0;
const spawned = (args: ReadonlyArray<string>, env: Record<string, string>) => new Promise<{ status: number | null; out: string }>((done) => {
  const log = join(parent, `command-${count++}.log`);
  const fd = openSync(log, "w");
  const p = spawn(process.execPath, [...args], { cwd: root, env, stdio: ["ignore", fd, fd] });
  p.on("exit", (status) => { closeSync(fd); done({ status, out: readFileSync(log, "utf8") }); });
});
/** The environment a CI job's step has: nothing of the shell's own ORTHO_ settings, so no token or local issuer can stand in for the runner's. */
const jobEnv = (extra: Record<string, string>) => ({ ...Object.fromEntries(Object.entries(process.env).filter(([k, v]) => v !== undefined && !k.startsWith("ORTHO_") && !/^(CLOUDFLARE_|CF_)/.test(k))) as Record<string, string>, ...extra });

const post = (path: string, body: unknown, authorization?: string, method = "POST") => fetch(`${logbook}${path}`, { method, headers: { connection: "close", "content-type": "application/json", ...(authorization === undefined ? {} : { authorization }) }, body: JSON.stringify(body) });
const rows = () => fetch(`${logbook}/verdicts`).then((r) => r.json() as Promise<Array<Record<string, unknown>>>);
const verdict = (operation: string) => ({ revision: "abc1234", environment: "test", operation, verdict: "pass" });
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");

beforeAll(async () => {
  expect(existsSync(join(repo, PATH)), `${PATH} does not exist: the token's workflow name and file are read from it`).toBe(true);
  const workflow = { name: String((parse(readFileSync(join(repo, PATH), "utf8")) as { name: string }).name), file: PATH };
  // The project proved, under git outside the repository: its revision is a commit of its own, and the token's sha is that commit (what GitHub's `sha` is for a pull request's merge commit).
  parent = mkdtempSync(join(realpathSync(tmpdir()), "ortho-m7-03-"));
  root = join(parent, "acme");
  const acme = join(repo, "examples/acme");
  for (const part of ["ortho.config.ts", "blueprint", "generated", "src", "journeys", "package.json"].filter((p) => existsSync(join(acme, p)))) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
  mkdirSync(join(root, "node_modules"));
  for (const entry of readdirSync(join(acme, "node_modules"))) if (entry !== ".bin") symlinkSync(join(acme, "node_modules", entry), join(root, "node_modules", entry));
  writeFileSync(join(root, ".gitignore"), "node_modules/\n.ortho/\n.wrangler/\n");
  git(root, "init", "-q", "-b", "main"); git(root, "add", "-A"); git(root, "commit", "-q", "-m", "acme");
  sha = git(root, "rev-parse", "HEAD"); revision = git(root, "rev-parse", "--short", "HEAD");

  const good = github(workflow, sha);
  const as = (over: Record<string, unknown>) => github(workflow, sha, over);
  const release = { workflow: "release", workflow_ref: `${REPO}/.github/workflows/release.yml@refs/heads/main`, job_workflow_ref: `${REPO}/.github/workflows/release.yml@refs/heads/main`, ref: "refs/heads/main", event_name: "push", sub: `repo:${REPO}:ref:refs/heads/main` };
  const clients = {
    pr: good, "other-audience": as({ aud: "someone-else" }), "other-repository": as({ repository: "someone/else", job_workflow_ref: `someone/else/${PATH}@${PR_REF}` }),
    "other-workflow-file": as({ job_workflow_ref: `${REPO}/.github/workflows/ci.yml@${PR_REF}` }),
    "branch-ref": as({ ref: "refs/heads/feature", job_workflow_ref: `${REPO}/${PATH}@refs/heads/feature` }), "no-ref": Object.fromEntries(Object.entries(good).filter(([k]) => k !== "ref")),
    "main-release": as(release),
  };
  children.push(await startIssuer(join(parent, "issuer"), PORTS.issuer, [{ issuerId: "actions", tokenExpiry: 5, clients }]));
  children.push(await startIssuer(join(parent, "rogue"), PORTS.rogue, [{ issuerId: "actions", tokenExpiry: 600, clients }]));
  children.push(await startLogbook(join(parent, "logbook"), PORTS.logbook, { issuer, jwksUrl: `${issuer}/jwks`, audience: AUDIENCE, repository: REPO, refs: ["refs/heads/main", "refs/pull/*/merge"], workflows: [PATH, ".github/workflows/release.yml"] }));
  // The runner's token request: GitHub's `ACTIONS_ID_TOKEN_REQUEST_URL` takes `audience` and a bearer, and answers `{ value }`.
  runner = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORTS.runner}`);
    asked.push({ audience: url.searchParams.get("audience"), authorization: req.headers.authorization });
    if (req.headers.authorization !== `bearer ${REQUEST_BEARER}` && req.headers.authorization !== `Bearer ${REQUEST_BEARER}`) return void res.writeHead(401).end("{}");
    void mint(issuer, url.searchParams.get("audience") === AUDIENCE ? "pr" : "other-audience").then((value) => res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ count: 1, value })));
  });
  await new Promise<void>((ok) => runner.listen(PORTS.runner, "127.0.0.1", ok));
  tokens["probe"] = await mint(issuer, "pr");
}, 300_000);

afterAll(async () => {
  runner?.closeAllConnections(); runner?.close();
  if (root !== "") await spawned([cli, "env", "down", "test", "--root", root], jobEnv({})).catch(() => undefined);
  for (const c of children.splice(0).reverse()) await stop(c);
  if (parent) rmSync(parent, { recursive: true, force: true });
}, 120_000);

describe("03: a pull request's verdicts are signed with GitHub's token (M7.05), with no cloud", () => {
  it("control: the stand-in's token has the claims GitHub puts in a pull request's, and the workflow's own name and file", () => {
    const payload = JSON.parse(Buffer.from(tokens["probe"]!.split(".")[1]!, "base64url").toString()) as Record<string, unknown>;
    expect(Object.keys(payload)).toEqual(expect.arrayContaining(["iss", "sub", "aud", "exp", "iat", "repository", "ref", "sha", "workflow", "job_workflow_ref", "event_name", "run_id", "head_ref", "base_ref"]));
    expect(payload).toMatchObject({ iss: issuer, sub: `repo:${REPO}:pull_request`, aud: AUDIENCE, event_name: "pull_request", ref: PR_REF, sha, workflow: "ortho", job_workflow_ref: `${REPO}/${PATH}@${PR_REF}` });
  });

  it("`ortho prove --env test` signs each verdict with the runner's token, asked for the audience the logbook demands, and the PR's provenance is stored with it", async () => {
    const up = await spawned([cli, "env", "up", "test", "--root", root, "--port", String(PORTS.test)], jobEnv({}));
    expect(up.status, up.out).toBe(0);
    const env = jobEnv({ ORTHO_LOGBOOK_URL: logbook, ACTIONS_ID_TOKEN_REQUEST_URL: `http://127.0.0.1:${PORTS.runner}/token?api-version=2.0`, ACTIONS_ID_TOKEN_REQUEST_TOKEN: REQUEST_BEARER });
    const before = asked.length;
    const proved = await spawned([cli, "prove", "--env", "test", "--root", root], env);
    expect(proved.status, proved.out).toBe(0);
    expect(proved.out).not.toContain(REQUEST_BEARER);
    // The runner was asked once, with its own bearer, for the logbook's audience.
    expect(asked.slice(before).map((a) => a.audience)).toEqual([AUDIENCE]);
    expect(asked.slice(before).every((a) => a.authorization?.toLowerCase() === `bearer ${REQUEST_BEARER}`)).toBe(true);
    // One verdict per operation of the model, all passing, each carrying the verified token's claims and the revision that was proved.
    const operations = Object.keys(JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")).operations).sort();
    const held = ((await (await fetch(`${logbook}/verdicts?revision=${revision}&environment=test`)).json()) as Array<Record<string, unknown>>);
    expect(held.map((v) => v["operation"]).sort()).toEqual(operations);
    for (const v of held) expect(v).toMatchObject({ verdict: "pass", environment: "test", revision, repository: REPO, ref: PR_REF, workflow: "ortho", event_name: "pull_request", sha });
    expect(String(held[0]!["sha"]).startsWith(revision)).toBe(true);
    // The world it made is gone.
    const status = await spawned([cli, "env", "status", "test", "--root", root], jobEnv({}));
    expect(status.out).toMatch(/worlds 0/);
  });

  describe("what the logbook takes", () => {
    const stored = async () => (await rows()).length;
    const accepted = (client: string) => async () => {
      const before = await stored();
      const res = await post("/verdicts", verdict("a.accepted"), `Bearer ${await mint(issuer, client)}`);
      expect(res.status, await res.text()).toBe(200);
      expect(await stored()).toBe(before + 1);
    };
    it("takes a verdict signed with the pull request's token", accepted("pr"));

    // Every thing the policy reads, planted wrong one way at a time (the table of the pull request).
    const wrong: ReadonlyArray<readonly [string, () => Promise<string | null>]> = [
      ["a token from another issuer (its own address, its own key)", () => mint(rogue, "pr")],
      ["a forgery: this issuer's address in `iss`, another key's signature", () => mint(rogue, "pr", `127.0.0.1:${PORTS.issuer}`)],
      ["the wrong audience", () => mint(issuer, "other-audience")],
      ["another repository", () => mint(issuer, "other-repository")],
      ["another workflow by file", () => mint(issuer, "other-workflow-file")],
      ["a branch ref, which a pull request's workflow never has", () => mint(issuer, "branch-ref")],
      ["a token with no ref", () => mint(issuer, "no-ref")],
      ["an unsigned token (alg none)", async () => `${b64({ alg: "none", typ: "JWT" })}.${b64({ iss: issuer, aud: AUDIENCE, exp: 4_102_444_800, iat: 1, repository: REPO, ref: PR_REF, workflow: "ortho", job_workflow_ref: `${REPO}/${PATH}@${PR_REF}` })}.`],
      ["a signed token whose payload was changed", async () => { const [h, , s] = (await mint(issuer, "other-repository")).split("."); const p = JSON.parse(Buffer.from((await mint(issuer, "pr")).split(".")[1]!, "base64url").toString()); return `${h}.${b64(p)}.${s}`; }],
      ["a token that is not a token", async () => "not-a-jwt"],
      ["an empty bearer", async () => ""],
      ["no Authorization header", async () => null],
    ];
    it.each(wrong)("401 for %s, and the ledger is as it was", async (_name, make) => {
      const before = await rows();
      const token = await make();
      const res = await post("/verdicts", verdict("a.refused"), token === null ? undefined : `Bearer ${token}`);
      expect(res.status, `${_name}: ${await res.text()}`).toBe(401);
      expect(await rows()).toEqual(before);
    });

    it("401 for another scheme carrying a good token, and for a token in the body", async () => {
      const good = await mint(issuer, "pr");
      const before = await rows();
      expect((await post("/verdicts", verdict("a.refused"), `Basic ${good}`)).status).toBe(401);
      expect((await post("/verdicts", { ...verdict("a.refused"), token: good })).status).toBe(401);
      expect(await rows()).toEqual(before);
    });

    it("refuses what a pull request's token must not do: record a production release (the same token may put its revision's model)", async () => {
      const token = await mint(issuer, "pr");
      expect((await post("/models/abc1234", { a: 1 }, `Bearer ${token}`, "PUT")).status).toBe(200);
      const res = await post("/releases", { version: "1.0.0", revision: "abc1234" }, `Bearer ${await mint(issuer, "pr")}`);
      expect(res.status, "a pull request's token recorded a release").toBe(403);
      expect((await fetch(`${logbook}/releases/latest`)).status).toBe(404);
    });

    it("takes the release workflow's token on main for that release", async () => {
      expect((await post("/models/abc1234", { a: 1 }, `Bearer ${await mint(issuer, "main-release")}`, "PUT")).status).toBe(200);
      const res = await post("/releases", { version: "1.0.1", revision: "abc1234" }, `Bearer ${await mint(issuer, "main-release")}`);
      expect(res.status, await res.text()).toBe(200);
    });

    it("401 for the very token it took, once it has expired", { timeout: 120_000 }, async () => {
      const token = await mint(issuer, "pr");
      expect((await post("/verdicts", verdict("a.fresh"), `Bearer ${token}`)).status).toBe(200);
      // The issuer gives its tokens 5 seconds and the logbook allows 30 more for clocks: past 35 seconds the same token is refused, for that and nothing else.
      await new Promise((r) => setTimeout(r, 38_000));
      const before = await rows();
      const res = await post("/verdicts", verdict("a.stale"), `Bearer ${token}`);
      expect(res.status, await res.text()).toBe(401);
      expect(await rows()).toEqual(before);
    });
  });
});
