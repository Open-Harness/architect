// What checks 09 to 13 (M1.22, the actions projection) share: the examples' models, what each generated action must say about its
// operation (read from the model, never from the action), the host a generated action is given, and the real generated SDK it calls.
// The host is the one K29 section 3.1 draws: `host.call(use, ctx)` hands `use` the SDK's client, made as the right caller with the
// request key of `ctx`, and `runForAction` turns the SDK's Effect into a Promise. Nothing here stands in for our own code: the SDK is
// the example's generated one, the module is `orthograph/actions`, and the server a call reaches is a real world (check 12) or a sink
// that only writes down what it was sent (checks 10 and 13).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join, relative } from "node:path";
import { Effect } from "effect";
import { repo } from "../layer1/support.ts";
import { type ActionContext, type ActionHost, type ActionOptions, loadActions } from "./contract.ts";

export { repo };

export const EXAMPLES = ["plugged-in", "acme"] as const;
export type Example = (typeof EXAMPLES)[number];
export const exampleRoot = (example: Example) => join(repo, "examples", example);

// ---- the model: what an action must say ----

export interface ModelOp {
  readonly name: string;
  readonly thing: string;
  readonly verb: string;
  readonly file: string;
  readonly description: string;
  readonly move: unknown;
  readonly steps: Readonly<Record<string, unknown>>;
  readonly refusals: ReadonlyArray<string>;
  readonly agentTool: boolean;
  readonly needsApproval?: true;
  readonly payload: Readonly<Record<string, { readonly value: { readonly type: string }; readonly optional?: boolean }>>;
}
export interface ModelJson { readonly refusals: Readonly<Record<string, string>>; readonly operations: Readonly<Record<string, ModelOp>>; readonly things: Readonly<Record<string, { readonly errors: Readonly<Record<string, { readonly fields: Readonly<Record<string, unknown>> }>>; readonly machine?: { readonly notFrom?: { readonly error: string } } }>> }

export const modelAt = (root: string): ModelJson => JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as ModelJson;
export const opsOf = (model: ModelJson): ReadonlyArray<ModelOp> => Object.values(model.operations).sort((a, b) => a.name.localeCompare(b.name));

/** The verb as the blueprint file names it (`sign-up`), which is the action module's name: `generated/actions/<thing>/<verb>.ts`. */
export const verbFile = (op: ModelOp) => /\/verbs\/([^/]+)\.ts$/.exec(op.file)?.[1] ?? "";
export const actionFile = (op: ModelOp) => `generated/actions/${op.thing}/${verbFile(op)}.ts`;

/**
 * `readOnly`, by `design/decisions/WEB-actions-projection.md` call 1: no `move`, and every step a `load`; no steps at all counts. The
 * model's own `move` and step names decide it, not K29 section 3.0's sort. The decision tabulates all 22 operations.
 */
export const isRead = (op: ModelOp) => op.move === null || op.move === undefined ? Object.keys(op.steps).every((step) => step === "load") : false;

/** The fields of `options(host)` that come from the model, as K29 section 3.1 draws them, every value read from the model. */
export const wantOptions = (model: ModelJson, op: ModelOp) => ({
  name: op.name,
  description: op.description,
  readOnly: isRead(op),
  needsApproval: op.needsApproval === true,
  agentTool: op.agentTool,
  errors: Object.fromEntries(op.refusals.map((tag) => [tag, model.refusals[tag]])),
});

// ---- the generated files ----

export const walk = (root: string, dir: string): ReadonlyArray<string> => existsSync(join(root, dir))
  ? readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(root, `${dir}/${entry.name}`) : [`${dir}/${entry.name}`])).sort()
  : [];
export const relativeTo = (root: string, path: string) => relative(root, path);

/** The `import` and `export ... from` specifiers of a TypeScript source, the comments and strings of its prose left alone. */
export const specifiers = (source: string) => [...source.matchAll(/(?:^|\n)\s*(?:import|export)\b[^;]*?\bfrom\s+["']([^"']+)["']/g)].map((m) => m[1]!);

