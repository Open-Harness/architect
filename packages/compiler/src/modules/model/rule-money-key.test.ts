// A unique rule whose key field is money of a row's own token, refused with an error that counts the same token: the compiler compares the two
// values without walking the field references (a field holds its thing, which holds the field), and so does not crash on the cycle.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import { Compiler } from "./service.ts";

const scratch = resolve(import.meta.dirname, "../../../test/tmp/rule-money-key");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

let n = 0;
const project = (errorField: string): string => {
  const root = join(scratch, `p${n++}`);
  const files: Record<string, string> = {
    "blueprint/things/stake/thing.ts": `import { Blueprint } from "orthograph";
const token = Blueprint.account();
export const Stake = Blueprint.thing({ description: "An amount held.", code: "SK", fields: { id: Blueprint.id("stk"), token, held: Blueprint.money.of(token) } });
`,
    "blueprint/things/stake/invariants.ts": `import { Blueprint } from "orthograph";
import { Stake } from "./thing.ts";
import { StakeTaken } from "./errors.ts";
export const oneHolding = Blueprint.invariant.unique(Stake.fields.held, { refuse: StakeTaken });
`,
    "blueprint/things/stake/errors.ts": `import { Blueprint } from "orthograph";
import { Stake } from "./thing.ts";
export class StakeTaken extends Blueprint.error({ held: ${errorField} }, { exit: 20 }) {}
`,
  };
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
};
const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));

describe("a unique rule on money of a row's token", () => {
  it("compiles when the refusal counts the same token, written as the thing's field", async () => {
    const exit = await modelOf(project("Blueprint.money.of(Stake.fields.token)"));
    expect(Exit.isSuccess(exit), Exit.isFailure(exit) ? String(exit.cause) : "").toBe(true);
  });

  it("is refused, saying the value differs, when the refusal counts the amount in other bits", async () => {
    const exit = await modelOf(project("Blueprint.money.of(Stake.fields.token, { bits: 64 })"));
    expect(Exit.isFailure(exit)).toBe(true);
    expect(JSON.stringify(exit)).toContain("carries held");
  });
});
