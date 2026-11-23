// L2.02's done-when checks, on a copy of acme under git: `prove --env test` posts verdicts the logbook reads back and
// leaves no world; a run killed mid-way (SIGKILL) with a 20 s lifetime leaves a world that `worlds reap` removes after
// its lifetime. Real wrangler and workerd for the logbook and the test environment, a real collector and a real OIDC
// issuer (an @orthograph/services process), each on a free port.
import { freePorts } from "../../../test/ports.ts";
import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { Effect, Exit, Redacted, Scope } from "effect";
import { Issuer } from "@orthograph/services";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Environments } from "#modules/environments/service.js";
import { Prove } from "#modules/prove/service.js";
import { Verdicts } from "#modules/verdicts/service.js";
import { TestWorlds } from "./service.ts";

const PORTS = freePorts("logbook", "test", "issuer");
const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const cli = resolve(import.meta.dirname, "../../../../cli/src/main.ts");
const trusted = { repository: "acme/acme", ref: "refs/heads/main", workflow: "ortho" };
const services = Effect.runSync(Scope.make());
const visible = (from: string) => !basename(from).startsWith(".");
const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const git = (root: string, ...args: ReadonlyArray<string>) =>
  spawnSync("git", ["-c", "user.name=l2", "-c", "user.email=l2@example.test", "-c", "commit.gpgsign=false", ...args], { cwd: root, encoding: "utf8" }).stdout.trim();

