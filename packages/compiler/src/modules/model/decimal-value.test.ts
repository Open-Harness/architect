// Exact decimals (#742, item 5): the compiler's side of `Blueprint.decimal`. The model carries a decimal as its own kind
// with its places, and the refusals lock records it so: a field moving between a decimal and text, or changing its
// places, changes what clients parse (lock-fields.ts). A chain-stored thing can't hold one, since a contract has no
// decimal; it keeps a scaled whole number, as money is base units.
//
// Assumptions beyond those documents (the PR for this check lists them for the lead): places is a whole number of at
// least 0 (values/decimal.test.ts says the rest), and the compiler refuses any other, naming places, as it refuses a
// width that is no whole number of bits.
//
// `Blueprint.decimal` is read loosely so this file type-checks before and after the surface exists.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { Blueprint } from "orthograph";
import { afterAll, describe, expect, it } from "vitest";
import { lockFields } from "./internal/lock-fields.ts";
import { nodeSource } from "#modules/source/service.js";
import { Compiler } from "./service.ts";

const budgets = resolve(import.meta.dirname, "../../../../../examples/budgets");
const scratch = resolve(import.meta.dirname, "../../../test/tmp-decimal-value");
const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));
const said = (exit: Exit.Exit<unknown, unknown>) => (Exit.isFailure(exit) ? JSON.stringify(exit.cause) : "");

/** A copy of budgets whose allowance has a `rate` decimal; `onChain: false` moves the allowance to the default store. */
const project = (onChain: boolean, rate = "Blueprint.decimal({ places: 4 })"): string => {
  if (typeof (Blueprint as unknown as { readonly decimal?: unknown }).decimal !== "function") throw new Error("Blueprint.decimal is not there: #742 item 5 adds it");
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "b-"));
  cpSync(join(budgets, "blueprint"), join(root, "blueprint"), {
    recursive: true,
    filter: (path) => !basename(path).startsWith(".") && !["projections", "starting-worlds"].includes(basename(path)),
  });
  const thing = join(root, "blueprint/things/allowance/thing.ts");
  let text = readFileSync(thing, "utf8").replace("    spent:", `    rate: ${rate},\n    spent:`);
  if (!onChain) text = text.replace("  lives: budgets,\n", "").replace(/import budgets[^\n]*\n/, "");
  writeFileSync(thing, text);
  return root;
};
const fieldOf = (exit: Exit.Exit<unknown, unknown>, key: string): unknown =>
  Exit.isSuccess(exit) ? (exit.value as { readonly things: Record<string, { readonly fields: Record<string, { readonly value: unknown }> }> }).things["allowance"]?.fields[key]?.value : undefined;

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("Exact decimals: the compiler and a decimal", () => {
  it("records a decimal error field in the refusals lock as its own kind with its places, not as a schema", () => {
    const fields = { rate: { value: { type: "decimal", places: 4 } }, share: { value: { type: "decimal", places: 9 } } } as never;
    expect(lockFields(fields)).toEqual({ rate: { value: "decimal", places: 4 }, share: { value: "decimal", places: 9 } });
  });

  it("carries a decimal field into the model as a decimal with its places", async () => {
    const exit = await modelOf(project(false));
    expect(said(exit)).toBe("");
    expect(fieldOf(exit, "rate")).toEqual({ type: "decimal", places: 4 });
  });

  it("carries a decimal with no places given as 9 places", async () => {
    const exit = await modelOf(project(false, "Blueprint.decimal()"));
    expect(said(exit)).toBe("");
    expect(fieldOf(exit, "rate")).toEqual({ type: "decimal", places: 9 });
  });

  it("refuses places that are no whole number of at least 0, naming the field and places", async () => {
    for (const places of ["-1", "1.5"]) {
      expect(said(await modelOf(project(false, `Blueprint.decimal({ places: ${places} })`))), places).toMatch(/field rate[^"]*places/);
    }
  });

  it("refuses a decimal field on a chain-stored thing, which a contract cannot hold", async () => {
    for (const rate of ["Blueprint.decimal({ places: 4 })", "Blueprint.decimal({ places: 0 })"]) {
      expect(said(await modelOf(project(true, rate))), rate).toMatch(/field rate[^"]*a decimal[^"]*contract/);
    }
  });
});
