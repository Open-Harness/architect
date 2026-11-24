// Exact decimals at the generated CLI (#742, item 5, after #959): the CLI prints an answer the SDK decoded, so a decimal
// reaches it as an Effect `BigDecimal`. Today `generated/cli/src/output.ts` prints a one-field answer with `String(...)`,
// giving `BigDecimal(1.5)`, and `--json` with a `JSON.stringify` that only knows bigints, giving
// `{"_id":"BigDecimal","value":"150","scale":2}`. A rate printed from the books' CLI must read `1.50`.
//
// Assumptions beyond those documents (the PR for this check lists them for the lead):
//  1. A decimal prints as its wire text (`decimalText` from `orthograph/server`): `1.50` keeps its trailing zero, and
//     there is no exponent at any size. With `--json` it is that text as a JSON string, as a bigint is its digits.
//  2. That holds for a decimal anywhere in the answer, in a list's items too.
//
// The rendered `output.ts` is run as written: it is put in a scratch project beside a stand-in for the SDK's `Errors`,
// which is all it imports from the SDK.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { BigDecimal, Effect } from "effect";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { Model } from "@orthograph/compiler";
import { renderCli } from "./internal/cli.ts";

// Under the package, so `effect` resolves from the scratch project the way generated code's imports do.
const scratch = resolve(import.meta.dirname, "../../../.ortho/decimal-cli");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

type Output = { readonly answer: (json: boolean) => <A extends object>(effect: Effect.Effect<A>) => Effect.Effect<unknown, never, never> };
const loadOutput = async (): Promise<Output> => {
  const model = { operations: {}, things: {} } as unknown as Model;
  const file = renderCli(model, "decimals").find((f) => f.path === "generated/cli/src/output.ts");
  if (file === undefined) throw new Error("renderCli wrote no generated/cli/src/output.ts");
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "p-"));
  mkdirSync(join(root, "generated/cli/src"), { recursive: true });
  mkdirSync(join(root, "generated/sdk/src"), { recursive: true });
  writeFileSync(join(root, "generated/cli/src/output.ts"), file.content);
  writeFileSync(join(root, "generated/sdk/src/index.ts"), "export const Errors = { refusals: {}, codes: {}, declared: {} };\n");
  return (await import(join(root, "generated/cli/src/output.ts"))) as Output;
};
const printed = async (json: boolean, answer: object): Promise<string> => {
  const { answer: print } = await loadOutput();
  const lines: Array<string> = [];
  const spy = vi.spyOn(console, "log").mockImplementation((...args: Array<unknown>) => void lines.push(args.map(String).join(" ")));
  try {
    await Effect.runPromise(print(json)(Effect.succeed(answer)) as Effect.Effect<unknown>);
  } finally {
    spy.mockRestore();
  }
  return lines.join("\n");
};
const d = (text: string) => BigDecimal.fromStringUnsafe(text);

describe("Exact decimals: the generated CLI prints a decimal as it travels", () => {
  it("prints a one-field decimal answer as its text", async () => {
    expect(await printed(false, { rate: d("1.50") })).toBe("1.50");
    expect(await printed(false, { rate: d("10000000000000000") })).toBe("10000000000000000");
    expect(await printed(false, { rate: d("-0.00000000000000001") })).toBe("-0.00000000000000001");
  });

  it("prints a decimal in a --json answer as its text, in a list's items too", async () => {
    const out = JSON.parse(await printed(true, { rate: d("1.50"), items: [{ id: "rt_1", value: d("10000000000000000") }], limit: 7n })) as Record<string, unknown>;
    expect(out).toEqual({ rate: "1.50", items: [{ id: "rt_1", value: "10000000000000000" }], limit: "7" });
  });
});
