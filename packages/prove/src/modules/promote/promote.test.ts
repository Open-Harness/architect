// L2.05's done-when checks, on a copy of acme under git, through the `ortho promote` command: it refuses a revision
// without verdicts and accepts one that has them, production is refused without staging verdicts, one bundle hash runs in
// test, staging and production, and a dirty tree or an unbuilt bundle is refused. Real wrangler and workerd for the
// logbook and the three environments, real collectors and a real OIDC issuer (an @orthograph/services process), each on a free port.
import { freePorts } from "../../../test/ports.ts";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { Issuer } from "@orthograph/services";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Environments } from "#modules/environments/service.js";

const PORTS = freePorts("logbook", "test", "staging", "production", "issuer");
const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const cli = resolve(import.meta.dirname, "../../../../cli/src/main.ts");
const trusted = { repository: "acme/acme", workflow: "ortho" };
const services = Effect.runSync(Scope.make());
const visible = (from: string) => !basename(from).startsWith(".");
const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

// Each ortho command blocks this test's event loop. A pooled socket may close while spawnSync is running, so
// never carry one across those commands. Closing the request is safe for both reads and signed writes; no replay.
const request = (url: string, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  headers.set("connection", "close");
  return fetch(url, { ...init, headers });
};

const git = (root: string, ...args: ReadonlyArray<string>) => {
  const r = spawnSync("git", ["-c", "user.name=l2", "-c", "user.email=l2@example.test", "-c", "commit.gpgsign=false", ...args], { cwd: root, encoding: "utf8" });
  expect(r.status, r.stderr).toBe(0);
  return r.stdout.trim();
};
const commit = (root: string, message: string) => {
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", message);
  return git(root, "rev-parse", "--short", "HEAD");
};

/** A copy of acme under git, outside the repository: its revision is a commit of its own. */
const parent = mkdtempSync(join(realpathSync(tmpdir()), "ortho-l205-"));
const root = join(parent, "acme");
for (const part of ["ortho.config.ts", "blueprint", "generated", "src", "journeys", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
mkdirSync(join(root, "node_modules"));
for (const entry of readdirSync(join(acme, "node_modules"))) if (entry !== ".bin") symlinkSync(join(acme, "node_modules", entry), join(root, "node_modules", entry));
writeFileSync(join(root, ".gitignore"), "node_modules/\n.ortho/\n.wrangler/\n");
git(root, "init", "-q", "-b", "main");
const first = commit(root, "acme");
const operations = Object.keys((JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as { operations: Record<string, unknown> }).operations);

const issuer = `http://127.0.0.1:${PORTS.issuer}/ortho`;
const logbook = `http://127.0.0.1:${PORTS.logbook}`;
const env = {
  ORTHO_OIDC_ISSUER: issuer, ORTHO_OIDC_CLIENT: "ci-main",
  ORTHO_OIDC_REPOSITORY: trusted.repository, ORTHO_OIDC_REF: "refs/heads/main", ORTHO_OIDC_WORKFLOW: trusted.workflow,
};

/** What `ortho <args>` printed and how it ended. */
const ortho = (...args: ReadonlyArray<string>) => {
  const r = spawnSync(process.execPath, [cli, ...args, "--root", root], { cwd: root, encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024, timeout: 900_000 });
  const out = `${r.stdout}${r.stderr}`;
  return { status: r.status, out, lines: out.split("\n") };
};

const scenario = (client: string, ref: string) => ({
  requestParam: "client_id", match: client,
  claims: { sub: `repo:acme/acme:ref:${ref}`, aud: ["ortho-logbook"], repository: trusted.repository, ref, workflow: trusted.workflow },
});
const scenarios = { interactiveLogin: false, tokenCallbacks: [{ issuerId: "ortho", tokenExpiry: 600, requestMappings: [scenario("ci-main", "refs/heads/main"), scenario("ci-pr", "refs/pull/7/merge")] }] };

const mint = async (client: string) => {
  const r = await request(`${issuer}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials", client_id: client, client_secret: "unused" }) });
  return ((await r.json()) as { access_token: string }).access_token;
};
const post = async (client: string, revision: string, environment: string, operation: string, verdict: "pass" | "fail" = "pass") => {
  const sha256 = (JSON.parse(readFileSync(join(root, ".ortho/artefacts", revision, "bundle.json"), "utf8")) as { sha256: string }).sha256;
  const r = await request(`${logbook}/verdicts`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await mint(client)}` }, body: JSON.stringify({ revision, environment, operation, verdict, sha256 }) });
  expect(r.status).toBe(200);
};
type Row = { operation: string; verdict: string; environment: string; ref: string; revision: string; sha256?: string | null };
const held = async (revision: string, environment: string) =>
  (await (await request(`${logbook}/verdicts?revision=${revision}&environment=${environment}`)).json()) as Array<Row>;
