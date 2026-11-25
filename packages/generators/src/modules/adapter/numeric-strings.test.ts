// #975, finding 1: a numeric string is held to its field's rules. The generated client lets a field the spec types as a
// number or an integer be given as the numeric string a service gives and wants (Slack's `ts`): digits, with a fraction
// or not. That string is judged as the number it spells, against every rule of the field: an integer field refuses a
// fraction (`5.0` spells 5, a whole number), and `minimum`, `maximum`, `exclusiveMinimum` and `exclusiveMaximum` (as a
// number, OpenAPI 3.1, beside `minimum`/`maximum` or alone; or as a flag on the bound, 3.0, true or false, on one side or
// both) and `enum` hold, exactly (no slack for floats), on a required field or an optional one, in the
// path, the query and the body. A string its number would be refused for is refused before anything is sent, naming the
// field. A string that fits is sent as given, character for character (`007` stays `007`). Any other string on a numeric
// field (`abc`, `0x10`, `1e2`, `-1`, `5.`, `.5`, `+5`, an empty string, a space or a newline around the digits) is refused as
// it is today. Numbers given as numbers are the control. Each call is
// judged on its own, every numeric string of it: one client takes every case below in turn, and two calls' fields of
// one name keep their own rules. Written by the checks author before the build; red on
// today's generator, listed in packages/generators/expected-failing/numeric-strings.txt (G11).
//
// Not judged here: a string with a sign on a field that allows a negative number. Today a sign makes the string not
// numeric, so `-1` is refused as text; every field below refuses a negative number anyway.
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { callAt, plugin, removePlugins, settle, standIn, wire, type Calls, type Node, type StandIn } from "./testing.ts";

afterAll(removePlugins);
const servers: Array<StandIn> = [];
afterEach(() => { for (const s of servers.splice(0)) s.close(); });
const serve = () => standIn(() => ({ status: 200, body: {} })).then((s) => { servers.push(s); return s; });

const ok = { "200": { description: "ok", content: { "application/json": { schema: { type: "object" } } } } };
const limit = { type: "integer", minimum: 1, maximum: 100 };
const offset = { type: "integer", minimum: 0, maximum: 10 };
const level = { type: "integer", enum: [1, 2, 3] };
const kind = { type: "integer", enum: [1, 2] };
const few = { type: "integer", minimum: 1, maximum: 10 };
// 3.0's flag set to false (an inclusive bound), 3.1's minimum beside its exclusiveMinimum, one flag on one side, a maximum of 0
const floor = { type: "integer", minimum: 0, exclusiveMinimum: false, maximum: 10 };
const both = { type: "number", minimum: 5, exclusiveMinimum: 0 };
const top = { type: "integer", minimum: 0, maximum: 10, exclusiveMaximum: true };
const cap = { type: "number", maximum: 0 };
const share = { type: "number", minimum: 0.5, exclusiveMaximum: 2 };
const weight = { type: "number", exclusiveMinimum: 0, maximum: 10 };
const ratio = { type: "number", minimum: 0, exclusiveMinimum: true, maximum: 1, exclusiveMaximum: true };
const spec = {
  openapi: "3.0.2", info: { title: "T", version: "1" },
  paths: {
    "/pages": { get: { operationId: "pages/list", responses: ok, parameters: [
      { name: "limit", in: "query", required: true, schema: limit }, { name: "offset", in: "query", required: false, schema: offset },
      { name: "tier", in: "query", required: false, schema: level },
    ] } },
    // a field of the same name as pages.list's, under another rule
    "/samples": { get: { operationId: "samples/list", responses: ok, parameters: [{ name: "limit", in: "query", required: true, schema: few }] } },
    "/levels/{level}": { get: { operationId: "levels/get", responses: ok, parameters: [{ name: "level", in: "path", required: true, schema: level }] } },
    "/splits": { post: { operationId: "splits/create", responses: ok, requestBody: { required: true, content: { "application/json": { schema: {
      type: "object", required: ["count", "share"], properties: { count: limit, share, weight, ratio, kind, floor, both, top, cap },
    } } } } } },
  },
};
/** A request as these checks judge it: its headers are another check's (gaps.test.ts). */
const sansHeaders = ({ method, path, query, body }: ReturnType<typeof wire>) => ({ method, path, query, body });
const clientAt = async (s: StandIn) => {
  const calls = (await plugin("t", spec)).client({ baseUrl: s.origin }).calls as Calls;
  return (name: string) => {
    const c = callAt(calls, name);
    expect(c, `the client has a call ${name}`).toBeDefined();
    return c!;
  };
};
/** The input of a call with `field` set to `value`: a body's required fields are filled with numbers that fit. */
const fill = (name: string, field: string, value: unknown): Node =>
  name === "splits.create" ? { count: 5, share: 1, [field]: value } : name === "pages.list" && field !== "limit" ? { limit: 5, [field]: value } : { [field]: value };

