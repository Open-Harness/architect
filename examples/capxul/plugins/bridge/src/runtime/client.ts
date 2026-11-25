// Generated from Bridge API 1. Do not edit.
// The client of a generated adapter: `client({ baseUrl, token? }).calls.<group>.<call>(input)` is a promise of the answer's
// JSON, as it came. The input is one flat object of the spec's path, query, header and body fields under the spec's names;
// it is refused before anything is sent when it doesn't fit, and so is an answer that doesn't fit the spec's success
// schema, unless the client is lenient (`answers: "lenient"`), which returns it and tells `onMisfit`. A call that declares
// `Idempotency-Key` sends the caller's key as given, else a fresh random UUID. The token goes where the spec's security
// says: the header an apiKey scheme names, nowhere for `security: []`, else `Authorization: Bearer`.
// A failure is a value with a `_tag`: `ApiFailure` (an HTTP status of 400 or more, or a 200 whose body says `ok: false`
// with an `error`, as Slack's do), `InputRefused`, `AnswerRefused`, `Unreachable`.
import { Cause, Data, Effect } from "effect";
import { problems } from "./json-schema.ts";
import type { Components, JsonSchema, Operation, Param } from "./types.ts";

export class ApiFailure extends Data.TaggedError("ApiFailure")<{ readonly status: number; readonly code?: string; readonly body: unknown }> {}
export class InputRefused extends Data.TaggedError("InputRefused")<{ readonly call: string; readonly problems: ReadonlyArray<string> }> {}
export class AnswerRefused extends Data.TaggedError("AnswerRefused")<{ readonly call: string; readonly problems: ReadonlyArray<string> }> {}
export class Unreachable extends Data.TaggedError("Unreachable")<{ readonly call: string; readonly reason: string }> {}

export interface ClientOptions {
  /** The origin: `https://api.github.com`. Swagger's base path is added by the client. */
  readonly baseUrl: string;
  /** Sent as each call's security says (a bearer unless an apiKey scheme names a header), and never as a field. None given, no credential. */
  readonly token?: string;
  /** `strict` (the default) refuses an answer that misfits its schema, or a 2xx the spec doesn't document, as `AnswerRefused`; `lenient` returns it as it came and tells `onMisfit`. */
  readonly answers?: "strict" | "lenient";
  /** Called once for each answer a lenient client returns that strict would refuse, with every problem found. */
  readonly onMisfit?: (misfit: Misfit) => void;
}

/** An answer a lenient client returned although it doesn't fit: the call, its status, and why. */
export interface Misfit { readonly call: string; readonly status: number; readonly problems: ReadonlyArray<string> }

/** A call's input, one flat object. */
export type Input = Readonly<Record<string, unknown>>;
type Tree = { [name: string]: ((input?: Input) => Promise<unknown>) | Tree };

const isRecord = (x: unknown): x is Input => typeof x === "object" && x !== null && !Array.isArray(x);
/** A field the spec types as a number may be the numeric string a service gives and wants (Slack's `ts`). */
const NUMERIC = /^\d+(\.\d+)?$/;
const numberish = (schema: JsonSchema) => schema["type"] === "number" || schema["type"] === "integer";

const IDEMPOTENCY_KEY = /^idempotency-key$/i;
const bodyGiven = (op: Operation, input: Input) => op.params.filter((p) => p.in === "body" && input[p.name] !== undefined);

const refuse = (call: string, components: Components, op: Operation, input: unknown): ReadonlyArray<string> => {
  if (!isRecord(input)) return [`${call}: takes one object of fields, not ${input === null ? "null" : typeof input}`];
  // The real specs have a few (GitHub's `actions/update-org-variable`: `name` in the path and in the body). The input is one
  // flat object and can't say which is meant, so such a call is refused whole, naming the field, rather than merged.
  const twice = op.params.find((p, i) => op.params.findIndex((q) => q.name === p.name) !== i);
  if (twice !== undefined) return [`${call}: ${twice.name} is both ${op.params.filter((p) => p.name === twice.name).map((p) => `a ${p.in} field`).join(" and ")}, and a call's input is one flat object that can't tell them apart`];
  const given = Object.entries(input).filter(([, v]) => v !== undefined);
  const known = new Map(op.params.map((p) => [p.name, p]));
  return [
    ...given.filter(([k]) => !known.has(k)).map(([k]) => `${call}: no field ${k}`),
    ...op.params.filter((p) => p.required && !given.some(([k]) => k === p.name)).map((p) => `${call}: ${p.name} is required`),
    ...given.flatMap(([k, v]) => {
      const param = known.get(k);
      if (param === undefined || (typeof v === "string" && numberish(param.schema) && NUMERIC.test(v))) return [];
      return problems(components, param.schema, v, k);
    }),
    // a body of alternatives is judged whole: each field alone fits some alternative, the input's body must fit one
    ...(op.body == null || (bodyGiven(op, input).length === 0 && !op.body.required) ? []
      : problems(components, op.body.schema, Object.fromEntries(bodyGiven(op, input).map((p) => [p.name, input[p.name]]))).map((x) => `${call}: the body ${x}`)),
  ];
};

