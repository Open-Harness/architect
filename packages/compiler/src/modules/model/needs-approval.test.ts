// #466 (Goal 5's ask): an operation declares that a person must say yes before it runs, `needsApproval: true`.
// The declaration and the model only: the compiler carries it, a wrong value is refused, AR-007 is reserved for ApprovalDeclined.
// Real copies of acme's blueprint, as model.test.ts does; the scratch folder is this file's own, since model.test.ts removes its own as a whole.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import * as codes from "./internal/codes.ts";
import { Compiler } from "./service.ts";

const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const pluggedIn = resolve(import.meta.dirname, "../../../../../examples/plugged-in");
const scratch = resolve(import.meta.dirname, "../../../.ortho/needs-approval");
const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));

const copyOfAcme = (): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "acme-"));
  cpSync(join(acme, "blueprint"), join(root, "blueprint"), {
    recursive: true,
    filter: (path) => !basename(path).startsWith(".") && basename(path) !== "projections" && basename(path) !== "starting-worlds",
  });
  return root;
};
const edit = (root: string, file: string, change: (text: string) => string) => {
  const path = join(root, "blueprint", file);
  writeFileSync(path, change(readFileSync(path, "utf8")));
};
const GRANT = "things/allowance/verbs/grant.ts";
/** grant.ts, with one more line in its declaration. */
const grantWith = (line: string) => (root: string) => edit(root, GRANT, (t) => t.replace("  idempotent:", `  ${line}\n  idempotent:`));

// Read as data: the model's type gains the field with the build, and these checks are written before it.
const declaredOf = (op: unknown): unknown => (op as { readonly needsApproval?: unknown } | undefined)?.needsApproval;

const succeeded = async (root: string) => {
  const exit = await modelOf(root);
  expect(Exit.isSuccess(exit)).toBe(true);
  if (!Exit.isSuccess(exit)) throw new Error("the model did not compile");
  return exit.value;
};

describe("needsApproval: an operation says a person must say yes before it runs (#466)", () => {
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));

  it("is carried into the model when declared, and only that operation changes: no other entry, its refusals or any other part moves", async () => {
    const before = await succeeded(acme);
    const root = copyOfAcme();
    grantWith("needsApproval: true,")(root);
    const after = await succeeded(root);
    expect(declaredOf(after.operations["allowance.grant"])).toBe(true);
    // The declaration is the operation's own: its hash says it changed, and it gains no refusal (the Worker never returns ApprovalDeclined).
    expect(after.operations["allowance.grant"]?.hash).not.toBe(before.operations["allowance.grant"]?.hash);
    expect(after.operations["allowance.grant"]?.refusals).toEqual(before.operations["allowance.grant"]?.refusals);
    expect(after.refusals).toEqual(before.refusals);
    const { needsApproval: _declared, hash: _hash, ...rest } = after.operations["allowance.grant"] as unknown as Record<string, unknown>;
    const { hash: _before, ...was } = before.operations["allowance.grant"] as unknown as Record<string, unknown>;
    expect(rest).toEqual(was);
    // Every other operation, entry for entry (hash included), is what it was.
    for (const name of Object.keys(before.operations).filter((n) => n !== "allowance.grant")) {
      expect(after.operations[name], name).toEqual(before.operations[name]);
      expect(after.operations[name], name).not.toHaveProperty("needsApproval");
    }
  });

  it("is absent, never `false`, where it is not declared: the key is on no undeclared operation and no `false` is anywhere", async () => {
    const declared = copyOfAcme();
    grantWith("needsApproval: true,")(declared);
    for (const [label, root] of [["acme", acme], ["acme with grant declaring it", declared]] as const) {
      const model = await succeeded(root);
      const undeclared = Object.entries(model.operations).filter(([name]) => name !== "allowance.grant" || root === acme);
      expect(undeclared.length, label).toBeGreaterThan(10);
      for (const [name, op] of undeclared) expect(op, `${label}: ${name}`).not.toHaveProperty("needsApproval");
      expect(JSON.stringify(model), label).not.toMatch(/"needsApproval":\s*false/);
    }
    // The declared one is the only one that shows it, so the key is how a reader tells.
    expect(Object.values((await succeeded(declared)).operations).filter((o) => "needsApproval" in o).map((o) => o.name)).toEqual(["allowance.grant"]);
  });

  it("is declared by Plugged In's `handle.release`, and by no other operation of Plugged In", async () => {
    const model = await succeeded(pluggedIn);
    expect(declaredOf(model.operations["handle.release"])).toBe(true);
    const others = Object.entries(model.operations).filter(([name]) => name !== "handle.release");
    expect(others.length).toBeGreaterThan(3);
    for (const [name, op] of others) expect(op, name).not.toHaveProperty("needsApproval");
    expect(JSON.stringify(model)).not.toMatch(/"needsApproval":\s*false/);
    // The source says it too, so the declaration is not only in the model: release.ts holds the line, once.
    const source = readFileSync(join(pluggedIn, "blueprint/things/handle/verbs/release.ts"), "utf8");
    expect(source.match(/^\s*needsApproval: true,/gm)).toHaveLength(1);
  });

  it.each([
    ["false (not asking is saying nothing)", "false"],
    ["the text \"yes\"", '"yes"'],
    ["the number 1", "1"],
    ["null", "null"],
    ["an object", "{ by: 'owner' }"],
  ])("refuses %s, naming the file and what is allowed", async (_label, value) => {
    const root = copyOfAcme();
    grantWith(`needsApproval: ${value} as never,`)(root);
    const exit = await modelOf(root);
    expect(Exit.isFailure(exit)).toBe(true);
    const text = JSON.stringify(exit);
    expect(text).toContain("blueprint/things/allowance/verbs/grant.ts");
    expect(text).toContain("needsApproval");
    expect(text).toMatch(/needsApproval[^"]*\btrue\b/);
  });

  it("reserves AR-007 for ApprovalDeclined beside the runtime's codes, and moves none: AR-001 NotAllowed, AR-002 IdempotencyConflict", () => {
    const reserved = (codes as unknown as { readonly RESERVED_CODES?: Readonly<Record<string, string>> }).RESERVED_CODES;
    expect(reserved).toEqual({ ApprovalDeclined: "AR-007" });
    expect(codes.RUNTIME_CODES).toEqual({ NotAllowed: "AR-001", IdempotencyConflict: "AR-002" });
    // Goal 4 holds AR-003 to AR-006 on goal/on-chain: nothing here takes them, and AR-007 is taken once.
    const taken = [...Object.values(codes.RUNTIME_CODES), ...Object.values(reserved ?? {})];
    expect(new Set(taken).size).toBe(taken.length);
    expect(taken.filter((c) => /^AR-00[3-6]$/.test(c))).toEqual([]);
  });

  it("keeps ApprovalDeclined out of every model's refusals (the Worker never returns it, and no generated file moves), and refuses a thing that declares it", async () => {
    const model = await succeeded(acme);
    expect(model.refusals).toMatchObject({ NotAllowed: "AR-001", IdempotencyConflict: "AR-002" });
    expect(model.refusals).not.toHaveProperty("ApprovalDeclined");
    expect(Object.values(model.refusals)).not.toContain("AR-007");

    const root = copyOfAcme();
    edit(root, "things/allowance/errors.ts", (t) => `${t}export class ApprovalDeclined extends Blueprint.error({}, { exit: 45 }) {}\n`);
    const exit = await modelOf(root);
    expect(Exit.isFailure(exit)).toBe(true);
    const text = JSON.stringify(exit);
    expect(text).toContain("ApprovalDeclined");
    expect(text).toContain("AR-007");
  });
});
