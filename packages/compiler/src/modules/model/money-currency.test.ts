// Company currency, part one (#882; design/decisions/CX-currency.md): the compiler's side of a currency a row holds. An
// amount may count the currency of a `Blueprint.currency()` field of its own row, as it counts the token of an
// account() field (M6-money item 2); a field of any other kind still holds no asset. The refusals lock records a
// currency as its own kind, and a chain-stored thing refuses one, since a currency has no chain binding.
//
// `Blueprint.currency` is read loosely so this file type-checks before and after the surface exists.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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
const project = (held: string): string => {
  if (typeof (Blueprint as unknown as { readonly currency?: unknown }).currency !== "function") {
    throw new Error("Blueprint.currency is not there: Company currency (#882) adds it");
  }
  const root = join(scratch, `p${n++}`);
  const files: Record<string, string> = {
    "blueprint/things/claim/thing.ts": `import { Blueprint } from "orthograph";
const held = ${held};
export const Claim = Blueprint.thing({ description: "An amount claimed.", code: "CL", fields: { id: Blueprint.id("clm"), held, amount: Blueprint.money.of(held) } });
`,
  };
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
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

  it("still refuses money of a field that holds no asset, such as text", async () => {
    expect(typeof (Blueprint as unknown as { readonly currency?: unknown }).currency, "Blueprint.currency is not there: Company currency (#882) adds it").toBe("function");
    expect(said(await modelOf(project("Blueprint.text({ max: 3 })")))).toMatch(/holds no asset/);
  });

  it("records a currency error field in the refusals lock as its own kind, not as text", () => {
    const fields = { held: { value: { type: "currency" } } } as never;
    expect(lockFields(fields)).toEqual({ held: { value: "currency" } });
  });
});
