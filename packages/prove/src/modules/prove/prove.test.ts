// The stage-one gate for prove: acme passes, and each planted fixture (written by the journey author, never by the
// builder) fails its own eval in a scratch copy of acme.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { createServer } from "node:http";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { FsTree, flushChanges } from "nx/src/generators/tree.js";
import { Sync } from "@orthograph/generators/sync";
import { Owned } from "@orthograph/services";
import { acmeCopy } from "../../../test/acme.ts";
import { coverageLine } from "../evals/testing.ts";
import { Prove } from "./service.ts";

// Dot-folders (.wrangler, .ortho) belong to whatever is running there; a filter also keeps cpSync off its native path,
// which aborts the process when a folder vanishes mid-copy.
const visible = (from: string) => !basename(from).startsWith(".");
const install = (from: string, root: string, to: string) => {
  if (!to.startsWith("src/") && !to.startsWith("generated/")) return cpSync(from, join(root, to));
  mkdirSync(dirname(join(root, to)), { recursive: true });
  writeFileSync(join(root, to), readFileSync(from, "utf8"));
};

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = join(repo, "examples/acme");
const fixtures = join(acme, "test/fixtures/evals");
// Planted copies stay under the repository (Sync works on repository paths), in a folder of this file's own.
mkdirSync(join(acme, "test/tmp"), { recursive: true });
const scratch = mkdtempSync(join(acme, "test/tmp/prove-"));
// The copy acme itself is proved on: its `.ortho` is this file's alone.
const own = acmeCopy();

const prove = (root: string, port: number) => Effect.runPromise(Effect.scoped(Prove.run({ root, port })));

/** A copy of acme with the fixture's files installed where its README says, and generated/ synced if it must be. */
const planted = (name: string, installs: ReadonlyArray<readonly [string, string]>, sync = false, unwritten = false) =>
  Effect.runPromise(Effect.gen(function* () {
    const root = join(scratch, name, "acme");
    rmSync(join(scratch, name), { recursive: true, force: true });
    mkdirSync(root, { recursive: true });
    for (const part of ["blueprint", "generated", "src", "journeys", "package.json"]) {
      cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
    }
    // acme's own compiler options, from where the copy sits.
    writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ extends: relative(root, join(acme, "tsconfig.json")) }));
    for (const [from, to] of installs) install(join(fixtures, name, from), root, to);
    // Sync scaffolds every handler that isn't there: a project whose handlers are all still blank.
    if (unwritten) rmSync(join(root, "src"), { recursive: true, force: true });
    if (sync) {
      const tree = new FsTree(repo, false);
      yield* Sync.project(tree, relative(repo, root));
      flushChanges(repo, tree.listChanges());
    }
    return root;
  }));

const GRANT = "src/allowance/grant.ts";
const nothingRunning = () => {
  // This process's own processes only: other test files prove their own projects at the same time.
  expect(Owned.leaks().filter((m) => m.owner === process.pid)).toEqual([]);
};

// A collector may still be flushing its last lines as the scope closes: retry instead of failing on ENOTEMPTY.
afterAll(() => { rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); own.remove(); });

