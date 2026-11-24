// #739's gaps 4 and 5, on small descriptions written here (gaps 1 to 3 are gaps.test.ts's). Written by #739's checks
// author before the build; red on today's generator, listed in packages/generators/expected-failing/bodies-and-answers.txt
// (G11). The contract:
//   4. A `oneOf` or `anyOf` request body takes the fields of any of its alternatives, sent in the body as given, and the
//      input is judged against the whole body schema, so it is refused before sending when it fits none.
//   5. `client({ ..., answers: "lenient", onMisfit })` returns an answer it would otherwise refuse as `AnswerRefused`,
//      a JSON body that misfits its status's schema or a 2xx status the operation doesn't document, as it came, and calls
//      `onMisfit({ call, status, problems })` exactly once for it, with every problem found. Without `answers`, with
//      `answers: "strict"`, or with only `onMisfit`, such an answer is `AnswerRefused` and `onMisfit` is never called.
//      Lenient is for answers only: inputs are refused and failures fail as before.
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { callAt, plugin, removePlugins, settle, standIn, wire, type Calls, type Node, type StandIn } from "./testing.ts";

afterAll(removePlugins);
const servers: Array<StandIn> = [];
afterEach(() => { for (const s of servers.splice(0)) s.close(); });
const answering = (list: Array<{ status: number; body: unknown }>) => standIn(() => list.shift() ?? { status: 500, body: {} }).then((s) => { servers.push(s); return s; });

const doc = (paths: Node, extra: Node = {}) => ({ openapi: "3.0.2", info: { title: "T", version: "1" }, paths, ...extra });
const ok = { "200": { description: "ok", content: { "application/json": { schema: { type: "object" } } } } };
const body = (schema: Node) => ({ requestBody: { required: true, content: { "application/json": { schema } } } });
const called = (calls: Calls, name: string) => {
  const call = callAt(calls, name);
  expect(call, `the client has a call ${name}`).toBeDefined();
  return call!;
};
const clientOf = (spec: unknown, s: StandIn, more: Node = {}) => plugin("t", spec).then((p) => p.client({ baseUrl: s.origin, ...more }).calls);

describe("4. a oneOf or anyOf request body takes the fields of its alternatives", () => {
  const kind = (k: string) => ({ type: "string", enum: [k] });
  const spec = doc({
    "/customers": { post: { responses: ok, ...body({
      oneOf: [{ $ref: "#/components/schemas/Person" }, { $ref: "#/components/schemas/Company" }],
      discriminator: { propertyName: "type", mapping: { individual: "#/components/schemas/Person", business: "#/components/schemas/Company" } },
    }) } },
    "/contacts": { post: { responses: ok, ...body({ anyOf: [{ type: "object", required: ["phone"], properties: { phone: { type: "string" } } }, { type: "object", required: ["email"], properties: { email: { type: "string" } } }] }) } },
  }, { components: { schemas: {
    Person: { type: "object", required: ["type"], properties: { type: kind("individual"), email: { type: "string" }, first_name: { type: "string" } } },
    Company: { type: "object", required: ["type", "business_legal_name"], properties: { type: kind("business"), email: { type: "string" }, business_legal_name: { type: "string" } } },
  } } });

  it("sends an input that fits any one alternative, in the body as given", async () => {
    const s = await answering([1, 2, 3, 4].map(() => ({ status: 200, body: {} })));
    const c = await clientOf(spec, s);
    const inputs: ReadonlyArray<readonly [string, string, Node]> = [
      ["customers.create", "/customers", { type: "individual", email: "ada@example.com" }],
      ["customers.create", "/customers", { type: "business", email: "ops@example.com", business_legal_name: "Acme Ltd" }],
      ["contacts.create", "/contacts", { phone: "1" }], ["contacts.create", "/contacts", { email: "a@b.c" }],
    ];
    for (const [name, , input] of inputs) expect((await settle(called(c, name)(input))).tag, JSON.stringify(input)).toBe("ok");
    expect(s.seen.map(wire)).toEqual(inputs.map(([, path, input]) => ({ method: "POST", path, query: "", headers: {}, body: input })));
  });

  it("refuses before sending an input that fits none, and a field no alternative has", async () => {
    const s = await answering([]);
    const c = await clientOf(spec, s);
    const wrong: ReadonlyArray<readonly [string, Node]> = [
      ["customers.create", { type: "robot", email: "r@example.com" }],
      ["customers.create", { type: "business", email: "ops@example.com" }],
      ["customers.create", { type: "individual", nickname: "Ada" }],
      ["contacts.create", {}],
    ];
    for (const [name, input] of wrong) expect((await settle(called(c, name)(input))).tag, JSON.stringify(input)).toBe("InputRefused");
    expect(s.seen).toEqual([]);
  });
});

