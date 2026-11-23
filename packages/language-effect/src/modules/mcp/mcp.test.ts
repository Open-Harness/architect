// L2.08: one tool per operation and read, with the real handler wrapper and a real store behind it. What a tool offers and
// answers is cut by `visibility` (a secret never, a private field to the roles it names), a refusal comes back as a tool
// error with its code, and the role check is the API's.
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { ErrorNames } from "orthograph/server";
import { Handlers, Reads } from "#modules/handler/service.js";
import type { Handler } from "#modules/handler/types.js";
import { storeMemory } from "#modules/records/service.js";
import { Records } from "#modules/records/types.js";
import { BusyLive } from "#modules/work/service.js";
import { Mcp } from "./service.ts";

const Amount = Blueprint.value(Blueprint.uint(128));
const Person = Blueprint.thing({ description: "Someone.", fields: { id: Blueprint.id("per") } });
const Purse = Blueprint.thing({
  description: "Money.",
  fields: { id: Blueprint.id("pur"), member: Person.fields.id, spent: Amount, pin: Blueprint.visibility.secret(Blueprint.text({ max: 8 })) },
});
const holder = Blueprint.role(Purse, { rule: (p, who) => p.member === who.person });
const Balance = Blueprint.visibility.private(Amount, holder);
const TooMuch = Blueprint.error({ left: Amount, limit: Balance }, { exit: 41 });
ErrorNames.name(TooMuch, "TooMuch");
const spend = Blueprint.operation(Purse, {
  description: "Spend from a purse.",
  payload: { purse: Purse.fields.id, amount: Amount },
  answer: { spent: Amount, balance: Balance, pin: Blueprint.visibility.secret(Blueprint.text({ max: 8 })) },
  errors: [TooMuch],
  allowed: [holder, Blueprint.signedIn],
});
const unlock = Blueprint.operation(Purse, {
  description: "Unlock with the pin.", payload: { purse: Purse.fields.id, pin: Blueprint.visibility.secret(Blueprint.text({ max: 8 })) },
  answer: { spent: Amount }, allowed: [holder],
});
const get = Blueprint.read(Purse, { by: "id", fields: ["member", "spent", "pin"], allowed: [holder, Blueprint.signedIn] });
const spender: Handler<typeof spend, Records> = ({ amount }) =>
  amount > 100n ? Effect.fail(new TooMuch({ left: 7n, limit: 100n })) : Effect.succeed({ spent: amount, balance: 93n, pin: "1234" });

const olga = { kind: "person", person: "per_olga", via: "session" } as const;
const bob = { kind: "person", person: "per_bob", via: "session" } as const;
const memory = storeMemory([[Purse, { id: "pur_1", member: "per_olga", spent: 7n, pin: "1234" }]]);
const services = Layer.mergeAll(BusyLive, memory.layer);

const tools = Mcp.tools<never>({
  catalog: { "purse.spend": { description: "Spend from a purse.", operation: spend }, "purse.unlock": { description: "Unlock.", operation: unlock }, "purse.get": { description: "One purse.", operation: get } },
  served: { "purse.spend": Handlers.serve({ name: "purse.spend", operation: spend, handler: spender }), "purse.unlock": Handlers.serve({ name: "purse.unlock", operation: unlock, handler: () => Effect.succeed({ spent: 1n }) }), "purse.get": Reads.serve({ name: "purse.get", read: get }) } as never,
  refusals: { codes: { TooMuch: "PU-001", NotAllowed: "AR-001" }, declared: { TooMuch } },
});
const tool = (name: string) => tools.find((t) => t.name === name)!;
const call = (name: string, args: Record<string, unknown>, who: typeof olga | typeof bob | { kind: "anonymous" }) =>
  Effect.runPromise(tool(name).call(args, who).pipe(Effect.provide(services)));

