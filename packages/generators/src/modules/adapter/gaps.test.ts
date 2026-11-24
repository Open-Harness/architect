// #739's five gaps in `ortho new adapter --from-openapi`, each on a small description written here, judged by what the
// generated client sends to a stand-in and what it gives back. Written by #739's checks author before the build; red on
// today's generator, and listed in packages/generators/expected-failing/gaps.txt (G11). The contract each one fixes:
//   1. A call with no `operationId` is named from its path's fixed parts, each camel-cased at `-` and `_`, then its
//      method: on a collection (the path ends in a fixed part) get, post, put, patch, delete are list, create, update,
//      update, delete; on an item (it ends in a `{parameter}`) get, update, update, delete, and post is create.
//      An operation with an `operationId` keeps the name it gives.
//   2. When the operation's security (or the document's) is an `apiKey` scheme `in: header`, the token is sent in that
//      header, under the scheme's name, and no `Authorization` is sent. Other schemes keep `Authorization: Bearer`.
//   3. Header parameters are fields of the input, under the spec's name, sent as headers and never in the body or query.
//      A required one missing is refused before sending, except `Idempotency-Key`: a call that declares it (on the
//      operation or its path) sends a fresh one each time unless the caller gives one, which is sent as given.
//   4. A `oneOf` or `anyOf` request body takes the fields of any of its alternatives, and the input is judged against the
//      whole body schema, so it is refused before sending when it fits none.
//   5. `client({ ..., answers: "lenient", onMisfit })` returns an answer that doesn't fit its schema as it came, and calls
//      `onMisfit({ call, status, problems })` once for it. Without `answers`, such an answer is still `AnswerRefused`.
//      Lenient is for answers only: inputs and failures are judged as before.
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { callAt, callNames, generate, plugin, removePlugins, settle, standIn, type Calls, type Node, type StandIn } from "./testing.ts";

afterAll(removePlugins);
const servers: Array<StandIn> = [];
afterEach(() => { for (const s of servers.splice(0)) s.close(); });
const serve = (answer: Parameters<typeof standIn>[0] = () => ({ status: 200, body: {} })) => standIn(answer).then((s) => { servers.push(s); return s; });

const doc = (paths: Node, extra: Node = {}) => ({ openapi: "3.0.2", info: { title: "T", version: "1" }, paths, ...extra });
const ok = { "200": { description: "ok", content: { "application/json": { schema: { type: "object" } } } } };
const op = (more: Node = {}) => ({ responses: ok, ...more });
const id = (name: string) => ({ name, in: "path", required: true, schema: { type: "string" } });
const body = (schema: Node) => ({ requestBody: { required: true, content: { "application/json": { schema } } } });
const called = (calls: Calls, name: string) => {
  const call = callAt(calls, name);
  expect(call, `the client has a call ${name}`).toBeDefined();
  return call!;
};

describe("1. a call with no operationId is named from its method and path", () => {
  const spec = doc({
    "/widgets": { get: op(), post: op() },
    "/widgets/{widgetID}": { get: op({ parameters: [id("widgetID")] }), put: op({ parameters: [id("widgetID")] }), delete: op({ parameters: [id("widgetID")] }) },
    "/widgets/{widgetID}/spare_parts": { parameters: [id("widgetID")], get: op(), post: op() },
    "/kyc-links/{kycLinkID}/refresh": { parameters: [id("kycLinkID")], patch: op() },
    "/ping": { get: op({ operationId: "health/ping" }) },
  });
  // [name, method, path sent], from the rule above, never from what the generator made
  const expected: ReadonlyArray<readonly [string, string, string]> = [
    ["widgets.list", "GET", "/widgets"], ["widgets.create", "POST", "/widgets"],
    ["widgets.get", "GET", "/widgets/w1"], ["widgets.update", "PUT", "/widgets/w1"], ["widgets.delete", "DELETE", "/widgets/w1"],
    ["widgets.spareParts.list", "GET", "/widgets/w1/spare_parts"], ["widgets.spareParts.create", "POST", "/widgets/w1/spare_parts"],
    ["kycLinks.refresh.update", "PATCH", "/kyc-links/k1/refresh"], ["health.ping", "GET", "/ping"],
  ];

  it("generates a call for every operation, an operationId's name kept", () => {
    const r = generate("t", spec);
    expect(r._tag === "Failure" ? r.failure.message : r.success.calls).toBe(expected.length);
  });

  it("names each call by the rule, and each name sends its own method and path", async () => {
    const s = await serve();
    const calls = (await plugin("t", spec)).client({ baseUrl: s.origin }).calls;
    expect([...callNames(calls)].sort()).toEqual(expected.map(([n]) => n).sort());
    for (const [name, method, path] of expected) {
      const before = s.seen.length;
      expect((await settle(called(calls, name)({ ...(path.includes("w1") ? { widgetID: "w1" } : {}), ...(path.includes("k1") ? { kycLinkID: "k1" } : {}) }))).tag, name).toBe("ok");
      expect(s.seen.slice(before).map((x) => `${x.method} ${x.path}`), name).toEqual([`${method} ${path}`]);
    }
  });
});