describe("5. a lenient client reports an answer it would refuse, and still returns it", () => {
  const transfer = { type: "object", required: ["id", "currency"], properties: { id: { type: "string" }, currency: { type: "string" } } };
  const spec = doc({ "/transfers/{transferID}": { get: { parameters: [{ name: "transferID", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "ok", content: { "application/json": { schema: transfer } } } } } } });
  // two problems, each named by its field: currency missing, and id a number
  const misfit = { id: 5, amount: "10.0", receipt: { fee: "0.1" } };
  const fits = { id: "t2", currency: "usd" };

  it.each<[Node]>([[{}], [{ answers: "strict" }], [{ onMisfit: "set" }]])("refuses a misfit and an undocumented 2xx as AnswerRefused with %j, never calling onMisfit", async (more) => {
    const s = await answering([{ status: 200, body: misfit }, { status: 202, body: fits }]);
    const seen: Array<unknown> = [];
    const get = called(await clientOf(spec, s, { ...more, ...(more.onMisfit === undefined ? {} : { onMisfit: (m: unknown) => seen.push(m) }) }), "transfers.get");
    for (const transferID of ["t1", "t2"]) expect((await settle(get({ transferID }))).tag, transferID).toBe("AnswerRefused");
    expect(seen).toEqual([]);
  });

  it("lenient: each answer comes back whole, a misfit or an undocumented 2xx reported once with every problem, a fitting one not at all", async () => {
    const s = await answering([{ status: 200, body: misfit }, { status: 200, body: fits }, { status: 202, body: fits }]);
    const seen: Array<Node> = [];
    const get = called(await clientOf(spec, s, { answers: "lenient", onMisfit: (m: Node) => seen.push(m) }), "transfers.get");
    expect(await settle(get({ transferID: "t1" }))).toEqual({ tag: "ok", value: misfit });
    expect(await settle(get({ transferID: "t2" }))).toEqual({ tag: "ok", value: fits });
    expect(await settle(get({ transferID: "t3" }))).toEqual({ tag: "ok", value: fits });
    expect(seen).toEqual([
      { call: "transfers.get", status: 200, problems: expect.arrayContaining([expect.stringContaining("$.currency"), expect.stringContaining("$.id")]) },
      { call: "transfers.get", status: 202, problems: [expect.stringContaining("202")] },
    ]);
    expect(seen[0]?.["problems"]).toHaveLength(2);
  });

  it("lenient without onMisfit still returns the answer", async () => {
    const s = await answering([{ status: 200, body: misfit }]);
    expect(await settle(called(await clientOf(spec, s, { answers: "lenient" }), "transfers.get")({ transferID: "t1" }))).toEqual({ tag: "ok", value: misfit });
  });

  it("lenient refuses inputs and fails failures as before, without calling onMisfit", async () => {
    const s = await answering([{ status: 404, body: { message: "Not Found" } }]);
    const seen: Array<unknown> = [];
    const get = called(await clientOf(spec, s, { answers: "lenient", onMisfit: (m: unknown) => seen.push(m) }), "transfers.get");
    expect((await settle(get({}))).tag).toBe("InputRefused");
    expect(s.seen).toEqual([]);
    expect(await settle(get({ transferID: "t9" }))).toMatchObject({ tag: "ApiFailure", failure: { status: 404 } });
    expect(seen).toEqual([]);
  });
});
