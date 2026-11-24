// #739's done check, on Bridge's real published description (pinned in test/fixtures/bridge/): the generator makes an
// adapter of all 144 operations, whose client sends the key as `Api-Key` and an `Idempotency-Key` on each call that
// declares one, takes `customers.create` as `{ type, email }`, and can accept answers shaped like Bridge's own published
// examples. Written by #739's checks author before the build; listed in packages/generators/expected-failing/bridge.txt
// (G11). Every expectation is read from the description here, never from what the generator made. The naming rule is
// gaps.test.ts's.
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { BRIDGE, bridge, bridgeSha, callAt, callNames, generate, plugin, removePlugins, settle, standIn, wire, type Calls, type Made, type Node, type StandIn } from "./testing.ts";

const spec = bridge();
const METHODS = ["get", "post", "put", "patch", "delete"] as const;
const camel = (w: string) => w.split(/[-_]/).filter((p) => p !== "").map((p, i) => (i === 0 ? p.charAt(0).toLowerCase() + p.slice(1) : p.charAt(0).toUpperCase() + p.slice(1))).join("");
/** gaps.test.ts's rule: the path's fixed parts, camel-cased, then the method's word on a collection or an item. */
const nameOf = (method: string, path: string) => {
  const parts = path.split("/").filter((p) => p !== "");
  const onItem = (parts.at(-1) ?? "").includes("{");
  const word = (onItem ? { get: "get", post: "create", put: "update", patch: "update", delete: "delete" } : { get: "list", post: "create", put: "update", patch: "update", delete: "delete" })[method as "get"];
  return [...parts.filter((p) => !p.includes("{")).map(camel), word].join(".");
};
const ref = (node: Node): Node => (typeof node?.["$ref"] === "string" ? ref(String(node["$ref"]).replace(/^#\//, "").split("/").reduce<Node>((at, k) => at?.[k], spec)) : node);
interface Operation { readonly name: string; readonly method: string; readonly path: string; readonly idempotent: boolean; readonly bodyFree: boolean; readonly given: Node; readonly sent: { readonly path: string; readonly query: string } }
const operations: ReadonlyArray<Operation> = Object.entries<Node>(spec["paths"]).flatMap(([path, item]) => METHODS.filter((m) => item[m] !== undefined).map((method) => ({
  name: nameOf(method, path), method, path,
  idempotent: [...(item["parameters"] ?? []), ...(item[method]["parameters"] ?? [])].map(ref).some((p: Node) => p["in"] === "header" && p["name"] === "Idempotency-Key"),
  bodyFree: ((b: Node | undefined) => b === undefined || (b["required"] !== true && ((s: Node) => s["required"] === undefined && s["oneOf"] === undefined && s["anyOf"] === undefined && s["allOf"] === undefined)(ref(b["content"]?.["application/json"]?.["schema"] ?? {}))))(item[method]["requestBody"] === undefined ? undefined : ref(item[method]["requestBody"])),
  // the required path and query fields, each a value its schema allows
  given: Object.fromEntries([...(item["parameters"] ?? []), ...(item[method]["parameters"] ?? [])].map(ref)
    .filter((p: Node) => (p["in"] === "path" || (p["in"] === "query" && p["required"] === true)))
    .map((p: Node) => [p["name"], ref(p["schema"] ?? {})["enum"]?.[0] ?? p["example"] ?? ref(p["schema"] ?? {})["example"] ?? (ref(p["schema"] ?? {})["format"] === "uuid" ? "00000000-0000-4000-8000-000000000001" : "a1")])),
})).map((o) => {
  // where those fields go: each path parameter into the path, the rest into the query, in the description's order
  const inPath = [...o.path.matchAll(/\{([^}]+)\}/g)].map(([, k]) => k!);
  const query = new URLSearchParams(Object.entries(o.given).filter(([k]) => !inPath.includes(k)).map(([k, v]): [string, string] => [k, String(v)])).toString();
  return { ...o, sent: { path: `/v0${o.path.replace(/\{([^}]+)\}/g, (_, k: string) => encodeURIComponent(String(o.given[k])))}`, query: query === "" ? "" : `?${query}` } };
}));
/** One of the examples Bridge publishes for an answer, its `$ref` followed. */
const example = (path: string, method: string, status: string, name: string): Node => structuredClone(ref(spec["paths"][path][method]["responses"][status]["content"]["application/json"]["examples"][name])["value"]) as Node;

const TOKEN = "sk-test-stand-in";
const destination = { currency: "usdc", payment_rail: "base", address: "0x00000000000000000000000000000000000000aa" };
let made: Made | undefined;
let s: StandIn;
let answer: { status: number; body: unknown } = { status: 200, body: {} };
beforeAll(async () => {
  s = await standIn(() => answer);
  // a refusal fails each check that needs the plugin, not the file
  made = await plugin("bridge", spec).catch(() => undefined);
});
afterAll(() => { s?.close(); removePlugins(); });
afterEach(() => { s.seen.splice(0); answer = { status: 200, body: {} }; });
const client = (more: Node = {}): Calls => {
  expect(made, "the generator made Bridge's plugin").toBeDefined();
  return made!.client({ baseUrl: `${s.origin}/v0`, token: TOKEN, ...more }).calls;
};
const call = (calls: Calls, name: string) => {
  const c = callAt(calls, name);
  expect(c, `the client has a call ${name}`).toBeDefined();
  return c!;
};

describe("Bridge's published description", () => {
  it("is the pinned copy: OpenAPI 3.0.2, 144 operations, none with an operationId, 38 declaring Idempotency-Key", () => {
    expect(bridgeSha(), `re-pin from ${BRIDGE.url}`).toBe(BRIDGE.sha256);
    expect(spec["openapi"]).toBe("3.0.2");
    expect(operations).toHaveLength(144);
    expect(Object.values<Node>(spec["paths"]).flatMap((item) => METHODS.map((m) => item[m]).filter((o) => o?.["operationId"] !== undefined))).toEqual([]);
    expect(operations.filter((o) => o.idempotent)).toHaveLength(38);
    expect(spec["components"]["securitySchemes"]["ApiKey"]).toEqual({ type: "apiKey", name: "Api-Key", in: "header" });
  });

  it("generates an adapter of all 144 operations, each named by the rule, no two alike", () => {
    const r = generate("bridge", spec);
    expect(r._tag === "Failure" ? r.failure.message : r.success.calls).toBe(144);
    expect(new Set(operations.map((o) => o.name)).size).toBe(144);
    expect([...callNames(client())].sort()).toEqual(operations.map((o) => o.name).sort());
  });

  it("sends each call whole: its method, path and query, Api-Key and no Authorization, an Idempotency-Key exactly where declared", async () => {
    const calls = client({ answers: "lenient" });
    const reached: Array<Operation> = [];
    for (const o of operations) {
      const before = s.seen.length;
      await settle(call(calls, o.name)(o.given));
      const sent = s.seen.slice(before);
      expect(sent.length, o.name).toBeLessThanOrEqual(1);
      if (sent[0] === undefined) continue;
      reached.push(o);
      // the whole request: no field was given for the body, so none is sent, and no header but the key and the Idempotency-Key
      expect(wire(sent[0]), o.name).toEqual({ method: o.method.toUpperCase(), ...o.sent, body: undefined,
        headers: { "api-key": TOKEN, ...(o.idempotent ? { "idempotency-key": expect.stringMatching(/\S/) } : {}) } });
    }
    // a call with no required body field reaches the stand-in from its path and query alone: every GET and DELETE among them
    expect(reached.filter((o) => o.method === "get" || o.method === "delete").length).toBe(operations.filter((o) => o.method === "get" || o.method === "delete").length);
    // and so does each call declaring Idempotency-Key whose body requires nothing: the key is never the caller's to give
    const free = operations.filter((o) => o.idempotent && o.bodyFree).map((o) => o.name);
    expect(free.length).toBeGreaterThan(5);
    expect(reached.filter((o) => o.idempotent && o.bodyFree).map((o) => o.name)).toEqual(free);
  });
});

describe("Capxul's first calls against a stand-in answering with Bridge's own examples", () => {
  it("customers.create takes { type, email } for an individual and a business, with a fresh Idempotency-Key each", async () => {
    answer = { status: 201, body: example("/customers", "post", "201", "IndividualCustomerCreated") };
    const create = call(client({ answers: "lenient" }), "customers.create");
    const inputs = [{ type: "individual", email: "ada@example.com" }, { type: "business", email: "ops@example.com", business_legal_name: "Acme Ltd" }];
    for (const input of inputs) expect((await settle(create(input))).tag, JSON.stringify(input)).toBe("ok");
    expect(s.seen.map((x) => [x.method, x.path, x.body])).toEqual(inputs.map((i) => ["POST", "/v0/customers", i]));
    const keys = s.seen.map((x) => x.headers["idempotency-key"]);
    expect(keys[0] !== undefined && keys[1] !== undefined && keys[0] !== keys[1], String(keys)).toBe(true);
    expect((await settle(create({ type: "robot", email: "r@example.com" }))).tag).toBe("InputRefused");
    expect(s.seen).toHaveLength(2);
  });

  it("a KYC link, a virtual account and an RFI response each carry Api-Key and an Idempotency-Key, the RFI's declared on its path", async () => {
    const calls = client({ answers: "lenient" });
    const steps: ReadonlyArray<readonly [string, Node, string, Node]> = [
      ["kycLinks.create", { email: "ada@example.com", type: "individual", full_name: "Ada Lovelace" }, "/v0/kyc_links", { email: "ada@example.com", type: "individual", full_name: "Ada Lovelace" }],
      ["customers.virtualAccounts.create", { customerID: "c1", source: { currency: "usd" }, destination }, "/v0/customers/c1/virtual_accounts", { source: { currency: "usd" }, destination }],
      ["rfis.responses.create", { rfiID: "r1", responses: [{ requested_item_id: "i1", text: "yes" }] }, "/v0/rfis/r1/responses", { responses: [{ requested_item_id: "i1", text: "yes" }] }],
    ];
    for (const [name, input] of steps) {
      answer = { status: name === "rfis.responses.create" ? 201 : 200, body: {} };
      expect((await settle(call(calls, name)(input))).tag, name).toBe("ok");
    }
    expect(s.seen.map((x) => [x.path, x.body, x.headers["api-key"], typeof x.headers["idempotency-key"]])).toEqual(steps.map(([, , path, sent]) => [path, sent, TOKEN, "string"]));
  });

  it("a transfer answered as Bridge publishes it is refused when strict, and returned whole with its misfit reported when lenient", async () => {
    const published = example("/transfers", "post", "201", "AchOnrampTransferResponse");
    expect(published["currency"], "the published example still leaves out currency").toBeUndefined();
    const input = { on_behalf_of: "c1", amount: "10.0", source: { currency: "usd", payment_rail: "ach_push" }, destination };
    answer = { status: 201, body: published };
    expect((await settle(call(client(), "transfers.create")(input))).tag).toBe("AnswerRefused");
    const misfits: Array<Node> = [];
    expect(await settle(call(client({ answers: "lenient", onMisfit: (m: Node) => misfits.push(m) }), "transfers.create")(input))).toEqual({ tag: "ok", value: published });
    expect(misfits).toEqual([{ call: "transfers.create", status: 201, problems: expect.arrayContaining([expect.stringContaining("currency")]) }]);
    expect(s.seen.map((x) => [x.path, x.body])).toEqual([["/v0/transfers", input], ["/v0/transfers", input]]);
  });

  it("a customer answered as Bridge publishes it (requirements.missing: null) comes back whole when lenient, and carries no Idempotency-Key", async () => {
    const published = example("/customers/{customerID}", "get", "200", "SuccessfulCustomerResponse");
    answer = { status: 200, body: published };
    const misfits: Array<Node> = [];
    expect(await settle(call(client({ answers: "lenient", onMisfit: (m: Node) => misfits.push(m) }), "customers.get")({ customerID: "c1" }))).toEqual({ tag: "ok", value: published });
    expect(misfits.map((m) => m["call"])).toEqual(["customers.get"]);
    expect(s.seen.map((x) => [x.method, x.path, x.headers["api-key"], x.headers["idempotency-key"]])).toEqual([["GET", "/v0/customers/c1", TOKEN, undefined]]);
  });
});
