// Check 10 (M1.22; design/decisions/WEB-actions-projection.md calls 1, 2, 4): what each generated `options(host)` says and does, for every operation of Plugged In and of acme. Its fields are
// agent-native's own names and carry what the model says (name, description, readOnly, needsApproval, agentTool, errors); it has no
// `retrySafe: true`; its `schema` advertises exactly the operation's payload, through Effect's Standard Schema and Standard JSON Schema,
// non-empty whenever the payload has fields; and its `run` is one `host.call` that makes the generated SDK's own request, under the
// request key the host gives, as the caller the host is. Every expected value is read from the model or from the SDK, never from the action.
//
// Written before the projection exists. The SDK is the examples' generated one, the module is `orthograph/actions`, and the server is a sink
// that writes down what it was sent (the runs against a real world are check 12).
import { Effect, Schema } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type ActionContext, loadActions } from "./contract.ts";
import { EXAMPLES, JSON_TYPE, SAMPLES, actionFile, exampleRoot, hostOf, loadModule, loadSdk, modelAt, opsOf, sink, wantOptions, type Sink } from "./projection.ts";

const KEYS = ["agentTool", "description", "errors", "name", "needsApproval", "readOnly", "run", "schema"];
/** agent-native's own further fields (spikes/agent-native-compat finding 1): allowed, never required. `retrySafe` is judged apart. */
const FURTHER = ["outputSchema", "mcpTool"];

interface ValueSpec { readonly type: string; readonly prefix?: string; readonly max?: number; readonly bits?: number }
/** Wire values to try on one field, from its value type in the model: both sides of each bound, and what a different kind of value looks like. */
const probesOf = (value: ValueSpec): ReadonlyArray<unknown> => {
  const common: Array<unknown> = ["", " ", "x", 7, true, [], {}];
  if (value.type === "id") return [...common, `${value.prefix}_abc`, `${value.prefix}_`, `${value.prefix}_ABC`, `${value.prefix}_a-b`, "zzz_abc", "abc", `${value.prefix}abc`];
  if (value.type === "text") return [...common, "x".repeat(value.max ?? 1), "x".repeat((value.max ?? 1) + 1), "\u00e9", "line\nbreak"];
  if (value.type === "uint") return [...common, "0", "1", "-1", "1.5", "1e3", "abc", "0x10", String(2n ** BigInt(value.bits ?? 8) - 1n), String(2n ** BigInt(value.bits ?? 8))];
  return [...common, "ada1", "a", "A", "ADA", "ada one", "9ada", "x".repeat(32), "x".repeat(33), "x".repeat(200), "https://example.com", "http://example.com/a?b=c", "ftp://example.com", "javascript:alert(1)", "not a url", "example.com"];
};

const camel = (name: string) => name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

