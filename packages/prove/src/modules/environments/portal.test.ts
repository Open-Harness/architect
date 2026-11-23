// L2.10b/c's done-when, as a user meets it: the portal on an environment's own workerd, from the revision's one bundle, reading the real
// logbook that holds real verdicts signed by a real OIDC issuer (an @orthograph/services process). K19: the pages are drawn in a browser
// (check 21 reads them there), so this reads what they draw from: `/_portal/v1/snapshot`. Spend shows `test ✔ staging ✔`; after a budget
// edit it is stale and nothing else is; a logbook that stops shows nothing green; the data routes refuse what they should; `/portal` is the
// client's shell when the revision shipped one; and `env down` leaves nothing running.
import { freePort } from "../../../test/ports.ts";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { Issuer } from "@orthograph/services";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Build } from "#modules/build/service.js";
import { Environments } from "./service.ts";

// Each port is taken the moment it is used (the issuer here, the rest by `env up` itself), never at load: a port picked minutes
// ahead is free only until something else, wrangler's own sockets among them, takes it.
const PORTS = { logbook: 0, issuer: 0, staging: 0, production: 0 };
const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const compiler = resolve(import.meta.dirname, "../../../../compiler/src/main.ts");
const trusted = { repository: "acme/acme", workflow: "ortho" };
const services = Effect.runSync(Scope.make());
const visible = (from: string) => !basename(from).startsWith(".");
const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const git = (root: string, ...args: ReadonlyArray<string>) => {
  const r = spawnSync("git", ["-c", "user.name=l2", "-c", "user.email=l2@example.test", "-c", "commit.gpgsign=false", ...args], { cwd: root, encoding: "utf8" });
  expect(r.status, r.stderr).toBe(0);
  return r.stdout.trim();
};

