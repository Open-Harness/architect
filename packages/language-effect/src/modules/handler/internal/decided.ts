// The log that decided a refusal: the last thing the handler logged before it refused, written on the operation's span.
// And the logs' side of the one visibility rule: a value the telemetry audience is not shown never reaches a logger.
import { Effect, Logger } from "effect";
import { CurrentLogAnnotations } from "effect/References";
import type { FieldsInput, Thing, Unique } from "orthograph";
import type { Records } from "#modules/records/types.js";
import { traceable } from "orthograph/server";

const text = (message: unknown): string =>
  Array.isArray(message) ? message.map(text).join(" ") : typeof message === "string" ? message : JSON.stringify(message) ?? String(message);

/** A value this short or this plain (a flag, a count) is hidden only as a whole word: it would garble every line holding it. */
const SHORT = 3;

/** One thing to hide from a log line: its text, and whether to match it only as a whole word. */
interface Hidden { readonly text: string; readonly whole: boolean }

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const word = "[A-Za-z0-9_]";

/** What a value looks like inside a log line: text and numbers as themselves, a flag as its word, an object as its JSON and its parts. */
const appearances = (value: unknown, nested = false): ReadonlyArray<Hidden> => {
  if (typeof value === "string") return value.length === 0 ? [] : [{ text: value, whole: value.length < SHORT }, ...(value === JSON.stringify(value).slice(1, -1) ? [] : [{ text: JSON.stringify(value).slice(1, -1), whole: value.length < SHORT }])];
  if (typeof value === "number" || typeof value === "bigint") return [{ text: String(value), whole: String(value).length < SHORT }];
  // A flag inside an object is covered by the object's JSON: hidden alone it would redact every "true" in the line.
  if (typeof value === "boolean") return nested ? [] : [{ text: String(value), whole: true }];
  if (typeof value !== "object" || value === null) return [];
  const json = JSON.stringify(value, (_, v: unknown) => (typeof v === "bigint" ? v.toString() : v));
  return [{ text: json, whole: false }, { text: JSON.stringify(json).slice(1, -1), whole: false },
    ...Object.values(value).flatMap((part) => appearances(part, true))];
};

/**
 * Run `work` with a logger that remembers the last message, redacting what the telemetry audience is not shown before it
 * becomes an attribute: every payload field the declaration does not let out, and the value of any field the handler loads or writes that the declaration
 * does not let out, of any type and length (found by value in the message, and by the field's name or value in its
 * annotations). `last` reads it afterwards. One per attempt, so a retried attempt never sees an earlier attempt's log.
 */
export const recordingLogs = (payload: object, fields: FieldsInput) => Effect.sync(() => {
  const hidden: Array<Hidden> = [];
  const hiddenKeys = new Set<string>();
  const hide = (values: ReadonlyArray<Hidden>) => {
    for (const v of values) if (!hidden.some((h) => h.text === v.text && h.whole === v.whole)) hidden.push(v);
    hidden.sort((a, b) => b.text.length - a.text.length);
  };
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (!Object.hasOwn(fields, key) || traceable(fields[key]!)) continue;
    hiddenKeys.add(key);
    // Text is found as a substring; anything else follows `appearances`' own rules.
    hide(appearances(value).map((h) => (typeof value === "string" ? { ...h, whole: false } : h)));
  }
  /** What a handler loads or stores of a thing, so far as the declaration keeps it out of telemetry, is hidden. */
  const learn = (thing: Thing, values: object) => {
    for (const [key, value] of Object.entries(values)) {
      if (Object.hasOwn(thing.fields, key) && !traceable(thing.fields[key]!)) { hiddenKeys.add(key); hide(appearances(value)); }
    }
  };
  const watching = (records: Records["Service"]): Records["Service"] => ({
    find: (thing, id) => records.find(thing, id).pipe(Effect.tap((found) => Effect.sync(() => { if (found) learn(thing, found); }))),
    findBy: ((rule: Unique, value: unknown) => {
      // `findBy(rule, value)` (G5): the thing is the rule's key's.
      const thing = rule.fields[0].of;
      return (records.findBy as (...args: ReadonlyArray<unknown>) => ReturnType<Records["Service"]["findBy"]>)(rule, value).pipe(Effect.tap((found) => Effect.sync(() => { if (found) learn(thing, found); })));
    }) as Records["Service"]["findBy"],
    list: (query) => records.list(query).pipe(Effect.tap(({ items }) => Effect.sync(() => { for (const found of items) learn(query.thing, found); }))),
    insert: (thing, values, state) => { learn(thing, values); return records.insert(thing, values, state); },
    update: (thing, id, changes, state) => { learn(thing, changes); return records.update(thing, id, changes, state); },
  });

  const redact = (line: string) => hidden.reduce((out, h) =>
    h.whole ? out.replace(new RegExp(`(?<!${word})${escaped(h.text)}(?!${word})`, "g"), "[redacted]") : out.replaceAll(h.text, "[redacted]"), line);
  // Each part of a message: a string redacted in place, anything else that holds hidden text replaced by its redacted text.
  const scrub = (message: unknown): unknown =>
    Array.isArray(message) ? message.map(scrub)
      : typeof message === "string" ? redact(message)
      : hidden.length > 0 && redact(text(message)) !== text(message) ? redact(text(message)) : message;
  const seen: { last: string | undefined } = { last: undefined };
  // A step signal (K5 seam 10) is evidence for the portal, never the log that decided a refusal.
  const recorder = Logger.make(({ message, fiber }) => {
    const annotations = fiber.getRef(CurrentLogAnnotations);
    if ("step" in annotations && "phase" in annotations) return;
    seen.last = text(scrub(message));
  });
  // The annotations an exporter reads from the fiber, with their values redacted too.
  const annotated = <F extends object>(fiber: F): F => new Proxy(fiber, {
    get: (target, property) => {
      const value: unknown = Reflect.get(target, property);
      if (property !== "getRef") return typeof value === "function" ? value.bind(target) : value;
      return (ref: unknown) => {
        const got = (value as (ref: unknown) => unknown).call(target, ref);
        // An annotation named for a hidden field is replaced whole, so a value too short to find in text is still kept out.
        return ref === CurrentLogAnnotations && hidden.length > 0
          ? Object.fromEntries(Object.entries(got as Record<string, unknown>).map(([k, v]) => [k, hiddenKeys.has(k) ? "[redacted]" : scrub(v)]))
          : got;
      };
    },
  });
  // Every logger sees the redacted message, the exporters included, never only the recorder (M1.19).
  const redacting = <M, O>(logger: Logger.Logger<M, O>) =>
    Logger.make<M, O>((options) => logger.log({ ...options, message: scrub(options.message) as M, fiber: annotated(options.fiber) }));
  const around = <A, E, R>(work: Effect.Effect<A, E, R>) =>
    Effect.gen(function* () {
      const current = yield* Logger.CurrentLoggers;
      return yield* Effect.provideService(work, Logger.CurrentLoggers, new Set([...[...current].map(redacting), recorder]));
    });
  return { around, last: Effect.sync(() => seen.last), watching };
});
