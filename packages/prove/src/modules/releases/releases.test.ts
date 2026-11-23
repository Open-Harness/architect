// L2.04's done-when, against the real logbook (workerd, behind wrangler) and a real OIDC issuer (an @orthograph/services
// process), each on a free port.
//   - adding `allowance.list` gives `next 1.1.0` and `stale none` against a logbook holding a 1.0.0 release;
//   - a budget edit gives a patch and makes exactly spend stale in staging and production;
//   - a changed payload gives a major.
import { freePorts } from "../../../test/ports.ts";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Logbook } from "@orthograph/logbook";
import { Issuer, type IssuerConfig } from "@orthograph/services";
import type { Model } from "@orthograph/compiler";
import { Impact } from "#modules/impact/service.js";
import { Releases } from "./service.ts";
import type { Env, Shipping } from "./types.ts";

const PORTS = freePorts("logbook", "issuer");
const services = Effect.runSync(Scope.make());
const REPO = "acme/acme";

const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const compiler = resolve(import.meta.dirname, "../../../../compiler/src/main.ts");
// Variants are compiled inside acme's folder so that `orthograph` resolves, as the other tests' copies are.
const scratch = join(acme, "test/tmp/releases");
const visible = (from: string) => !basename(from).startsWith(".");

const scenario = (client: string, ref: string, event: string) => ({
  requestParam: "client_id", match: client,
  claims: { sub: `repo:${REPO}:ref:${ref}`, aud: ["ortho-logbook"], repository: REPO, ref, workflow: "ortho", event_name: event, sha: "0123456789abcdef0123456789abcdef01234567",
    job_workflow_ref: `${REPO}/.github/workflows/ortho.yml@${ref}` },
});
const issuerConfig: IssuerConfig = {
  tokenCallbacks: [{ issuerId: "ortho", tokenExpiry: 600, requestMappings: [scenario("ci-main", "refs/heads/main", "push"), scenario("ci-pr", "refs/pull/7/merge", "pull_request")] }],
};

let dir = "";
let issuer = "";
let logbook = "";
let stop: (() => Promise<void>) | undefined;
let env: Env = {};

const mint = async (client: string) => {
  const r = await fetch(`${issuer}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: client, client_secret: "unused" }) });
  return ((await r.json()) as { access_token: string }).access_token;
};
const postVerdict = async (client: string, revision: string, environment: string, operation: string, verdict = "pass") => {
  const r = await fetch(`${logbook}/verdicts`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await mint(client)}` },
    body: JSON.stringify({ revision, environment, operation, verdict }) });
  expect(r.status).toBe(200);
};

/** A copy of acme with the changes a test makes, and its model compiled by the compiler in a fresh process, as the command does. */
const variant = (name: string, installs: ReadonlyArray<readonly [string, string]> = []) => {
  const root = join(scratch, name);
  mkdirSync(root, { recursive: true });
  for (const part of ["blueprint", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
  writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ extends: relative(root, join(acme, "tsconfig.json")), include: ["blueprint/**/*.ts"] }));
  for (const [from, to] of installs) cpSync(join(acme, "test/fixtures/layer2", from), join(root, to));
  return { root, model: JSON.parse(execFileSync(process.execPath, [compiler, root], { encoding: "utf8" })) as Model };
};

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const shipping = (model: Model): Promise<Shipping> => run(Releases.shipping(logbook, model));

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "releases-test-"));
  rmSync(scratch, { recursive: true, force: true });
  await Effect.runPromise(Issuer.start({ config: issuerConfig, port: PORTS.issuer }).pipe(Scope.provide(services)));
  issuer = `http://127.0.0.1:${PORTS.issuer}/ortho`;
  const scope = Effect.runSync(Scope.make());
  await Effect.runPromise(Logbook.start({
    port: PORTS.logbook, state: join(dir, "state"), log: join(dir, "wrangler.log"),
    policy: { issuer, jwksUrl: `${issuer}/jwks`, audience: "ortho-logbook", repository: REPO, refs: ["refs/heads/main", "refs/pull/*/merge"], workflows: ["ortho"] },
  }).pipe(Scope.provide(scope)));
  stop = () => Effect.runPromise(Scope.close(scope, Exit.void));
  logbook = `http://127.0.0.1:${PORTS.logbook}`;
  env = { ORTHO_LOGBOOK_URL: logbook, ORTHO_OIDC_ISSUER: issuer, ORTHO_OIDC_CLIENT: "ci-main" };
}, 240_000);

afterAll(async () => {
  await stop?.();
  await Effect.runPromise(Scope.close(services, Exit.void));
  rmSync(dir, { recursive: true, force: true });
  rmSync(scratch, { recursive: true, force: true });
}, 60_000);

