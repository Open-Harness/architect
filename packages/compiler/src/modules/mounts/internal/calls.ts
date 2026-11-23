// An adapter mount's calls and events: the ones its `include` names are reachable, and every call of the adapter is known
// by its dotted name (`issues.createComment`), so a step that names one the mount didn't include is refused naming both
// (M1-plugins section 9), and so is an include of a call or an event the adapter doesn't have.
import type { AdapterCall, Mount } from "orthograph";
import type { CallReach } from "../types.ts";

const kindOf = (x: unknown) => (typeof x === "object" && x !== null ? (x as { kind?: unknown }).kind : undefined);

/** The adapter's own calls, by the dotted name its descriptor gives them: a group's calls are `group.call`. */
const offered = (calls: unknown, prefix = ""): ReadonlyArray<readonly [string, AdapterCall]> =>
  typeof calls === "object" && calls !== null
    ? Object.entries(calls).sort(([a], [b]) => a.localeCompare(b)).flatMap(([name, c]) => kindOf(c) === "call" ? [[`${prefix}${name}`, c] as never] : offered(c, `${prefix}${name}.`))
    : [];

/** The adapter's own events, by name. */
const eventsOffered = (events: unknown): ReadonlyArray<readonly [string, unknown]> =>
  typeof events === "object" && events !== null ? Object.entries(events).filter(([, e]) => kindOf(e) === "event").sort(([a], [b]) => a.localeCompare(b)) : [];

/**
 * Each call of the adapter, whether this mount includes it, which events it includes, and what is wrong with the
 * `include` verbs, naming the mount's file.
 */
export const callsOf = (file: string, pkg: string, mountName: string, mount: Mount) => {
  const problems: Array<string> = [];
  const known = offered((mount.plugin as { readonly calls?: unknown }).calls);
  const knownEvents = eventsOffered((mount.plugin as { readonly events?: unknown }).events);
  const said = known.map(([name]) => name).join(", ") || "none";
  const saidEvents = knownEvents.map(([name]) => name).join(", ") || "none";
  const named = new Set<unknown>();
  const namedEvents = new Set<unknown>();
  for (const verb of mount.verbs) {
    if (verb.verb !== "include") continue;
    for (const item of verb.items) {
      if (known.some(([, call]) => call === item)) named.add(item);
      else if (knownEvents.some(([, event]) => event === item)) namedEvents.add(item);
      else if (kindOf(item) === "missing-call") problems.push(`${file}: includes the call ${(item as { name: string }).name}, which ${pkg} doesn't have (its calls: ${said})`);
      else if (kindOf(item) === "missing-event") problems.push(`${file}: includes the event ${(item as { name: string }).name}, which ${pkg} doesn't have (its events: ${saidEvents})`);
      else problems.push(`${file}: include takes one of ${pkg}'s calls or events, written p.calls.<call> or p.events.<event> (${said}); it was given ${JSON.stringify(item) ?? String(item)}`);
    }
  }
  const reach = known.map(([call, value]): readonly [AdapterCall, CallReach] => [value, { mount: mountName, file, package: pkg, call, included: named.has(value) }]);
  return {
    problems, reach,
    included: reach.filter(([, r]) => r.included).map(([, r]) => r.call),
    events: knownEvents.filter(([, event]) => namedEvents.has(event)).map(([name]) => name),
  };
};
