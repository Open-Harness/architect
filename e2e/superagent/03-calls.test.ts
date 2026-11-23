// Check 03 (Goal 17 slice 3): each call the superagent includes sends exactly the request its spec describes, returns
// exactly what came back, refuses a wrong answer, and refuses a wrong input before anything is sent. Judged against a
// probe the check writes (servers.ts), so what is read is what went over the wire, never the adapter's own types.
//
// The plugin is the one the app holds (examples/superagent/plugins/<name>), through its `./client` export:
//   client({ baseUrl, token? }).calls.<group>.<call>(input) -> Promise<the answer's JSON>
// The input is one flat object: path, query and body fields under the names the spec gives them.
import { afterAll, describe, expect, it } from "vitest";
import { NEEDS, appPlugin } from "./needs.ts";
import { NAMES, trimmed, type Name } from "./pins.ts";
import { at, build, load, once, type Node } from "./plugin.ts";
import { plants, sample } from "./schema.ts";
import { probe, type Answer, type Seen } from "./servers.ts";
import { basePath, deref, operationNamed, readSpec, type Json, type Operation, type Spec } from "./spec.ts";

const TOKEN = "test-token";
const SCALARS = new Set(["string", "integer", "number", "boolean"]);

const inputFor = (spec: Spec, op: Operation, every: boolean): Record<string, Json> =>
  Object.fromEntries(op.inputs.filter((i) => i.required || (every && SCALARS.has(String(deref(spec, i.schema)["type"])))).map((i) => [i.name, sample(spec, i.schema)]));

/** What the spec says the request is: its method, its path with the path fields in, its query, its body. */
const requestFor = (spec: Spec, op: Operation, input: Record<string, Json>) => {
  const of = (where: string) => Object.fromEntries(op.inputs.filter((i) => i.where === where && i.name in input).map((i) => [i.name, input[i.name]!]));
  const path = basePath(spec) + op.path.replace(/\{(\w+)\}/g, (_, k: string) => encodeURIComponent(String(input[k])));
  return { method: op.method, path, query: Object.fromEntries(Object.entries(of("query")).map(([k, v]) => [k, String(v)])), body: { ...of("body"), ...of("formData") } };
};

const sentWhatTheSpecSays = (seen: Seen, wanted: ReturnType<typeof requestFor>, form: boolean) => {
  expect(seen.method).toBe(wanted.method);
  expect(seen.path).toBe(wanted.path);
  expect(seen.query).toEqual(wanted.query);
  expect(seen.headers["authorization"]).toBe(`Bearer ${TOKEN}`);
  if (Object.keys(wanted.body).length === 0) expect(seen.body ?? {}).toEqual({});
  // Slack takes JSON or a form, so a form's every value is a string; a JSON body keeps its types
  else if (form && String(seen.headers["content-type"]).includes("x-www-form-urlencoded")) expect(seen.body).toEqual(Object.fromEntries(Object.entries(wanted.body).map(([k, v]) => [k, typeof v === "string" ? v : String(v)])));
  else expect(seen.body).toEqual(wanted.body);
};