/** The credential's header, by the call's security; none without a token. */
const credential = (op: Operation, token: string | undefined): Readonly<Record<string, string>> =>
  token === undefined || op.auth === "none" ? {}
    : op.auth === undefined || op.auth === "bearer" ? { authorization: `Bearer ${token}` }
      : { [op.auth.header]: token };

const request = (op: Operation, input: Input, baseUrl: string, token: string | undefined) => {
  const of = (where: Param["in"]) => op.params.filter((p) => p.in === where && input[p.name] !== undefined);
  const path = op.path.replace(/\{([^}]+)\}/g, (_, k: string) => encodeURIComponent(String(input[k])));
  const query = new URLSearchParams(of("query").map((p) => [p.name, String(input[p.name])] as [string, string])).toString();
  const body = of("body");
  // a declared Idempotency-Key the caller didn't give is a fresh random one, so a retry the caller wants the same carries its own
  const headers = op.params.filter((p) => p.in === "header").flatMap((p): ReadonlyArray<[string, string]> =>
    input[p.name] !== undefined ? [[p.name, String(input[p.name])]] : IDEMPOTENCY_KEY.test(p.name) ? [[p.name, crypto.randomUUID()]] : []);
  return {
    url: `${baseUrl.replace(/\/$/, "")}${path}${query === "" ? "" : `?${query}`}`,
    init: {
      method: op.method.toUpperCase(),
      headers: { accept: "application/json", ...Object.fromEntries(headers), ...credential(op, token), ...(body.length > 0 ? { "content-type": "application/json" } : {}) },
      ...(body.length > 0 ? { body: JSON.stringify(Object.fromEntries(body.map((p) => [p.name, input[p.name]]))) } : {}),
    },
  };
};

const parsed = (text: string) => Effect.option(Effect.try(() => JSON.parse(text) as unknown));

const call = (components: Components, op: Operation, options: ClientOptions, input: unknown) => {
  const name = op.name.join(".");
  return Effect.gen(function* () {
    const wrong = refuse(name, components, op, input);
    if (wrong.length > 0) return yield* new InputRefused({ call: name, problems: wrong });
    const sent = request(op, input as Input, options.baseUrl, options.token);
    const response = yield* Effect.tryPromise({ try: () => fetch(sent.url, sent.init), catch: (e) => new Unreachable({ call: name, reason: String(e) }) });
    const text = yield* Effect.tryPromise({ try: () => response.text(), catch: (e) => new Unreachable({ call: name, reason: String(e) }) });
    const json = yield* parsed(text);
    const body = json._tag === "Some" ? json.value : text;
    if (response.status >= 400) return yield* new ApiFailure({ status: response.status, body });
    if (isRecord(body) && body["ok"] === false && typeof body["error"] === "string") return yield* new ApiFailure({ status: response.status, code: body["error"], body });
    // each documented success status has its own schema; a status with none (204) takes an empty body
    const documented = op.successes.find((s) => s.status === response.status);
    const misfit = op.successes.length > 0 && documented === undefined ? [`${name}: status ${response.status} is not one of ${op.successes.map((s) => s.status).join(", ")}`]
      : documented === undefined || documented.schema === null ? []
        : json._tag === "None" ? [`${name}: the answer is not JSON`]
          : problems(components, documented.schema, json.value);
    if (misfit.length === 0) return json._tag === "Some" ? json.value : undefined;
    if (options.answers !== "lenient") return yield* new AnswerRefused({ call: name, problems: misfit });
    options.onMisfit?.({ call: name, status: response.status, problems: misfit });
    return body;
  });
};

const promised = <A, E>(effect: Effect.Effect<A, E>): Promise<A> =>
  Effect.runPromiseExit(effect).then((exit) => (exit._tag === "Success" ? exit.value : Promise.reject(Cause.squash(exit.cause))));

/** The client of a spec's calls: each is a function of its input, grouped as the descriptor's calls are. */
export const makeClient = (operations: ReadonlyArray<Operation>, components: Components, options: ClientOptions): { readonly calls: Tree } => {
  // Trees have no prototype, so a call or group named `constructor` or `toString` is just a name.
  const calls: Tree = Object.create(null) as Tree;
  for (const op of operations) {
    const group = op.name.slice(0, -1).reduce<Tree>((tree, part) => (tree[part] ??= Object.create(null) as Tree) as Tree, calls);
    group[op.name[op.name.length - 1]!] = (input?: Input) => promised(call(components, op, options, input));
  }
  return { calls };
};