// [call, field, the string given, why it is refused], each read off the schemas above, never off what the client does with it
const REFUSED: ReadonlyArray<readonly [string, string, string, string]> = [
  ["pages.list", "limit", "0", "under the minimum 1 (query)"],
  ["pages.list", "limit", "101", "over the maximum 100 (query)"],
  ["pages.list", "limit", "1000", "far over the maximum (query)"],
  ["pages.list", "limit", "1.5", "not a whole number (query)"],
  ["pages.list", "limit", "50.5", "not a whole number, in range (query)"],
  ["pages.list", "offset", "11", "over the maximum 10, an optional field (query)"],
  ["pages.list", "offset", "0.5", "not a whole number, an optional field (query)"],
  ["pages.list", "tier", "4", "not in the enum (query)"],
  ["samples.list", "limit", "50", "over this call's maximum 10, though pages.list's limit takes 50 (query)"],
  ["levels.get", "level", "4", "not in the enum (path)"],
  ["levels.get", "level", "0", "not in the enum (path)"],
  ["levels.get", "level", "2.5", "not a whole number (path)"],
  ["splits.create", "count", "0", "under the minimum 1 (body)"],
  ["splits.create", "count", "101", "over the maximum 100 (body)"],
  ["splits.create", "count", "7.25", "not a whole number (body)"],
  ["splits.create", "share", "0.25", "under the minimum 0.5, a number field (body)"],
  ["splits.create", "share", "2", "not under the exclusive maximum 2 (body)"],
  ["splits.create", "weight", "0", "not over the exclusive minimum 0, as 3.1 writes it (body)"],
  ["splits.create", "weight", "10.5", "over the maximum 10, an optional field (body)"],
  ["splits.create", "ratio", "0", "not over the minimum 0, with 3.0's exclusiveMinimum flag (body)"],
  ["splits.create", "ratio", "1", "not under the maximum 1, with 3.0's exclusiveMaximum flag (body)"],
  ["splits.create", "kind", "3", "not in the enum (body)"],
  ["pages.list", "limit", "5.0000001", "not a whole number, however near (query)"],
  ["splits.create", "share", "0.4999999", "under the minimum 0.5, however near (body)"],
  ["splits.create", "share", "2.0000001", "over the exclusive maximum 2, however near (body)"],
  ["splits.create", "both", "3", "under the minimum 5, beside 3.1's exclusiveMinimum 0 (body)"],
  ["splits.create", "top", "10", "not under the maximum 10, with 3.0's exclusiveMaximum flag alone (body)"],
  ["splits.create", "cap", "0.5", "over the maximum 0 (body)"],
];
// [call, field, a string that is no number as the client reads one]: refused today, and refused after the build
const NOT_NUMBERS: ReadonlyArray<readonly [string, string, string]> = [
  ["pages.list", "limit", "abc"], ["pages.list", "limit", "0x10"], ["pages.list", "limit", "1e2"], ["pages.list", "limit", " 5"],
  ["pages.list", "limit", ""], ["pages.list", "limit", "-1"],
  ["pages.list", "limit", "5."], ["pages.list", "limit", ".5"], ["pages.list", "limit", "+5"], ["pages.list", "limit", "5\n"], ["splits.create", "share", ".75"], ["levels.get", "level", "0x2"], ["splits.create", "count", "5 "],
];
// [call, input, the request the stand-in sees]: the path's and the query's text as given, the body's JSON as given
const SENT: ReadonlyArray<readonly [string, Node, Node]> = [
  ["pages.list", { limit: "1" }, { method: "GET", path: "/pages", query: "?limit=1", body: undefined }],
  ["pages.list", { limit: "100" }, { method: "GET", path: "/pages", query: "?limit=100", body: undefined }],
  ["pages.list", { limit: "9" }, { method: "GET", path: "/pages", query: "?limit=9", body: undefined }],
  ["pages.list", { limit: "20", offset: "10" }, { method: "GET", path: "/pages", query: "?limit=20&offset=10", body: undefined }],
  ["pages.list", { limit: "007", offset: "0" }, { method: "GET", path: "/pages", query: "?limit=007&offset=0", body: undefined }],
  ["pages.list", { limit: "5.0" }, { method: "GET", path: "/pages", query: "?limit=5.0", body: undefined }],
  ["pages.list", { limit: 42 }, { method: "GET", path: "/pages", query: "?limit=42", body: undefined }],
  ["pages.list", { limit: "00000000005", tier: "2" }, { method: "GET", path: "/pages", query: "?limit=00000000005&tier=2", body: undefined }],
  ["samples.list", { limit: "10" }, { method: "GET", path: "/samples", query: "?limit=10", body: undefined }],
  ["pages.list", { limit: "5.00" }, { method: "GET", path: "/pages", query: "?limit=5.00", body: undefined }],
  ["splits.create", { count: "1", share: "1.9999999", floor: "0", both: "6", top: "0", cap: "0" }, { method: "POST", path: "/splits", query: "", body: { count: "1", share: "1.9999999", floor: "0", both: "6", top: "0", cap: "0" } }],
  ["levels.get", { level: "3" }, { method: "GET", path: "/levels/3", query: "", body: undefined }],
  ["levels.get", { level: "02" }, { method: "GET", path: "/levels/02", query: "", body: undefined }],
  ["levels.get", { level: 1 }, { method: "GET", path: "/levels/1", query: "", body: undefined }],
  ["splits.create", { count: "100", share: "0.5" }, { method: "POST", path: "/splits", query: "", body: { count: "100", share: "0.5" } }],
  ["splits.create", { count: "9", share: "1.99", weight: "0.01", ratio: "0.5" }, { method: "POST", path: "/splits", query: "", body: { count: "9", share: "1.99", weight: "0.01", ratio: "0.5" } }],
  ["splits.create", { count: "1", share: "1.50", weight: "10", ratio: "0.999" }, { method: "POST", path: "/splits", query: "", body: { count: "1", share: "1.50", weight: "10", ratio: "0.999" } }],
  ["splits.create", { count: "2", share: "1.123456789012", kind: "2" }, { method: "POST", path: "/splits", query: "", body: { count: "2", share: "1.123456789012", kind: "2" } }],
  ["splits.create", { count: 7, share: 1.25, weight: 3, ratio: 0.25 }, { method: "POST", path: "/splits", query: "", body: { count: 7, share: 1.25, weight: 3, ratio: 0.25 } }],
];

