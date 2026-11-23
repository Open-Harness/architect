// Stores in the model (K3): the declared stores, the one-store-per-commit rule, and what an environment may bind.
import type { StoreModel, ThingModel } from "../types.ts";
import { hashOf } from "./hash.ts";
import type { Layout } from "./layout.ts";

/**
 * The kinds the host supplies: `database` and `actor` from @orthograph/host-cloudflare, and `chain.evm`, a contract
 * the Solidity language writes and `Host.chain` deploys (K25, K27). A kind another host or language supplies is added here.
 */
export const STORE_KINDS: ReadonlyArray<string> = ["database", "actor", "chain.evm"];

const byName = <V>(m: ReadonlyMap<string, V>) => [...m].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

/** The declared stores by name, each hashed, and a problem for a kind no host supplies. */
export const storesOf = (layout: Layout, problems: Array<string>): Readonly<Record<string, StoreModel>> =>
  Object.fromEntries(byName(layout.stores).map(([name, s]) => {
    if (!STORE_KINDS.includes(s.store.of)) {
      problems.push(`${s.file}: a store of kind "${s.store.of}", which no host of this project supplies (they supply ${STORE_KINDS.join(" and ")})`);
    }
    const entry = { name, file: s.file, kind: s.store.of, ...(s.from ? { from: s.from } : {}) };
    return [name, { ...entry, hash: hashOf(entry) }];
  }));

/** Where a thing lives, as a message names it. */
const placeOf = (t: ThingModel): string => (t.store ? `store ${t.store}` : t.lives === "actor" ? "the actor store" : "the default store");

/** One step of an operation, as the model has it. */
interface StepModel {
  readonly type: string;
  readonly writes?: ReadonlyArray<string>;
}

/**
 * The problem with an operation whose writes land in more than one store, if it has one (K3 item 5). A `database`
 * step writes the operation's own thing, or the things it names; a move writes the operation's own thing.
 */
export const crossStore = (
  file: string,
  operation: string,
  own: string,
  hasMove: boolean,
  steps: Readonly<Record<string, StepModel>>,
  things: Readonly<Record<string, ThingModel>>,
): string | undefined => {
  const places = new Map<string, Array<string>>();
  const write = (thing: string | undefined, by: string) => {
    const t = thing ? things[thing] : undefined;
    if (t) places.set(placeOf(t), [...(places.get(placeOf(t)) ?? []), by]);
  };
  if (hasMove) write(own, "its move");
  for (const [key, s] of Object.entries(steps)) {
    if (s.type !== "database") continue;
    if (s.writes) for (const w of s.writes) write(w, `step ${key} (${w})`);
    else write(own, `step ${key}`);
  }
  if (places.size < 2) return undefined;
  const named = [...places].map(([place, by]) => `${place} by ${[...new Set(by)].join(" and ")}`);
  return `${file}: ${operation} writes to ${places.size === 2 ? "two" : places.size} stores (${named.join("; ")}): one call commits to one store, so run work across stores as a workflow`;
};