describe("the MCP tools", () => {
  it("are one per operation and read, with the declaration's own input and only its public fields", () => {
    expect(tools.map((t) => [t.name, t.readOnly])).toEqual([["purse.spend", false], ["purse.unlock", false], ["purse.get", true]]);
    expect(tool("purse.spend").input).toMatchObject({ type: "object", required: ["purse", "amount"], additionalProperties: false });
    // The secret `pin` is not an input.
    expect(Object.keys((tool("purse.unlock").input as { properties: object }).properties)).toEqual(["purse"]);
  });

  it("answer with the public fields, and a private one only to a caller who holds its role; a secret never", async () => {
    const asOlga = await call("purse.spend", { purse: "pur_1", amount: "10" }, olga);
    expect(asOlga).toEqual({ isError: false, text: '{"spent":"10","balance":"93"}', structured: { spent: "10", balance: "93" } });
    const asBob = await call("purse.spend", { purse: "pur_1", amount: "10" }, bob);
    expect(asBob.text).toBe('{"spent":"10"}');
    expect((await call("purse.get", { id: "pur_1" }, olga)).text).toBe('{"member":"per_olga","spent":"7"}');
  });

  it("refuse with the refusal's code, and show a refusal's private field only to the role", async () => {
    expect(await call("purse.spend", { purse: "pur_1", amount: "101" }, olga)).toEqual({ isError: true, text: "[PU-001] TooMuch { left: 7, limit: 100 }" });
    expect(await call("purse.spend", { purse: "pur_1", amount: "101" }, bob)).toEqual({ isError: true, text: "[PU-001] TooMuch { left: 7 }" });
  });

  it("run the API's role check: no role, no answer", async () => {
    expect(await call("purse.get", { id: "pur_1" }, { kind: "anonymous" })).toEqual({ isError: true, text: "[AR-001] NotAllowed" });
  });

  it("take no secret input, and refuse what isn't a payload", async () => {
    // Naming the secret anyway changes nothing: it is taken out before the call, so the call lacks it.
    expect((await call("purse.unlock", { purse: "pur_1", pin: "1234" }, olga)).text).toMatch(/^InvalidPayload: /);
    expect((await call("purse.spend", { purse: "pur_1" }, olga)).text).toMatch(/^InvalidPayload: /);
  });

  it("answer MCP over HTTP, stateless: tools/list names every tool", async () => {
    const response = await Mcp.handle({
      name: "purse", version: "0.0.0", tools, principal: olga, run: (effect) => Effect.runPromise(effect.pipe(Effect.provide(services))),
    }, new Request("http://mcp.test/mcp", {
      method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    }));
    const body = (await response.json()) as { result: { tools: ReadonlyArray<{ name: string; annotations?: { readOnlyHint?: boolean } }> } };
    expect(body.result.tools.map((t) => [t.name, t.annotations?.readOnlyHint ?? false])).toEqual([["purse.spend", false], ["purse.unlock", false], ["purse.get", true]]);
  });
});

describe("an MCP refusal's structured form", () => {
  it("keeps the table's refusal, code, exit and status when the error has fields of those names", async () => {
    const Clash = Blueprint.error({ exit: Amount, status: Blueprint.text(), refusal: Blueprint.text() }, { exit: 42 });
    ErrorNames.name(Clash, "Clash");
    const clash = Blueprint.operation(Purse, { description: "Always refuses.", payload: { purse: Purse.fields.id }, answer: {}, errors: [Clash], allowed: [Blueprint.signedIn] });
    const refuser: Handler<typeof clash> = () => Effect.fail(new Clash({ exit: 9n, status: "odd", refusal: "other" }));
    const [only] = Mcp.tools<never>({
      catalog: { "purse.clash": { description: "Always refuses.", operation: clash } },
      served: { "purse.clash": Handlers.serve({ name: "purse.clash", operation: clash, handler: refuser }) } as never,
      refusals: { codes: { Clash: "PU-002" }, declared: { Clash }, table: { Clash: { code: "PU-002", exit: 42, status: 422 } } } as never,
    });
    const result = await Effect.runPromise(only!.call({ purse: "pur_1" }, olga as never).pipe(Effect.provide(services)));
    expect(result.structured).toEqual({ refusal: "Clash", code: "PU-002", exit: 42, status: 422 });
  });
});
