// Company currency, part one (#882; design/decisions/CX-currency.md): the compiler's side of a currency a row holds. An
// amount may count the currency of a `Blueprint.currency()` field of its own row, as it counts the token of an
// account() field (M6-money item 2); a field of any other kind still holds no asset. The refusals lock records a
// currency as its own kind, and a chain-stored thing refuses one, since a currency has no chain binding.
//
// `Blueprint.currency` is read loosely so this file type-checks before and after the surface exists.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { Blueprint } from "orthograph";
import { afterAll, describe, expect, it } from "vitest";
import { lockFields } from "./internal/lock-fields.ts";
import { nodeSource } from "#modules/source/service.js";
import { Compiler } from "./service.ts";

const scratch = resolve(import.meta.dirname, "../../../test/tmp/money-currency");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

let n = 0;
/** A project with one thing, Claim, whose `amount` counts the asset its `held` field holds. */
const project = (held: string, extra: Record<string, string> = {}): string => {
  if (typeof (Blueprint as unknown as { readonly currency?: unknown }).currency !== "function") {
    throw new Error("Blueprint.currency is not there: Company currency (#882) adds it");
  }
  const root = join(scratch, `p${n++}`);
  const files: Record<string, string> = {
    "blueprint/things/claim/thing.ts": `import { Blueprint } from "orthograph";
const held = ${held};
export const Claim = Blueprint.thing({ description: "An amount claimed.", code: "CL", fields: { id: Blueprint.id("clm"), held, amount: Blueprint.money.of(held) } });
`,
    ...extra,
  };
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
};
const budgets = resolve(import.meta.dirname, "../../../../../examples/budgets");
/** A copy of budgets, whose allowance lives in a chain store, with `edit` applied to its thing file. */
const onChain = (edit: (text: string) => string): string => {
  if (typeof (Blueprint as unknown as { readonly currency?: unknown }).currency !== "function") {
    throw new Error("Blueprint.currency is not there: Company currency (#882) adds it");
  }
  const root = join(scratch, `c${n++}`);
  cpSync(join(budgets, "blueprint"), join(root, "blueprint"), {
    recursive: true,
    filter: (path) => !basename(path).startsWith(".") && !["projections", "starting-worlds"].includes(basename(path)),
  });
  const thing = join(root, "blueprint/things/allowance/thing.ts");
  writeFileSync(thing, edit(readFileSync(thing, "utf8")));
  return root;
};
const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));
const said = (exit: Exit.Exit<unknown, unknown>) => (Exit.isFailure(exit) ? JSON.stringify(exit.cause) : "");
type Model = { readonly things: Record<string, { readonly fields: Record<string, { readonly value: unknown }> }> };

describe("Company currency: the compiler and a row's currency", () => {
  it("carries a currency field as a currency, and money of it as money of that field", async () => {
    const exit = await modelOf(project("Blueprint.currency()"));
    expect(said(exit)).toBe("");
    const fields = Exit.isSuccess(exit) ? (exit.value as Model).things["claim"]?.fields : undefined;
    expect(fields?.["held"]?.value).toEqual({ type: "currency" });
    expect(fields?.["amount"]?.value).toEqual({ type: "money", bits: 128, signed: false, asset: { field: "held" } });
  });

  it("counts the row's currency when an error names it as the thing's field, as an operation or event does", async () => {
    const exit = await modelOf(project("Blueprint.currency()", {
      "blueprint/things/claim/errors.ts": `import { Blueprint } from "orthograph";
import { Claim } from "./thing.ts";
export class ClaimTooLarge extends Blueprint.error({ over: Blueprint.money.of(Claim.fields.held) }, { exit: 41 }) {}
`,
    }));
    expect(said(exit)).toBe("");
    type Errors = Record<string, { readonly fields: Record<string, { readonly value: unknown }> }>;
    const claim = Exit.isSuccess(exit) ? (exit.value as { readonly things: Record<string, { readonly errors?: Errors }> }).things["claim"] : undefined;
    const over = claim?.errors?.["ClaimTooLarge"]?.fields["over"]?.value;
    expect(over).toEqual({ type: "money", bits: 128, signed: false, asset: { field: "held" } });
  });

  it("still refuses money of a field that holds no asset: text, a whole number, a moment, a day, an id or money", async () => {
    expect(typeof (Blueprint as unknown as { readonly currency?: unknown }).currency, "Blueprint.currency is not there: Company currency (#882) adds it").toBe("function");
    for (const held of ["Blueprint.text({ max: 3 })", "Blueprint.uint(32)", "Blueprint.instant()", "Blueprint.day()", 'Blueprint.id("cur")', 'Blueprint.money(Blueprint.asset.currency("KES"))']) {
      expect(said(await modelOf(project(held))), held).toMatch(/holds no asset/);
    }
  });

  it("records a currency error field in the refusals lock as its own kind, not as text", () => {
    const fields = { held: { value: { type: "currency" } } } as never;
    expect(lockFields(fields)).toEqual({ held: { value: "currency" } });
  });

  it("refuses a currency field on a chain-stored thing, which a contract cannot hold", async () => {
    const root = onChain((t) => t.replace("    spent:", "    shown: Blueprint.currency(),\n    spent:"));
    expect(said(await modelOf(root))).toMatch(/shown[^"]*currency[^"]*chain|shown[^"]*chain[^"]*currency/i);
  });

  it("refuses money of a row's currency on a chain-stored thing, since a currency has no chain binding", async () => {
    const root = onChain((t) => t.replace("const token = Blueprint.account();", "const token = Blueprint.currency();"));
    expect(said(await modelOf(root))).toMatch(/limit[^"]*currency[^"]*chain|limit[^"]*chain[^"]*currency/i);
  });
});
