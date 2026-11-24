// #739's gaps 1 to 3 in `ortho new adapter --from-openapi`, each on a small description written here, judged by the whole
// request the generated client puts on the wire (method, path, query, every header beyond transport, body). Gaps 4 and 5
// are in bodies-and-answers.test.ts, the done check on Bridge's description in bridge.test.ts. Written by #739's checks
// author before the build; red on today's generator, listed in packages/generators/expected-failing/gaps.txt (G11).
// The contract:
//   1. A call with no `operationId` is named from its path's fixed parts, each camel-cased at `-` and `_`, then its
//      method: on a collection (the path ends in a fixed part) get, post, put, patch, delete are list, create, update,
//      update, delete; on an item (it ends in a `{parameter}`) get, create, update, update, delete. An operation with an
//      `operationId` keeps the name it gives. Two operations that come to one name are refused, naming it.
//   2. When an operation's security (its own, else the document's) is an `apiKey` scheme `in: header`, from OpenAPI's
//      `components.securitySchemes` or Swagger's `securityDefinitions`, the token is sent in that header under the
//      scheme's name and nowhere else. Security `[]` sends no credential. Any other scheme, or none declared, keeps
//      `Authorization: Bearer`. No token, no credential.
//   3. Header parameters are fields of the input under the spec's name, sent only as headers, judged like any field (a
//      required one missing, or a value that doesn't fit, is refused before sending), and a header and a body field of
//      one name are refused like a path and a body field. `Idempotency-Key` (any case) is the exception: a call that
//      declares it, on the operation or its path, sends the caller's key as given, else a fresh random UUID on every
//      call. A parameter named `token` outside the path stays the client's credential and is never a field, as today
//      (Slack declares it as a header). A body is sent as `content-type: application/json`; no body field given, no body.
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { UUID, callAt, callNames, generate, plugin, removePlugins, settle, standIn, wire, type Calls, type Node, type StandIn } from "./testing.ts";

afterAll(removePlugins);
const servers: Array<StandIn> = [];
afterEach(() => { for (const s of servers.splice(0)) s.close(); });
const serve = () => standIn(() => ({ status: 200, body: {} })).then((s) => { servers.push(s); return s; });

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
const clientOf = (spec: unknown, s: StandIn, more: Node = {}) => plugin("t", spec).then((p) => p.client({ baseUrl: s.origin, ...more }).calls);
const req = (method: string, path: string, headers: Node = {}, more: Node = {}) => ({ method, path, query: "", headers, body: undefined, ...more });

describe("1. a call with no operationId is named from its method and path", () => {
  const spec = doc({
    "/widgets": { get: op(), post: op() },
    "/widgets/{widgetID}": { parameters: [id("widgetID")], get: op(), post: op(), put: op(), delete: op() },
    "/widgets/{widgetID}/spare_parts": { parameters: [id("widgetID")], get: op(), post: op() },
    "/widgets/{widgetID}/history": { get: op({ parameters: [id("widgetID")], operationId: "widgets/history-of" }) },
    "/settings": { put: op(), patch: op({ operationId: "settings/merge" }), delete: op() },
    "/notes/{noteID}": { patch: op({ parameters: [id("noteID")] }) },
    "/kyc-links/{kycLinkID}/refresh": { parameters: [id("kycLinkID")], patch: op() },
    "/orgs/{orgID}/billing/payment_methods": { parameters: [id("orgID")], patch: op() },
    "/ping": { get: op({ operationId: "health/ping" }) },
  });
  // [name, method, path template], from the rule above, never from what the generator made; each {parameter} is given as v1
  const expected: ReadonlyArray<readonly [string, string, string]> = [
    ["widgets.list", "GET", "/widgets"], ["widgets.create", "POST", "/widgets"],
    ["widgets.get", "GET", "/widgets/{widgetID}"], ["widgets.create", "POST", "/widgets/{widgetID}"], ["widgets.update", "PUT", "/widgets/{widgetID}"], ["widgets.delete", "DELETE", "/widgets/{widgetID}"],
    ["widgets.spareParts.list", "GET", "/widgets/{widgetID}/spare_parts"], ["widgets.spareParts.create", "POST", "/widgets/{widgetID}/spare_parts"],
    ["widgets.historyOf", "GET", "/widgets/{widgetID}/history"],
    ["settings.update", "PUT", "/settings"], ["settings.merge", "PATCH", "/settings"], ["settings.delete", "DELETE", "/settings"],
    ["notes.update", "PATCH", "/notes/{noteID}"], ["kycLinks.refresh.update", "PATCH", "/kyc-links/{kycLinkID}/refresh"],
    ["orgs.billing.paymentMethods.update", "PATCH", "/orgs/{orgID}/billing/payment_methods"], ["health.ping", "GET", "/ping"],
  ];
  // the collection POST and the item POST of /widgets share a name: the rule says so, and the description is refused
  const distinct = expected.filter(([, m, p]) => !(m === "POST" && p === "/widgets/{widgetID}"));
  const unclashed = doc({ ...spec.paths, "/widgets/{widgetID}": { ...spec.paths["/widgets/{widgetID}"], post: undefined } });

  it("refuses a description whose operations come to one name, naming it", () => {
    const r = generate("t", spec);
    expect(r._tag === "Failure" ? r.failure.message : "made").toMatch(/widgets\.create/);
  });

  it("generates a call for every operation of a description without clashes, an operationId's name kept", () => {
    const r = generate("t", unclashed);
    expect(r._tag === "Failure" ? r.failure.message : r.success.calls).toBe(distinct.length);
  });

  it("names each call by the rule, and each name sends its own method and path, and nothing else", async () => {
    const s = await serve();
    const calls = await clientOf(unclashed, s);
    expect([...callNames(calls)].sort()).toEqual(distinct.map(([n]) => n).sort());
    for (const [name, method, template] of distinct) {
      const before = s.seen.length;
      const input = Object.fromEntries([...template.matchAll(/\{([^}]+)\}/g)].map(([, k]) => [k!, "v1"]));
      const path = template.replace(/\{[^}]+\}/g, "v1");
      expect((await settle(called(calls, name)(input))).tag, name).toBe("ok");
      expect(s.seen.slice(before).map(wire), name).toEqual([req(method, path)]);
    }
  });
});

