import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Actions } from "./service.ts";
import { ActionRefusal } from "./internal/refusal.ts";
import type { ActionOptions } from "./types.ts";

const options = (run: ActionOptions<{ n: number }, number>["run"], needsApproval = false): ActionOptions<{ n: number }, number> => ({
  name: "thing.do",
  description: "Does a thing.",
  schema: Schema.Struct({ n: Schema.Number, note: Schema.optionalKey(Schema.String) }) as never,
  readOnly: false,
  needsApproval,
  agentTool: true,
  errors: {},
  run,
});
const rejected = (p: Promise<unknown>) => p.then(() => undefined, (e: unknown) => e);

describe("actions", () => {
  it("runForAction types a declared refusal and redacts everything else", async () => {
    const refusal = await rejected(Actions.runForAction(Effect.fail({ _tag: "SoldOut", code: "PR-001", left: 0 })));
    expect(refusal).toBeInstanceOf(ActionRefusal);
    expect(refusal).toMatchObject({ errorCode: "PR-001", statusCode: 422, details: { left: 0 } });
    const defect = (await rejected(Actions.runForAction(Effect.die(new Error("secret"))))) as Error;
    expect(defect).not.toBeInstanceOf(ActionRefusal);
    expect(defect.message).not.toContain("secret");
  });

  it("the wrapper asks once for needsApproval, never when the host approved, and a no is AR-003", async () => {
    let ran = 0;
    const asked: string[] = [];
    const yes = { ask: (r: { action: string }) => (asked.push(r.action), Promise.resolve(true)) };
    const no = { ask: () => Promise.resolve(false) };
    const run = () => (ran++, Promise.resolve(1));
    expect(await Actions.defineAction(options(run, true), yes).run({ n: 1 })).toBe(1);
    expect(asked).toEqual(["thing.do"]);
    await Actions.defineAction(options(run, true), no).run({ n: 1 }, { caller: "x", approvedToolCallKey: "k" });
    expect(asked).toHaveLength(1);
    const declined = await rejected(Actions.defineAction(options(run, true), no).run({ n: 1 }));
    expect(declined).toMatchObject({ errorCode: "AR-003" });
    expect(ran).toBe(2);
  });

  it("a signal aborted before the call runs nothing, asks nobody and rejects as a plain error", async () => {
    let ran = 0;
    let asked = 0;
    const controller = new AbortController();
    controller.abort();
    const approver = { ask: () => (asked++, Promise.resolve(true)) };
    const action = Actions.defineAction(options(() => (ran++, Promise.resolve(1)), true), approver);
    const error = await rejected(action.run({ n: 1 }, { caller: "x", signal: controller.signal }));
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ActionRefusal);
    expect(ran).toBe(0);
    expect(asked).toBe(0);
    let effectRan = 0;
    await rejected(Actions.runForAction(Effect.sync(() => effectRan++), { signal: controller.signal }));
    expect(effectRan).toBe(0);
  });

  it("the registry lists each action with a JSON schema and refuses duplicates", () => {
    const action = Actions.defineAction(options(() => Promise.resolve(1)), { ask: () => Promise.resolve(true) });
    const registry = Actions.registry([action]);
    const row = registry.list()[0]!;
    expect(row.inputSchema).toMatchObject({ type: "object", required: ["n"] });
    expect(registry.get("thing.do")).toBe(action);
    expect(() => Actions.registry([action, action])).toThrow();
  });
});