describe.each(NAMES)("03 %s: each included call", (name: Name) => {
  const spec = readSpec(trimmed(name));
  const client = once(async () => { build(appPlugin(name)); return (await load(appPlugin(name), "./client"))["client"] as (opts: { baseUrl: string; token?: string }) => Node; });
  /** The call, from a client pointed at `url`. */
  const callOf = async (call: string, url: string, token?: string) => at((await client())({ baseUrl: url, ...(token === undefined ? {} : { token }) })["calls"], call);
  const servers: Array<{ close: () => Promise<void> }> = [];
  afterAll(async () => { for (const s of servers.splice(0)) await s.close(); });

  const serve = async (answer: (seen: Seen, count: number) => Answer) => { const p = await probe(answer); servers.push(p); return p; };
  const reply = (op: Operation, body: Json): Answer => ({ status: op.success!.status, body });

  it.each(NEEDS[name].calls)("%s: sends what the spec says, with the token as a bearer, for required inputs and for every scalar one", async (call) => {
    const op = operationNamed(spec, call);
    for (const every of [false, true]) {
      const input = inputFor(spec, op, every);
      const p = await serve(() => reply(op, sample(spec, op.success!.schema)));
      await (await callOf(call, p.url, TOKEN))(input);
      expect(p.seen, `${call}: one request`).toHaveLength(1);
      sentWhatTheSpecSays(p.seen[0]!, requestFor(spec, op, input), name === "slack");
      if (name === "slack") { expect(p.seen[0]!.query).not.toHaveProperty("token"); expect(p.seen[0]!.body ?? {}).not.toHaveProperty("token"); }
    }
    const bare = await serve(() => reply(op, sample(spec, op.success!.schema)));
    await (await callOf(call, bare.url))(inputFor(spec, op, false));
    expect(bare.seen[0]!.headers["authorization"], "no token, no Authorization").toBeUndefined();
  });

  it.each(NEEDS[name].calls)("%s: returns exactly what came back, whole", async (call) => {
    const op = operationNamed(spec, call);
    for (const full of [false, true]) {
      const body = sample(spec, op.success!.schema, { full });
      const p = await serve(() => reply(op, body));
      expect(await (await callOf(call, p.url, TOKEN))(inputFor(spec, op, false)), `${call} full=${String(full)}`).toEqual(body);
    }
  });

  it.each(NEEDS[name].calls)("%s: refuses an answer the spec doesn't allow, one wrong part at a time", async (call) => {
    const op = operationNamed(spec, call);
    const base = sample(spec, op.success!.schema);
    const wrong = plants(spec, op.success!.schema, base);
    expect(wrong.length).toBeGreaterThan(2);
    const sent = { current: base as Json };
    const p = await serve(() => reply(op, sent.current));
    const f = await callOf(call, p.url, TOKEN);
    for (const plant of wrong) {
      sent.current = plant.value;
      await expect(f(inputFor(spec, op, false)), `${call}: ${plant.label}`).rejects.toBeDefined();
    }
    sent.current = base;
    await expect(f(inputFor(spec, op, false)), `${call}: the right answer still passes after the wrong ones`).resolves.toEqual(base);
    const text = await serve(() => ({ status: op.success!.status, body: "this is not json", type: "text/plain" }));
    await expect((await callOf(call, text.url, TOKEN))(inputFor(spec, op, false)), `${call}: not JSON`).rejects.toBeDefined();
  });

  it.each(NEEDS[name].calls)("%s: refuses a wrong input before it sends anything", async (call) => {
    const op = operationNamed(spec, call);
    const input = inputFor(spec, op, false);
    const p = await serve(() => reply(op, sample(spec, op.success!.schema)));
    const f = await callOf(call, p.url, TOKEN);
    for (const required of op.inputs.filter((i) => i.required)) {
      const { [required.name]: _left, ...without } = input;
      await expect(f(without), `${call}: ${required.name} left out`).rejects.toBeDefined();
      await expect(f({ ...input, [required.name]: { nope: 1 } }), `${call}: ${required.name} is an object`).rejects.toBeDefined();
    }
    // a value of the wrong kind, for every input the spec types as a scalar: required, and optional when given
    const wrongKind = (schema: Node): Json | undefined => {
      const type = String(deref(spec, schema)["type"]);
      return type === "string" ? 7 : type === "integer" || type === "number" ? "not a number" : type === "boolean" ? "yes" : undefined;
    };
    for (const i of op.inputs.filter((x) => SCALARS.has(String(deref(spec, x.schema)["type"])))) {
      const wrong = wrongKind(i.schema);
      if (wrong === undefined) continue;
      await expect(f({ ...inputFor(spec, op, true), [i.name]: wrong }), `${call}: ${i.name} is ${JSON.stringify(wrong)}`).rejects.toBeDefined();
    }
    await expect(f({ ...input, bogus: 1 }), `${call}: a field the spec doesn't have`).rejects.toBeDefined();
    await expect(f(undefined), `${call}: no input`).rejects.toBeDefined();
    expect(p.seen, `${call}: nothing was sent`).toHaveLength(0);
    await f(input);
    expect(p.seen, `${call}: the right input goes`).toHaveLength(1);
  });

  if (name === "slack") {
    it("conversationsReplies: a ts the spec types as a number may be the string Slack gives, and is sent as written; nothing else is", async () => {
      const op = operationNamed(spec, "conversationsReplies");
      const p = await serve(() => reply(op, sample(spec, op.success!.schema)));
      const f = await callOf("conversationsReplies", p.url, TOKEN);
      for (const ts of ["1503435956.100000", "1503435956.000247", "1503435956"]) await f({ channel: "C024BE91L", ts });
      expect(p.seen.map((s) => s.query["ts"])).toEqual(["1503435956.100000", "1503435956.000247", "1503435956"]);
      for (const ts of ["abc", "1e5", "", "1.2.3", " 1", "0x10"]) await expect(f({ channel: "C024BE91L", ts }), `ts ${JSON.stringify(ts)}`).rejects.toBeDefined();
      expect(p.seen, "the refused ones were not sent").toHaveLength(3);
    });
  }

  it.each(NEEDS[name].calls)("%s: fails with what the server said", async (call) => {
    const op = operationNamed(spec, call);
    const failures: ReadonlyArray<{ readonly answer: Answer; readonly wants: Record<string, unknown> }> = name === "slack"
      ? [{ answer: { status: 200, body: { ok: false, error: "channel_not_found" } }, wants: { code: "channel_not_found" } }]
      : [{ answer: { status: 404, body: name === "github" ? { message: "Not Found" } : { type: "invalid_request", code: "not_found", detail: "Not found.", attr: null } }, wants: { status: 404 } },
        { answer: { status: 500, body: "boom", type: "text/plain" }, wants: { status: 500 } }];
    for (const { answer, wants } of failures) {
      const p = await serve(() => answer);
      const failed = await (await callOf(call, p.url, TOKEN))(inputFor(spec, op, false)).then(() => undefined, (e: unknown) => e);
      expect(failed, `${call}: ${JSON.stringify(wants)}`).toBeDefined();
      expect(failed).toMatchObject(wants);
      expect(typeof (failed as { _tag?: unknown })._tag, `${call}: a tagged failure`).toBe("string");
    }
  });
});