/** What the environment itself says it runs, found where it is. */
const bundleOf = async (name: "test" | "staging" | "production") => {
  const where = await run(Environments.status({ root, name }));
  expect(where.state, name).toBe("up");
  expect((where as { port: number }).port, `${name}'s port`).toBe(PORTS[name]);
  return (await (await request(`${(where as { url: string }).url}/_ortho/bundle`)).json()) as { revision: string; sha256: string };
};

beforeAll(async () => {
  const dir = join(parent, "issuer");
  mkdirSync(dir);
  await run(Issuer.start({ port: PORTS.issuer, dir, config: scenarios }).pipe(Scope.provide(services)));
  // A pull request's token is trusted by the logbook, so that only a verdict's ref, not its signature, keeps it from counting.
  const policy = { issuer, repository: trusted.repository, refs: ["refs/heads/main", "refs/pull/*/merge"], workflows: [trusted.workflow] };
  expect((await run(Environments.up({ root, name: "logbook", port: PORTS.logbook, policy }))).url).toBe(logbook);
}, 600_000);

afterAll(async () => {
  for (const name of ["production", "staging", "test", "logbook"]) await run(Environments.down({ root, name }));
  await run(Scope.close(services, Exit.void));
  rmSync(parent, { recursive: true, force: true });
});

