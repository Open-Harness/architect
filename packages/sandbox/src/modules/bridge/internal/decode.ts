// A request body as a call's input, or `BadRequest` saying what is wrong. Hand-written: nothing here is worth a schema library.
import { Effect } from "effect";
import type { Given } from "../../environment/types.ts";
import type { Lent } from "../../loans/types.ts";
import type { ExecInput, OpenInput, ReadInput, WriteInput } from "../../sandboxes/types.ts";
import { BadRequest } from "../types.ts";

type Body = Readonly<Record<string, unknown>>;

const bad = (what: string) => Effect.fail(new BadRequest({ what }));
const isBody = (value: unknown): value is Body => typeof value === "object" && value !== null && !Array.isArray(value);
const body = (value: unknown): Effect.Effect<Body, BadRequest> => (isBody(value) ? Effect.succeed(value) : value === undefined ? Effect.succeed({}) : bad("the body is not a JSON object"));

const text = (o: Body, key: string): Effect.Effect<string, BadRequest> => (typeof o[key] === "string" ? Effect.succeed(o[key]) : bad(`${key} must be text`));
const optionalText = (o: Body, key: string): Effect.Effect<string | undefined, BadRequest> => (o[key] === undefined || o[key] === null ? Effect.succeed(undefined) : text(o, key));
const strings = (o: Body, key: string, min = 0): Effect.Effect<ReadonlyArray<string>, BadRequest> => {
  const value = o[key];
  return Array.isArray(value) && value.length >= min && value.every((v) => typeof v === "string") ? Effect.succeed(value as ReadonlyArray<string>) : bad(`${key} must be a list of text${min > 0 ? ` with at least ${min}` : ""}`);
};
const listOf = <A>(o: Body, key: string, each: (item: Body, at: string) => Effect.Effect<A, BadRequest>): Effect.Effect<ReadonlyArray<A>, BadRequest> => {
  const value = o[key] ?? [];
  if (!Array.isArray(value)) return bad(`${key} must be a list`);
  return Effect.forEach(value, (item, i) => (isBody(item) ? each(item, `${key}[${i}]`) : bad(`${key}[${i}] must be an object`)));
};

const variable = (o: Body, at: string): Effect.Effect<Given, BadRequest> =>
  Effect.gen(function* () {
    const from = o["from"];
    if (from !== undefined && from !== "source" && from !== "settings") return yield* bad(`${at}.from must be "source" or "settings"`);
    return { name: yield* text(o, "name"), value: yield* text(o, "value"), ...(from === undefined ? {} : { from }) };
  });

const loan = (o: Body, at: string): Effect.Effect<Lent, BadRequest> =>
  Effect.gen(function* () {
    if (typeof o["expiresAt"] !== "number") return yield* bad(`${at}.expiresAt must be a number of epoch milliseconds`);
    return { name: yield* text(o, "name"), value: yield* text(o, "value"), scope: yield* text(o, "scope"), expiresAt: o["expiresAt"] };
  });

export const open = (value: unknown): Effect.Effect<OpenInput, BadRequest> =>
  Effect.gen(function* () {
    const o = yield* body(value);
    return { owner: yield* text(o, "owner"), tag: yield* text(o, "tag"), variables: yield* listOf(o, "variables", variable), blocked: o["blocked"] === undefined ? [] : yield* strings(o, "blocked") };
  });

export const sandboxOf = (value: unknown): Effect.Effect<string, BadRequest> => body(value).pipe(Effect.flatMap((o) => text(o, "sandbox")));

export const exec = (value: unknown): Effect.Effect<ExecInput, BadRequest> =>
  Effect.gen(function* () {
    const o = yield* body(value);
    const cwd = yield* optionalText(o, "cwd");
    const timeout = o["timeoutSeconds"];
    if (timeout !== undefined && (typeof timeout !== "number" || !(timeout > 0))) return yield* bad("timeoutSeconds must be a positive number");
    return { sandbox: yield* text(o, "sandbox"), command: yield* strings(o, "command", 1), ...(cwd === undefined ? {} : { cwd }), lend: yield* listOf(o, "lend", loan), ...(timeout === undefined ? {} : { timeoutSeconds: timeout }) };
  });

export const write = (value: unknown): Effect.Effect<WriteInput, BadRequest> =>
  Effect.gen(function* () {
    const o = yield* body(value);
    return { sandbox: yield* text(o, "sandbox"), path: yield* text(o, "path"), content: yield* text(o, "content") };
  });

export const read = (value: unknown): Effect.Effect<ReadInput, BadRequest> =>
  Effect.gen(function* () {
    const o = yield* body(value);
    return { sandbox: yield* text(o, "sandbox"), path: yield* text(o, "path") };
  });

export const tagOf = (value: unknown): Effect.Effect<{ readonly tag?: string }, BadRequest> =>
  body(value).pipe(Effect.flatMap((o) => optionalText(o, "tag")), Effect.map((tag) => (tag === undefined ? {} : { tag })));

export const maybeSandbox = (value: unknown): Effect.Effect<{ readonly sandbox?: string }, BadRequest> =>
  body(value).pipe(Effect.flatMap((o) => optionalText(o, "sandbox")), Effect.map((sandbox) => (sandbox === undefined ? {} : { sandbox })));
