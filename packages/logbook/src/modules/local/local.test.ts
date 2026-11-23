// The done-when check for L2.03 (D3 #8, #15.2): the real logbook worker on local workerd, behind wrangler, and a real
// OIDC issuer (an `@orthograph/services` process), each on a free port.
import { freePorts } from "../../../test/ports.ts";
import { createSign, generateKeyPairSync } from "node:crypto";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { Issuer, type IssuerConfig } from "@orthograph/services";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Logbook } from "./service.ts";

const REPO = "acme/acme";
const PORTS = freePorts("logbook", "issuer", "rogue");
const services = Effect.runSync(Scope.make());

/** One client id per scenario: the claims a GitHub Actions job would carry (D3 #8). */
const scenario = (client: string, o: { aud?: string; ref?: string; event?: string; repository?: string; workflow?: string }) => {
  const ref = o.ref ?? "refs/heads/main";
  const repository = o.repository ?? REPO;
  const workflow = o.workflow ?? "ortho";
  return {
    requestParam: "client_id", match: client,
    claims: {
      sub: `repo:${repository}:ref:${ref}`, aud: [o.aud ?? "ortho-logbook"], repository, ref, workflow,
      event_name: o.event ?? "push", sha: "0123456789abcdef0123456789abcdef01234567",
      job_workflow_ref: `${repository}/.github/workflows/${workflow}.yml@${ref}`,
    },
  };
};
const config: IssuerConfig = {
  tokenCallbacks: [{ issuerId: "ortho", tokenExpiry: 600, requestMappings: [
    scenario("ci-main", {}),
    scenario("ci-pr", { ref: "refs/pull/7/merge", event: "pull_request" }),
    scenario("ci-other-branch", { ref: "refs/heads/feature/x" }),
    scenario("ci-pr-prefix-trick", { ref: "refs/pull/7/merge/../x" }),
    scenario("ci-other-repo", { repository: "someone/else" }),
    scenario("ci-other-workflow", { workflow: "release" }),
    scenario("ci-wrong-aud", { aud: "other" }),
  ] }],
};

const startIssuer = (port: number) => Effect.runPromise(Issuer.start({ config, port }).pipe(Scope.provide(services))).then((issuing) => issuing.url);
const mint = async (issuer: string, client = "ci-main") => {
  const r = await fetch(`${issuer}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: client, client_secret: "unused" }) });
  expect(r.status).toBe(200);
  return ((await r.json()) as { access_token: string }).access_token;
};
/** The same token, claims and key id intact, signed with a key of the forger's own. */
const forge = (token: string) => {
  const [header, payload] = token.split(".");
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return `${header}.${payload}.${createSign("RSA-SHA256").update(`${header}.${payload}`).sign(privateKey).toString("base64url")}`;
};

let dir = "";
let issuer = "";
let rogue = "";
const base = `http://127.0.0.1:${PORTS.logbook}`;
const start = () => {
  const scope = Effect.runSync(Scope.make());
  const run = Logbook.start({
    port: PORTS.logbook, state: join(dir, "state"), log: join(dir, "wrangler.log"),
    policy: { issuer, jwksUrl: `${issuer}/jwks`, audience: "ortho-logbook", repository: REPO, refs: ["refs/heads/main", "refs/pull/*/merge"], workflows: ["ortho"] },
  }).pipe(Scope.provide(scope));
  return Effect.runPromise(run).then(() => () => Effect.runPromise(Scope.close(scope, Exit.void)));
};

const verdict = { revision: "abcdef1", environment: "test", operation: "allowance.spend", verdict: "pass" };
const send = (path: string, body: unknown, token?: string, method = "POST") =>
  fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...(token === undefined ? {} : { authorization: `Bearer ${token}` }) }, body: JSON.stringify(body) });
const read = (path: string) => fetch(`${base}${path}`).then((r) => r.json() as Promise<Array<Record<string, unknown>>>);