describe("2. the token goes in the header the apiKey scheme names", () => {
  const schemes = { Key: { type: "apiKey", in: "header", name: "Api-Key" }, Partner: { type: "apiKey", in: "header", name: "X-Partner-Key" }, B: { type: "http", scheme: "bearer" }, Q: { type: "apiKey", in: "query", name: "key" } };
  const spec = doc({
    "/things": { get: op(), post: op() },
    "/things/{thingID}": { parameters: [id("thingID")], get: op({ security: [] }), put: op({ security: [{ B: [] }] }), delete: op({ security: [{ Partner: [] }] }) },
    "/lookups": { get: op({ security: [{ Q: [] }] }) },
  }, { security: [{ Key: [] }], components: { securitySchemes: schemes } });
  const sends = async (more: Node, expected: ReadonlyArray<Node>) => {
    const s = await serve();
    const calls = await clientOf(spec, s, more);
    for (const [name, input] of [["things.list", {}], ["things.create", {}], ["things.get", { thingID: "a" }], ["things.update", { thingID: "a" }], ["things.delete", { thingID: "a" }], ["lookups.list", {}]] as const) {
      expect((await settle(called(calls, name)(input))).tag, name).toBe("ok");
    }
    expect(s.seen.map(wire)).toEqual(expected);
  };

  it("sends the token as the scheme names it on each call: the document's, the operation's own, none for [], Bearer for anything else", () => sends({ token: "sk-test-1" }, [
    req("GET", "/things", { "api-key": "sk-test-1" }), req("POST", "/things", { "api-key": "sk-test-1" }),
    req("GET", "/things/a"), req("PUT", "/things/a", { authorization: "Bearer sk-test-1" }), req("DELETE", "/things/a", { "x-partner-key": "sk-test-1" }),
    req("GET", "/lookups", { authorization: "Bearer sk-test-1" }),
  ]));

  it("sends no credential at all when no token is given", () => sends({}, ["GET /things", "POST /things", "GET /things/a", "PUT /things/a", "DELETE /things/a", "GET /lookups"].map((x) => req(x.split(" ")[0]!, x.split(" ")[1]!))));

  it("reads Swagger 2.0's securityDefinitions, under its basePath", async () => {
    const s = await serve();
    const swagger = { swagger: "2.0", info: { title: "S", version: "1" }, basePath: "/v2", securityDefinitions: { K: { type: "apiKey", in: "header", name: "X-Key" } }, security: [{ K: [] }], paths: { "/items": { get: { responses: { "200": { description: "ok", schema: { type: "object" } } } } } } };
    expect((await settle(called(await clientOf(swagger, s, { token: "tk" }), "items.list")({}))).tag).toBe("ok");
    expect(s.seen.map(wire)).toEqual([req("GET", "/v2/items", { "x-key": "tk" })]);
  });
});