describe("versions and staleness against the logbook", () => {
  it("with no release the next version is 1.0.0 and nothing is stale", async () => {
    const first = variant("first");
    expect(await shipping(first.model)).toMatchObject({ from: null, version: "1.0.0", bump: null, changes: [], stale: [], proven: [] });
  });

  it("records a release (the model, then the version), and refuses the same version twice", async () => {
    const first = variant("recorded");
    const record = (version: string) => run(Releases.record({ logbook, env, model: first.model, revision: "rev1", version }));
    await record("1.0.0");
    expect(await (await fetch(`${logbook}/releases/latest`)).json()).toMatchObject({ version: "1.0.0", revision: "rev1" });
    expect(await (await fetch(`${logbook}/models/rev1`)).json()).toEqual(JSON.parse(JSON.stringify(first.model)));
    // The same model again is fine; the same version again is a conflict, and says so.
    await expect(record("1.0.0")).rejects.toMatchObject({ message: expect.stringContaining("409") });
    for (const environment of ["test", "staging", "production"]) for (const op of Object.keys(first.model.operations)) await postVerdict("ci-main", "rev1", environment, op);
  }, 120_000);

  it("a new read is minor, and stales nothing", async () => {
    const withList = variant("with-list", [["list-read/list.ts", "blueprint/things/allowance/verbs/list.ts"]]);
    const s = await shipping(withList.model);
    expect(s).toMatchObject({ from: "1.0.0", version: "1.1.0", bump: "minor", stale: [] });
    expect(s.changes).toEqual([{ kind: "added", what: "allowance.list", bump: "minor" }]);
    expect(s.proven).toContain("allowance.spend");
    expect(Impact.lines({ changes: [], stale: [], proven: [], unproven: [] }, s)).toEqual(expect.arrayContaining(["next 1.1.0", "stale none"]));
    expect(JSON.parse(Releases.changesJson(s))).toMatchObject({ from: "1.0.0", to: "1.1.0", changes: [{ kind: "added", what: "allowance.list", bump: "minor" }], stale: [] });
  }, 120_000);

  it("a looser budget is a patch and makes exactly spend stale, in staging and production", async () => {
    const looser = variant("looser", [
      ["list-read/list.ts", "blueprint/things/allowance/verbs/list.ts"],
      ["looser-budget/spend.ts", "blueprint/things/allowance/verbs/spend.ts"],
    ]);
    const s = await shipping(looser.model);
    expect(s.version).toBe("1.1.0");
    expect(s.stale).toEqual([{ operation: "allowance.spend", environments: ["staging", "production"] }]);
    expect(Impact.lines({ changes: [], stale: [], proven: [], unproven: [] }, s)).toEqual(expect.arrayContaining(["next 1.1.0", "stale allowance.spend in staging, production"]));
    // Budget only, so against the release alone it is a patch.
    expect(await shipping(variant("budget-only", [["looser-budget/spend.ts", "blueprint/things/allowance/verbs/spend.ts"]]).model))
      .toMatchObject({ version: "1.0.1", bump: "patch" });
  }, 120_000);

  it("a verdict from a pull request never un-stales or stales anything: only main's count", async () => {
    const looser = variant("looser-again", [["looser-budget/spend.ts", "blueprint/things/allowance/verbs/spend.ts"]]);
    await postVerdict("ci-pr", "rev-pr", "staging", "allowance.spend");
    const s = await shipping(looser.model);
    expect(s.stale.map((x) => x.operation)).toEqual(["allowance.spend"]);
  }, 120_000);

  it("a changed payload is a major", async () => {
    const first = variant("major");
    const changed = JSON.parse(JSON.stringify(first.model)) as { operations: Record<string, { payload: Record<string, unknown>; hash: string }> };
    delete changed.operations["allowance.spend"]!.payload["allowance"];
    changed.operations["allowance.spend"]!.hash = "other";
    const s = await shipping(changed as unknown as Model);
    expect(s).toMatchObject({ version: "2.0.0", bump: "major" });
    expect(s.changes[0]).toMatchObject({ what: "allowance.spend.payload", bump: "major" });
  }, 120_000);

  it("is found through ORTHO_LOGBOOK_URL, and says when there is no logbook", async () => {
    const found = await run(Releases.locate({ root: dir, env: { ORTHO_LOGBOOK_URL: `${logbook}/` } }));
    expect(found).toBe(logbook);
    expect(existsSync(join(dir, ".ortho"))).toBe(false);
    expect(await run(Releases.locate({ root: dir, env: {} }))).toBeUndefined();
  });
});
