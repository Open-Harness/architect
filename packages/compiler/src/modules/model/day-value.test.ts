// Dates, part one (#866): the compiler's side of a calendar day. The refusals lock records a day as its own kind, as it
// does an instant: a field moving between a day and text changes what clients parse (lock-fields.ts). A chain-stored
// thing can't hold one, since a contract has no day; it keeps a day as a uint, as it keeps a moment.
//
// `Blueprint.day` is read loosely so this file type-checks before and after the surface exists.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { Blueprint } from "orthograph";
import { afterAll, describe, expect, it } from "vitest";
import { lockFields } from "./internal/lock-fields.ts";
import { nodeSource } from "#modules/source/service.js";
import { Compiler } from "./service.ts";

const budgets = resolve(import.meta.dirname, "../../../../../examples/budgets");
const scratch = resolve(import.meta.dirname, "../../../test/tmp-day-value");
const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));
const said = (exit: Exit.Exit<unknown, unknown>) => (Exit.isFailure(exit) ? JSON.stringify(exit.cause) : "");

/** A copy of budgets whose allowance has a `due` day; `onChain: false` moves the allowance to the default store. */
const project = (onChain: boolean): string => {
  if (typeof (Blueprint as unknown as { readonly day?: unknown }).day !== "function") throw new Error("Blueprint.day is not there: Dates (#866) adds it");
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "b-"));
  cpSync(join(budgets, "blueprint"), join(root, "blueprint"), {
    recursive: true,
    filter: (path) => !basename(path).startsWith(".") && !["projections", "starting-worlds"].includes(basename(path)),
  });
  const thing = join(root, "blueprint/things/allowance/thing.ts");
  let text = readFileSync(thing, "utf8").replace("    spent:", "    due: Blueprint.day(),\n    spent:");
  if (!onChain) text = text.replace("  lives: budgets,\n", "").replace(/import budgets[^\n]*\n/, "");
  writeFileSync(thing, text);
  return root;
};

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("Dates: the compiler and a calendar day", () => {
  it("records a day error field in the refusals lock as its own kind, not as text", () => {
    const fields = { due: { value: { type: "day" } } } as never;
    expect(lockFields(fields)).toEqual({ due: { value: "day" } });
  });

  it("carries a day field into the model as a day", async () => {
    const exit = await modelOf(project(false));
    expect(said(exit)).toBe("");
    const model = Exit.isSuccess(exit) ? (exit.value as { readonly things: Record<string, { readonly fields: Record<string, { readonly value: unknown }> }> }) : undefined;
    expect(model?.things["allowance"]?.fields["due"]?.value).toEqual({ type: "day" });
  });

  it("refuses a day field on a chain-stored thing, which a contract cannot hold", async () => {
    expect(said(await modelOf(project(true)))).toMatch(/a day is ISO text, which a contract can't hold/);
  });
});