describe("ortho prove --env local", () => {
  it("passes on acme: every journey, every eval, coverage, and leaves nothing running", { timeout: 180_000 }, async () => {
    const report = await prove(own.root, 0);
    expect(report.lines).toContain("journey grant an allowance ✔ 4/4 steps");
    // acme is the starter plus the allowance (L1.51): the starter's five journeys run beside acme's own six.
    for (const j of ["an outsider cannot revoke", "read an allowance", "revoke then spend", "spend twice with one request", "spend within an allowance",
      "an invitation is used once", "an owner makes an api key", "health is up", "invite and accept", "sign up and sign in",
      "a key and a session are the same person", "an agent passes the owner rule", "an agent cannot consent for a person", "the system is nobody signed in"]) {
      expect(report.lines.some((l) => l.startsWith(`journey ${j} ✔`))).toBe(true);
    }
    for (const op of ["allowance.get", "allowance.grant", "allowance.revoke", "allowance.spend", "organization.create", "organization.get",
      "api-key.create", "invitation.accept", "invitation.revoke", "invitation.send", "membership.get", "person.sign-up", "session.show",
      "session.sign-in", "system.health"]) {
      expect(report.lines.some((l) => l.startsWith(`${op} 9 evals ✔ p50 `))).toBe(true);
    }
    expect(report.lines.some((l) => l.startsWith("allowance.grant performance ✔ p50 "))).toBe(true);
    expect(report.lines).toContain(coverageLine("moves 7/7 · outcomes 7/7 · refusals 4/4 · runtime refusals 15/17", JSON.parse(readFileSync(join(own.root, "generated/model/model.json"), "utf8"))));
    expect(report.lines.at(-1)).toBe("prove ✔");
    expect(report.passed).toBe(true);
    nothingRunning();
  });

  // S-25: `ortho prove` defaults to port 0, a free port the OS picks. Another session's world on the old fixed default
  // (8799) answers every request, so a run that landed on it would report its verdicts instead of its own.
  it("with port 0 it runs its own world while 8799 is held by something else (S-25)", { timeout: 180_000 }, async () => {
    const held = createServer((_, res) => { res.writeHead(200, { "content-type": "application/json" }); res.end("{}"); });
    const taken = await new Promise<boolean>((done) => { held.once("error", () => done(true)); held.listen(8799, "127.0.0.1", () => done(true)); });
    expect(taken).toBe(true);
    try {
      const report = await Effect.runPromise(Effect.scoped(Prove.run({ root: acme, port: 0, only: "grant an allowance" })));
      expect(report.lines).toContain("journey grant an allowance ✔ 4/4 steps");
      expect(report.lines.some((l) => l.includes("telemetry missing"))).toBe(false);
    } finally {
      held.close();
    }
    nothingRunning();
  });

  it("the who-may-call fixture is still the generated server with only its gate removed", () => {
    // The author regenerates it from generated/server/main.ts; if the generator moves on, this says so.
    const fixture = readFileSync(join(fixtures, "who-may-call/main.ts"), "utf8").split("\n");
    const generated = new Set(readFileSync(join(acme, "generated/server/main.ts"), "utf8").split("\n"));
    const different = fixture.filter((line) => !generated.has(line));
    expect(different.length).toBeLessThanOrEqual(5);
    expect(different.some((l) => l.includes("allowed: [Blueprint.anyone]"))).toBe(true);
  });

  const cases: ReadonlyArray<{ readonly fixture: string; readonly installs: ReadonlyArray<readonly [string, string]>; readonly line: string; readonly says: string; readonly sync?: boolean }> = [
    { fixture: "answer-shape", installs: [["grant.ts", GRANT]], line: "allowance.grant answer shape ✘", says: 'grant-an-allowance "ada grants olga 500": answer.allowance: expected alw_<id>, got 500' },
    { fixture: "declared-errors", installs: [["grant.ts", GRANT]], line: "allowance.grant declared errors ✘", says: "refused with AllowanceMemberUnknown, not one of AllowanceLimitTooHigh, PersonNotFound, NotAllowed" },
    { fixture: "machine-path", installs: [["grant.ts", GRANT]], line: "allowance.grant machine path ✘", says: 'grant ended in "paused", not one of active' },
    { fixture: "events", installs: [["grant.ts", GRANT]], line: "allowance.grant events ✘", says: "move grant emitted no AllowanceGranted" },
    { fixture: "who-may-call", installs: [["main.ts", "generated/server/main.ts"]], line: "allowance.grant who may call ✘", says: "and was answered, not refused" },
    { fixture: "steps", installs: [["grant.ts", GRANT]], line: "allowance.grant steps ✘", says: "declared step allowance.grant.insert ran no span" },
    { fixture: "coverage", installs: [["rename.ts", "blueprint/things/organization/verbs/rename.ts"], ["rename.handler.ts", "src/organization/rename.ts"]], line: "organization.rename coverage ✘", says: "organization.rename reached by no journey", sync: true },
    { fixture: "explainability", installs: [["grant.ts", GRANT]], line: "allowance.grant explainability ✘", says: '"a limit over the cap is refused": AllowanceLimitTooHigh has no deciding log' },
  ];

  it("fails on the scaffolded handlers: the starting world can't be made, so no step runs", { timeout: 120_000 }, async () => {
    const report = await prove(await planted("scaffolded", [], true, true), 0);
    expect(report.lines.find((l) => l.startsWith("journey grant an allowance"))).toMatch(/^journey grant an allowance ✘ starting world founded: organization.create died: .*BlankReached/);
    expect(report.lines.filter((l) => l.startsWith("journey ")).every((l) => l.includes(" ✘ "))).toBe(true);
    expect(report.passed).toBe(false);
    nothingRunning();
  });

  cases.forEach((c) =>
    it(`fails the planted ${c.fixture} fixture on its own eval`, { timeout: 120_000 }, async () => {
      expect(existsSync(join(fixtures, c.fixture))).toBe(true);
      const report = await prove(await planted(c.fixture, c.installs, c.sync), 0);
      expect(report.passed).toBe(false);
      expect(report.lines.filter((l) => l.startsWith(c.line)).join("\n")).toContain(c.says);
      expect(report.lines.at(-1)).toMatch(/^prove ✘/);
      nothingRunning();
    }),
  );
});