/** A copy of acme under git, outside the repository: its revision is a commit of its own. */
const parent = mkdtempSync(join(realpathSync(tmpdir()), "ortho-l210-"));
const root = join(parent, "acme");
for (const part of ["ortho.config.ts", "blueprint", "generated", "src", "journeys", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
mkdirSync(join(root, "node_modules"));
for (const entry of readdirSync(join(acme, "node_modules"))) if (entry !== ".bin") symlinkSync(join(acme, "node_modules", entry), join(root, "node_modules", entry));
writeFileSync(join(root, ".gitignore"), "node_modules/\n.ortho/\n.wrangler/\n");
git(root, "init", "-q", "-b", "main");
git(root, "add", "-A");
git(root, "commit", "-q", "-m", "acme");
const first = git(root, "rev-parse", "--short", "HEAD");
const model = JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as { operations: Record<string, unknown> };
const operations = Object.keys(model.operations);

const issuer = () => `http://127.0.0.1:${PORTS.issuer}/ortho`;
const logbook = () => `http://127.0.0.1:${PORTS.logbook}`;
const url = (name: "staging" | "production") => `http://127.0.0.1:${PORTS[name]}`;

const mint = async () => {
  const r = await fetch(`${issuer()}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials", client_id: "ci-main", client_secret: "unused" }) });
  return ((await r.json()) as { access_token: string }).access_token;
};
const send = async (method: string, path: string, body: unknown) => {
  const r = await fetch(`${logbook()}${path}`, { method, headers: { "content-type": "application/json", authorization: `Bearer ${await mint()}` }, body: JSON.stringify(body) });
  expect(r.status, `${method} ${path}`).toBe(200);
};
const post = (revision: string, environment: string, operation: string, verdict: "pass" | "fail" = "pass") => send("POST", "/verdicts", { revision, environment, operation, verdict });

type Snapshot = { consistency: string; proofs: Array<{ operation: string; environment: string; state: string }> };
const snapshotOf = async (base: string): Promise<Snapshot> => {
  const digest = ((await (await fetch(`${base}/_portal/v1/blueprint`)).json()) as { digest: string }).digest;
  return (await (await fetch(`${base}/_portal/v1/snapshot?digest=${digest}`)).json()) as Snapshot;
};
const WORDS: Record<string, (environment: string) => string> = {
  "recorded-pass": (e) => `${e} ✔`, failed: (e) => `${e} ✘ failed`, stale: (e) => `${e} stale`, unproven: (e) => `${e} unproven`, unavailable: (e) => `${e} unavailable`,
};
/** The snapshot's rows as plain text, one per operation, the way the page words them: `allowance.spend test ✔ staging stale production stale`. */
const portal = async (base: string) => {
  const { proofs } = await snapshotOf(base);
  return [...new Set(proofs.map((p) => p.operation))].map((op) => `${op} ${proofs.filter((p) => p.operation === op).map((p) => WORDS[p.state]!(p.environment)).join(" ")}`);
};
const row = (rows: ReadonlyArray<string>, op: string) => rows.find((r) => new RegExp(`(^|\\s)${op.replace(".", "\\.")}(\\s|$)`).test(r));

beforeAll(async () => {
  const dir = join(parent, "issuer");
  mkdirSync(dir);
  const claims = { sub: `repo:acme/acme:ref:refs/heads/main`, aud: ["ortho-logbook"], repository: trusted.repository, ref: "refs/heads/main", workflow: trusted.workflow };
  PORTS.issuer = freePort();
  await run(Issuer.start({ port: PORTS.issuer, dir, config: { tokenCallbacks: [{ issuerId: "ortho", tokenExpiry: 600, requestMappings: [{ requestParam: "client_id", match: "ci-main", claims }] }] } }).pipe(Scope.provide(services)));
  const policy = { issuer: issuer(), repository: trusted.repository, refs: ["refs/heads/main"], workflows: [trusted.workflow] };
  const up = await run(Environments.up({ root, name: "logbook", policy }));
  PORTS.logbook = up.port;
  expect(up.url).toBe(logbook());
}, 600_000);

afterAll(async () => {
  for (const name of ["production", "staging", "logbook"]) await run(Environments.down({ root, name }));
  await run(Scope.close(services, Exit.void));
  rmSync(parent, { recursive: true, force: true });
}, 120_000);

describe("/portal on an environment", () => {
  it("shows spend `test ✔ staging ✔ production ✔` for the revision the environment runs, and answers its data routes", { timeout: 900_000 }, async () => {
    await send("PUT", `/models/${first}`, model);
    for (const environment of ["test", "staging", "production"]) for (const op of operations) await post(first, environment, op);
    const built = await run(Build.build(root));
    const staging = await run(Environments.up({ root, name: "staging" }));
    PORTS.staging = staging.port;
    expect(staging.url).toBe(url("staging"));

    const rows = await portal(staging.url);
    expect(row(rows, "allowance.spend"), rows.join("\n")).toMatch(/test ✔\s+staging ✔\s+production ✔/);
    for (const op of operations) expect(row(rows, op), op).toMatch(/test ✔\s+staging ✔\s+production ✔/);
    expect(rows.join("\n")).not.toMatch(/\bstale\b/);

    // The page is the environment's own route: the bundle, the API and the data routes are still there.
    expect(await (await fetch(`${staging.url}/_ortho/bundle`)).json()).toEqual({ revision: first, sha256: built.sha256 });
    const blueprint = await fetch(`${staging.url}/_portal/v1/blueprint`);
    expect(blueprint.status).toBe(200);
    const digest = ((await blueprint.json()) as { digest: string }).digest;
    expect(blueprint.headers.get("etag")).toBe(`"${digest}"`);
    const snapshot = await fetch(`${staging.url}/_portal/v1/snapshot?digest=${digest}`);
    expect(snapshot.status).toBe(200);
    expect(await snapshot.json()).toMatchObject({ consistency: "checked", bundleRevision: first, candidate: { revision: first, source: "logbook" } });
    expect((await fetch(`${staging.url}/_portal/v1/snapshot?digest=${"0".repeat(64)}`)).status).toBe(409);
    expect((await fetch(`${staging.url}/_portal/v1/traces/abc`)).status).toBe(404);
    expect((await fetch(`${staging.url}/portal`, { method: "POST", body: "{}" })).status).toBe(405);
    expect(JSON.stringify(await (await fetch(`${staging.url}/_portal/v1/blueprint`)).json())).toContain("Spend from what is left");
    // `/portal` is the client's shell when the revision shipped one (a machine without it says so), a route under it is the same shell, and
    // the logbook's address stays with the Worker.
    const shell = await fetch(`${staging.url}/portal`);
    const page = await shell.text();
    if (existsSync(join(dirname(built.main), "portal/index.html"))) {
      expect(shell.status).toBe(200);
      expect(page).toContain('type="module"');
      expect(page, "the shell holds none of the page").not.toContain("data-portal=");
      expect(await (await fetch(`${staging.url}/portal/operations/allowance.spend`)).text()).toBe(page);
      expect((await fetch(`${staging.url}/portal/assets/missing.js`)).status).toBe(404);
    } else expect(page).toContain("not installed");
    for (const body of [page, JSON.stringify(await (await fetch(`${staging.url}/_portal/v1/blueprint`)).json())]) expect(body).not.toContain(String(PORTS.logbook));
  });

  it("after a budget edit shows stale on spend and on no other operation, though the environment still runs the old bundle", { timeout: 900_000 }, async () => {
    cpSync(join(acme, "test/fixtures/layer2/looser-budget/spend.ts"), join(root, "blueprint/things/allowance/verbs/spend.ts"));
    const looser = JSON.parse(execFileSync(process.execPath, [compiler, root], { encoding: "utf8" })) as { operations: Record<string, unknown> };
    git(root, "checkout", "--", "blueprint");
    await send("PUT", "/models/looser1", looser);
    for (const op of Object.keys(looser.operations)) await post("looser1", "test", op);

    const rows = await portal(url("staging"));
    expect(row(rows, "allowance.spend"), rows.join("\n")).toMatch(/test ✔\s+staging stale\s+production stale/);
    const others = rows.filter((r) => /\b[a-z-]+\.[a-z-]+\b.*(test|staging|production) ✔/.test(r) && !/allowance\.spend/.test(r));
    expect(others.length).toBeGreaterThan(5);
    expect(others.filter((r) => /\bstale\b/.test(r)), "only spend is stale").toEqual([]);
    expect(await (await fetch(`${url("staging")}/_ortho/bundle`)).json()).toMatchObject({ revision: first });
  });

  it("the latest failure wins", { timeout: 300_000 }, async () => {
    await post(first, "staging", "allowance.get", "fail");
    expect(row(await portal(url("staging")), "allowance.get")).toMatch(/test ✔\s+staging ✘ failed/);
  });

  it("another environment, started after the logbook, reads the same logbook", { timeout: 600_000 }, async () => {
    const production = await run(Environments.up({ root, name: "production" }));
    PORTS.production = production.port;
    expect(row(await portal(production.url), "allowance.spend")).toMatch(/test ✔\s+staging stale\s+production stale/);
  });

  it("a logbook that stops shows no tick, only that it cannot tell", { timeout: 300_000 }, async () => {
    await run(Environments.down({ root, name: "logbook" }));
    const snapshot = await snapshotOf(url("staging"));
    expect(snapshot.consistency).toBe("unavailable");
    expect(snapshot.proofs.every((p) => p.state === "unavailable")).toBe(true);
  });

  it("env down leaves nothing running", { timeout: 300_000 }, async () => {
    for (const name of ["production", "staging", "logbook"]) await run(Environments.down({ root, name }));
    await sleep(500);
    expect(spawnSync("pgrep", ["-fl", root], { encoding: "utf8" }).stdout.trim()).toBe("");
  });
});