describe("a numeric string is refused before sending where its number would be", () => {
  for (const [name, field, value, why] of REFUSED) {
    it(`${name} ${field} = ${JSON.stringify(value)}: ${why}`, async () => {
      const s = await serve();
      const call = await clientAt(s);
      const asNumber = await settle(call(name)(fill(name, field, Number(value))));
      expect(asNumber.tag, "the number itself is refused (the control: the spec refuses this value)").toBe("InputRefused");
      const asString = await settle(call(name)(fill(name, field, value)));
      expect(asString.tag, "the numeric string is refused as its number is").toBe("InputRefused");
      expect((asString.failure?.["problems"] as ReadonlyArray<string> | undefined)?.join("\n") ?? "", "the refusal names the field").toContain(field);
      expect(s.seen, "nothing reached the service").toEqual([]);
    });
  }

  it("every numeric string of a call is judged, not only one of them", async () => {
    const s = await serve();
    const call = await clientAt(s);
    for (const [name, input] of [
      ["pages.list", { limit: "0", offset: "5" }], ["pages.list", { limit: "5", offset: "11" }], ["pages.list", { limit: "0", offset: "11" }],
      // one string, two fields: it fits limit and not offset
      ["pages.list", { limit: "50", offset: "50" }], ["pages.list", { offset: "50", limit: "50" }],
      ["splits.create", { count: "0", share: "1.5" }], ["splits.create", { count: "5", share: "3" }],
    ] as const) {
      expect((await settle(call(name)(input))).tag, JSON.stringify(input)).toBe("InputRefused");
    }
    expect(s.seen, "nothing reached the service").toEqual([]);
  });

  it("a string that is no number is refused on a numeric field, as today (a guard)", async () => {
    const s = await serve();
    const call = await clientAt(s);
    for (const [name, field, value] of NOT_NUMBERS) {
      const r = await settle(call(name)(fill(name, field, value)));
      expect(r.tag, `${name} ${field} = ${JSON.stringify(value)}`).toBe("InputRefused");
    }
    expect(s.seen, "nothing reached the service").toEqual([]);
  });
});

describe("a numeric string that fits is sent as given (the control)", () => {
  for (const [name, input, request] of SENT) {
    it(`${name} ${JSON.stringify(input)}`, async () => {
      const s = await serve();
      expect((await settle((await clientAt(s))(name)(input))).tag).toBe("ok");
      expect(s.seen.map(wire).map(sansHeaders)).toEqual([request]);
    });
  }
});

describe("one client judges each call on its own", () => {
  it("takes every case above in turn, alternating fits and misfits, and sends exactly the ones that fit", async () => {
    const s = await serve();
    const call = await clientAt(s);
    const sent: Array<Node> = [];
    const turns = Math.max(REFUSED.length, SENT.length);
    for (let i = 0; i < turns; i++) {
      const fits = SENT[i];
      if (fits !== undefined) {
        expect((await settle(call(fits[0])(fits[1]))).tag, JSON.stringify(fits[1])).toBe("ok");
        sent.push(fits[2]);
      }
      // the same strings again, now on a field they don't fit, then the misfit of this turn
      const misfit = REFUSED[i];
      if (misfit !== undefined) {
        expect((await settle(call(misfit[0])(fill(misfit[0], misfit[1], misfit[2])))).tag, `${misfit[1]} = ${misfit[2]}`).toBe("InputRefused");
      }
      expect((await settle(call("pages.list")({ limit: "5", offset: "50" }))).tag, "offset 50, after limit 50 or 5 fit elsewhere").toBe("InputRefused");
      // one name, two rules: pages.list's limit takes 50, samples.list's doesn't, in either order
      expect((await settle(call("pages.list")({ limit: "50" }))).tag, "pages.list limit 50").toBe("ok");
      sent.push({ method: "GET", path: "/pages", query: "?limit=50", body: undefined });
      expect((await settle(call("samples.list")({ limit: "50" }))).tag, "samples.list limit 50").toBe("InputRefused");
    }
    expect(s.seen.map(wire).map(sansHeaders)).toEqual(sent);
  });
});