describe("3. header parameters are kept, and Idempotency-Key is sent on each call that declares it", () => {
  const idem = { $ref: "#/components/parameters/Idem" };
  const text = { type: "object", properties: { text: { type: "string" } } };
  const spec = doc({
    "/transfers": { get: op(), post: op({ parameters: [idem], ...body({ type: "object", properties: { amount: { type: "string" } } }) }) },
    "/rfis/{rfiID}/responses": { parameters: [id("rfiID"), idem], post: op(body(text)) },
    "/quiet": { post: op({ parameters: [{ name: "idempotency-key", in: "header", required: true, schema: { type: "string" } }] }) },
    "/notes": { post: op({ parameters: [{ name: "X-Request-Source", in: "header", required: true, schema: { type: "string", enum: ["app", "cli"] } }, { name: "X-Trace", in: "header", schema: { type: "string" } }], ...body(text) }) },
    "/search": { post: op({ parameters: [{ name: "q", in: "query", schema: { type: "string" } }], ...body(text) }) },
    "/clash": { post: op({ parameters: [{ name: "text", in: "header", schema: { type: "string" } }], ...body(text) }) },
    "/chat.postMessage": { post: op({ operationId: "chat_postMessage", parameters: [{ name: "token", in: "header", required: true, schema: { type: "string" } }], ...body(text) }) },
  }, { components: { parameters: { Idem: { name: "Idempotency-Key", in: "header", required: true, schema: { type: "string" } } } } });
  const fresh = expect.stringMatching(UUID);

  it("sends a fresh key on each call, even of the same input, and only as a header", async () => {
    const s = await serve();
    const c = await clientOf(spec, s);
    for (const _ of [1, 2]) expect((await settle(called(c, "transfers.create")({ amount: "1.0" }))).tag).toBe("ok");
    expect((await settle(called(c, "quiet.create")({}))).tag, "a key declared in lower case").toBe("ok");
    expect(s.seen.map(wire)).toEqual([
      req("POST", "/transfers", { "idempotency-key": fresh }, { body: { amount: "1.0" } }), req("POST", "/transfers", { "idempotency-key": fresh }, { body: { amount: "1.0" } }),
      req("POST", "/quiet", { "idempotency-key": fresh }),
    ]);
    const keys = s.seen.map((x) => x.headers["idempotency-key"]);
    expect(new Set(keys).size, String(keys)).toBe(3);
  });

  it("sends the caller's own key as given, on the operation's declaration and on its path's, so a retry is the same request", async () => {
    const s = await serve();
    const c = await clientOf(spec, s);
    for (const _ of [1, 2]) await called(c, "transfers.create")({ amount: "5.0", "Idempotency-Key": "retry-1" });
    await called(c, "rfis.responses.create")({ rfiID: "r1", text: "x", "Idempotency-Key": "retry-2" });
    await called(c, "rfis.responses.create")({ rfiID: "r1", text: "x" });
    expect(s.seen.map(wire)).toEqual([
      req("POST", "/transfers", { "idempotency-key": "retry-1" }, { body: { amount: "5.0" } }), req("POST", "/transfers", { "idempotency-key": "retry-1" }, { body: { amount: "5.0" } }),
      req("POST", "/rfis/r1/responses", { "idempotency-key": "retry-2" }, { body: { text: "x" } }), req("POST", "/rfis/r1/responses", { "idempotency-key": fresh }, { body: { text: "x" } }),
    ]);
    expect(s.seen[3]?.headers["idempotency-key"]).not.toBe("retry-2");
  });

  it("sends none on a call that doesn't declare it", async () => {
    const s = await serve();
    await called(await clientOf(spec, s), "transfers.list")({});
    expect(s.seen.map(wire)).toEqual([req("GET", "/transfers")]);
  });

  it("sends a header field as a header under its name, a query field only in the query, a body field only in the body", async () => {
    const s = await serve();
    const c = await clientOf(spec, s);
    expect((await settle(called(c, "notes.create")({ text: "a", "X-Request-Source": "cli" }))).tag).toBe("ok");
    expect((await settle(called(c, "notes.create")({ text: "b", "X-Request-Source": "app", "X-Trace": "t-9" }))).tag).toBe("ok");
    expect((await settle(called(c, "search.create")({ q: "a", text: "b" }))).tag).toBe("ok");
    expect(s.seen.map(wire)).toEqual([
      req("POST", "/notes", { "x-request-source": "cli" }, { body: { text: "a" } }),
      req("POST", "/notes", { "x-request-source": "app", "x-trace": "t-9" }, { body: { text: "b" } }),
      req("POST", "/search", {}, { query: "?q=a", body: { text: "b" } }),
    ]);
    expect(s.seen.map((x) => x.headers["content-type"])).toEqual(s.seen.map(() => expect.stringMatching(/^application\/json/)));
  });

  it("refuses before sending a header missing, a header that doesn't fit, and a header and a body field of one name", async () => {
    const s = await serve();
    const c = await clientOf(spec, s);
    const wrong: ReadonlyArray<readonly [string, Node, RegExp]> = [
      ["notes.create", { text: "c" }, /X-Request-Source/], ["notes.create", { text: "c", "X-Request-Source": "robot" }, /X-Request-Source/],
      ["notes.create", { text: "c", "X-Request-Source": "cli", "X-Trace": 5 }, /X-Trace/], ["clash.create", { text: "c" }, /text/],
    ];
    for (const [name, input, names] of wrong) {
      const got = await settle(called(c, name)(input));
      expect([got.tag, (got.failure?.["problems"] ?? []).some((p: string) => names.test(p))], JSON.stringify(input)).toEqual(["InputRefused", true]);
    }
    expect(s.seen).toEqual([]);
  });

  it("keeps a header called token as the client's credential, never a field", async () => {
    const s = await serve();
    const post = called(await clientOf(spec, s, { token: "xoxb-1" }), "chatPostMessage");
    expect((await settle(post({ text: "hi" }))).tag).toBe("ok");
    expect((await settle(post({ text: "hi", token: "other" }))).tag).toBe("InputRefused");
    expect(s.seen.map(wire)).toEqual([req("POST", "/chat.postMessage", { authorization: "Bearer xoxb-1" }, { body: { text: "hi" } })]);
  });
});