/** A source's code with its comments and string literals blanked, so a word in a description is not a call. */
export const codeOf = (source: string) => source
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ")
  .replace(/`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g, '""');

// ---- the SDK and the host ----

const camel = (name: string) => name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

export interface Sdk {
  readonly layer: (url: string, token?: string) => unknown;
  readonly [thing: string]: unknown;
}
export const loadSdk = (root: string): Promise<Sdk> => import(/* @vite-ignore */ join(root, "generated/sdk/src/index.ts")) as Promise<Sdk>;

type Call = (payload: unknown, options?: { readonly requestKey?: string }) => Effect.Effect<unknown, unknown, never>;

/** The client a generated action is handed: `client.<thing>.<verb>({ payload })` (K29 section 3.1), each call the generated SDK's own, as `token`, under `key`. */
export const clientOf = (sdk: Sdk, url: string, token: string | undefined, key: string | undefined) =>
  new Proxy({}, {
    get: (_, thing: string) => new Proxy({}, {
      get: (__, verb: string) => (arg: { readonly payload?: unknown } | undefined) => {
        const call = (sdk[camel(thing)] as Record<string, Call> | undefined)?.[camel(verb)];
        if (typeof call !== "function") throw new Error(`the action called client.${thing}.${verb}, and the generated SDK has no such call`);
        const given = Object.keys(arg ?? {});
        if (given.length !== 1 || given[0] !== "payload") throw new Error(`the action called client.${thing}.${verb}(${JSON.stringify(given)}): K29 section 3.1 draws one argument, { payload: args }`);
        return call(arg!.payload, key === undefined ? undefined : { requestKey: key }).pipe(Effect.provide(sdk.layer(url, token) as never));
      },
    }),
  });

/** What K29 section 3.1 calls `host`: the SDK's call as `token`, and the request key a tool call's id makes. */
export const hostOf = async (sdk: Sdk, url: string, token?: string): Promise<ActionHost<any> & { readonly calls: Array<{ readonly ctx: ActionContext | undefined }> }> => {
  const { runForAction } = await loadActions();
  const calls: Array<{ readonly ctx: ActionContext | undefined }> = [];
  const requestKey = (ctx?: ActionContext) => (ctx?.toolCallId === undefined ? undefined : `tool:${ctx.toolCallId}`);
  return {
    calls,
    requestKey,
    // `use` may throw before it returns an Effect (a call the SDK does not have): that is the action's mistake, said as it is.
    call: (use, ctx) => (calls.push({ ctx }), Promise.resolve().then(() => runForAction(use(clientOf(sdk, url, token, requestKey(ctx)) as never), ctx))),
  };
};

/** `options(host)` of one generated action module, and what else the module exports. */
export const loadModule = async (root: string, op: ModelOp) => {
  const module = (await import(/* @vite-ignore */ join(root, actionFile(op)))) as Record<string, unknown>;
  return { module, exported: Object.keys(module).sort(), options: module["options"] as ((host: ActionHost<any>) => ActionOptions<any, any>) | undefined };
};

/** A server that writes down every request it gets and answers 500: what a call sent, with nothing of the Worker in the way. */
export interface Sink { readonly url: string; readonly seen: Array<{ readonly method: string; readonly path: string; readonly key: string | undefined; readonly token: string | undefined; readonly body: string }>; readonly close: () => Promise<void> }
export const sink = async (): Promise<Sink> => {
  const seen: Sink["seen"] = [];
  const server: Server = createServer((request, response) => {
    const chunks: Array<Buffer> = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const key = request.headers["idempotency-key"];
      const auth = request.headers["authorization"];
      seen.push({ method: request.method ?? "", path: request.url ?? "", key: Array.isArray(key) ? key[0] : key, token: typeof auth === "string" ? auth.replace(/^Bearer /, "") : undefined, body: Buffer.concat(chunks).toString("utf8") });
      response.writeHead(500, { "content-type": "application/json", connection: "close" });
      response.end('{"message":"sink"}');
    });
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, seen, close: () => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); }) };
};

/** A valid payload for each operation of the two examples, as `run` is given it (decoded: a `uint` is a bigint). The check fails by name for an operation it has none for. */
export const SAMPLES: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  "handle.claim": { name: "ada1" },
  "handle.release": { handle: "hdl_abc" },
  "handle.resolve": { name: "ada1" },
  "link.add": { title: "Docs", url: "https://example.com/docs" },
  "link.order": { link: "lnk_abc", position: 2n },
  "link.remove": { link: "lnk_abc" },
  "profile.get": { handle: "ada1" },
  "allowance.get": { id: "alw_abc" },
  "allowance.grant": { organization: "org_abc", member: "per_abc", limit: 500n },
  "allowance.revoke": { allowance: "alw_abc" },
  "allowance.spend": { allowance: "alw_abc", amount: 5n, memo: "lunch" },
  "api-key.create": { organization: "org_abc", name: "ci" },
  "invitation.accept": { invitation: "inv_abc" },
  "invitation.revoke": { invitation: "inv_abc" },
  "invitation.send": { organization: "org_abc", email: "bob@example.com" },
  "membership.get": { id: "mem_abc" },
  "organization.create": { name: "Acme", cap: 1000n },
  "organization.get": { id: "org_abc" },
  "person.sign-up": { email: "ada@example.com", password: "correct horse battery", name: "Ada" },
  "session.show": {},
  "session.sign-in": { email: "ada@example.com", password: "correct horse battery" },
  "system.health": {},
};

/** The JSON-Schema type each model value type is advertised as: a `uint` crosses the wire as a decimal string. */
export const JSON_TYPE: Readonly<Record<string, string>> = { id: "string", text: "string", uint: "string", schema: "string" };