describe("ortho promote", () => {
  it("refuses a dirty tree and a revision with no built bundle, each naming what is wrong", { timeout: 600_000 }, () => {
    const unbuilt = ortho("promote", "--to", "staging");
    expect(unbuilt.status, unbuilt.out).toBe(1);
    expect(unbuilt.lines, unbuilt.out).toContain(`refused: ${first} has no built bundle: run \`ortho build\``);

    expect(ortho("build").status).toBe(0);
    writeFileSync(join(root, "src/allowance/spend.ts"), `${readFileSync(join(root, "src/allowance/spend.ts"), "utf8")}\n// edited, not committed\n`);
    const dirty = ortho("promote", "--to", "staging");
    expect(dirty.status, dirty.out).toBe(1);
    expect(dirty.out).toContain(`refused: the working tree differs from ${first}`);
    // Nothing was started for a refused promotion.
    expect(dirty.out).not.toContain("up http");
    git(root, "checkout", "--", "src/allowance/spend.ts");
  });

  it("refuses a revision without main test verdicts, naming what is missing, and accepts one that has them", { timeout: 900_000 }, async () => {
    const none = ortho("promote", "--to", "staging");
    expect(none.status, none.out).toBe(1);
    expect(none.lines, none.out).toContain(`refused: ${first} has no green verdicts in test`);
    expect(none.out).toContain(`missing: ${operations.join(", ")}`);

    // A pull request's verdicts never count, even from a signed token the logbook trusts.
    for (const op of operations) await post("ci-pr", first, "test", op);
    const pull = ortho("promote", "--to", "staging");
    expect(pull.status, pull.out).toBe(1);
    expect(pull.lines, pull.out).toContain(`refused: ${first} has no green verdicts in test`);

    // All but one on main, and one that failed: both are named.
    const [failing, absent, ...rest] = operations;
    for (const op of rest) await post("ci-main", first, "test", op);
    await post("ci-main", first, "test", failing!, "fail");
    const partial = ortho("promote", "--to", "staging");
    expect(partial.status, partial.out).toBe(1);
    expect(partial.out).toContain(`refused: ${first} has no green verdicts in test for every operation`);
    expect(partial.out).toContain(`missing: ${[failing, absent].sort().join(", ")}`);
    expect(await bundleStatus("staging")).toBe("down");
  });

  it("production is refused without staging verdicts, then takes what staging proved: one bundle in test, staging and production", { timeout: 1_800_000 }, async () => {
    // Environments the way the checks run them: up on a port of their own, which a promotion then keeps.
    expect(ortho("env", "up", "test", "--port", String(PORTS.test)).status).toBe(0);
    const proved = ortho("prove", "--env", "test");
    expect(proved.status, proved.out.slice(-3000)).toBe(0);

    const refused = ortho("promote", "--to", "production");
    expect(refused.status, refused.out).toBe(1);
    expect(refused.lines, refused.out).toContain(`refused: ${first} has no green verdicts in staging`);
    expect(await bundleStatus("production")).toBe("down");
    for (const name of ["staging", "production"] as const) expect(ortho("env", "up", name, "--port", String(PORTS[name])).status).toBe(0);

    const staged = ortho("promote", "--to", "staging");
    expect(staged.status, staged.out.slice(-3000)).toBe(0);
    expect(staged.out).toContain("prove ✔");
    const hash = (JSON.parse(readFileSync(join(root, `.ortho/artefacts/${first}/bundle.json`), "utf8")) as { sha256: string }).sha256;
    expect(staged.out).toContain(`sha256:${hash}`);
    const verdicts = await held(first, "staging");
    expect(verdicts.map((v) => v.operation).sort()).toEqual([...operations].sort());
    expect(verdicts.every((v) => v.verdict === "pass" && v.ref === "refs/heads/main" && v.sha256 === hash)).toBe(true);

    // The newest signed verdict closes the gate if it names other bytes or has no bundle identity at all.
    for (const sha256 of ["0".repeat(64), undefined]) {
      const response = await request(`${logbook}/verdicts`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await mint("ci-main")}` }, body: JSON.stringify({ revision: first, environment: "staging", operation: operations[0], verdict: "pass", ...(sha256 ? { sha256 } : {}) }) });
      expect(response.status).toBe(200);
      const wrong = ortho("promote", "--to", "production");
      expect(wrong.status, wrong.out).toBe(1);
      expect(wrong.out).toContain("bundle");
    }
    await post("ci-main", first, "staging", operations[0]!);

    // A bundle cannot inherit the clean revision's proof after an uncommitted build and a source restore.
    const source = join(root, "src/allowance/spend.ts");
    const text = readFileSync(source, "utf8");
    const main = join(root, ".ortho/artefacts", first, "main.js");
    const bytes = readFileSync(main, "utf8");
    writeFileSync(source, text.replace("return { remaining: remaining - amount }", "return { remaining: 0n }"));
    const dirtyBuild = ortho("build");
    writeFileSync(source, text);
    expect(dirtyBuild.status, dirtyBuild.out).not.toBe(0);
    expect(readFileSync(main, "utf8")).toBe(bytes);


    const released = ortho("promote", "--to", "production");
    expect(released.status, released.out.slice(-3000)).toBe(0);
    expect(released.lines, released.out).toContain(`production from staging ${first} sha256:${hash}`);
    expect(released.lines.some((l) => /^skipped .+ \(cloud pass\)$/.test(l)), released.out).toBe(true);

    // The same bundle, byte for byte, in all three.
    for (const name of ["test", "staging", "production"] as const) expect(await bundleOf(name), name).toEqual({ revision: first, sha256: hash });

    // Production has a verdict per operation too: staging's, carried to the same bundle, so staleness reaches it.
    expect((await held(first, "production")).every((v) => v.sha256 === hash)).toBe(true);
    expect((await held(first, "production")).map((v) => `${v.operation}:${v.verdict}`).sort()).toEqual(operations.map((o) => `${o}:pass`).sort());

    // The release is in the logbook, with the version the model gave.
    const last = (await (await request(`${logbook}/releases/latest`)).json()) as { version: string; revision: string };
    expect(last).toMatchObject({ version: "1.0.0", revision: first });

    // Promoting the revision again changes nothing: it is already the last release, and the logbook keeps one.
    const again = ortho("promote", "--to", "production");
    expect(again.status, again.out).toBe(0);
    expect(again.lines, again.out).toContain(`release 1.0.0 already recorded for ${first}`);
    expect(await (await request(`${logbook}/releases/latest`)).json()).toEqual(last);
  });
});

/** `down` or `up` as `ortho env status` says it. */
const bundleStatus = (name: string) => Promise.resolve(ortho("env", "status", name).lines[0]!.endsWith(" down") ? "down" : "up");
