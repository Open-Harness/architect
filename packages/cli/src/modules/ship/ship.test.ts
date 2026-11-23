// L2.04's done-when through the commands' own code: `version --next` and `impact` against the real logbook (workerd behind
// wrangler) and a real OIDC issuer (an @orthograph/services process), each on a free port.
//   - adding allowance.list gives `next 1.1.0` and `stale none` against a logbook holding a 1.0.0 release;
//   - a budget edit keeps it a patch and makes exactly spend stale in staging and production;
//   - without a logbook, `impact` is what Gate 1 had and `version --next` says how to start one.
import { freePorts } from "../../../test/ports.ts";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Logbook } from "@orthograph/logbook";
import { Issuer, type IssuerConfig } from "@orthograph/services";
import { Releases } from "@orthograph/prove";
import type { Model } from "@orthograph/compiler";
import { Ship } from "./service.ts";

const PORTS = freePorts("logbook", "issuer", "gone");
const services = Effect.runSync(Scope.make());
const REPO = "acme/acme";

const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const compiler = resolve(import.meta.dirname, "../../../../compiler/src/main.ts");
const scratch = join(acme, "test/tmp/ship");
const visible = (from: string) => !basename(from).startsWith(".");

const issuerConfig: IssuerConfig = {
  tokenCallbacks: [{ issuerId: "ortho", tokenExpiry: 600, requestMappings: [{
    requestParam: "client_id", match: "ci-main",
    claims: { sub: `repo:${REPO}:ref:refs/heads/main`, aud: ["ortho-logbook"], repository: REPO, ref: "refs/heads/main", workflow: "ortho", event_name: "push",
      sha: "0123456789abcdef0123456789abcdef01234567", job_workflow_ref: `${REPO}/.github/workflows/ortho.yml@refs/heads/main` },
  }] }],
};

let dir = "";
let issuer = "";
let logbook = "";
let stop: (() => Promise<void>) | undefined;
let env: Record<string, string> = {};

