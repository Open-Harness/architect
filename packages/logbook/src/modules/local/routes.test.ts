// The former HTTP/SQL shim assertions, through real workerd, R2, Durable Objects and the OIDC issuer process of @orthograph/services.
// Each case gets fresh persisted storage. Every port is a free one; no other services are touched.
import { freePorts } from "../../../test/ports.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { Issuer, type IssuerConfig } from "@orthograph/services";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { StoredVerdict } from "#modules/book/types.js";
import { Logbook } from "./service.ts";

const PORTS = freePorts("logbook", "issuer");
const services = Effect.runSync(Scope.make());
const base = `http://127.0.0.1:${PORTS.logbook}`;
const issuer = `http://127.0.0.1:${PORTS.issuer}/ortho`;
const config: IssuerConfig = { tokenCallbacks: [{ issuerId: "ortho", tokenExpiry: 600,
  requestMappings: [false, true].map((pr) => ({ requestParam: "client_id", match: pr ? "ci-pr" : "ci-main", claims: {
    sub: `repo:acme/acme:ref:${pr ? "refs/pull/3/merge" : "refs/heads/main"}`, aud: ["ortho-logbook"], repository: "acme/acme",
    ref: pr ? "refs/pull/3/merge" : "refs/heads/main", workflow: "ci", event_name: pr ? "pull_request" : "push",
    sha: "0123456789abcdef0123456789abcdef01234567",
    job_workflow_ref: `acme/acme/.github/workflows/ci.yml@${pr ? "refs/pull/3/merge" : "refs/heads/main"}`,
  } })),
}] };
let dir = "";
let state = "";
let token = "";
let prToken = "";
let stop: (() => Promise<void>) | undefined;