for (const example of EXAMPLES) {
  const root = exampleRoot(example);
  const model = modelAt(root);
  const ops = opsOf(model);
  let server: Sink;
  beforeAll(async () => { server = await sink(); });
  afterAll(async () => { await server.close(); });

  describe(`10 M1.22: options(host) of ${example}`, () => {
    it("there is a valid sample payload for every operation (the check's own table)", () => {
      expect(Object.keys(SAMPLES).filter((name) => name in model.operations).sort()).toEqual(ops.map((op) => op.name));
    });

    it("every field agent-native reads is there, with the model's value: name, description, readOnly, needsApproval, agentTool and the refusals' codes", async () => {
      const wrong: Array<string> = [];
      for (const op of ops) {
        const { options } = await loadModule(root, op).catch(() => ({ options: undefined }));
        if (typeof options !== "function") { wrong.push(`${op.name}: ${actionFile(op)} has no options`); continue; }
        const host = await hostOf(await loadSdk(root), server.url);
        const got = options(host);
        const keys = Object.keys(got).sort();
        const missing = KEYS.filter((k) => !keys.includes(k));
        const extra = keys.filter((k) => !KEYS.includes(k) && !FURTHER.includes(k));
        if (missing.length > 0) wrong.push(`${op.name}: missing ${missing.join(", ")}`);
        if (extra.length > 0) wrong.push(`${op.name}: has ${extra.join(", ")}, which are not agent-native's field names`);
        const want = wantOptions(model, op);
        for (const [field, value] of Object.entries(want)) {
          if (JSON.stringify((got as unknown as Record<string, unknown>)[field]) !== JSON.stringify(value) && !(field === "errors" && sameMap(got.errors, value as Record<string, string>))) {
            wrong.push(`${op.name}.${field} is ${JSON.stringify((got as unknown as Record<string, unknown>)[field])}, the model says ${JSON.stringify(value)}`);
          }
        }
        if (host.calls.length > 0) wrong.push(`${op.name}: options(host) called the host before anything ran`);
      }
      expect(wrong).toEqual([]);
    });

    it("the flags are the model's and nothing wider: a boolean each, and no retrySafe at all", async () => {
      const wrong: Array<string> = [];
      for (const op of ops) {
        const { options } = await loadModule(root, op).catch(() => ({ options: undefined }));
        if (typeof options !== "function") { wrong.push(`${op.name}: ${actionFile(op)} has no options`); continue; }
        const got = options(await hostOf(await loadSdk(root), server.url)) as unknown as Record<string, unknown>;
        for (const flag of ["readOnly", "needsApproval", "agentTool"]) if (typeof got[flag] !== "boolean") wrong.push(`${op.name}.${flag} is ${typeof got[flag]}, a boolean is wanted`);
        if ("retrySafe" in got && got["retrySafe"] !== undefined && got["retrySafe"] !== false) wrong.push(`${op.name}.retrySafe is ${String(got["retrySafe"])}`);
        if ("mcpTool" in got && typeof got["mcpTool"] !== "boolean") wrong.push(`${op.name}.mcpTool is ${typeof got["mcpTool"]}`);
      }
      expect(wrong).toEqual([]);
    });

    it("the registry lists each action with the model's flags and an input schema of exactly the payload's fields, non-empty when it has any", async () => {
      const { Actions, defineAction } = await loadActions();
      const approver = { ask: async () => true };
      const sdk = await loadSdk(root);
      const actions = [];
      for (const op of ops) {
        const { options } = await loadModule(root, op).catch(() => ({ options: undefined }));
        if (typeof options !== "function") expect.fail(`${op.name}: ${actionFile(op)} has no options`);
        actions.push(defineAction(options(await hostOf(sdk, server.url)), approver));
      }
      const listed = Actions.registry(actions).list();
      expect(listed.map((row) => row.name)).toEqual(ops.map((op) => op.name));
      const wrong: Array<string> = [];
      for (const [index, op] of ops.entries()) {
        const row = listed[index]!;
        const want = wantOptions(model, op);
        for (const field of ["description", "readOnly", "needsApproval", "agentTool"] as const) if (row[field] !== want[field]) wrong.push(`${op.name}.${field} is ${String(row[field])}`);
        const fields = Object.keys(op.payload);
        const schema = row.inputSchema;
        const properties = Object.keys(schema.properties ?? {}).sort();
        if (properties.join(",") !== [...fields].sort().join(",")) wrong.push(`${op.name} advertises [${properties.join(", ")}], the payload has [${fields.join(", ")}]`);
        if (fields.length > 0 && properties.length === 0) wrong.push(`${op.name} advertises no parameters, and its payload has ${fields.length}`);
        const required = [...(schema.required ?? [])].sort();
        const wantRequired = fields.filter((f) => op.payload[f]!.optional !== true).sort();
        if (required.join(",") !== wantRequired.join(",")) wrong.push(`${op.name} requires [${required.join(", ")}], the payload requires [${wantRequired.join(", ")}]`);
        for (const field of fields) {
          const type = op.payload[field]!.value.type;
          const advertised = schema.properties?.[field];
          const wantType = JSON_TYPE[type];
          if (wantType === undefined) { wrong.push(`${op.name}.${field}: the check does not know a ${type} value (extend JSON_TYPE)`); continue; }
          if (advertised?.["type"] !== wantType) wrong.push(`${op.name}.${field} is advertised as ${JSON.stringify(advertised)}, a ${type} is a ${wantType}`);
          if (advertised !== undefined && ("anyOf" in advertised || "oneOf" in advertised)) wrong.push(`${op.name}.${field} is advertised with a union: ${JSON.stringify(advertised)}`);
        }
      }
      expect(wrong).toEqual([]);
    });

    it("the advertised schema is the payload's own: the declaration's schema through Standard Schema and Standard JSON Schema, field for field", async () => {
      const { Actions, defineAction } = await loadActions();
      const sdk = await loadSdk(root);
      const wrong: Array<string> = [];
      for (const op of ops) {
        const { options } = await loadModule(root, op).catch(() => ({ options: undefined }));
        if (typeof options !== "function") { wrong.push(`${op.name}: ${actionFile(op)} has no options`); continue; }
        const action = defineAction(options(await hostOf(sdk, server.url)), { ask: async () => true });
        const declared = (await import(/* @vite-ignore */ `${root}/generated/api/src/${op.thing}/${op.verb}.ts`) as { declaration: { payloadSchema: Schema.Codec<any, any> } }).declaration.payloadSchema;
        const want = Schema.toStandardJSONSchemaV1(Schema.toStandardSchemaV1(declared))["~standard"].jsonSchema.input({ target: "draft-2020-12" });
        const got = Actions.registry([action]).list()[0]!.inputSchema;
        if (JSON.stringify(sorted(got)) !== JSON.stringify(sorted(JSON.parse(JSON.stringify(want))))) wrong.push(`${op.name}: advertises ${JSON.stringify(got)}, the declaration gives ${JSON.stringify(want)}`);
      }
      expect(wrong).toEqual([]);
    });

    it("the schema decodes the sample as `run` is given it, and refuses each required field left out and each field of the wrong kind", async () => {
      const wrong: Array<string> = [];
      const sdk = await loadSdk(root);
      for (const op of ops) {
        const { options } = await loadModule(root, op).catch(() => ({ options: undefined }));
        if (typeof options !== "function") { wrong.push(`${op.name}: ${actionFile(op)} has no options`); continue; }
        const { schema } = options(await hostOf(sdk, server.url));
        const sample = SAMPLES[op.name]!;
        const wire = JSON.parse(JSON.stringify(sample, (_, v) => (typeof v === "bigint" ? v.toString() : v))) as Record<string, unknown>;
        const decodes = (input: unknown) => Effect.runSync(Schema.decodeUnknownEffect(schema)(input).pipe(Effect.match({ onFailure: () => "refused" as const, onSuccess: (v) => v })));
        const got = decodes(wire);
        if (got === "refused" || JSON.stringify(got, (_, v) => (typeof v === "bigint" ? `${v}n` : v)) !== JSON.stringify(sample, (_, v) => (typeof v === "bigint" ? `${v}n` : v))) wrong.push(`${op.name}: decodes ${JSON.stringify(wire)} to ${String(JSON.stringify(got, (_, v) => (typeof v === "bigint" ? `${v}n` : v)))}`);
        for (const field of Object.keys(op.payload)) {
          const { [field]: _left, ...without } = wire;
          if (decodes(without) !== "refused") wrong.push(`${op.name}: accepts a payload without ${field}`);
          if (decodes({ ...wire, [field]: 12.5 }) !== "refused") wrong.push(`${op.name}: accepts ${field} as a number`);
          if (decodes({ ...wire, [field]: null }) !== "refused") wrong.push(`${op.name}: accepts ${field} as null`);
        }
      }
      expect(wrong).toEqual([]);
    });

    it("the schema accepts what the declaration's own payload schema accepts and refuses what it refuses, field by field, on probes made from each field's value type in the model", async () => {
      const sdk = await loadSdk(root);
      const wrong: Array<string> = [];
      const outcome = (schema: Schema.Codec<any, any>, input: unknown) =>
        Effect.runSync(Schema.decodeUnknownEffect(schema)(input).pipe(Effect.match({ onFailure: () => "refused", onSuccess: (v) => `accepted ${JSON.stringify(v, (_, x) => (typeof x === "bigint" ? `${x}n` : x))}` })));
      for (const op of ops) {
        const { options } = await loadModule(root, op).catch(() => ({ options: undefined }));
        if (typeof options !== "function") { wrong.push(`${op.name}: ${actionFile(op)} has no options`); continue; }
        const { schema } = options(await hostOf(sdk, server.url));
        const declared = (await import(/* @vite-ignore */ `${root}/generated/api/src/${op.thing}/${op.verb}.ts`) as { declaration: { payloadSchema: Schema.Codec<any, any> } }).declaration.payloadSchema;
        const wire = JSON.parse(JSON.stringify(SAMPLES[op.name]!, (_, v) => (typeof v === "bigint" ? v.toString() : v))) as Record<string, unknown>;
        const fields = Object.entries(op.payload);
        const judge = (label: string, input: Record<string, unknown>) => {
          const got = outcome(schema, input);
          const want = outcome(declared, input);
          if (got !== want) wrong.push(`${op.name} ${label}: the action's schema says ${got.slice(0, 60)}, the payload's own says ${want.slice(0, 60)}`);
        };
        for (const [field, spec] of fields) for (const probe of probesOf(spec.value as ValueSpec)) judge(`${field} = ${JSON.stringify(probe).slice(0, 40)}`, { ...wire, [field]: probe });
        // A rule across fields (two equal, one in the other) is seen only when two fields change at once: every pair, a dozen probes each, and one value in every field.
        for (const [a, b] of fields.flatMap(([x], i) => fields.slice(i + 1).map(([y]) => [x, y] as const))) {
          for (const pa of probesOf(op.payload[a]!.value as ValueSpec).slice(0, 12)) for (const pb of probesOf(op.payload[b]!.value as ValueSpec).slice(0, 12)) judge(`${a} = ${JSON.stringify(pa).slice(0, 20)} with ${b} = ${JSON.stringify(pb).slice(0, 20)}`, { ...wire, [a]: pa, [b]: pb });
        }
        for (const same of ["x", "ada1", "a@b.co", "1"]) judge(`every field = ${same}`, Object.fromEntries(fields.map(([field]) => [field, same])));
        for (const [a, b] of fields.flatMap(([x], i) => fields.slice(i + 1).map(([y]) => [x, y] as const))) judge(`${a} = ${b} (the same sample value)`, { ...wire, [a]: wire[b] });
      }
      expect(wrong).toEqual([]);
    });

    it("run is the SDK's own call, every time, whoever calls: the same request, credential and key the generated SDK makes, the context handed on untouched, once per run, whatever the caller, email, headers or approval it carries", async () => {
      const wrong: Array<string> = [];
      const sdk = await loadSdk(root);
      const layer = sdk.layer(server.url, "tok_of_ada") as never;
      const contexts: ReadonlyArray<ActionContext> = [
        { caller: "tool", toolCallId: "t-1" },
        { caller: "http", toolCallId: "t-2", userEmail: "ada@example.com" },
        { caller: "frontend", toolCallId: "t-3", requestHeaders: new Headers({ authorization: "Bearer not-ours", "idempotency-key": "not-ours" }) },
        { caller: "mcp", toolCallId: "t-4", userEmail: "ada@example.com", approvedToolCallKey: "approved-4" },
        { caller: "cli", toolCallId: "t-5", signal: new AbortController().signal },
        { caller: "a2a", toolCallId: "t-6", userEmail: "ada@example.com", approvedToolCallKey: "approved-6", signal: new AbortController().signal, requestHeaders: new Headers() },
      ];
      for (const op of ops) {
        const { options } = await loadModule(root, op).catch(() => ({ options: undefined }));
        if (typeof options !== "function") { wrong.push(`${op.name}: ${actionFile(op)} has no options`); continue; }
        const sample = SAMPLES[op.name]!;
        const direct = (sdk[camel(op.thing)] as Record<string, (p: unknown, o?: unknown) => Effect.Effect<unknown, unknown, never>>)[camel(op.verb)]!;
        const host = await hostOf(sdk, server.url, "tok_of_ada");
        const action = options(host);
        for (const ctx of contexts) {
          const label = `${op.name} as ${ctx.caller} (${ctx.toolCallId})`;
          server.seen.length = 0;
          await Effect.runPromiseExit(direct(sample, { requestKey: `tool:${ctx.toolCallId}` }).pipe(Effect.provide(layer)));
          const wantSent = server.seen.splice(0);
          if (wantSent.length === 0) { wrong.push(`${label}: the check's sample was refused by the SDK before it was sent`); break; }
          const callsBefore = host.calls.length;
          await action.run(sample, ctx).then(() => undefined, () => undefined);
          const got = server.seen.splice(0);
          if (host.calls.length - callsBefore !== 1) wrong.push(`${label}: run made ${host.calls.length - callsBefore} host calls, one is wanted`);
          if (host.calls[callsBefore]?.ctx !== ctx) wrong.push(`${label}: run did not hand its context to the host as it was given (the same object)`);
          const first = wantSent[0]!;
          const sent = got[0];
          if (got.length !== 1) wrong.push(`${label}: run sent ${got.length} requests, the SDK's own call sent ${wantSent.length}`);
          else if (sent!.method !== first.method || sent!.path !== first.path || sent!.body !== first.body) wrong.push(`${label}: run sent ${sent!.method} ${sent!.path} ${sent!.body}, the SDK sends ${first.method} ${first.path} ${first.body}`);
          if (sent !== undefined && sent.key !== `tool:${ctx.toolCallId}`) wrong.push(`${label}: run sent the key ${String(sent.key)}, the host's is tool:${ctx.toolCallId}`);
          if (sent !== undefined && sent.token !== "tok_of_ada") wrong.push(`${label}: run sent the credential ${String(sent.token)}`);
        }
      }
      expect(wrong).toEqual([]);
    });
  });
}