describe("2. the token goes in the header the apiKey scheme names", () => {
  const keyed = (header: string) => doc({ "/things": { get: op(), post: op() } }, { security: [{ Key: [] }], components: { securitySchemes: { Key: { type: "apiKey", in: "header", name: header } } } });

  it.each(["Api-Key", "X-Partner-Key"])("sends the token as %s on every call, and no Authorization", async (header) => {
    const s = await serve();
    const calls = (await plugin("t", keyed(header))).client({ baseUrl: s.origin, token: "sk-test-1" }).calls;
    for (const name of ["things.list", "things.create"]) expect((await settle(called(calls, name)({}))).tag, name).toBe("ok");
    expect(s.seen.map((x) => [x.method, x.headers[header.toLowerCase()], x.headers["authorization"]])).toEqual([["GET", "sk-test-1", undefined], ["POST", "sk-test-1", undefined]]);
  });

  it("sends no key header when no token is given", async () => {
    const s = await serve();
    await called((await plugin("t", keyed("Api-Key"))).client({ baseUrl: s.origin }).calls, "things.list")({});
    expect([s.seen[0]?.headers["api-key"], s.seen[0]?.headers["authorization"]]).toEqual([undefined, undefined]);
  });

  it("keeps Authorization: Bearer for an http bearer scheme", async () => {
    const s = await serve();
    const spec = doc({ "/things": { get: op() } }, { security: [{ B: [] }], components: { securitySchemes: { B: { type: "http", scheme: "bearer" } } } });
    await called((await plugin("t", spec)).client({ baseUrl: s.origin, token: "sk-test-1" }).calls, "things.list")({});
    expect([s.seen[0]?.headers["authorization"], s.seen[0]?.headers["api-key"]]).toEqual(["Bearer sk-test-1", undefined]);
  });
});

describe("3. header parameters are kept, and Idempotency-Key is sent on each call that declares it", () => {
  const idem = { $ref: "#/components/parameters/Idem" };
  const spec = doc({
    "/transfers": { get: op(), post: op({ parameters: [idem], ...body({ type: "object", properties: { amount: { type: "string" } } }) }) },
    "/rfis/{rfiID}/responses": { parameters: [id("rfiID"), idem], post: op(body({ type: "object", properties: { text: { type: "string" } } })) },
    "/notes": { post: op({ parameters: [{ name: "X-Request-Source", in: "header", required: true, schema: { type: "string", enum: ["app", "cli"] } }, { name: "X-Trace", in: "header", schema: { type: "string" } }], ...body({ type: "object", properties: { text: { type: "string" } } }) }) },
  }, { components: { parameters: { Idem: { name: "Idempotency-Key", in: "header", required: true, schema: { type: "string" } } } } });
  const calls = (s: StandIn) => plugin("t", spec).then((p) => p.client({ baseUrl: s.origin }).calls);

  it("sends a fresh key on each call the operation declares it on, and never in the body or query", async () => {
    const s = await serve();
    const c = await calls(s);
    for (const amount of ["1.0", "2.0"]) expect((await settle(called(c, "transfers.create")({ amount }))).tag).toBe("ok");
    const keys = s.seen.map((x) => x.headers["idempotency-key"]);
    expect(keys.every((k) => typeof k === "string" && k.length > 0), String(keys)).toBe(true);
    expect(keys[0]).not.toBe(keys[1]);
    expect(s.seen.map((x) => [x.body, x.query])).toEqual([[{ amount: "1.0" }, ""], [{ amount: "2.0" }, ""]]);
  });

  it("sends one on a call whose path declares it", async () => {
    const s = await serve();
    expect((await settle(called(await calls(s), "rfis.responses.create")({ rfiID: "r1", text: "x" }))).tag).toBe("ok");
    expect([s.seen[0]?.path, typeof s.seen[0]?.headers["idempotency-key"], s.seen[0]?.body]).toEqual(["/rfis/r1/responses", "string", { text: "x" }]);
  });

  it("sends the caller's own key as given, so a retry is the same request", async () => {
    const s = await serve();
    const c = await calls(s);
    for (const _ of [1, 2]) await called(c, "transfers.create")({ amount: "5.0", "Idempotency-Key": "retry-1" });
    expect(s.seen.map((x) => [x.headers["idempotency-key"], x.body])).toEqual([["retry-1", { amount: "5.0" }], ["retry-1", { amount: "5.0" }]]);
  });

  it("sends none on a call that doesn't declare it", async () => {
    const s = await serve();
    await called(await calls(s), "transfers.list")({});
    expect(s.seen.map((x) => x.headers["idempotency-key"])).toEqual([undefined]);
  });

  it("sends another header parameter from the input under its name, and refuses a required one missing or wrong before sending", async () => {
    const s = await serve();
    const notes = called(await calls(s), "notes.create");
    expect((await settle(notes({ text: "a", "X-Request-Source": "cli" }))).tag).toBe("ok");
    expect((await settle(notes({ text: "b", "X-Request-Source": "cli", "X-Trace": "t-9" }))).tag).toBe("ok");
    expect(s.seen.map((x) => [x.headers["x-request-source"], x.headers["x-trace"], x.body])).toEqual([["cli", undefined, { text: "a" }], ["cli", "t-9", { text: "b" }]]);
    for (const input of [{ text: "c" }, { text: "c", "X-Request-Source": "robot" }]) expect((await settle(notes(input))).tag, JSON.stringify(input)).toBe("InputRefused");
    expect(s.seen).toHaveLength(2);
  });
});

