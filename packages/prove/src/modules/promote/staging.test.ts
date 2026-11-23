// The proof-to-publish boundary on real workerd, logbook, OIDC and Verdaccio.
import { freePorts } from "../../../test/ports.ts";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash, randomBytes } from "node:crypto";
import { Effect, Exit, Scope } from "effect";
import { Issuer, Registry } from "@orthograph/services";
import { Compiler, nodeSource } from "@orthograph/compiler";
import { Releases } from "#modules/releases/service.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Build } from "#modules/build/service.js";
import { Environments } from "#modules/environments/service.js";
import { Promote } from "./service.ts";
import { Publish } from "#modules/publish/service.js";
import { publishOrthograph } from "../../../test/orthograph-package.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = join(repo, "examples/acme");
const parent = mkdtempSync(join(realpathSync(tmpdir()), "ortho-staging-proof-"));
const root = join(parent, "acme");
const ports = freePorts("logbook", "issuer", "staging", "registry");
const services = Effect.runSync(Scope.make());
const issuer = `http://127.0.0.1:${ports.issuer}/ortho`;
const registry = `http://127.0.0.1:${ports.registry}/`;
const logbook = `http://127.0.0.1:${ports.logbook}`;
const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const git = (...args: ReadonlyArray<string>) => {
  const r = spawnSync("git", ["-c", "user.name=proof", "-c", "user.email=proof@example.test", "-c", "commit.gpgsign=false", ...args], { cwd: root, encoding: "utf8" });
  expect(r.status, r.stderr).toBe(0);
  return r.stdout.trim();
};
const commit = (message: string) => { git("add", "-A"); git("commit", "-q", "-m", message); return git("rev-parse", "--short", "HEAD"); };
const request = (url: string, init?: RequestInit) => fetch(url, { ...init, headers: { ...init?.headers, connection: "close" } });
const env: Record<string, string | undefined> = {
  ...process.env, ORTHO_OIDC_ISSUER: issuer, ORTHO_OIDC_CLIENT: "ci-main", ORTHO_OIDC_REPOSITORY: "acme/acme",
  ORTHO_OIDC_REF: "refs/heads/main", ORTHO_OIDC_WORKFLOW: "ortho", ORTHO_LOGBOOK_URL: logbook,
  ORTHO_REGISTRY: registry, NPM_CONFIG_USERCONFIG: join(parent, "npmrc"),
};
const rows = (revision: string) => request(`${logbook}/verdicts?revision=${revision}&environment=staging`).then((r) => r.json());
const versions = async () => {
  const response = await request(`${registry}@acme%2fsdk`);
  return response.status === 404 ? [] : Object.keys(((await response.json()) as { versions: Record<string, unknown> }).versions);
};