const sameMap = (a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>) =>
  Object.keys(a).length === Object.keys(b).length && Object.entries(b).every(([k, v]) => a[k] === v);

/** A JSON value with its object keys in order, so two schemas compare as values. */
const sorted = (value: unknown): unknown =>
  Array.isArray(value) ? value.map(sorted) : value !== null && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sorted(v)])) : value;

describe("10 M1.22: the values K29 draws for Plugged In, as written there", () => {
  it("handle.claim, handle.release and profile.get say what section 3 of K29 says", async () => {
    const root = exampleRoot("plugged-in");
    const model = modelAt(root);
    const host = await hostOf(await loadSdk(root), "http://127.0.0.1:1");
    const read = async (name: string) => {
      const op = model.operations[name]!;
      const { options } = await loadModule(root, op);
      const got = options!(host);
      return { name: got.name, description: got.description, readOnly: got.readOnly, needsApproval: got.needsApproval, agentTool: got.agentTool, errors: got.errors };
    };
    expect(await read("handle.claim")).toEqual({
      name: "handle.claim", description: "Claim a free name and make it the address of your public page, with its profile.",
      readOnly: false, needsApproval: false, agentTool: true,
      errors: { HandleTaken: "HN-001", HandleAlreadyOwned: "HN-002", NotAllowed: "AR-001", IdempotencyConflict: "AR-002" },
    });
    expect(await read("handle.release")).toEqual({
      name: "handle.release", description: model.operations["handle.release"]!.description,
      readOnly: false, needsApproval: true, agentTool: true,
      errors: { HandleNotClaimed: model.refusals["HandleNotClaimed"], NotAllowed: model.refusals["NotAllowed"] },
    });
    expect((await read("profile.get")).readOnly).toBe(true);
    expect((await read("handle.resolve")).readOnly).toBe(true);
    expect((await read("link.order")).readOnly).toBe(false);
  });
});
