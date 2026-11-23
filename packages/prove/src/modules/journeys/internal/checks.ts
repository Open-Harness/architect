// A step's checks against what its call got back and what the world now holds. Span checks wait for telemetry.
import { Effect } from "effect";
import type { Assertion, NotFound, NotFrom, Refusal, Thing } from "orthograph";
import { ErrorNames, EventNames, Scripting } from "orthograph/server";
import type { CallRecord, Facts } from "../types.ts";
import { stateOf } from "./world.ts";

/** Values as they travel: bigints as text, so `500n` and `"500"` compare equal. A value that holds itself reads `"[Circular]"` where it loops back. */
export const wireOf = (v: unknown, above: ReadonlyArray<object> = []): unknown => {
  if (typeof v === "bigint") return v.toString();
  if (typeof v !== "object" || v === null) return v;
  if (above.includes(v)) return "[Circular]";
  const path = [...above, v];
  return Array.isArray(v) ? v.map((x) => wireOf(x, path)) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, wireOf(x, path)]));
};
export const show = (v: unknown) => JSON.stringify(wireOf(v));

export const tagOfClass = (cls: unknown): string =>
  ErrorNames.nameOf(cls as never) ?? String((new (cls as new (a: object) => { _tag?: unknown })({}))._tag);

const pascal = (name: string) => name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");

/**
 * A machine's first declared state, whichever shape `states` has. Today `states` is the declared array; ST1.14 (G5 section 1) makes it a record of state references and keeps the
 * array as `declared`. This reads both, so the builder of ST1.14 does not touch this protected file. Once the record has landed it can read `declared[0]` alone.
 */
const firstStateOf = (machine: object): string => {
  const shape = machine as { readonly states?: unknown; readonly declared?: ReadonlyArray<string> };
  const declared = shape.declared ?? (Array.isArray(shape.states) ? (shape.states as ReadonlyArray<string>) : Object.keys((shape.states ?? {}) as object));
  return declared[0] ?? "";
};

/**
 * A refusal check's tag: a declared error's class name, `<Thing>Not<FirstState>` for a machine's own refusal, or
 * `<Thing>NotFound` for a missing instance (a thing's declared error of that name is the same tag, K16 M1.46).
 */
const tagOfRefusal = (error: Refusal, tableOf: (thing: Thing) => string | undefined): string => {
  if ((error as NotFound).kind === "not-found") return `${pascal(tableOf((error as NotFound).thing) ?? "?")}NotFound`;
  if ((error as NotFrom).kind !== "not-from") return tagOfClass(error);
  const machine = (error as NotFrom).machine;
  return `${pascal(tableOf(machine.thing) ?? "?")}Not${pascal(firstStateOf(machine))}`;
};

const subset = (want: Readonly<Record<string, unknown>>, got: unknown) =>
  typeof got === "object" && got !== null && Object.entries(want).every(([k, v]) => show(v) === show((got as Record<string, unknown>)[k]));

/**
 * Journey code (a `pick`, a refusal's class, a machine) runs inside `Effect.try`: a throw is the step's failure, with the error's name and message,
 * and never a defect that ends the run (S-27).
 */
const attempt = <A>(f: () => A) =>
  Effect.try({ try: f, catch: (e) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e)) }).pipe(
    Effect.match({ onFailure: (threw) => ({ threw }) as const, onSuccess: (value) => ({ value }) as const }),
  );

/** The answer's top-level keys and never its values: an answer may hold a token, and the report is kept and shared. */
const keysOf = (answer: unknown) =>
  typeof answer === "object" && answer !== null && !Array.isArray(answer) ? `keys [${Object.keys(answer).join(", ")}]` : `no keys (${Array.isArray(answer) ? "a list" : typeof answer})`;

/** What prove says of a check that threw: where, which keys the answer had and what the error said. No stack, no answer values. */
const threwMessage = (call: CallRecord, env: Readonly<Record<string, unknown>>, threw: string) =>
  `journey "${call.journey}" step "${call.step}": a check threw on an answer with ${keysOf(env["last"])}: ${threw}`;

/** One failed check: the sentence prove prints, and the two halves of it when it has them. */
export interface Finding { readonly message: string; readonly expected?: string; readonly got?: string }

