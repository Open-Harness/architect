// L2.04: a read that lists. Filters by the fields it is given, in the order the rows were made, a page at a time, with its
// role decided on the thing a filter names.
import { Cause, Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { Reads } from "#modules/handler/service.js";
import { storeMemory } from "./service.ts";

const Amount = Blueprint.value(Blueprint.uint(128));
const Person = Blueprint.thing({ description: "Someone.", fields: { id: Blueprint.id("per") } });
const Purse = Blueprint.thing({ description: "Money.", fields: { id: Blueprint.id("pur"), member: Person.fields.id, spent: Amount } });
const self = Blueprint.role(Person, { rule: (p, who) => p.id === who.person });
type Who = { readonly kind: "person"; readonly person: string; readonly via: "session" };
const olga: Who = { kind: "person", person: "per_olga", via: "session" };
const bob: Who = { kind: "person", person: "per_bob", via: "session" };

const purses = ["pur_1", "pur_2", "pur_3", "pur_4", "pur_5"].map(
  (id, i) => [Purse, { id, member: i === 2 ? "per_bob" : "per_olga", spent: BigInt(i), state: i === 4 ? "closed" : "active" }] as const,
);
const stocked = () => storeMemory([[Person, { id: "per_olga" }], [Person, { id: "per_bob" }], ...purses]);
const list = (order: "newest" | "oldest", page: number) =>
  Reads.serve({ name: "purse.list", read: Blueprint.read(Purse, { where: ["member", "state"], order, page, allowed: [self.of("member")] }) });

type Page = { items: Array<{ id: string }>; next: string | null };
const page = (served: ReturnType<typeof list>, payload: Record<string, unknown>, who: Who = olga) =>
  Effect.runPromise(served.run(payload, who).pipe(Effect.provide(stocked().layer))) as unknown as Promise<Page>;
const ids = (p: Page) => p.items.map((i) => i.id);
const refused = async (served: ReturnType<typeof list>, payload: Record<string, unknown>, who: Who = olga) => {
  const exit = await Effect.runPromiseExit(served.run(payload, who).pipe(Effect.provide(stocked().layer)));
  return Exit.isFailure(exit) && Cause.squash(exit.cause);
};

describe("a list read", () => {
  it("filters by the fields it is given, in the order the rows were made, a page at a time", async () => {
    const newest = list("newest", 2);
    const first = await page(newest, { member: "per_olga" });
    expect(ids(first)).toEqual(["pur_5", "pur_4"]);
    expect(first.items[0]).toMatchObject({ member: "per_olga", spent: 4n, state: "closed" });
    expect(first.next).not.toBeNull();
    const second = await page(newest, { member: "per_olga", cursor: first.next });
    expect(ids(second)).toEqual(["pur_2", "pur_1"]);
    expect(second.next).toBeNull();
    expect(ids(await page(list("oldest", 2), { member: "per_olga" }))).toEqual(["pur_1", "pur_2"]);
    expect(ids(await page(newest, { member: "per_olga", state: "active" }))).toEqual(["pur_4", "pur_2"]);
  });

  it("is refused to someone the role does not allow, and when the filter the role is decided on is left out", async () => {
    for (const [who, payload] of [[bob, { member: "per_olga" }], [olga, {}], [olga, { member: "per_bob" }]] as const) {
      expect(await refused(list("newest", 2), payload, who)).toMatchObject({ _tag: "NotAllowed" });
    }
  });

  it("refuses a cursor it did not hand out", async () => {
    expect(await refused(list("newest", 2), { member: "per_olga", cursor: "1; drop" })).toMatchObject({ _tag: "NotAllowed" });
  });
});