/** A copy of acme under git, outside the repository: its revision is a commit of its own. */
const copyUnderGit = () => {
  const parent = mkdtempSync(join(realpathSync(tmpdir()), "ortho-l202-"));
  const root = join(parent, "acme");
  for (const part of ["blueprint", "generated", "src", "journeys", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
  mkdirSync(join(root, "node_modules"));
  for (const entry of readdirSync(join(acme, "node_modules"))) if (entry !== ".bin") symlinkSync(join(acme, "node_modules", entry), join(root, "node_modules", entry));
  writeFileSync(join(root, ".gitignore"), "node_modules/\n.ortho/\n.wrangler/\n");
  git(root, "init", "-q", "-b", "main");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "acme");
  return { root, parent, revision: git(root, "rev-parse", "--short", "HEAD"), remove: () => rmSync(parent, { recursive: true, force: true }) };
};

const project = copyUnderGit();
const { root } = project;
const issuer = `http://127.0.0.1:${PORTS.issuer}/ortho`;
const logbook = `http://127.0.0.1:${PORTS.logbook}`;
const testUrl = `http://127.0.0.1:${PORTS.test}`;
const env = {
  ORTHO_OIDC_ISSUER: issuer, ORTHO_OIDC_CLIENT: "ci-main",
  ORTHO_OIDC_REPOSITORY: trusted.repository, ORTHO_OIDC_REF: trusted.ref, ORTHO_OIDC_WORKFLOW: trusted.workflow,
};
const source = { kind: "issuer", issuer, client: "ci-main" } as const;

/** The claims a GitHub Actions job would carry for `ortho-logbook` (D3 #8). */
const scenarios = {
  interactiveLogin: false,
  tokenCallbacks: [{ issuerId: "ortho", tokenExpiry: 600, requestMappings: [
    { requestParam: "client_id", match: "ci-main", claims: { sub: "repo:acme/acme:ref:refs/heads/main", aud: ["ortho-logbook"], ...trusted } },
  ] }],
};

/** What is in the test environment's D1 right now, table by table (the app's, not the registry's). */
const rows = () => {
  const dir = join(root, ".ortho/environments/test/state/v3/d1");
  const file = (existsSync(dir) ? readdirSync(dir, { recursive: true, encoding: "utf8" }) : []).find((f) => f.endsWith(".sqlite") && !f.includes("metadata"));
  expect(file, "the environment's D1 file").toBeDefined();
  const db = new DatabaseSync(join(dir, file!), { readOnly: true });
  try {
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\' AND name NOT LIKE '\\_cf\\_%' ESCAPE '\\' AND name NOT IN ('d1_migrations', '_worlds')`).all() as Array<{ name: string }>;
    return Object.fromEntries(tables.map(({ name }) => [name, (db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get() as { n: number }).n]));
  } finally {
    db.close();
  }
};
const total = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

beforeAll(async () => {
  const dir = join(project.parent, "issuer");
  mkdirSync(dir);
  await run(Issuer.start({ port: PORTS.issuer, dir, config: scenarios }).pipe(Scope.provide(services)));
  const up = await run(Environments.up({ root, name: "logbook", port: PORTS.logbook, policy: { issuer, repository: trusted.repository, refs: [trusted.ref], workflows: [trusted.workflow] } }));
  expect(up.url).toBe(logbook);
  expect((await run(Environments.up({ root, name: "test", port: PORTS.test }))).url).toBe(testUrl);
}, 600_000);

afterAll(async () => {
  for (const name of ["test", "logbook"]) await run(Environments.down({ root, name }));
  await run(Scope.close(services, Exit.void));
  project.remove();
});

describe("prove --env test", () => {
  it("posts a verdict per operation that the logbook reads back, and leaves no world", { timeout: 600_000 }, async () => {
    const said: Array<string> = [];
    const report = await run(Prove.test({ root, logbook, token: source, say: (line) => Effect.sync(() => void said.push(line)) }));
    expect(report.passed, said.join("\n")).toBe(true);

    const world = said.findIndex((l) => /^world test-[0-9a-f]{8} · expires in 2h$/.test(l));
    const verdicts = said.findIndex((l) => l.startsWith("verdicts "));
    expect(world, said.join("\n")).toBeGreaterThanOrEqual(0);
    expect(verdicts).toBeGreaterThan(world);
    expect(said.at(-1)).toBe("world destroyed");
    expect(said.at(-2)).toBe(said[verdicts]);
    expect(said[verdicts]!.endsWith(`(revision ${project.revision})`)).toBe(true);
    expect(said).toContain("prove ✔");

    const held = (await (await fetch(`${logbook}/verdicts?revision=${project.revision}&environment=test`)).json()) as Array<{ operation: string; verdict: string; environment: string; ref: string }>;
    const operations = Object.keys(JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")).operations);
    expect(held.map((v) => v.operation).sort()).toEqual([...operations].sort());
    expect(held.every((v) => v.verdict === "pass" && v.environment === "test" && v.ref === trusted.ref)).toBe(true);
    for (const op of operations) expect(said[verdicts]).toContain(`${op} ✔`);
    // The logbook keeps the revision's model with its verdicts, so the portal and `impact` can judge them against it (D3 #138).
    const kept = await fetch(`${logbook}/models/${project.revision}`);
    expect(kept.status).toBe(200);
    expect(Object.keys(((await kept.json()) as { operations: object }).operations).sort()).toEqual([...operations].sort());

    // The world is gone: nothing counts it, and the rows its journeys made are gone with it.
    expect(await run(TestWorlds.live(testUrl))).toBe(0);
    expect(total(rows()), JSON.stringify(rows())).toBe(0);
    // Nothing printed carries the token the logbook was given.
    const token = Redacted.value(await run(Verdicts.mint(source)));
    expect(said.join("\n")).not.toContain(token);
  });

  it("refuses a second world while one lives, and a run that cannot record its verdicts still destroys its world", { timeout: 600_000 }, async () => {
    // A token for a client the logbook was not told of is refused with 401, after the journeys ran.
    const said: Array<string> = [];
    const failed = await run(Prove.test({ root, logbook, token: { ...source, client: "nobody" }, say: (line) => Effect.sync(() => void said.push(line)) }).pipe(Effect.flip));
    expect(failed.message).toContain("401");
    expect(said.at(0)).toMatch(/^world test-/);
    expect(said.at(-1)).toBe("world destroyed");
    expect(await run(TestWorlds.live(testUrl))).toBe(0);
    expect(total(rows())).toBe(0);

    await run(TestWorlds.create({ url: testUrl, id: "test-held", lifetimeMs: 60_000 }));
    const refused = await run(TestWorlds.create({ url: testUrl, id: "test-second", lifetimeMs: 60_000 }).pipe(Effect.flip));
    expect(refused.message).toContain("test-held");
    await run(TestWorlds.destroy({ url: testUrl, id: "test-held" }));
    expect(await run(TestWorlds.live(testUrl))).toBe(0);
  });

  it("a run killed part-way leaves a world that worlds reap removes after its lifetime", { timeout: 600_000 }, async () => {
    const lifetime = 20;
    const child = spawn(process.execPath, [cli, "prove", "--env", "test", "--root", root], { cwd: root, env: { ...process.env, ...env, ORTHO_LIFETIME: `${lifetime}s` }, stdio: ["ignore", "pipe", "pipe"] });
    let seen = "";
    child.stdout.on("data", (chunk: Buffer) => { seen += chunk.toString(); });
    for (let i = 0; i < 960 && !/^world test-[0-9a-f]{8} · expires in 20s/m.test(seen); i++) await sleep(250);
    expect(seen).toMatch(/^world test-[0-9a-f]{8} · expires in 20s/m);
    // Let the journeys write something, so there is something to remove.
    for (let i = 0; i < 240 && total(rows()) === 0; i++) await sleep(250);
    const killedAt = Date.now();
    await new Promise<void>((done) => { child.once("exit", () => done()); child.kill("SIGKILL"); });
    expect(seen).not.toContain("world destroyed");
    const left = rows();
    expect(total(left), JSON.stringify(left)).toBeGreaterThan(0);

    // Within its lifetime the world is there, and reap leaves it alone.
    expect(await run(TestWorlds.live(testUrl))).toBe(1);
    expect(await run(TestWorlds.reap({ root, name: "test" }))).toBe(0);
    expect(await run(TestWorlds.live(testUrl))).toBe(1);

    // Alarms fire only while a workerd runs: with the environment down it is reap that starts it, and it stops it again.
    await run(Environments.down({ root, name: "test" }));
    await sleep(Math.max(0, killedAt + (lifetime + 3) * 1000 - Date.now()));
    expect(await run(TestWorlds.reap({ root, name: "test" }))).toBe(1);
    expect((await run(Environments.status({ root, name: "test" }))).state).toBe("down");
    expect(await run(TestWorlds.reap({ root, name: "test" }))).toBe(0);

    // Nothing of the world is left in the database, and the environment holds no world.
    expect(total(rows())).toBe(0);
    await run(Environments.up({ root, name: "test", port: PORTS.test }));
    expect(await run(TestWorlds.live(testUrl))).toBe(0);
  });
});
