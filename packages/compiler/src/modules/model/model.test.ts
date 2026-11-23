import { cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import { Compiler } from "./service.ts";

// Dot-folders (.wrangler, .ortho) belong to whatever is running there; a filter also keeps cpSync off its native path,
// which aborts the process when a folder vanishes mid-copy.
const visible = (from: string) => !basename(from).startsWith(".");

const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const scratch = resolve(import.meta.dirname, "../../../test/tmp");
const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));

/** A copy of acme's blueprint inside the package, so its imports still resolve. */
const copyOfAcme = (startingWorlds = true): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "acme-"));
  cpSync(join(acme, "blueprint"), join(root, "blueprint"), { recursive: true, filter: (path) => visible(path) && basename(path) !== "projections" && (startingWorlds || basename(path) !== "starting-worlds") });
  return root;
};

describe("model", () => {
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));

  it("describes acme", async () => {
    const exit = await modelOf(acme);
    expect(Exit.isSuccess(exit)).toBe(true);
    if (!Exit.isSuccess(exit)) return;
    expect(Object.keys(exit.value.operations)).toEqual(["allowance.get", "allowance.grant", "allowance.revoke", "allowance.spend", "api-key.create", "invitation.accept", "invitation.revoke", "invitation.send", "membership.get", "organization.create", "organization.get", "person.sign-up", "session.show", "session.sign-in", "system.health"]);
    const grant = exit.value.operations["allowance.grant"];
    // K16 (M1.46): grant's member is read by no role check, so a missing one is refused PersonNotFound before the handler.
    expect(grant?.refusals).toEqual(["AllowanceLimitTooHigh", "PersonNotFound", "NotAllowed", "IdempotencyConflict"]);
    expect(grant?.steps).toEqual({ insert: { name: "allowance.grant.insert", type: "database" } });
    expect(grant?.allowed).toEqual([{ kind: "role-of", role: "organization.owner", path: "organization" }]);
    expect(exit.value.things["allowance"]?.fields["member"]?.ref).toBe("person.id");
    await expect(JSON.stringify(exit.value, null, 2) + "\n").toMatchFileSnapshot("__snapshots__/acme.model.json");
  });

  it("names an operation after its file: grant.ts renamed to award.ts is allowance.award", async () => {
    const root = copyOfAcme(false);
    renameSync(join(root, "blueprint/things/allowance/verbs/grant.ts"), join(root, "blueprint/things/allowance/verbs/award.ts"));
    const exit = await modelOf(root);
    expect(Exit.isSuccess(exit)).toBe(true);
    if (!Exit.isSuccess(exit)) return;
    expect(Object.keys(exit.value.operations)).toEqual(["allowance.award", "allowance.get", "allowance.revoke", "allowance.spend", "api-key.create", "invitation.accept", "invitation.revoke", "invitation.send", "membership.get", "organization.create", "organization.get", "person.sign-up", "session.show", "session.sign-in", "system.health"]);
    expect(exit.value.operations["allowance.award"]?.steps["insert"]?.name).toBe("allowance.award.insert");
  });

  it("keeps every hash when a file is only reformatted", async () => {
    const before = await modelOf(copyOfAcme());
    const root = copyOfAcme();
    const file = join(root, "blueprint/things/allowance/verbs/grant.ts");
    const reformatted = readFileSync(file, "utf8").split("\n").map((l) => `\t${l}   `).join("\n\n");
    writeFileSync(file, `// reformatted\n${reformatted}`);
    const after = await modelOf(root);
    expect(Exit.isSuccess(before) && Exit.isSuccess(after)).toBe(true);
    if (!Exit.isSuccess(before) || !Exit.isSuccess(after)) return;
    expect(readFileSync(file, "utf8")).not.toEqual(readFileSync(join(acme, "blueprint/things/allowance/verbs/grant.ts"), "utf8"));
    expect(after.value.operations["allowance.grant"]?.hash).toBe(before.value.operations["allowance.grant"]?.hash);
    expect(after.value).toEqual(before.value);
  });

  it("reads environments, each named by its file", async () => {
    const exit = await modelOf(acme);
    expect(Exit.isSuccess(exit)).toBe(true);
    if (!Exit.isSuccess(exit)) return;
    const environments = exit.value.environments!;
    expect(Object.keys(environments)).toEqual(["local", "production", "staging", "test"]);
    expect(environments["test"]).toMatchObject({ lifetimeMs: 7_200_000, identity: "test-principals", cloud: { provider: "cloudflare", database: "d1" } });
    expect(environments["production"]).toMatchObject({ promotesFrom: "staging", deploy: { server: { how: "worker", domain: "api.acme.dev" } } });
    expect(environments["production"]?.publish["cli"]?.map((p) => p.how)).toEqual(["npm", "homebrew", "binaries"]);
    expect(environments["local"]?.database).toBe("d1-local");
  });

  it("reads an environment's telemetry sinks as a list, and a second sink is one more line of config", async () => {
    const before = await modelOf(acme);
    expect(Exit.isSuccess(before) && before.value.environments?.["local"]?.telemetry).toEqual([{ sink: "local" }]);
    const root = copyOfAcme();
    const file = join(root, "blueprint/environments/local.ts");
    writeFileSync(file, readFileSync(file, "utf8").replace("[Telemetry.sink.local()]", '[Telemetry.sink.local(), Telemetry.sink.axiom({ group: "capxul-test" })]'));
    const after = await modelOf(root);
    expect(Exit.isSuccess(after) && after.value.environments?.["local"]?.telemetry).toEqual([{ sink: "local" }, { sink: "axiom", group: "capxul-test" }]);
    // The hash moves with it, so what depends on the environment sees the change.
    if (Exit.isSuccess(before) && Exit.isSuccess(after)) expect(after.value.environments?.["local"]?.hash).not.toBe(before.value.environments?.["local"]?.hash);
    // An environment that names none has no telemetry key at all.
    expect(Exit.isSuccess(before) && "telemetry" in before.value.environments!["test"]!).toBe(false);
  });

  it("refuses a sink named twice and an Axiom group that is no dataset name", async () => {
    const root = copyOfAcme();
    const file = join(root, "blueprint/environments/local.ts");
    writeFileSync(file, readFileSync(file, "utf8").replace("[Telemetry.sink.local()]", '[Telemetry.sink.local(), Telemetry.sink.local(), Telemetry.sink.axiom({ group: "a b" })]'));
    const exit = await modelOf(root);
    expect(Exit.isFailure(exit)).toBe(true);
    const text = JSON.stringify(exit);
    expect(text).toContain("telemetry names the same sink twice");
    expect(text).toContain("isn't a dataset group name");
  });

  it("names an environment after its file, and refuses a promotesFrom that no file answers to", async () => {
    const root = copyOfAcme();
    renameSync(join(root, "blueprint/environments/staging.ts"), join(root, "blueprint/environments/preview.ts"));
    const exit = await modelOf(root);
    expect(Exit.isFailure(exit)).toBe(true);
    expect(JSON.stringify(exit)).toContain('blueprint/environments/production.ts: promotesFrom \\"staging\\" isn');
    // Node caches a module by its path, so the fixed copy is a copy of its own.
    const fixed = copyOfAcme();
    renameSync(join(fixed, "blueprint/environments/staging.ts"), join(fixed, "blueprint/environments/preview.ts"));
    writeFileSync(join(fixed, "blueprint/environments/production.ts"), readFileSync(join(fixed, "blueprint/environments/production.ts"), "utf8").replace('"staging"', '"preview"'));
    const renamed = await modelOf(fixed);
    expect(Exit.isSuccess(renamed)).toBe(true);
    if (Exit.isSuccess(renamed)) expect(Object.keys(renamed.value.environments!)).toEqual(["local", "preview", "production", "test"]);
  });

  // A journey step that calls an operation with a blank part is described under `blankOperations`, so it has no entry in
  // `operations` to look the payload's `visibility` up in. The completed operation's secret is redacted (journeys.ts `publicData`,
  // asserted for acme's sign-up journey below); a blank one must redact the same payload field, not print the literal.
  describe("a journey step's payload literals", () => {
    const secret = "hunter2-DISTINCTIVE-4f9a1c";
    const journey = (root: string) => {
      mkdirSync(join(root, "journeys"), { recursive: true });
      writeFileSync(join(root, "journeys/leak.ts"), [
        'import { Blueprint } from "orthograph";',
        'import signUp from "../blueprint/things/person/verbs/sign-up.ts";',
        'export default Blueprint.journey("a newcomer signs up", {',
        "  cast: { newcomer: Blueprint.anyone },",
        `  steps: (s) => [s.step("the newcomer signs up", s.newcomer.run(signUp, { email: "n@example.test", password: "${secret}", name: "Newcomer" }))],`,
        "});",
        "",
      ].join("\n"));
    };
    const signUpOf = (root: string, blank: boolean) => {
      journey(root);
      if (blank) {
        const file = join(root, "blueprint/things/person/verbs/sign-up.ts");
        writeFileSync(file, readFileSync(file, "utf8").replace("steps: { create: Blueprint.step.database() },", 'steps: Blueprint.todo("the steps"),'));
      }
      return modelOf(root);
    };

    it("are redacted for a completed operation: the secret field is { redacted: true }", async () => {
      const exit = await signUpOf(copyOfAcme(false), false);
      expect(Exit.isSuccess(exit)).toBe(true);
      if (!Exit.isSuccess(exit)) return;
      expect(Object.keys(exit.value.operations)).toContain("person.sign-up");
      expect(JSON.stringify(exit.value).includes(secret) ? "the secret literal is in the model" : "the model is clean").toBe("the model is clean");
      expect(Object.values(exit.value.journeys!)[0]?.steps[0]).toMatchObject({ call: { payload: { password: { redacted: true } } } });
    });

    it("are redacted for an operation that has a blank part too, in describe's JSON", async () => {
      const exit = await signUpOf(copyOfAcme(false), true);
      expect(Exit.isSuccess(exit)).toBe(true);
      if (!Exit.isSuccess(exit)) return;
      expect(Object.keys(exit.value.blankOperations ?? {})).toContain("person.sign-up");
      // Redacted or left out are both fine; the literal in describe's JSON is not.
      const leaked = JSON.stringify(exit.value).includes(secret);
      expect(leaked ? `the blank operation's secret payload literal is in describe's JSON: ${JSON.stringify(Object.values(exit.value.journeys!)[0]?.steps[0])}` : "the model is clean").toBe("the model is clean");
    });
  });

  // A blank operation's payload is redacted by its declaration: a public field's literal is data, a secret one is
  // { redacted: true }, a key the declaration does not name stays redacted, and a wholly blank payload redacts everything.
  describe("a blank operation's payload literals, by declared visibility", () => {
    const publicLiteral = "public-DISTINCTIVE-7b2e";
    const stepOf = async (blankPayload: boolean) => {
      const root = copyOfAcme(false);
      mkdirSync(join(root, "journeys"), { recursive: true });
      writeFileSync(join(root, "journeys/mixed.ts"), [
        'import { Blueprint } from "orthograph";',
        'import signUp from "../blueprint/things/person/verbs/sign-up.ts";',
        'export default Blueprint.journey("a newcomer signs up", {',
        "  cast: { newcomer: Blueprint.anyone },",
        `  steps: (s) => [s.step("the newcomer signs up", s.newcomer.run(signUp, { email: "${publicLiteral}@example.test", password: "hunter2", name: "Newcomer", undeclared: "stray" } as never))],`,
        "});",
        "",
      ].join("\n"));
      const file = join(root, "blueprint/things/person/verbs/sign-up.ts");
      const blanked = readFileSync(file, "utf8").replace("steps: { create: Blueprint.step.database() },", 'steps: Blueprint.todo("the steps"),');
      writeFileSync(file, blankPayload ? blanked.replace(/payload: \{[^\n]*\},/, 'payload: Blueprint.todo("the payload"),') : blanked);
      const exit = await modelOf(root);
      expect(Exit.isSuccess(exit)).toBe(true);
      if (!Exit.isSuccess(exit)) throw new Error("model failed");
      expect(Object.keys(exit.value.blankOperations ?? {})).toContain("person.sign-up");
      return (Object.values(exit.value.journeys!)[0]?.steps[0] as { call: { payload: Record<string, unknown> } }).call.payload;
    };

    it("keeps a public literal as data, redacts a secret one and an undeclared key", async () => {
      const payload = await stepOf(false);
      expect(payload["email"]).toBe(`${publicLiteral}@example.test`);
      expect(payload["name"]).toBe("Newcomer");
      expect(payload["password"]).toEqual({ redacted: true });
      expect(payload["undeclared"]).toEqual({ redacted: true });
    });

    it("redacts everything when the payload declaration is wholly blank", async () => {
      const payload = await stepOf(true);
      expect(payload).toEqual({ email: { redacted: true }, password: { redacted: true }, name: { redacted: true }, undeclared: { redacted: true } });
    });
  });

  it("refuses a verb file that holds no operation", async () => {
    const exit = await modelOf(resolve(import.meta.dirname, "../../../test/fixtures/not-an-operation"));
    expect(Exit.isFailure(exit)).toBe(true);
    expect(JSON.stringify(exit)).toContain("blueprint/things/widget/verbs/spin.ts");
  });

  // L2.P (N1): the seams a later target needs, each with a default that keeps today's behaviour.
  describe("privacy-ready seams", () => {
    const edit = (root: string, file: string, change: (text: string) => string) => {
      const path = join(root, "blueprint", file);
      writeFileSync(path, change(readFileSync(path, "utf8")));
    };

    it("carries `visibility` into the model: the declared secrets are marked, everything else is public by absence", async () => {
      const exit = await modelOf(acme);
      expect(Exit.isSuccess(exit)).toBe(true);
      if (!Exit.isSuccess(exit)) return;
      const ops = exit.value.operations;
      expect(ops["session.sign-in"]?.payload["password"]?.visibility).toBe("secret");
      expect(ops["session.sign-in"]?.answer["token"]?.visibility).toBe("secret");
      expect(ops["session.sign-in"]?.answer["session"]?.visibility).toBe("secret");
      expect(ops["session.sign-in"]?.payload["email"]).not.toHaveProperty("visibility");
      expect(ops["person.sign-up"]?.payload["password"]?.visibility).toBe("secret");
      expect(ops["api-key.create"]?.answer["key"]?.visibility).toBe("secret");
      expect(ops["allowance.grant"]?.payload["limit"]).not.toHaveProperty("visibility");
      // The things' own fields are public: a session id declared elsewhere is not secret because one answer marks it.
      expect(exit.value.things["session"]?.fields["id"]).not.toHaveProperty("visibility");
    });

    it("carries `private(role)` into the model, the role named as thing.role", async () => {
      const root = copyOfAcme();
      edit(root, "things/allowance/verbs/grant.ts", (t) => t.replace("limit: Allowance.fields.limit }", "limit: Blueprint.visibility.private(Allowance.fields.limit, owner) }"));
      edit(root, "things/allowance/errors.ts", (t) => t.replace('import { Amount }', 'import { owner } from "../organization/roles.ts";\nimport { Amount }').replace("remaining: Amount", "remaining: Blueprint.visibility.private(Amount, owner)"));
      const exit = await modelOf(root);
      expect(Exit.isSuccess(exit)).toBe(true);
      if (!Exit.isSuccess(exit)) return;
      expect(exit.value.operations["allowance.grant"]?.payload["limit"]?.visibility).toEqual({ private: ["organization.owner"] });
      expect(exit.value.things["allowance"]?.errors["AllowanceExceeded"]?.fields["remaining"]?.visibility).toEqual({ private: ["organization.owner"] });
      // Only what was marked: the same field elsewhere is public.
      expect(exit.value.things["allowance"]?.events["AllowanceGranted"]?.["limit"]).not.toHaveProperty("visibility");
    });

    it("numbers refusal codes by declaration order, and a new error never moves one that shipped", async () => {
      const before = await modelOf(acme);
      expect(Exit.isSuccess(before)).toBe(true);
      if (!Exit.isSuccess(before)) return;
      expect(before.value.things["allowance"]?.code).toBe("AL");
      expect(Object.fromEntries(Object.entries(before.value.things["allowance"]!.errors).map(([n, e]) => [n, e.code]))).toEqual({
        AllowanceExceeded: "AL-001", AllowanceNotFound: "AL-002", AllowanceLimitTooHigh: "AL-003",
      });
      expect(before.value.refusals).toMatchObject({ AllowanceNotActive: "AL-900", NotAllowed: "AR-001", PersonEmailTaken: "PE-001", SessionCredentialsWrong: "SE-001" });

      const root = copyOfAcme();
      edit(root, "things/allowance/errors.ts", (t) => `${t}export class AllowanceFrozen extends Blueprint.error({}, { exit: 45 }) {}\n`);
      const after = await modelOf(root);
      expect(Exit.isSuccess(after)).toBe(true);
      if (!Exit.isSuccess(after)) return;
      expect(after.value.refusals).toMatchObject({ AllowanceExceeded: "AL-001", AllowanceNotFound: "AL-002", AllowanceLimitTooHigh: "AL-003", AllowanceFrozen: "AL-004", AllowanceNotActive: "AL-900" });
    });

    it("refuses two things that would share a code prefix, naming both", async () => {
      const root = copyOfAcme();
      edit(root, "things/organization/thing.ts", (t) => t.replace('  description: "A company', '  code: "AL",\n  description: "A company'));
      const exit = await modelOf(root);
      expect(Exit.isFailure(exit)).toBe(true);
      expect(JSON.stringify(exit)).toMatch(/organization and allowance \(blueprint\/things\/allowance\/thing\.ts\) would both have refusal codes starting AL-/);
    });

    it("defaults `runs` to server and `test` to unit, and refuses every other place, naming the target that would run it", async () => {
      const exit = await modelOf(acme);
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) expect(Object.values(exit.value.operations).every((o) => o.runs === "server" && o.test === "unit")).toBe(true);

      const client = copyOfAcme();
      edit(client, "things/allowance/verbs/grant.ts", (t) => t.replace("  idempotent:", '  runs: "client",\n  idempotent:'));
      const refusedClient = await modelOf(client);
      expect(Exit.isFailure(refusedClient)).toBe(true);
      expect(JSON.stringify(refusedClient)).toContain('blueprint/things/allowance/verbs/grant.ts: runs \\"client\\" is not supported yet');
      expect(JSON.stringify(refusedClient)).toContain("a mounted plugin supplies it, with a code entry for each of node, browser and world");

      const chain = copyOfAcme();
      edit(chain, "things/allowance/verbs/grant.ts", (t) => t.replace("  idempotent:", '  runs: "chain",\n  idempotent:'));
      const refusedChain = await modelOf(chain);
      expect(Exit.isFailure(refusedChain)).toBe(true);
      expect(JSON.stringify(refusedChain)).toContain("language-solidity");
    });

    it("carries a test kind a target set, `unit` otherwise", async () => {
      const root = copyOfAcme();
      edit(root, "things/allowance/verbs/grant.ts", (t) => t.replace("  idempotent:", '  test: "network",\n  idempotent:'));
      const exit = await modelOf(root);
      expect(Exit.isSuccess(exit)).toBe(true);
      if (!Exit.isSuccess(exit)) return;
      expect(exit.value.operations["allowance.grant"]?.test).toBe("network");
      expect(exit.value.operations["allowance.spend"]?.test).toBe("unit");
    });
  });
});
