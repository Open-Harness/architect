// #975, finding 2: a filter on a derived field compares values, not identity. A read's `where` (the caller's filter, decoded
// from the wire) and its `only` (the read's own pin) on a derived field keep exactly the rows whose worked-out value equals
// it, whatever the field holds: text, a boolean, a list, an object, an exact decimal, and those nested (a list of objects
// holding decimals). Two values are equal when the field's schema writes them as the same wire value: a list item by item
// in order (of text or of objects), an object key by key whatever the order of its keys and with only the keys its schema
// declares, a decimal digit by digit. A row that works out no value
// for an optional field never matches a filter on it, nor an empty one. Text compares exactly: no trimming, no case or
// Unicode folding. Each call works every row out afresh. Text and booleans, already compared by value, are the controls.
// Written by the checks author before the build; red on today's handler, listed in
// packages/language-effect/expected-failing/derived-equal.txt (G11). The builder never edits this file and only removes
// lines from that list.
//
// Not judged here: whether `1.5` and `1.50` are one value. The records layer compares a stored decimal by its encoded
// text, scale and all; every decimal below is written at one scale only, so no two of them differ by scale alone.
import { Cause, Effect, Exit, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { Reads } from "#modules/handler/service.js";
import { storeMemory } from "#modules/records/service.js";

const Shop = Blueprint.thing({ description: "A shop.", fields: { id: Blueprint.id("shp"), name: Blueprint.text() } });
const who = { kind: "person", person: "per_olga", via: "session" } as const;
// In the order they were made. Two shops are called ada, so a value two rows share is kept for both.
const SHOPS: ReadonlyArray<readonly [string, string]> = [["shp_1", "ada"], ["shp_2", "bob"], ["shp_3", "cy"], ["shp_4", "ada"], ["shp_5", "dee"], ["shp_6", "eve"]];
const stocked = () => storeMemory(SHOPS.map(([id, name]) => [Shop, { id, name }] as const));

const decimal = Blueprint.decimal({ places: 2 });
const Place = Schema.Struct({ city: Schema.String, zip: Schema.String });
const Line = Schema.Struct({ sku: Schema.String, qty: decimal.schema });
const adds = {
  tags: Blueprint.list(Blueprint.text()),
  place: Blueprint.value(Place),
  lines: Blueprint.list(Blueprint.value(Line)),
  rates: Blueprint.list(decimal),
  rate: decimal,
  label: Blueprint.text(),
  open: Blueprint.bool(),
  nick: Blueprint.optional(Blueprint.text()),
};
type Field = keyof typeof adds;
const FIELDS = Object.keys(adds) as ReadonlyArray<Field>;

// What each shop works out, as the wire writes it (a decimal as its text). The derive makes it afresh on every call, so no
// two rows ever hold the same object, and keeps each object's keys in the order written here, as code would: dee's place
// and eve's lines hold theirs in another order than the schema's. Bob and dee work out no nick.
const WORKED: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  ada: { tags: ["x", "y"], place: { city: "Accra", zip: "00233" }, lines: [{ sku: "a", qty: "1.50" }], rates: ["1.50"], rate: "1.50", label: "Ada", open: true, nick: "m" },
  bob: { tags: ["x"], place: { city: "Accra", zip: "00234" }, lines: [{ sku: "a", qty: "2.25" }], rates: ["2.25"], rate: "2.25", label: "bob", open: false },
  cy: { tags: ["y", "x"], place: { city: "Lagos", zip: "00233" }, lines: [{ sku: "b", qty: "1.50" }], rates: ["1.50", "2.25"], rate: "0.15", label: "ﬁve", open: false, nick: "m" },
  dee: { tags: ["x,y"], place: { zip: "00233", city: "Accra" }, lines: [], rates: ["2.25"], rate: "900719925474099.31", label: "café", open: true },
  eve: { tags: ["a", "b", "c"], place: { city: "Lagos", zip: "00234" }, lines: [{ qty: "1.50", sku: "a" }, { qty: "1.50", sku: "b" }], rates: [], rate: "1.55", label: "Eve", open: false, nick: "n" },
};
const toDecimal = Schema.decodeUnknownSync(decimal.schema as unknown as Schema.Decoder<unknown>);
/** A wire value as code holds it: each decimal made from its text, every other value copied, each object's keys in their order. */
const asCode = (field: string, wire: unknown): unknown =>
  field === "rate" ? toDecimal(wire)
  : field === "rates" ? (wire as ReadonlyArray<unknown>).map((v) => toDecimal(v))
  : field === "lines" ? (wire as ReadonlyArray<Readonly<Record<string, unknown>>>).map((line) => Object.fromEntries(Object.entries(line).map(([k, v]) => [k, k === "qty" ? toDecimal(v) : v])))
  : JSON.parse(JSON.stringify(wire));