beforeAll(async () => {
  for (const part of ["ortho.config.ts", "blueprint", "generated", "src", "journeys", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: (p) => !basename(p).startsWith(".") });
  mkdirSync(join(root, "node_modules/.bin"), { recursive: true });
  for (const entry of readdirSync(join(acme, "node_modules"))) if (entry !== ".bin") symlinkSync(join(acme, "node_modules", entry), join(root, "node_modules", entry));
  writeFileSync(join(root, "node_modules/.bin/tsc"), `#!/bin/sh\nexec "${join(repo, "node_modules/.bin/tsc")}" "$@"\n`, { mode: 0o755 });
  writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ extends: join(acme, "tsconfig.json"), compilerOptions: { typeRoots: [join(repo, "node_modules/@types"), join(acme, "node_modules")] }, include: ["blueprint/**/*.ts", "generated/**/*.ts", "src/**/*.ts", "journeys/**/*.ts"] }));
  writeFileSync(join(root, ".gitignore"), "node_modules/\n.ortho/\n.wrangler/\n");
  git("init", "-q", "-b", "main");
  commit("the proof candidate");
  await run(Issuer.start({ port: ports.issuer, dir: parent, config: { tokenCallbacks: [{ issuerId: "ortho", tokenExpiry: 600, requestMappings: [{ requestParam: "client_id", match: "ci-main", claims: { sub: "repo:acme/acme:ref:refs/heads/main", aud: ["ortho-logbook"], repository: "acme/acme", ref: "refs/heads/main", workflow: "ortho" } }] }] } }).pipe(Scope.provide(services)));
  // Its throwaway user's token is in `<parent>/npmrc`, which `env` names.
  await run(Registry.start({ dir: parent, port: ports.registry }).pipe(Scope.provide(services)));
  const { built, published } = publishOrthograph(repo, registry, env);
  expect(built.status, built.stdout + built.stderr).toBe(0);
  expect(published?.status, `${published?.stdout}${published?.stderr}`).toBe(0);
  await run(Environments.up({ root, name: "logbook", port: ports.logbook, policy: { issuer, repository: "acme/acme", refs: ["refs/heads/main"], workflows: ["ortho"] } }));
}, 180_000);
afterAll(async () => {
  for (const name of ["production", "staging", "logbook"]) await run(Environments.down({ root, name }));
  await run(Scope.close(services, Exit.void));
  rmSync(parent, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

/** Real signed gate inputs. This fixture does not claim these seeded rows are a new test-world proof. */
const testVerdicts = async (revision: string, sha256: string) => {
  const minted = await request(`${issuer}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials", client_id: "ci-main", client_secret: "unused" }) });
  const token = ((await minted.json()) as { access_token: string }).access_token;
  const operations = Object.keys((JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as { operations: Record<string, unknown> }).operations);
  for (const operation of operations) expect((await request(`${logbook}/verdicts`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ revision, sha256, operation, environment: "test", verdict: "pass" }) })).status).toBe(200);
};
const noEffects = async (revision: string, before: ReadonlyArray<string>) => {
  expect(await rows(revision)).toEqual([]);
  expect((await request(`${logbook}/models/${revision}`)).status).toBe(404);
  expect(await versions()).toEqual(before);
};

describe("staging's proof-to-publish boundary", () => {
  it.each([false, true])("rejects staging replacement after its initial check, including rollback=%s", { timeout: 600_000 }, async (rollback) => {
    const a = await run(Build.build(root, env));
    const source = join(root, "src/allowance/spend.ts");
    const original = readFileSync(source, "utf8");
    writeFileSync(source, original.replace("the amount is more than is left", "a compatible second revision refused this amount"));
    commit("a compatible second bundle");
    const b = await run(Build.build(root, env));
    expect(b.sha256).not.toBe(a.sha256);
    git("checkout", "--detach", a.revision);
    await testVerdicts(a.revision, a.sha256);
    await run(Environments.up({ root, name: "staging", revision: a.revision, port: ports.staging }));
    const before = await versions();
    let changed = false;
    const result = await run(Promote.to({ root, env, target: "staging", say: (line) => Effect.gen(function* () {
      if (!changed && line.startsWith("staging up ")) { changed = true; yield* Environments.up({ root, name: "staging", revision: b.revision }).pipe(Effect.orDie); if (rollback) yield* Environments.up({ root, name: "staging", revision: a.revision }).pipe(Effect.orDie); }
    }) }).pipe(Effect.result));
    expect(changed).toBe(true);
    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure" && "message" in result.failure) expect(result.failure.message).toMatch(/staging.*(bundle|runs)/);
    await noEffects(a.revision, before);
  });

  it("rejects source mutation at proof completion before model storage, publishing or passing verdicts", { timeout: 600_000 }, async () => {
    git("checkout", "main");
    const source = join(root, "src/allowance/spend.ts");
    const original = readFileSync(source, "utf8");
    writeFileSync(source, `${original}\n// a new candidate for the source-mutation check\n`);
    commit("the source mutation candidate");
    const a = await run(Build.build(root, env));
    await testVerdicts(a.revision, a.sha256);
    const before = await versions();
    let changed = false;
    const result = await run(Promote.to({ root, env, target: "staging", say: (line) => Effect.sync(() => {
      if (!changed && line === "prove ✔") { changed = true; writeFileSync(source, `${readFileSync(source, "utf8")}\n// changed while proof was running\n`); }
    }) }).pipe(Effect.result));
    git("checkout", "--", "src/allowance/spend.ts");
    expect(changed).toBe(true);
    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure" && "message" in result.failure) expect(result.failure.message).toContain("source changed");
    await noEffects(a.revision, before);
  });
});

/** A tracked dependency imported by the generated SDK and CLI, to observe the source that actually shipped. */
const marker = join(root, "src/publication-source.ts");
const prepareMarker = () => {
  writeFileSync(marker, 'export const publicationSource = "committed-A";\n');
  const sdk = join(root, "generated/sdk/src/index.ts");
  writeFileSync(sdk, `${readFileSync(sdk, "utf8")}\nexport { publicationSource } from "../../../src/publication-source.ts";\n`);
  const cli = join(root, "generated/cli/src/main.ts");
  const lines = readFileSync(cli, "utf8").split("\n");
  lines.splice(2, 0, 'import { publicationSource } from "../../../src/publication-source.ts";', "console.log(publicationSource);");
  writeFileSync(cli, lines.join("\n"));
  commit("a captured publication marker");
  return git("rev-parse", "HEAD");
};
const publish = (version: string, sourceRevision?: string, change?: () => void, extraEnv = env, environment: "staging" | "production" = "staging", localTap = false) =>
  run(Publish.run({ root, env: extraEnv, environment, version, mode: "publish", localTap, ...(sourceRevision ? { sourceRevision } : {}), say: (line) => Effect.sync(() => { if (line.startsWith("publish ")) change?.(); }) }));

const productionInputs = async () => {
  if (!existsSync(marker)) prepareMarker();
  git("checkout", "--", "src/publication-source.ts");
  const source = join(root, "src/allowance/spend.ts");
  writeFileSync(source, `${readFileSync(source, "utf8")}\n// production candidate ${randomBytes(4).toString("hex")}\n`);
  commit("a production boundary candidate");
  const built = await run(Build.build(root, env));
  const model = await run(Compiler.model.pipe(Effect.provide(nodeSource(root))));
  await run(Releases.keep({ logbook, env, model, revision: built.revision }));
  const minted = await request(`${issuer}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials", client_id: "ci-main", client_secret: "unused" }) });
  const token = ((await minted.json()) as { access_token: string }).access_token;
  for (const operation of Object.keys(model.operations)) expect((await request(`${logbook}/verdicts`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ revision: built.revision, sha256: built.sha256, operation, environment: "staging", verdict: "pass" }) })).status).toBe(200);
  return { built, model };
};
describe("publication identity", () => {
  it("installs the captured SDK and CLI even if source changes after capture during publication", { timeout: 600_000 }, async () => {
    const sourceRevision = prepareMarker();
    const version = "3.0.0-next.1";
    const result = await publish(version, sourceRevision, () => writeFileSync(marker, 'export const publicationSource = "uncommitted-B";\n'));
    const install = join(parent, "captured-install");
    mkdirSync(install);
    writeFileSync(join(install, "package.json"), JSON.stringify({ private: true, type: "module" }));
    const added = spawnSync("npm", ["install", `@acme/sdk@${version}`, `@acme/cli@${version}`, "--registry", registry, "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: install, encoding: "utf8", env, timeout: 600_000 });
    expect(added.status, added.stdout + added.stderr).toBe(0);
    const sdk = spawnSync(process.execPath, ["--input-type=module", "-e", "import {publicationSource} from '@acme/sdk'; console.log(publicationSource)"], { cwd: install, encoding: "utf8" });
    const cli = spawnSync(join(install, "node_modules/.bin/acme"), ["--version"], { encoding: "utf8" });
    expect(sdk.stdout.trim(), sdk.stderr).toBe("committed-A");
    expect(cli.stdout, cli.stderr).toContain("committed-A");
    expect(cli.stdout).toContain(`acme ${version}`);
    for (const pkg of result.packages) expect(readFileSync(join(pkg.dir, "package.json"), "utf8")).toContain(version);
    git("checkout", "--", "src/publication-source.ts");
  });

  it("owns package and SEA outputs per invocation and preserves earlier tarballs and formula URLs", { timeout: 600_000 }, async () => {
    const sourceRevision = git("rev-parse", "HEAD");
    const version = "4.0.0-next.1";
    const first = await publish(version, sourceRevision);
    const sdkBytes = readFileSync(join(first.packages[0]!.dir, "dist/index.js"), "utf8");
    const second = await publish(version, sourceRevision);
    expect(second.packages[0]!.dir).not.toBe(first.packages[0]!.dir);
    expect(readFileSync(join(first.packages[0]!.dir, "dist/index.js"), "utf8")).toBe(sdkBytes);
    const binaryEnv = { ...env, ORTHO_REGISTRY: "" };
    const a = await publish("4.0.0", sourceRevision, undefined, binaryEnv, "production", true);
    const digest = a.binary!.sha256;
    const formula = readFileSync(a.formula!, "utf8");
    const b = await publish("4.0.0", sourceRevision, undefined, binaryEnv, "production", true);
    expect(b.binary!.tarball).not.toBe(a.binary!.tarball);
    expect(createHash("sha256").update(readFileSync(a.binary!.tarball)).digest("hex")).toBe(digest);
    expect(formula).toContain(`file://${a.binary!.tarball}`);
  });

  it("refuses pre-existing different same-version package bytes instead of claiming successful reuse", { timeout: 600_000 }, async () => {
    const version = "5.0.0-next.1";
    await publish(version);
    writeFileSync(marker, 'export const publicationSource = "different-existing-version";\n');
    const result = await run(Publish.run({ root, env, environment: "staging", version, mode: "publish", localTap: false, say: () => Effect.void }).pipe(Effect.result));
    git("checkout", "--", "src/publication-source.ts");
    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") expect(result.failure.message).toMatch(/integrity|different.*bytes/);
  });

  it("repairs a persisted partial release on retry without duplicating complete carried facts", { timeout: 600_000 }, async () => {
    const { built } = await productionInputs();
    const result = await run(Promote.to({ root, env, target: "production", say: (line) => {
      if (line.startsWith("publish ")) writeFileSync(marker, 'export const publicationSource = "changed-after-capture";\n');
      return line.startsWith("released ") ? Effect.die("interrupted after recording release") : Effect.void;
    } }).pipe(Effect.exit));
    expect(result._tag).toBe("Failure");
    expect(await request(`${logbook}/releases/latest`).then((r) => r.json())).toMatchObject({ revision: built.revision });
    const query = `${logbook}/verdicts?revision=${built.revision}&environment=production`;
    expect(await request(query).then((r) => r.json())).toEqual([]);
    git("checkout", "--", "src/publication-source.ts");
    await run(Promote.to({ root, env, target: "production", say: () => Effect.void }));
    const complete = await request(query).then((r) => r.json()) as Array<{ sha256: string; verdict: string }>;
    const operations = Object.keys((JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as { operations: object }).operations);
    expect(complete).toHaveLength(operations.length);
    expect(complete.every((v) => v.sha256 === built.sha256 && v.verdict === "pass")).toBe(true);
    await run(Promote.to({ root, env, target: "production", say: () => Effect.void }));
    expect(await request(query).then((r) => r.json())).toEqual(complete);
  });
  it("records no new production release or carried pass when existing package bytes conflict", { timeout: 600_000 }, async () => {
    const { built, model } = await productionInputs();
    const previous = await request(`${logbook}/releases/latest`);
    const before = previous.status === 404 ? null : await previous.json();
    const version = await run(Releases.next(logbook, model));
    writeFileSync(marker, 'export const publicationSource = "pre-existing-conflict";\n');
    await publish(version, undefined, undefined, env, "production");
    git("checkout", "--", "src/publication-source.ts");
    const result = await run(Promote.to({ root, env, target: "production", say: () => Effect.void }).pipe(Effect.result));
    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure" && "message" in result.failure) expect(result.failure.message).toContain("integrity");
    expect(await request(`${logbook}/verdicts?revision=${built.revision}&environment=production`).then((r) => r.json())).toEqual([]);
    const after = await request(`${logbook}/releases/latest`);
    if (before === null) expect(after.status).toBe(404); else expect(await after.json()).toEqual(before);
  });
});