export const runChecks = (
  checks: ReadonlyArray<Assertion>,
  call: CallRecord,
  env: Readonly<Record<string, unknown>>,
  world: { readonly facts: Facts; readonly tableOf: (thing: Thing) => string | undefined; readonly nameOf?: (operation: unknown) => string | undefined },
) =>
  Effect.gen(function* () {
    const failures: Array<string> = [];
    // The same failures with what was expected and what came back, for prove's structured report.
    const findings: Array<Finding> = [];
    const bad = (message: string, expected?: string, got?: string) => {
      failures.push(message);
      findings.push({ message, ...(expected === undefined ? {} : { expected }), ...(got === undefined ? {} : { got }) });
    };
    const refused = typeof call.body === "object" && call.body !== null && call.status >= 400 ? (call.body as { _tag?: string })._tag : undefined;
    const said = call.status === 200 ? "answered" : refused ? `refused with ${refused}` : `failed with ${call.status}`;
    for (const c of checks) {
      // Only the values inside a check are refs; the declarations it names must stay the very objects they are.
      const refs = c.kind === "emits" || c.kind === "refuses" ? c.fields : c.kind === "is-in" ? c.id : undefined;
      const resolved = Scripting.resolve(refs, env);
      if (resolved.missing.length > 0) {
        bad(`${c.kind}: nothing at ${resolved.missing.join(", ")}`);
        continue;
      }
      const check = (c.kind === "emits" || c.kind === "refuses" ? { ...c, fields: resolved.value } : c.kind === "is-in" ? { ...c, id: resolved.value } : c) as Assertion;
      if (check.kind === "expect") {
        if (call.status !== 200) bad(`expected an answer, ${said}`, "an answer", said);
        else {
          const tried = yield* attempt(() => check.pick(env["last"]));
          if ("threw" in tried) { bad(threwMessage(call, env, tried.threw)); continue; }
          const picked = tried.value;
          if (!check.match.test(String(wireOf(picked)))) bad(`answer ${show(picked)} doesn't match ${check.match}`, String(check.match), show(picked));
        }
      } else if (check.kind === "expect-equal") {
        if (call.status !== 200) bad(`expected an answer, ${said}`, "an answer", said);
        else {
          const tried = yield* attempt(() => check.pick(env["last"]));
          if ("threw" in tried) { bad(threwMessage(call, env, tried.threw)); continue; }
          const picked = tried.value;
          // The expected value may name the script (`s.olga.person`): it means what the run gave it.
          const value = Scripting.resolve(check.value, env).value;
          if (show(picked) !== show(value)) bad(`answer ${show(picked)}, expected ${show(value)}`, show(value), show(picked));
        }
      } else if (check.kind === "refuses") {
        const named = yield* attempt(() => tagOfRefusal(check.error, world.tableOf));
        if ("threw" in named) { bad(`journey "${call.journey}" step "${call.step}": the refusal named in refuses() threw: ${named.threw}`); continue; }
        const tag = named.value;
        if (refused !== tag) bad(`expected refused with ${tag}, ${said}`, `refused with ${tag}`, said);
        else if (!subset(check.fields, call.body)) bad(`refused with ${tag} ${show(call.body)}, expected ${show(check.fields)}`, show(check.fields), show(call.body));
      } else if (check.kind === "emits") {
        const name = EventNames.nameOf(check.event) ?? "?";
        const found = call.journal.find((e) => e.event === name);
        if (!found) bad(`expected ${name}, journal has ${call.journal.map((e) => e.event).join(", ") || "nothing"}`, name, call.journal.map((e) => e.event).join(", ") || "nothing");
        else if (!subset(check.fields, found.fields)) bad(`${name} ${show(found.fields)}, expected ${show(check.fields)}`, show(check.fields), show(found.fields));
      } else if (check.kind === "no-events") {
        if (call.journal.length > 0) bad(`expected no events, journal has ${call.journal.map((e) => e.event).join(", ")}`, "no events", call.journal.map((e) => e.event).join(", "));
      } else if ((check as { readonly kind: string }).kind === "lacks" || (check as { readonly kind: string }).kind === "has") {
        // `lacks(...operations)` and `has(...operations)` on a `.tools()` call (M2.02, M2-auth fork 2): none of these is a tool, or all of them are. Neither can
        // pass by saying nothing: the call must have answered a tools list, it must name at least one operation, and every operation it names must be one the project declares.
        const verb = (check as { readonly kind: string }).kind;
        const asked = (check as unknown as { readonly operations: ReadonlyArray<unknown> }).operations;
        const listed = (call.body as { readonly tools?: unknown } | null)?.tools;
        const names = asked.map((op) => world.nameOf?.(op));
        if (call.status !== 200 || !Array.isArray(listed)) bad(`expected a tools list, ${said}`, "a tools list", said);
        else if (asked.length === 0) bad(`${verb} names no operation`, "at least one operation", "none");
        else if (names.some((n) => n === undefined)) bad(`${verb} names an operation the project does not declare`, "declared operations", `${names.filter((n) => n === undefined).length} undeclared`);
        else {
          const declared = names.filter((n): n is string => n !== undefined);
          const held = declared.filter((n) => (listed as ReadonlyArray<unknown>).includes(n));
          if (verb === "lacks" && held.length > 0) bad(`tools list holds ${held.join(", ")}`, "none of them", held.join(", "));
          const missing = declared.filter((n) => !held.includes(n));
          if (verb === "has" && missing.length > 0) bad(`tools list lacks ${missing.join(", ")}`, "all of them", missing.join(", "));
        }
      } else if (check.kind === "is-in") {
        const table = world.tableOf(check.thing as Thing);
        const state = table ? yield* stateOf(world.facts, table, String(check.id)) : undefined;
        if (state !== check.state) bad(`${String(check.id)} is in ${state === undefined || state === null ? "no state" : `"${String(state)}"`}, expected "${check.state}"`, `"${check.state}"`, state === undefined || state === null ? "no state" : `"${String(state)}"`);
      }
    }
    const spans = checks.filter((c): c is Extract<Assertion, { kind: "spans" }> => c.kind === "spans");
    return { failures, findings, spans: { present: spans.flatMap((c) => c.present), absent: spans.flatMap((c) => c.absent) } };
  });