// A label a test sets for one shop between two calls: the derive works each row out afresh, so the next call sees it.
const relabelled: Record<string, string> = {};
const Worked = Blueprint.derive(Shop, {
  looks: {},
  adds,
  is: (root) => {
    const name = (root as { name: string }).name;
    const row: Record<string, unknown> = Object.fromEntries(Object.entries(WORKED[name]!).map(([k, v]) => [k, asCode(k, v)]));
    // eve's place holds a key its schema doesn't declare: the wire never writes it, so it is no part of the value
    if (name === "eve") row["place"] = { ...(row["place"] as object), note: "kept in code" };
    return (relabelled[name] === undefined ? row : { ...row, label: relabelled[name] }) as never;
  },
});

const listOf = (only?: Readonly<Record<string, unknown>>) =>
  Reads.serve({ name: "shop.worked", read: Blueprint.read(Shop, { where: [...FIELDS], ...(only === undefined ? {} : { only }), derive: Worked, order: "oldest", page: 10, allowed: [Blueprint.signedIn] }) } as never);
/** The ids a list keeps, called as the API calls it: the payload as it came on the wire, decoded by the read's own schema. */
const ids = async (served: ReturnType<typeof Reads.serve>, raw: Readonly<Record<string, unknown>>, store = stocked()) => {
  const exit = await Effect.runPromiseExit(served.call(raw, who).pipe(Effect.provide(store.layer)));
  if (Exit.isFailure(exit)) return `refused: ${String(Cause.squash(exit.cause))}`;
  return (exit.value as { items: ReadonlyArray<Record<string, unknown>> }).items.map((i) => i["id"]);
};

// The oracle, written apart from the handler: two wire values are equal when they read the same with every object's keys sorted.
const sorted = (x: unknown): unknown =>
  Array.isArray(x) ? x.map(sorted) : typeof x === "object" && x !== null ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sorted((x as Record<string, unknown>)[k])])) : x;
const same = (a: unknown, b: unknown) => a !== undefined && JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
const expected = (filter: Readonly<Record<string, unknown>>) =>
  SHOPS.filter(([, name]) => Object.entries(filter).every(([k, v]) => same(WORKED[name]![k], v))).map(([id]) => id);

// One read serves every call below, so a build that keeps a filter from one call to the next is caught.
const shared = listOf();

describe("a caller's filter on a derived field keeps exactly the rows whose value equals it", () => {
  // [what, the filter as the wire gives it, the ids, read off WORKED by hand]
  const cases: ReadonlyArray<readonly [string, Record<string, unknown>, ReadonlyArray<string>]> = [
    ["text (the control)", { label: "Ada" }, ["shp_1", "shp_4"]],
    ["text in another case (the control)", { label: "ada" }, []],
    ["text with spaces around it", { label: " Ada " }, []],
    ["text the same as dee's but for how its accent is written (e and a combining accent)", { label: "cafe\u0301" }, []],
    ["text that only looks like a shop's (fi, where cy works out the ligature ﬁ)", { label: "five" }, []],
    ["a list of one text holding a NUL", { tags: ["x\u0000y"] }, []],
    ["a boolean, false (the control)", { open: false }, ["shp_2", "shp_3", "shp_6"]],
    ["a list, equal", { tags: ["x", "y"] }, ["shp_1", "shp_4"]],
    ["a list, the same items in another order", { tags: ["y", "x"] }, ["shp_3"]],
    ["a list of one text holding a comma", { tags: ["x,y"] }, ["shp_5"]],
    ["a list, longer than any", { tags: ["x", "y", "z"] }, []],
    ["a list of three, its middle item different", { tags: ["a", "z", "c"] }, []],
    ["a list, empty", { tags: [] }, []],
    ["an object, equal, its keys in another order than two rows hold them", { place: { zip: "00233", city: "Accra" } }, ["shp_1", "shp_4", "shp_5"]],
    ["an object, one field different", { place: { city: "Lagos", zip: "00235" } }, []],
    ["an object, its values under each other's keys", { place: { city: "00233", zip: "Accra" } }, []],
    ["an object, equal to what the wire writes of a value holding an undeclared key", { place: { city: "Lagos", zip: "00234" } }, ["shp_6"]],
    ["a list of objects holding decimals, equal", { lines: [{ sku: "a", qty: "1.50" }] }, ["shp_1", "shp_4"]],
    ["a list of objects, one decimal different", { lines: [{ sku: "a", qty: "2.26" }] }, []],
    ["a list of objects, empty", { lines: [] }, ["shp_5"]],
    ["a list of objects, the same items in another order", { lines: [{ qty: "1.50", sku: "b" }, { qty: "1.50", sku: "a" }] }, []],
    ["a list of decimals, equal", { rates: ["1.50", "2.25"] }, ["shp_3"]],
    ["a list of decimals, empty", { rates: [] }, ["shp_6"]],
    ["a decimal, equal", { rate: "1.50" }, ["shp_1", "shp_4"]],
    ["a decimal with its digits shifted (the same unscaled digits as 2.25)", { rate: "22.5" }, []],
    ["a decimal too long for a float, equal", { rate: "900719925474099.31" }, ["shp_5"]],
    ["a decimal too long for a float, one cent off", { rate: "900719925474099.30" }, []],
    ["an optional field that two shops work out no value for", { nick: "m" }, ["shp_1", "shp_3", "shp_4"]],
    ["two filters at once, both equal", { tags: ["x", "y"], rate: "1.50" }, ["shp_1", "shp_4"]],
    ["two filters at once, one unequal", { tags: ["x", "y"], rate: "2.25" }, []],
  ];
  for (const [what, filter, kept] of cases) {
    it(`${what}: ${JSON.stringify(filter)}`, async () => {
      expect(kept, "the hand-read ids agree with the oracle").toEqual(expected(filter));
      expect(await ids(shared, filter)).toEqual(kept);
    });
  }

  // Every shop's own value of every field, as a filter: the rows kept are exactly those whose value the oracle calls the same.
  for (const field of FIELDS) {
    it(`each shop's own ${field} keeps exactly the shops that work out the same ${field}`, async () => {
      for (const [, name] of SHOPS) {
        const value = WORKED[name]![field];
        if (value === undefined) continue;
        expect(await ids(shared, { [field]: value }), `${field} = ${JSON.stringify(value)}`).toEqual(expected({ [field]: value }));
      }
    });
  }
});

