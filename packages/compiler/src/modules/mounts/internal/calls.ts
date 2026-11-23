// An adapter mount's calls: the ones its `include` names are reachable, and every call of the adapter is known by name,
// so a step that names one the mount didn't include is refused naming both (M1-plugins section 9).
import type { AdapterCall, Mount } from "orthograph";
import type { CallReach } from "../types.ts";

const kindOf = (x: unknown) => (typeof x === "object" && x !== null ? (x as { kind?: unknown }).kind : undefined);

/** The adapter's own calls, by the name its descriptor gives them. */
const offered = (calls: unknown): ReadonlyArray<readonly [string, AdapterCall]> =>
  typeof calls === "object" && calls !== null ? Object.entries(calls).filter(([, c]) => kindOf(c) === "call").sort(([a], [b]) => a.localeCompare(b)) as never : [];

/**
 * Each call of the adapter, whether this mount includes it, and what is wrong with the `include` verbs, naming the
 * mount's file.
 */
export const callsOf = (file: string, pkg: string, mountName: string, mount: Mount) => {
  const problems: Array<string> = [];
  const known = offered((mount.plugin as { readonly calls?: unknown }).calls);
  const said = known.map(([name]) => name).join(", ") || "none";
  const named = new Set<unknown>();
  for (const verb of mount.verbs) {
    if (verb.verb !== "include") continue;
    for (const item of verb.items) {
      if (known.some(([, call]) => call === item)) named.add(item);
      else if (kindOf(item) === "missing-call") problems.push(`${file}: includes the call ${(item as { name: string }).name}, which ${pkg} doesn't have (its calls: ${said})`);
      else problems.push(`${file}: include takes one of ${pkg}'s calls, written p.calls.<call> (${said}); it was given ${JSON.stringify(item) ?? String(item)}`);
    }
  }
  const reach = known.map(([call, value]): readonly [AdapterCall, CallReach] => [value, { mount: mountName, file, package: pkg, call, included: named.has(value) }]);
  return { problems, reach, included: reach.filter(([, r]) => r.included).map(([, r]) => r.call) };
};
