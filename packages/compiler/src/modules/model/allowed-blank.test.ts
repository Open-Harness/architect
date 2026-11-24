// A `Blueprint.todo` as one entry of `allowed` (#742, item 7). `allowed: [Blueprint.todo("...")]` crashed the compiler
// (`Cannot read properties of undefined (reading 'service')` in internal/allowed.ts). Like a blank `allowed`, it is a
// blank: the declaration is listed under its blanks with what is still to write, and it is not served until filled.
// Each case changes one `allowed` in a copy of Capxul.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import type { Model } from "./types.ts";
import { Compiler } from "./service.ts";

const capxul = resolve(import.meta.dirname, "../../../../../examples/capxul");
const scratch = resolve(import.meta.dirname, "../../../test/tmp-allowed-blank");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));

/** A copy of Capxul's blueprint with one verb's `allowed: [owner.of("company")]` written as `allowed: [<entries>]`. */
const capxulWith = (verb: string, entries: string): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "c-"));
  cpSync(join(capxul, "blueprint"), join(root, "blueprint"), {
    recursive: true,
    filter: (p) => !basename(p).startsWith(".") && !["starting-worlds"].includes(basename(p)),
  });
  const file = join(root, `blueprint/things/${verb}.ts`);
  const text = readFileSync(file, "utf8");
  const from = `allowed: [owner.of("company")]`;
  if (!text.includes(from)) throw new Error(`${verb} has no ${from}: the fixture moved`);
  writeFileSync(file, text.replace(from, `allowed: [${entries}]`));
  return root;
};

/** The model, or the reason there is none. */
const described = async (root: string): Promise<Model> => {
  const exit = await modelOf(root);
  if (Exit.isSuccess(exit)) return exit.value as Model;
  const reasons = exit.cause.reasons.map((r) => r as { readonly defect?: unknown; readonly error?: unknown });
  throw new Error(`no model: ${reasons.map((r) => String(r.defect ?? JSON.stringify(r.error))).join("; ")}`);
};

describe("a Blueprint.todo inside allowed is a blank (#742, item 7)", () => {
  it.each([
    ["an operation's only entry", "department/verbs/create", "department.create", `Blueprint.todo("who may add a department")`, "who may add a department"],
    ["a read's only entry", "department/verbs/get", "department.get", `Blueprint.todo("who may read a department")`, "who may read a department"],
    ["an entry beside a role", "employee/verbs/hire", "employee.hire", `owner.of("company"), Blueprint.todo("and the HR manager")`, "and the HR manager"],
  ])("lists %s as a blank, not served until it is filled", async (_, verb, name, entries, what) => {
    const model = await described(capxulWith(verb, entries));
    expect(model.blanks?.[name]?.some((b) => b.includes(what)), `${name}'s blanks: ${JSON.stringify(model.blanks?.[name])}`).toBe(true);
    expect(model.blankOperations?.[name]?.blanks.some((b) => b.includes(what))).toBe(true);
    expect(model.operations[name]).toBeUndefined();
  });
});
