// K16 review 7, PR #76 at 7430e023 (a check ahead of its fix, written by the ✍️ author; a builder never edits this file).
// P2: an MCP refusal's structured form is built field by field, and a field the error holds as undefined (set
// explicitly, as `{ note: undefined }` does) went through JSON one value at a time and became a defect,
// `[AR-500] InternalError`. A refusal stays a refusal: its line and its table row, the undefined field simply absent.
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
const Purse = Blueprint.thing({ description: "Money.", fields: { id: Blueprint.id("pur") } });
const TooMuch = Blueprint.error({ left: Amount }, { exit: 41 });
ErrorNames.name(TooMuch, "TooMuch");
const spend = Blueprint.operation(Purse, {
  description: "Spend from a purse.", payload: { purse: Purse.fields.id, amount: Amount }, answer: { spent: Amount },
  errors: [TooMuch], allowed: [Blueprint.signedIn],
});
// Over 100 is refused with what is left; over 1000 the handler has nothing to say, and leaves the field undefined.
const spender: Handler<typeof spend> = ({ amount }) =>
  amount > 1000n ? Effect.fail(new TooMuch({ left: undefined as never }))
  : amount > 100n ? Effect.fail(new TooMuch({ left: 7n }))
  : Effect.succeed({ spent: amount });

const table = { TooMuch: { code: "PU-001", exit: 41, status: 422 }, NotAllowed: { code: "AR-001", exit: 3, status: 403 } };
const tools = Mcp.tools<never>({
  catalog: { "purse.spend": { description: "Spend from a purse.", operation: spend } },
  served: { "purse.spend": Handlers.serve({ name: "purse.spend", operation: spend, handler: spender }) } as never,
  refusals: { codes: { TooMuch: "PU-001", NotAllowed: "AR-001" }, declared: { TooMuch }, table } as never,
});
const services = Layer.mergeAll(BusyLive, storeMemory([[Purse, { id: "pur_1" }]]).layer);
const call = (args: Record<string, unknown>) =>
  Effect.runPromise(tools[0]!.call(args, { kind: "person", person: "per_olga", via: "session" } as never).pipe(Effect.provide(services)));

describe("K16 review 7: an MCP refusal with an undefined field is still a refusal", () => {
  it("control: the same refusal with its field set is the table's row and its field", async () => {
    const result = await call({ purse: "pur_1", amount: "101" });
    expect(result.text).toBe("[PU-001] TooMuch { left: 7 }");
    expect(result.structured).toEqual({ refusal: "TooMuch", code: "PU-001", exit: 41, status: 422, left: "7" });
  });

  it("with its field undefined: refused TooMuch, the table's code, exit and status, and no defect", async () => {
    const result = await call({ purse: "pur_1", amount: "1001" });
    expect(result.isError).toBe(true);
    expect(result.text, "a refusal, not [AR-500] InternalError").toMatch(/^\[PU-001\] TooMuch\b/);
    expect(result.structured).toMatchObject({ refusal: "TooMuch", code: "PU-001", exit: 41, status: 422 });
    expect(result.structured?.["left"], "an undefined field is absent, never null or a string").toBeUndefined();
  });
});
