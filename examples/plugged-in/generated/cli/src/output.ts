// Generated from blueprint/projections/cli.ts. Do not edit.
import { BigDecimal, Console, Context, Effect, Option } from "effect";
import { decimalText } from "orthograph/server";
import { Errors } from "../../sdk/src/index.ts";

/** Set by the entry, so commands never touch the process. */
export class ExitCode extends Context.Service<ExitCode, { readonly set: (code: number) => Effect.Effect<void> }>()("cli/ExitCode") {}

/** The flags the caller gave: an optional flag left out is `None`, and is not sent at all. */
export const supplied = (flags: Readonly<Record<string, unknown>>) =>
  Object.fromEntries(Object.entries(flags).flatMap(([k, v]) => (Option.isOption(v) ? (Option.isSome(v) ? [[k, v.value]] : []) : [[k, v]])));

/** A value as it travels: a bigint as its digits, a decimal as its text (`1.50`, never an exponent). */
const wire = (v: unknown): unknown => (typeof v === "bigint" ? v.toString() : BigDecimal.isBigDecimal(v) ? decimalText(v) : v);
// A decimal is read from its holder, since JSON.stringify has already called its toJSON; every other value keeps what its own toJSON made of it.
const text = (x: unknown) =>
  JSON.stringify(x, function (this: Readonly<Record<string, unknown>>, k: string, v: unknown) { const raw = this[k]; return BigDecimal.isBigDecimal(raw) ? decimalText(raw) : wire(v); });
const exitOf = (tag: unknown): number =>
  typeof tag === "string" && tag in Errors.refusals ? Errors.refusals[tag as keyof typeof Errors.refusals].exit : tag === "SchemaError" ? 2 : 1;

/** `AL-002 Name { a: 1, b: x }`: a refusal's code, its name, and the values of its declared fields that the server sent (it cut them for this caller). */
const said = (tag: unknown, code: unknown, fields: Readonly<Record<string, unknown>>) => {
  // Only the project's own refusals have a code. Anything else (the CLI's own `NotSignedIn`) is told as it always was.
  if (typeof tag !== "string" || !(tag in Errors.codes)) return `${String(tag ?? "Error")}: ${text(fields)}`;
  const declared = (Errors.declared as Readonly<Record<string, { readonly fields: Readonly<Record<string, unknown>> }>>)[tag];
  const shown = Object.entries(fields).filter(([k]) => declared === undefined || k in declared.fields).map(([k, v]) => `${k}: ${typeof v === "object" && !BigDecimal.isBigDecimal(v) ? text(v) : String(wire(v))}`);
  return `${typeof code === "string" ? `[${code}] ` : ""}${tag}${shown.length > 0 ? ` { ${shown.join(", ")} }` : ""}`;
};

/** A refusal prints its code, name and public fields to stderr and exits with its exit code. */
export const refused = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.catch((e: unknown) => {
      const tag = typeof e === "object" && e !== null ? (e as { readonly _tag?: unknown })._tag : undefined;
      const { _tag: _, code, ...fields } = (typeof e === "object" && e !== null ? e : {}) as Record<string, unknown>;
      const line = tag === "SchemaError" ? `SchemaError: ${String((e as { readonly message?: unknown }).message)}` : said(tag, code, fields);
      return Console.error(line).pipe(
        Effect.andThen(Effect.flatMap(ExitCode, (exit) => exit.set(exitOf(tag)))),
      );
    }),
  );

/** A one-field answer prints its value, or with `json` the whole answer as JSON. */
export const answer = (json: boolean) => <A extends object, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.flatMap((a) => Console.log(!json && Object.keys(a).length === 1 ? String(wire(Object.values(a)[0])) : text(a))), refused);