let stop: (() => Promise<void>) | undefined;
beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "logbook-test-"));
  [issuer, rogue] = await Promise.all([startIssuer(PORTS.issuer), startIssuer(PORTS.rogue)]);
  stop = await start();
}, 180_000);
afterAll(async () => {
  await stop?.();
  await Effect.runPromise(Scope.close(services, Exit.void));
  rmSync(dir, { recursive: true, force: true });
}, 60_000);

describe("the logbook on local workerd, with a real issuer", () => {
  it("refuses forged, foreign, wrong-ref, unsigned and not-a-token requests with 401, and stores nothing", async () => {
    const trusted = await mint(issuer);
    const refused: Array<[string, string | undefined]> = [
      ["a forged signature", forge(trusted)],
      ["a token from another issuer", await mint(rogue)],
      ["a branch outside the allow-list", await mint(issuer, "ci-other-branch")],
      ["a ref that only looks like a pull request", await mint(issuer, "ci-pr-prefix-trick")],
      ["another repository", await mint(issuer, "ci-other-repo")],
      ["another workflow", await mint(issuer, "ci-other-workflow")],
      ["another audience", await mint(issuer, "ci-wrong-aud")],
      ["no token", undefined],
      ["not a JWT", "not-a-jwt"],
    ];
    for (const [what, token] of refused) expect((await send("/verdicts", verdict, token)).status, what).toBe(401);
    expect(await read("/verdicts?revision=abcdef1")).toEqual([]);
    expect(await read("/verdicts?environment=test")).toEqual([]);
  });

  it("takes a trusted token's verdict, with its ref and event, and reads it back", async () => {
    expect((await send("/verdicts", verdict, await mint(issuer))).status).toBe(200);
    const pr = await send("/verdicts", { ...verdict, environment: "staging", verdict: "fail" }, await mint(issuer, "ci-pr"));
    expect(pr.status).toBe(200);
    expect(await read("/verdicts?revision=abcdef1&environment=test")).toMatchObject([{ ...verdict, ref: "refs/heads/main", event_name: "push" }]);
    expect(await read("/verdicts?revision=abcdef1")).toMatchObject([verdict, { environment: "staging", verdict: "fail", ref: "refs/pull/7/merge", event_name: "pull_request" }]);
  });

  it("keeps a revision's model, the latest verdict per operation and environment, and the last release", async () => {
    const token = await mint(issuer);
    const model = { operations: ["allowance.spend"], revision: "abcdef1" };
    expect((await send("/models/abcdef1", model, undefined, "PUT")).status, "unsigned model").toBe(401);
    expect((await send("/models/abcdef1", model, token, "PUT")).status).toBe(200);
    expect(await fetch(`${base}/models/abcdef1`).then((r) => r.json())).toEqual(model);
    expect((await send("/models/abcdef1", { other: true }, token, "PUT")).status, "a revision's model never changes").toBe(409);
    expect((await fetch(`${base}/models/missing`)).status).toBe(404);

    await send("/verdicts", { ...verdict, revision: "abcdef2", verdict: "fail" }, token);
    const latest = await read("/verdicts/latest?environment=test&ref=refs%2Fheads%2Fmain");
    expect(latest).toMatchObject([{ operation: "allowance.spend", environment: "test", revision: "abcdef2", verdict: "fail" }]);

    expect((await fetch(`${base}/releases/latest`)).status, "no release yet").toBe(404);
    expect((await send("/releases", { version: "1.0.0", revision: "nomodel" }, token)).status, "a release needs its model").toBe(409);
    expect((await send("/releases", { version: "1.0.0", revision: "abcdef1" }, token)).status).toBe(200);
    expect((await send("/releases", { version: "1.0.0", revision: "abcdef1" }, token)).status, "a version is released once").toBe(409);
    expect(await fetch(`${base}/releases/latest`).then((r) => r.json())).toMatchObject({ version: "1.0.0", revision: "abcdef1" });
  });

  it("admits one concurrent different model and preserves that stored winner", async () => {
    const token = await mint(issuer);
    const models = Array.from({ length: 8 }, (_, owner) => ({ owner, operations: ["allowance.spend"], declarations: "x".repeat(512 * 1024) }));
    const requests = models.map((model) => new Request(`${base}/models/concurrent-different`, { method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(model) }));
    const responses = await Promise.all(requests.map((request) => fetch(request)));
    expect(responses.map((r) => r.status).filter((status) => status === 200)).toHaveLength(1);
    expect(responses.map((r) => r.status).filter((status) => status === 409)).toHaveLength(models.length - 1);
    const winner = models[responses.findIndex((r) => r.status === 200)]!;
    expect(await fetch(`${base}/models/concurrent-different`).then((r) => r.json())).toEqual(winner);
    for (const model of models) expect((await send("/models/concurrent-different", model, token, "PUT")).status).toBe(model === winner ? 200 : 409);
    expect(await fetch(`${base}/models/concurrent-different`).then((r) => r.json())).toEqual(winner);
  });

  it("accepts concurrent identical model retries without replacing the immutable object", async () => {
    const token = await mint(issuer);
    const model = { operations: ["allowance.spend"], revision: "concurrent-identical" };
    const responses = await Promise.all([send("/models/concurrent-identical", model, token, "PUT"), send("/models/concurrent-identical", model, token, "PUT")]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    expect((await send("/models/concurrent-identical", { changed: true }, token, "PUT")).status).toBe(409);
    expect(await fetch(`${base}/models/concurrent-identical`).then((r) => r.json())).toEqual(model);
  });

  it("rejects a body that isn't a verdict", async () => {
    const token = await mint(issuer);
    expect((await send("/verdicts", { ...verdict, verdict: "maybe" }, token)).status).toBe(400);
    expect((await send("/verdicts", { revision: "x" }, token)).status).toBe(400);
    expect((await send("/verdicts", { ...verdict, sha256: "not-a-sha256" }, token)).status).toBe(400);
  });

  it("expands a legacy persisted book without losing rows, keeps hashless verdicts readable, and retries the upgrade", async () => {
    const before = await read("/verdicts?revision=abcdef1");
    await stop?.();
    stop = undefined;
    // The real workerd state is stopped. Restore its verdict table to the exact pre-hash schema, preserving rows.
    const sqlite = readdirSync(join(dir, "state"), { recursive: true }).map(String).filter((p) => p.endsWith(".sqlite"));
    let found = false;
    for (const path of sqlite) {
      const db = new DatabaseSync(join(dir, "state", path));
      if (db.prepare("SELECT name FROM sqlite_master WHERE name = 'verdicts'").get()) {
        const columns = db.prepare("PRAGMA table_info(verdicts)").all() as Array<{ name: string }>;
        if (columns.some((c) => c.name === "sha256")) db.exec("ALTER TABLE verdicts DROP COLUMN sha256");
        found = true;
      }
      db.close();
    }
    expect(found).toBe(true);
    stop = await start();
    expect(await read("/verdicts?revision=abcdef1")).toMatchObject(before);
    expect((await read("/verdicts?revision=abcdef1")).every((r) => r["sha256"] == null)).toBe(true);
    const sha256 = "a".repeat(64);
    expect((await send("/verdicts", { ...verdict, revision: "hashbound", sha256 }, await mint(issuer))).status).toBe(200);
    expect(await read("/verdicts?revision=hashbound")).toMatchObject([{ sha256 }]);
    await stop();
    stop = undefined;
    stop = await start();
    expect(await read("/verdicts?revision=hashbound")).toMatchObject([{ sha256 }]);
    expect((await read("/verdicts?revision=abcdef1")).length).toBe(before.length);
  }, 180_000);

  it("keeps its state across a restart", async () => {
    const before = await read("/verdicts?revision=abcdef1");
    expect(before.length).toBeGreaterThan(0);
    await stop?.();
    stop = undefined;
    expect(await fetch(`${base}/health`).then((r) => r.ok, () => false), "stopped").toBe(false);
    stop = await start();
    expect(await read("/verdicts?revision=abcdef1")).toEqual(before);
    expect(await fetch(`${base}/models/abcdef1`).then((r) => r.status)).toBe(200);
    expect(await fetch(`${base}/releases/latest`).then((r) => r.json())).toMatchObject({ version: "1.0.0" });
  }, 60_000);
});
