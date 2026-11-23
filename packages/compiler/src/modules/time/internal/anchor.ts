// Checks a move's anchor against its thing: the field exists and is a time, a calendar day is a day, a zone is known.
import type { Thing, TimeBy } from "orthograph";
import { isZone } from "./zones.ts";

const WEEKDAYS = new Set(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);

/** The type of a field of the thing, or nothing when it has no such field. */
const typeOf = (thing: Thing, field: string): string | undefined => {
  const f = Object.hasOwn(thing.fields, field) ? thing.fields[field] : undefined;
  return f === undefined ? undefined : f.value.meta.type;
};

/** A field the anchor names: the thing must have it and it must be an instant. */
const instantField = (where: string, thing: Thing, field: string, what: string): ReadonlyArray<string> => {
  const type = typeOf(thing, field);
  if (type === undefined) return [`${where} is made by time, but its ${what} ${field} isn't a field of the thing`];
  return type === "instant" ? [] : [`${where} is made by time, but its ${what} ${field} isn't a time (an instant), it is ${type}`];
};

const zoneProblems = (where: string, thing: Thing, zone: string): ReadonlyArray<string> => {
  if (isZone(zone)) return [];
  const type = typeOf(thing, zone);
  if (type === "text") return [];
  return [`${where} is made by time, but its zone "${zone}" is neither in the tz database nor a text field of the thing`];
};

export const anchorProblems = (where: string, thing: Thing, by: TimeBy): ReadonlyArray<string> => {
  if (by.kind === "after") return instantField(where, thing, by.field, "after field");
  const { from, on, zone } = by;
  if (from === undefined && on === undefined) return [`${where} is made by time, but every needs a \`from\` field of the thing, or a calendar anchor (\`on\`) with a zone`];
  if (from !== undefined && on !== undefined) return [`${where} is made by time, but it names both \`from\` and \`on\`: an anchor is one or the other`];
  const found: Array<string> = [];
  if (from !== undefined) found.push(...instantField(where, thing, from, "anchor field"));
  if (on !== undefined) {
    if ("weekday" in on) {
      if (!WEEKDAYS.has(on.weekday)) found.push(`${where} is made by time, but its weekday "${on.weekday}" isn't a day of the week`);
    } else if (on.day !== "last" && !(Number.isInteger(on.day) && on.day >= 1 && on.day <= 31)) {
      found.push(`${where} is made by time, but its day ${String(on.day)} isn't from 1 to 31, or "last"`);
    }
    if (zone === undefined) found.push(`${where} is made by time on a calendar day, but names no zone: give a tz database zone ("Europe/London") or a text field of the thing, so nothing silently runs in UTC`);
  }
  if (zone !== undefined) found.push(...zoneProblems(where, thing, zone));
  return found;
};
