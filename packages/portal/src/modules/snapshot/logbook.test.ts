// L2.10b's done-when, against the real logbook (workerd, behind wrangler) holding real verdicts signed by a real OIDC
// issuer (an @orthograph/services process), over models the real compiler wrote: a recorded pass shows on
// spend, a budget edit makes spend stale and nothing else, the latest failure wins, and a logbook that stops or a model
// that is missing never shows green.
import { freePorts } from "../../../test/ports.ts";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Logbook } from "@orthograph/logbook";
import { Issuer, type IssuerConfig } from "@orthograph/services";
import { Reader } from "#modules/reader/service.js";
import { Wire } from "#modules/wire/service.js";
import { acmeDocs } from "#modules/wire/testing.js";
import type { ModelWire } from "#modules/wire/types.js";
import { Snapshot } from "./service.ts";
import type { PortalSnapshot } from "./types.ts";

const PORTS = freePorts("logbook", "issuer");
const REPO = "acme/acme";
const services = Effect.runSync(Scope.make());

const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const compiler = resolve(import.meta.dirname, "../../../../compiler/src/main.ts");
const scratch = join(acme, "test/tmp/portal");
const visible = (from: string) => !basename(from).startsWith(".");

const scenario = (client: string, ref: string) => ({
  requestParam: "client_id", match: client,
  claims: { sub: `repo:${REPO}:ref:${ref}`, aud: ["ortho-logbook"], repository: REPO, ref, workflow: "ortho", event_name: "push", sha: "0123456789abcdef0123456789abcdef01234567", job_workflow_ref: `${REPO}/.github/workflows/ortho.yml@${ref}` },
});
const issuerConfig: IssuerConfig = { tokenCallbacks: [{ issuerId: "ortho", tokenExpiry: 600, requestMappings: [scenario("ci-main", "refs/heads/main"), scenario("ci-pr", "refs/pull/7/merge")] }] };

let dir = "";
let issuer = "";
let logbook = "";
let stop: (() => Promise<void>) | undefined;
let stopped = false;

const mint = async (client: string) => {
  const r = await fetch(`${issuer}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: client, client_secret: "unused" }) });
  return ((await r.json()) as { access_token: string }).access_token;
};
const send = async (client: string, method: string, path: string, body: unknown) => {
  const r = await fetch(`${logbook}${path}`, { method, headers: { "content-type": "application/json", authorization: `Bearer ${await mint(client)}` }, body: JSON.stringify(body) });
  expect(r.status, `${method} ${path}`).toBe(200);
};
const post = (revision: string, environment: string, operation: string, verdict = "pass", client = "ci-main") => send(client, "POST", "/verdicts", { revision, environment, operation, verdict });

/** A copy of acme with the changes a test makes, its model compiled by the compiler in a fresh process, as the command does. */
const variant = (name: string, installs: ReadonlyArray<readonly [string, string]> = []) => {
  const root = join(scratch, name);
  mkdirSync(root, { recursive: true });
  for (const part of ["blueprint", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
  writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ extends: relative(root, join(acme, "tsconfig.json")), include: ["blueprint/**/*.ts"] }));
  for (const [from, to] of installs) cpSync(join(acme, "test/fixtures/layer2", from), join(root, to));
  return JSON.parse(execFileSync(process.execPath, [compiler, root], { encoding: "utf8" })) as ModelWire;
};
const keep = (revision: string, model: unknown) => send("ci-main", "PUT", `/models/${revision}`, model);
const prove = async (revision: string, model: ModelWire, environments: ReadonlyArray<string>) => {
  await keep(revision, model);
  for (const environment of environments) for (const operation of Object.keys(model.operations)) await post(revision, environment, operation);
};

let first: ModelWire;
let looser: ModelWire;
const snapshot = (model: ModelWire, bundle: string): Promise<PortalSnapshot> =>
  Effect.runPromise(Snapshot.take({ blueprint: Wire.build({ project: "acme", model, docs: acmeDocs() }), reader: Reader.http(logbook), bundleRevision: bundle }));
const stateOf = (s: PortalSnapshot, operation: string) => Object.fromEntries(s.proofs.filter((p) => p.operation === operation).map((p) => [p.environment, p.state]));

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "portal-test-"));
  rmSync(scratch, { recursive: true, force: true });
  first = variant("first");
  looser = variant("looser", [["looser-budget/spend.ts", "blueprint/things/allowance/verbs/spend.ts"]]);
  await Effect.runPromise(Issuer.start({ config: issuerConfig, port: PORTS.issuer }).pipe(Scope.provide(services)));
  issuer = `http://127.0.0.1:${PORTS.issuer}/ortho`;
  const scope = Effect.runSync(Scope.make());
  await Effect.runPromise(Logbook.start({
    port: PORTS.logbook, state: join(dir, "state"), log: join(dir, "wrangler.log"),
    policy: { issuer, jwksUrl: `${issuer}/jwks`, audience: "ortho-logbook", repository: REPO, refs: ["refs/heads/main", "refs/pull/*/merge"], workflows: ["ortho"] },
  }).pipe(Scope.provide(scope)));
  stop = () => (stopped ? Promise.resolve() : ((stopped = true), Effect.runPromise(Scope.close(scope, Exit.void))));
  logbook = `http://127.0.0.1:${PORTS.logbook}`;
}, 240_000);