const mint = async () => {
  const r = await fetch(`${issuer}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: "ci-main", client_secret: "unused" }) });
  return ((await r.json()) as { access_token: string }).access_token;
};

/** A copy of acme, with some of the layer-two fixtures installed, as a user's project at one point in its life. */
const copy = (name: string, installs: ReadonlyArray<readonly [string, string]> = []) => {
  const root = join(scratch, name);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  for (const part of ["blueprint", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
  mkdirSync(join(root, "generated/model"), { recursive: true });
  writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ extends: relative(root, join(acme, "tsconfig.json")), include: ["blueprint/**/*.ts"] }));
  for (const [from, to] of installs) cpSync(join(acme, "test/fixtures/layer2", from), join(root, to));
  return root;
};
const modelOf = (root: string) => JSON.parse(execFileSync(process.execPath, [compiler, root], { encoding: "utf8" })) as Model;
const lines = (said: { out: string }) => said.out.split("\n");

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "ship-test-"));
  rmSync(scratch, { recursive: true, force: true });
  await Effect.runPromise(Issuer.start({ config: issuerConfig, port: PORTS.issuer }).pipe(Scope.provide(services)));
  issuer = `http://127.0.0.1:${PORTS.issuer}/ortho`;
  const scope = Effect.runSync(Scope.make());
  await Effect.runPromise(Logbook.start({
    port: PORTS.logbook, state: join(dir, "state"), log: join(dir, "wrangler.log"),
    policy: { issuer, jwksUrl: `${issuer}/jwks`, audience: "ortho-logbook", repository: REPO, refs: ["refs/heads/main"], workflows: ["ortho"] },
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

describe("ortho version --next and ortho impact", () => {
  it("with no logbook: impact is the local ledger's lines, and version --next says how to start one", async () => {
    const root = copy("nobook");
    const impact = await Effect.runPromise(Ship.impact({ root, env: {} }));
    expect(impact).toMatchObject({ exit: 0, err: "" });
    expect(lines(impact)).toContain("stale none");
    expect(lines(impact).some((l) => l.startsWith("next "))).toBe(false);
    const next = await Effect.runPromise(Ship.next({ root, env: {} }));
    expect(next.exit).toBe(2);
    expect(next.err).toContain("ortho env up logbook");
    expect(existsSync(join(root, "generated/model/changes.json"))).toBe(false);
  }, 120_000);

  it("a logbook with no release: 1.0.0, and nothing stale", async () => {
    const root = copy("first");
    expect(await Effect.runPromise(Ship.next({ root, env }))).toEqual({ out: "1.0.0\n", err: "", exit: 0 });
    expect(lines(await Effect.runPromise(Ship.impact({ root, env })))).toEqual(expect.arrayContaining(["next 1.0.0", "stale none"]));
  }, 120_000);

  it("after a 1.0.0 release: the read is minor with nothing stale; a looser budget stales only spend in staging and production", async () => {
    const first = copy("released");
    await Effect.runPromise(Releases.record({ logbook, env, model: modelOf(first), revision: "rev1", version: "1.0.0" }));
    for (const environment of ["test", "staging", "production"]) {
      for (const operation of Object.keys(modelOf(first).operations)) {
        const r = await fetch(`${logbook}/verdicts`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await mint()}` },
          body: JSON.stringify({ revision: "rev1", environment, operation, verdict: "pass" }) });
        expect(r.status).toBe(200);
      }
    }
    expect(await Effect.runPromise(Ship.next({ root: first, env }))).toEqual({ out: "1.0.1\n", err: "", exit: 0 });
    expect(lines(await Effect.runPromise(Ship.impact({ root: first, env })))).toContain("stale none");

    const withList = copy("with-list", [["list-read/list.ts", "blueprint/things/allowance/verbs/list.ts"]]);
    const impact = await Effect.runPromise(Ship.impact({ root: withList, env }));
    expect(impact).toMatchObject({ exit: 0, err: "" });
    expect(lines(impact)).toEqual(expect.arrayContaining(["next 1.1.0", "stale none", "added allowance.list minor"]));
    expect((await Effect.runPromise(Ship.next({ root: withList, env }))).out).toBe("1.1.0\n");
    const changes = JSON.parse(readFileSync(join(withList, "generated/model/changes.json"), "utf8")) as { from: string; to: string; changes: unknown; stale: unknown; proven: Array<string> };
    expect(changes).toMatchObject({ from: "1.0.0", to: "1.1.0", changes: [{ kind: "added", what: "allowance.list", bump: "minor" }], stale: [] });
    expect(changes.proven).toEqual(expect.arrayContaining(["allowance.get", "allowance.grant", "allowance.spend"]));

    const looser = copy("looser", [["list-read/list.ts", "blueprint/things/allowance/verbs/list.ts"], ["looser-budget/spend.ts", "blueprint/things/allowance/verbs/spend.ts"]]);
    const stale = lines(await Effect.runPromise(Ship.impact({ root: looser, env })));
    expect(stale).toContain("next 1.1.0");
    expect(stale.filter((l) => l.startsWith("stale "))).toEqual(["stale allowance.spend in staging, production"]);
    expect(JSON.parse(readFileSync(join(looser, "generated/model/changes.json"), "utf8"))).toMatchObject({ to: "1.1.0", stale: ["allowance.spend"] });
  }, 240_000);

  it("a logbook that does not answer is a warning on the local lines, never a wrong `stale none`", async () => {
    const root = copy("down");
    const said = await Effect.runPromise(Ship.impact({ root, env: { ORTHO_LOGBOOK_URL: `http://127.0.0.1:${PORTS.gone}` } }));
    expect(said.exit).toBe(0);
    expect(said.err).toContain("the logbook was not consulted");
    expect(lines(said).some((l) => l.startsWith("next "))).toBe(false);
    expect((await Effect.runPromise(Ship.next({ root, env: { ORTHO_LOGBOOK_URL: `http://127.0.0.1:${PORTS.gone}` } }))).exit).toBe(2);
  }, 120_000);
});
