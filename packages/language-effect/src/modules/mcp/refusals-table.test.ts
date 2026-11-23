// K16, M1.47 (checks ahead of their build, written by the ✍️ author): one generated refusals table gives every surface
// the same code, exit and status. The CLI exits with `exit`, HTTP answers `status`, and an MCP refusal carries all three,
// so an agent can tell a refusal from a defect without parsing text. A builder never edits this file.
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { ErrorNames } from "orthograph/server";
import { Handlers } from "#modules/handler/service.js";
import type { Handler } from "#modules/handler/types.js";
import { storeMemory } from "#modules/records/service.js";
import { BusyLive } from "#modules/work/service.js";
import { Mcp } from "./service.ts";

const Amount = Blueprint.value(Blueprint.uint(128));
const Person = Blueprint.thing({ description: "Someone.", fields: { id: Blueprint.id("per") } });
const Purse = Blueprint.thing({ description: "Money.", fields: { id: Blueprint.id("pur"), member: Person.fields.id } });
const holder = Blueprint.role(Purse, { rule: (p, who) => p.member === who.person });
const TooMuch = Blueprint.error({ left: Amount }, { exit: 41 });
ErrorNames.name(TooMuch, "TooMuch");
const spend = Blueprint.operation(Purse, {
  description: "Spend from a purse.", payload: { purse: Purse.fields.id, amount: Amount }, answer: { spent: Amount },
  errors: [TooMuch], allowed: [holder],
});
const spender: Handler<typeof spend> = ({ amount }) => (amount > 100n ? Effect.fail(new TooMuch({ left: 7n })) : Effect.succeed({ spent: amount }));

// The generated `refusals` table from api/src/errors.ts, as M1.47 writes it: one row per refusal, read by every surface.
const table = {
  TooMuch: { code: "PU-001", exit: 41, status: 422 },
  NotAllowed: { code: "AR-001", exit: 3, status: 403 },
};
const tools = Mcp.tools<never>({
  catalog: { "purse.spend": { description: "Spend from a purse.", operation: spend } },
  served: { "purse.spend": Handlers.serve({ name: "purse.spend", operation: spend, handler: spender }) } as never,
  refusals: { codes: { TooMuch: "PU-001", NotAllowed: "AR-001" }, declared: { TooMuch }, table } as never,
});
const services = Layer.mergeAll(BusyLive, storeMemory([[Purse, { id: "pur_1", member: "per_olga" }]]).layer);
const call = (args: Record<string, unknown>, person: string) =>
  Effect.runPromise(tools[0]!.call(args, { kind: "person", person } as never).pipe(Effect.provide(services)));

describe("K16: an MCP refusal carries the table's code, exit and status (M1.47)", () => {
  it("a declared refusal: its code, its declared exit, and 422", async () => {
    const result = await call({ purse: "pur_1", amount: "101" }, "per_olga");
    expect(result.text, "control: the text line is unchanged").toBe("[PU-001] TooMuch { left: 7 }");
    expect(result.structured).toEqual({ refusal: "TooMuch", code: "PU-001", exit: 41, status: 422, left: "7" });
  });

  it("the runtime's own refusal: NotAllowed, exit 3, 403", async () => {
    const result = await call({ purse: "pur_1", amount: "1" }, "per_bob");
    expect(result.text, "control: the text line is unchanged").toBe("[AR-001] NotAllowed");
    expect(result.structured).toEqual({ refusal: "NotAllowed", code: "AR-001", exit: 3, status: 403 });
  });
});