afterAll(async () => {
  await stop?.();
  await Effect.runPromise(Scope.close(services, Exit.void));
  rmSync(dir, { recursive: true, force: true });
  rmSync(scratch, { recursive: true, force: true });
}, 60_000);

describe("the portal over the real logbook", () => {
  it("shows spend proved in test, staging and production by signed verdicts", async () => {
    await prove("rev1", first, ["test", "staging", "production"]);
    const s = await snapshot(first, "rev1");
    expect(s.consistency).toBe("checked");
    expect(s.candidate).toEqual({ revision: "rev1", source: "logbook" });
    expect(stateOf(s, "allowance.spend")).toEqual({ test: "recorded-pass", staging: "recorded-pass", production: "recorded-pass" });
    expect(s.proofs.every((p) => p.state === "recorded-pass")).toBe(true);
    const spend = s.proofs.find((p) => p.operation === "allowance.spend" && p.environment === "staging")!;
    expect(spend.evidence).toMatchObject({ value: { revision: "rev1", ref: "refs/heads/main", repository: REPO, workflow: "ortho", event_name: "push" } });
  }, 300_000);

  it("a pull request's verdict signed by the same issuer never fills the matrix", async () => {
    await post("rev1", "staging", "allowance.get", "fail", "ci-pr");
    expect(stateOf(await snapshot(first, "rev1"), "allowance.get").staging).toBe("recorded-pass");
  }, 120_000);

  it("a budget edit makes spend stale in staging and production, and no other operation", async () => {
    expect(looser.operations["allowance.spend"]!.budget).not.toEqual(first.operations["allowance.spend"]!.budget);
    await prove("rev2", looser, ["test"]);
    const s = await snapshot(looser, "rev1");
    expect(s.candidate).toEqual({ revision: "rev2", source: "logbook" });
    expect(stateOf(s, "allowance.spend")).toEqual({ test: "recorded-pass", staging: "stale", production: "stale" });
    expect(s.proofs.find((p) => p.operation === "allowance.spend" && p.environment === "staging")!.changedDependencies.map((c) => c.key)).toEqual(["operation:allowance.spend"]);
    const stale = s.proofs.filter((p) => p.state === "stale");
    expect(new Set(stale.map((p) => p.operation))).toEqual(new Set(["allowance.spend"]));
    expect(s.proofs.filter((p) => p.state !== "stale" && p.state !== "recorded-pass")).toEqual([]);
  }, 300_000);

  it("the latest failure wins, and a later pass replaces it", async () => {
    await post("rev2", "test", "allowance.spend", "fail");
    expect(stateOf(await snapshot(looser, "rev1"), "allowance.spend").test).toBe("failed");
    await post("rev2", "test", "allowance.spend", "pass");
    expect(stateOf(await snapshot(looser, "rev1"), "allowance.spend").test).toBe("recorded-pass");
  }, 120_000);

  it("a verdict for a revision whose model the logbook does not hold is unavailable, not green", async () => {
    await post("ghost1", "production", "allowance.spend");
    const s = await snapshot(looser, "rev1");
    expect(stateOf(s, "allowance.spend").production).toBe("unavailable");
    expect(s.proofs.find((p) => p.operation === "allowance.spend" && p.environment === "production")!.reason).toContain("ghost1");
  }, 120_000);

  it("a logbook that has stopped shows every proof unavailable, none green, with nothing left running", async () => {
    await stop?.();
    const s = await snapshot(looser, "rev1");
    expect(s.consistency).toBe("unavailable");
    expect(s.proofs.length).toBeGreaterThan(0);
    expect(s.proofs.every((p) => p.state === "unavailable")).toBe(true);
    expect(s.proofs[0]!.evidence).toMatchObject({ state: "unavailable" });
    expect(spawnSync("pgrep", ["-fl", dir], { encoding: "utf8" }).stdout.trim()).toBe("");
  }, 120_000);
});
