import { Reading } from "../../reading/service.ts";
import { over } from "./over.ts";

/** event.model: the thing declares the event with its fields (each with a value type), and a move of its machine emits it. */
export const model = over("event.model", ({ name, thing, fields, emitters }) => [
  ...Object.entries(fields).filter(([, f]) => typeof f.value?.type !== "string").map(([field]) => `field ${field} has no value type`),
  ...(Object.values(thing.machine?.moves ?? {}).some((m) => m.emits === name) ? [] : [`no move of ${thing.name}'s machine emits ${name}`]),
  ...(emitters.length === 0 ? [`no operation makes a move that emits ${name}`] : []),
]);

/**
 * event.server: each operation that emits it passes prove's `events` check, and its commit span says the event was committed. The journal itself
 * is not read: an event with a secret or private field is red until the journal can be (the cell asks that those fields never reach it).
 */
export const server = over("event.server", ({ name, fields, emitters }, e) => [
  ...emitters.flatMap((op) => Reading.proved(e.prove, `${op.name} events`)),
  ...(e.spans === undefined ? ["no spans were read from the prove run"] : emitters.flatMap((op) =>
    Reading.spansNamed(e.spans ?? [], `${op.name}.commit`).some((s) => s.attrs["event.name"] === name && s.attrs["commit.outcome"] === "committed") ? [] : [`no committed ${op.name}.commit span names ${name}`])),
  ...Object.entries(fields).filter(([, f]) => f.visibility !== undefined).map(([field]) => `${name}.${field} is not public, and nothing reads the journal to show it is left out`),
]);

/** The name a line is about: its first word once the list, heading, table and emphasis marks are taken off (a `- LinkAdded: link` entry, a `| LinkAdded | link |` row, a `### LinkAdded` heading; a paragraph is none of them). */
const subjectOf = (line: string) => /^\s*(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|\|\s*)[`*_]*([A-Za-z0-9_]+)/.exec(line)?.[1];

/**
 * The event is documented with each of its fields. Its entry starts on the line that is about it (its own heading, list entry or table row, so a
 * sentence that mentions it in passing is not its entry) and ends on the line that starts the next event's entry or at the section's end.
 */
const lists = (lines: ReadonlyArray<string>, name: string, fields: ReadonlyArray<string>, others: ReadonlyArray<string>): ReadonlyArray<string> => {
  const start = lines.findIndex((line) => subjectOf(line) === name);
  if (start < 0) return [`has no entry for ${name}`];
  // From where the entry names the event to where anything names another event, on that line or a later one: two events in one entry do not share fields.
  const text = lines.slice(start).join("\n");
  const whole = (n: string) => new RegExp(`(?<![\\w.-])${n}(?![\\w-])`);
  const after = text.slice(text.search(whole(name)) + name.length);
  const cuts = others.map((o) => after.search(whole(o))).filter((i) => i >= 0);
  const entry = cuts.length === 0 ? after : after.slice(0, Math.min(...cuts));
  return fields.filter((f) => !whole(f).test(entry)).map((f) => `lists ${name} without its field ${f}`);
};

/** event.docs: the thing's page documents the event with its fields (an Events section; a move table naming it does not document it). */
export const docs = over("event.docs", ({ name, thing, fields }, e) => {
  const siblings = Object.keys(thing.events ?? {}).filter((x) => x !== name);
  const path = `generated/docs/${thing.name}/index.md`;
  const page = e.files[path];
  if (page === undefined) return [`${path} was not generated`];
  const section = Reading.mdSection(page, "Events");
  return section === undefined ? [`${path} has no Events section documenting ${name} with its fields`] : lists(section.split("\n"), name, Object.keys(fields), siblings).map((p) => `${path}'s Events ${p}`);
});

/** event.portal: the thing's page lists the event with its fields, in the portal's own part. */
export const portal = over("event.portal", ({ name, thing, fields }, e) => {
  const siblings = Object.keys(thing.events ?? {}).filter((x) => x !== name);
  const route = `/portal/things/${thing.name}`;
  const page = e.portal[route];
  if (page === undefined) return [`${route} could not be rendered`];
  const section = Reading.htmlSection(Reading.portalOwn(page), 2, "Events");
  return section === undefined ? [`${route} has no Events section listing ${name} with its fields`] : lists(Reading.htmlLines(section), name, Object.keys(fields), siblings).map((p) => `${route}'s Events ${p}`);
});

/** event.telemetry: the commit span of each operation that emits it carries `event.name`. */
export const telemetry = over("event.telemetry", ({ name, emitters }, e) => {
  if (e.spans === undefined) return ["no spans were read from the prove run"];
  const spans = e.spans;
  return emitters.flatMap((op) => (Reading.spansNamed(spans, `${op.name}.commit`).some((s) => s.attrs["event.name"] === name) ? [] : [`no ${op.name}.commit span carries event.name ${name}`]));
});