describe("one read works each row out on each call", () => {
  it("keeps the rows whose value equals the filter now, after a row's value changed between two calls on one store", async () => {
    const store = stocked();
    expect(await ids(shared, { label: "Ann" }, store), "before: no shop is Ann").toEqual([]);
    relabelled["ada"] = "Ann";
    try {
      expect(await ids(shared, { label: "Ann" }, store), "after ada became Ann").toEqual(["shp_1", "shp_4"]);
      expect(await ids(shared, { label: "Ada" }, store), "and is no longer Ada").toEqual([]);
    } finally {
      delete relabelled["ada"];
    }
    expect(await ids(shared, { label: "Ada" }, store), "back again").toEqual(["shp_1", "shp_4"]);
  });
});

describe("a read's `only` on a derived field pins exactly the rows whose value equals it", () => {
  // [what, the pinned field, the pin as the wire writes it (code pins it as `asCode` makes it, keys in the order written), the same field as a caller might send it otherwise]
  const pins: ReadonlyArray<readonly [string, Field, unknown, unknown]> = [
    ["text (the control)", "label", "bob", "Ada"],
    ["a list", "tags", ["x", "y"], ["x"]],
    ["an object", "place", { zip: "00233", city: "Lagos" }, { city: "Accra", zip: "00233" }],
    ["a list of objects holding decimals, keys in another order than the schema's", "lines", [{ qty: "1.50", sku: "b" }], [{ sku: "a", qty: "1.50" }]],
    ["a decimal", "rate", "2.25", "1.50"],
    ["a list no shop works out", "tags", ["x", "x"], ["x", "y"]],
  ];
  for (const [what, field, wire, other] of pins) {
    it(`${what}: whatever the caller sends`, async () => {
      const pinned = listOf({ [field]: asCode(field, wire) });
      expect(await ids(pinned, {}), "no filter from the caller").toEqual(expected({ [field]: wire }));
      expect(await ids(pinned, { [field]: other }), "the caller's filter on the pinned field is not theirs to set").toEqual(expected({ [field]: wire }));
    });
  }

  it("an object that is only part of every shop's place pins no row", async () => {
    // Code can pin what the wire would refuse: a place with no zip. No shop works out that place, so no row is kept.
    expect(await ids(listOf({ place: { city: "Accra" } }), {})).toEqual([]);
    expect(await ids(listOf({ lines: [{ sku: "a" }] }), {}), "inside a list too").toEqual([]);
    expect(await ids(listOf({ tags: "x" }), {}), "an item is not the list of it").toEqual([]);
  });

  it("an empty text pins no row, not the rows that work out no value", async () => {
    expect(await ids(listOf({ nick: "" }), {})).toEqual([]);
  });
});