const start = async (policyIssuer = issuer) => {
  const scope = Effect.runSync(Scope.make());
  stop = () => Effect.runPromise(Scope.close(scope, Exit.void));
  await Effect.runPromise(Logbook.start({ port: PORTS.logbook, state, log: join(state, "wrangler.log"),
    policy: { issuer: policyIssuer, jwksUrl: `${issuer}/jwks`, audience: "ortho-logbook", repository: "acme/acme",
      refs: ["refs/heads/main", "refs/pull/*/merge"], workflows: ["ci"] },
  }).pipe(Scope.provide(scope)));
};
const mint = async (client: string) => {
  const response = await fetch(`${issuer}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: client, client_secret: "unused" }) });
  expect(response.status).toBe(200);
  return ((await response.json()) as { access_token: string }).access_token;
};
const request = (method: string, path: string, body?: unknown, bearer?: string) => fetch(`${base}${path}`, {
  method, headers: { connection: "close", "content-type": "application/json", ...(bearer === undefined ? {} : { authorization: `Bearer ${bearer}` }) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const rows = (query = "", latest = false) => request("GET", `/verdicts${latest ? "/latest" : ""}${query}`).then((r) => r.json() as Promise<Array<StoredVerdict>>);
const verdict = { revision: "abc1234", environment: "test", operation: "a.b", verdict: "pass" };
const post = async (revision: string, environment: string, operation: string, value = "pass", bearer = token) => {
  expect((await request("POST", "/verdicts", { revision, environment, operation, verdict: value }, bearer)).status).toBe(200);
};

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "logbook-routes-"));
  await Effect.runPromise(Issuer.start({ config, port: PORTS.issuer }).pipe(Scope.provide(services)));
  [token, prToken] = await Promise.all([mint("ci-main"), mint("ci-pr")]);
}, 180_000);
beforeEach(async () => { state = mkdtempSync(join(dir, "case-")); await start(); }, 180_000);
afterEach(async () => { await stop?.(); stop = undefined; }, 60_000);
afterAll(async () => {
  await stop?.();
  await Effect.runPromise(Scope.close(services, Exit.void));
  if (dir) rmSync(dir, { recursive: true, force: true });
}, 60_000);

describe("the public logbook routes on real platform storage", () => {
  it("answers health, unknown routes and unsupported methods", async () => {
    const health = await request("GET", "/health");
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ ok: true, service: "logbook" });
    expect((await request("GET", "/nothing")).status).toBe(404);
    expect((await request("DELETE", "/verdicts")).status).toBe(404);
  });

  it("refuses unsigned and bad-token writes before body decoding, leaving every store empty", async () => {
    expect((await request("POST", "/verdicts", verdict)).status).toBe(401);
    expect((await request("POST", "/verdicts", verdict, "not-a-jwt")).status).toBe(401);
    expect((await request("PUT", "/models/abc1234", { a: 1 })).status).toBe(401);
    expect((await request("POST", "/releases", { version: "1.0.1", revision: "abc1234" })).status).toBe(401);
    const invalidJson = await fetch(`${base}/verdicts`, { method: "POST", headers: { connection: "close" }, body: "not JSON" });
    expect(invalidJson.status).toBe(401);
    expect(await rows()).toEqual([]);
    expect((await request("GET", "/models/abc1234")).status).toBe(404);
    expect((await request("GET", "/releases/latest")).status).toBe(404);
  });

  it("reports only the missing policy setting through the real worker", async () => {
    await stop?.(); stop = undefined;
    await start("");
    const response = await request("POST", "/verdicts", verdict, token);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, reason: "not configured", missing: ["OIDC_ISSUER"] });
    expect(await rows()).toEqual([]);
  }, 60_000);

  it("accepts a valid verdict and rejects every original invalid body without extra records", async () => {
    expect((await request("POST", "/verdicts", verdict, token)).status).toBe(200);
    for (const bad of [{ ...verdict, verdict: "maybe" }, { ...verdict, revision: "../x" }, { ...verdict, operation: "" }, { revision: "abc" }, "text"]) {
      expect((await request("POST", "/verdicts", bad, token)).status, JSON.stringify(bad)).toBe(400);
    }
    expect(await rows()).toMatchObject([verdict]);
    expect(await rows()).toHaveLength(1);
  });

  it("keeps one immutable R2 model, permits identical retries and rejects a non-object model", async () => {
    expect((await request("GET", "/models/abc1234")).status).toBe(404);
    expect((await request("PUT", "/models/abc1234", { a: 1 }, token)).status).toBe(200);
    expect((await request("PUT", "/models/abc1234", { a: 1 }, token)).status).toBe(200);
    expect((await request("PUT", "/models/abc1234", { a: 2 }, token)).status).toBe(409);
    expect((await request("PUT", "/models/abc1234", [1], token)).status).toBe(400);
    const response = await request("GET", "/models/abc1234");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ a: 1 });
  });

  it("requires a model, admits a release once per version and rejects invalid release bodies", async () => {
    expect((await request("GET", "/releases/latest")).status).toBe(404);
    expect((await request("POST", "/releases", { version: "1.1.0", revision: "abc1234" }, token)).status).toBe(409);
    expect((await request("PUT", "/models/abc1234", { a: 1 }, token)).status).toBe(200);
    expect((await request("POST", "/releases", { version: "1.1.0", revision: "abc1234" }, token)).status).toBe(200);
    expect((await request("POST", "/releases", { version: "1.1.0", revision: "abc1234" }, token)).status).toBe(409);
    expect((await request("POST", "/releases", { version: "one", revision: "abc1234" }, token)).status).toBe(400);
    expect(await request("GET", "/releases/latest").then((r) => r.json())).toMatchObject({ version: "1.1.0", revision: "abc1234" });
  });
});

describe("the ledger's SQL invariants through its real Durable Object", () => {
  it("keeps every append oldest first with real verified provenance and nullable or supplied bundle hashes", async () => {
    await post("r1", "test", "a.b");
    await post("r1", "test", "a.b", "fail", prToken);
    const all = await rows("?revision=r1");
    expect(all.map((x) => [x.seq, x.verdict, x.ref, x.event_name])).toEqual([[1, "pass", "refs/heads/main", "push"], [2, "fail", "refs/pull/3/merge", "pull_request"]]);
    expect(all).toMatchObject([{ repository: "acme/acme", workflow: "ci", sha: "0123456789abcdef0123456789abcdef01234567", sha256: null }, { sha256: null }]);
    expect(await rows("?revision=nope")).toEqual([]);
    const sha256 = "b".repeat(64);
    expect((await request("POST", "/verdicts", { ...verdict, sha256 }, token)).status).toBe(200);
    expect(await rows("?revision=abc1234")).toMatchObject([{ sha256 }]);
  });

  it("conjoins the revision, environment, operation and ref filters", async () => {
    await post("r1", "test", "a.b");
    await post("r1", "staging", "a.b");
    await post("r1", "test", "a.c", "pass", prToken);
    expect(await rows("?environment=test")).toHaveLength(2);
    expect(await rows("?environment=test&ref=refs%2Fheads%2Fmain")).toHaveLength(1);
    expect(await rows("?operation=a.c&revision=r1&environment=test&ref=refs%2Fpull%2F3%2Fmerge")).toHaveLength(1);
    expect(await rows("?operation=a.c&revision=r1&environment=test&ref=refs%2Fheads%2Fmain")).toEqual([]);
  });

  it("selects the latest per operation and environment after filtering, without a PR hiding main", async () => {
    await post("r1", "test", "a.b");
    await post("r2", "test", "a.b", "fail");
    await post("r2", "staging", "a.b");
    await post("r3", "test", "a.b", "pass", prToken);
    expect((await rows("", true)).map((x) => [x.environment, x.revision])).toEqual([["staging", "r2"], ["test", "r3"]]);
    expect((await rows("?ref=refs%2Fheads%2Fmain", true)).map((x) => [x.environment, x.revision, x.verdict])).toEqual([["staging", "r2", "pass"], ["test", "r2", "fail"]]);
  });

  it("keeps the last release and finds old versions after newer releases advance the ledger", async () => {
    expect((await request("GET", "/releases/latest")).status).toBe(404);
    for (const revision of ["r1", "r2"]) expect((await request("PUT", `/models/${revision}`, { revision }, token)).status).toBe(200);
    for (const [version, revision] of [["1.0.0", "r1"], ["1.1.0", "r2"]]) {
      expect((await request("POST", "/releases", { version, revision }, token)).status).toBe(200);
    }
    expect(await request("GET", "/releases/latest").then((r) => r.json())).toMatchObject({ version: "1.1.0", revision: "r2", ref: "refs/heads/main" });
    expect((await request("POST", "/releases", { version: "1.0.0", revision: "r2" }, token)).status).toBe(409);
    expect((await request("POST", "/releases", { version: "2.0.0", revision: "r2" }, token)).status).toBe(200);
    expect(await request("GET", "/releases/latest").then((r) => r.json())).toMatchObject({ version: "2.0.0", revision: "r2" });
  });
});
