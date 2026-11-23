// On a chain store `allowed` names who signs, nothing else (M6-chain item 1): a contract sees only the signer, so an operation of a chain-stored
// thing refuses `.via`/`.notVia`, `Blueprint.system` and a service role, and a field of an instant. The same entries stay allowed off chain.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { lockFields } from "./internal/lock-fields.ts";
import { nodeSource } from "#modules/source/service.js";
import { Compiler } from "./service.ts";

const visible = (from: string) => !basename(from).startsWith(".");
const budgets = resolve(import.meta.dirname, "../../../../../examples/budgets");
const scratch = resolve(import.meta.dirname, "../../../test/tmp-chain-allowed");
const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));
const said = (exit: Exit.Exit<unknown, unknown>) => (Exit.isFailure(exit) ? JSON.stringify(exit.cause) : "");

/** A copy of budgets whose spend allows `entry`; `onChain: false` moves the allowance to the default store. */
const project = (entry: string, onChain = true): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "b-"));
  cpSync(join(budgets, "blueprint"), join(root, "blueprint"), { recursive: true, filter: (path) => visible(path) && !["projections", "starting-worlds"].includes(basename(path)) });
  const spend = join(root, "blueprint/things/allowance/verbs/spend.ts");
  writeFileSync(spend, readFileSync(spend, "utf8").replace("allowed: [grantee]", `allowed: [${entry}]`).replace('import { grantee }', 'import { grantee, ruled, svc }'));
  const roles = join(root, "blueprint/things/allowance/roles.ts");
  writeFileSync(roles, `${readFileSync(roles, "utf8")}export const ruled = Blueprint.role(Allowance, { rule: () => true });\nexport const svc = Blueprint.role(Allowance, { service: {} as never });\n`);
  if (!onChain) {
    const thing = join(root, "blueprint/things/allowance/thing.ts");
    writeFileSync(thing, readFileSync(thing, "utf8").replace("  lives: budgets,\n", "").replace(/import budgets[^\n]*\n/, ""));
  }
  return root;
};

const NARROWED = "how a caller arrived means nothing to a contract, which sees only the signer";

describe("an operation of a chain-stored thing allows only who signs", () => {
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));

  it("the plain who role compiles", async () => {
    expect(said(await modelOf(project("grantee")))).toBe("");
  });

  it("refuses .via on a who role, and .notVia on one", async () => {
    expect(said(await modelOf(project('grantee.via("session")')))).toContain(NARROWED);
    expect(said(await modelOf(project('grantee.notVia("agent")')))).toContain(NARROWED);
  });

  it("refuses a narrowed entry and still refuses what is inside it", async () => {
    const text = said(await modelOf(project('ruled.via("session")')));
    expect(text).toContain(NARROWED);
    expect(text).toContain("whose rule is TypeScript only");
    expect(said(await modelOf(project('Blueprint.signedIn.via("session")')))).toContain(NARROWED);
    expect(said(await modelOf(project('Blueprint.signedIn.via("session")')))).toContain("allowed to Blueprint.signedIn");
  });

  it("refuses Blueprint.system", async () => {
    expect(said(await modelOf(project("Blueprint.system")))).toContain("allowed to Blueprint.system");
  });

  it("refuses a service role", async () => {
    const text = said(await modelOf(project("svc")));
    expect(text).toContain("allowed to the service role");
  });

  it("allows all four off chain (the chain refusals do not apply)", async () => {
    for (const entry of ['ruled.via("session")', 'Blueprint.signedIn.via("session")', "Blueprint.system", "svc"]) {
      const text = said(await modelOf(project(entry, false)));
      if (entry !== "svc") expect(text, entry).toBe("");
      expect(text, entry).not.toContain(NARROWED);
      expect(text, entry).not.toContain("allowed to Blueprint.system");
      expect(text, entry).not.toContain("allowed to the service role");
    }
  });

  it("refuses an instant field, which a contract cannot hold", async () => {
    const root = project("grantee");
    const thing = join(root, "blueprint/things/allowance/thing.ts");
    writeFileSync(thing, readFileSync(thing, "utf8").replace("    spent:", "    due: Blueprint.instant(),\n    spent:"));
    expect(said(await modelOf(root))).toContain("an instant is ISO text, which a contract can't hold");
  });
});

describe("the refusals lock", () => {
  it("records an instant error field as its own kind", () => {
    const fields = { at: { value: { type: "instant" } } } as never;
    expect(lockFields(fields)).toEqual({ at: { value: "instant" } });
  });
});