describe("4. a oneOf or anyOf request body takes the fields of its alternatives", () => {
  const kind = (k: string) => ({ type: "string", enum: [k] });
  const spec = doc({
    "/customers": { post: op(body({
      oneOf: [{ $ref: "#/components/schemas/Person" }, { $ref: "#/components/schemas/Company" }],
      discriminator: { propertyName: "type", mapping: { individual: "#/components/schemas/Person", business: "#/components/schemas/Company" } },
    })) },
    "/contacts": { post: op(body({ anyOf: [{ type: "object", required: ["phone"], properties: { phone: { type: "string" } } }, { type: "object", required: ["email"], properties: { email: { type: "string" } } }] })) },
  }, { components: { schemas: {
    Person: { type: "object", required: ["type"], properties: { type: kind("individual"), email: { type: "string" }, first_name: { type: "string" } } },
    Company: { type: "object", required: ["type", "business_legal_name"], properties: { type: kind("business"), email: { type: "string" }, business_legal_name: { type: "string" } } },
  } } });

  it("sends an input that fits any one alternative, as given", async () => {
    const s = await serve();
    const c = (await plugin("t", spec)).client({ baseUrl: s.origin }).calls;
    const inputs: ReadonlyArray<readonly [string, Node]> = [
      ["customers.create", { type: "individual", email: "ada@example.com" }],
      ["customers.create", { type: "business", email: "ops@example.com", business_legal_name: "Acme Ltd" }],
      ["contacts.create", { phone: "1" }], ["contacts.create", { email: "a@b.c" }],
    ];
    for (const [name, input] of inputs) expect((await settle(called(c, name)(input))).tag, JSON.stringify(input)).toBe("ok");
    expect(s.seen.map((x) => x.body)).toEqual(inputs.map(([, i]) => i));
  });

  it("refuses before sending an input that fits none, and a field no alternative has", async () => {
    const s = await serve();
    const c = (await plugin("t", spec)).client({ baseUrl: s.origin }).calls;
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

describe("5. a lenient client reports an answer that misfits its schema and still returns it", () => {
  const spec = doc({ "/transfers/{transferID}": { get: { parameters: [id("transferID")], responses: { "200": { description: "ok", content: { "application/json": { schema: { type: "object", required: ["id", "currency"], properties: { id: { type: "string" }, currency: { type: "string" } } } } } } } } } });
  const misfit = { id: "t1", amount: "10.0", receipt: { fee: "0.1" } };
  const answers = (list: Array<{ status: number; body: unknown }>) => serve(() => list.shift() ?? { status: 500, body: {} });

  it("strict by default: the misfit is AnswerRefused", async () => {
    const s = await answers([{ status: 200, body: misfit }]);
    expect((await settle(called((await plugin("t", spec)).client({ baseUrl: s.origin }).calls, "transfers.get")({ transferID: "t1" }))).tag).toBe("AnswerRefused");
  });

  it("lenient: the misfit comes back whole and is reported once; a fitting answer is not reported", async () => {
    const s = await answers([{ status: 200, body: misfit }, { status: 200, body: { id: "t2", currency: "usd" } }]);
    const seen: Array<unknown> = [];
    const get = called((await plugin("t", spec)).client({ baseUrl: s.origin, answers: "lenient", onMisfit: (m: unknown) => seen.push(m) }).calls, "transfers.get");
    expect(await settle(get({ transferID: "t1" }))).toEqual({ tag: "ok", value: misfit });
    expect(seen).toEqual([{ call: "transfers.get", status: 200, problems: [expect.stringContaining("currency")] }]);
    expect(await settle(get({ transferID: "t2" }))).toEqual({ tag: "ok", value: { id: "t2", currency: "usd" } });
    expect(seen).toHaveLength(1);
  });

  it("lenient without onMisfit still returns the answer", async () => {
    const s = await answers([{ status: 200, body: misfit }]);
    expect(await settle(called((await plugin("t", spec)).client({ baseUrl: s.origin, answers: "lenient" }).calls, "transfers.get")({ transferID: "t1" }))).toEqual({ tag: "ok", value: misfit });
  });

  it("lenient judges inputs and failures as before", async () => {
    const s = await answers([{ status: 404, body: { message: "Not Found" } }]);
    const get = called((await plugin("t", spec)).client({ baseUrl: s.origin, answers: "lenient", onMisfit: () => undefined }).calls, "transfers.get");
    expect((await settle(get({}))).tag).toBe("InputRefused");
    expect(s.seen).toEqual([]);
    expect(await settle(get({ transferID: "t9" }))).toMatchObject({ tag: "ApiFailure", failure: { status: 404 } });
  });
});
